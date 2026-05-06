const mongoose = require("mongoose");
const axios = require("axios");
const Booking = require("../models/booking.model");
const Vehicle = require("../models/vehicle.model");
const Payment = require("../models/payment.model");
const User = require("../models/user.model");
const BaseService = require("./base.service");
const throwError = require("../utils/throwError");
const QueryBuilder = require("../utils/queryBuilder");
const auditLogService = require("./auditLog.service");
const UploadService = require("./upload.service");
const AiService = require("./ai.service");

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "waiting_payment", "cancelled"],
  confirmed: ["waiting_payment", "cancelled"],
  waiting_payment: ["paid", "payment_failed", "cancelled"],
  payment_failed: ["waiting_payment", "cancelled"],
  paid: ["waiting_handover", "cancelled"],
  waiting_handover: ["handed_over"],
  handed_over: ["in_use"],
  in_use: ["waiting_return_confirmation"],
  waiting_return_confirmation: ["completed"],
  cancelled: [],
  completed: [],
};

const canTransition = (fromStatus, toStatus) => {
  return (ALLOWED_TRANSITIONS[fromStatus] || []).includes(toStatus);
};

const canTransitionByRole = (role, toStatus) => {
  if (role === "admin" || role === "system") return true;
  if (role === "showroom") {
    return [
      "confirmed",
      "waiting_handover",
      "handed_over",
      "waiting_return_confirmation",
      "completed",
      "cancelled",
    ].includes(toStatus);
  }
  // user/renter
  return ["waiting_payment", "cancelled", "in_use"].includes(toStatus);
};

class BookingService {
  static buildRevenueSnapshot(totalPrice, vehicle = null) {
    const rule = vehicle?.revenue_share_rule || {};
    const platformPercent = Number(rule.platform_fee_percent ?? process.env.PLATFORM_FEE_PERCENT ?? 10);
    const consignorPercent = Number(rule.consignor_share_percent ?? 0);
    const platformFee = Math.round((totalPrice * platformPercent) / 100);
    const consignorShare = Math.round((totalPrice * consignorPercent) / 100);
    const showroomShare = Math.max(0, totalPrice - platformFee - consignorShare);

    return {
      platform_fee: platformFee,
      showroom_share: showroomShare,
      consignor_share: consignorShare,
      currency: vehicle?.vehicle_hire_rate_currency || "VND",
      pricing_snapshot_at: new Date(),
    };
  }

  static computeTotalPrice(vehicle, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throwError("Thời gian booking không hợp lệ", 422);
    }

    const rate = Number(vehicle.vehicle_hire_rate_in_figures || 0);
    if (rate <= 0) throwError("Xe chưa có đơn giá thuê hợp lệ", 422);

    const delta = end.getTime() - start.getTime();
    const chargeBy = vehicle.vehicle_hire_charge_per_timing || "day";

    let units = 1;
    if (chargeBy === "hourly") {
      units = Math.ceil(delta / HOUR_IN_MS);
    } else if (chargeBy === "day") {
      units = Math.ceil(delta / DAY_IN_MS);
    } else if (chargeBy === "minutes") {
      units = Math.ceil(delta / (60 * 1000));
    } else {
      // seconds / negotiable fallback to full day minimum
      units = Math.max(1, Math.ceil(delta / DAY_IN_MS));
    }

    return Math.max(0, Math.round(rate * units));
  }

  static async createBooking(data, userId) {
    const { vehicle_id, start_date, end_date, note } = data;
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) throwError("Không tìm thấy xe", 404);

    const showroomId = vehicle.showroom_id || vehicle.added_by;
    if (!showroomId) throwError("Xe chưa được gán showroom quản lý", 422);

    const showroom = await User.findById(showroomId).select("role showroom_status");
    if (!showroom || showroom.role !== "showroom") {
      throwError("Thông tin showroom của xe không hợp lệ", 422);
    }
    if (showroom.showroom_status !== "approved") {
      throwError("Showroom chưa được duyệt nên không thể nhận booking", 403);
    }

    const totalPrice = this.computeTotalPrice(vehicle, start_date, end_date);
    const pricingSnapshot = this.buildRevenueSnapshot(totalPrice, vehicle);
    const session = await mongoose.startSession();

    try {
      let createdBooking = null;
      await session.withTransaction(async () => {
        const [booking] = await Booking.create(
          [
            {
              user_id: userId,
              showroom_id: showroomId,
              vehicle_id,
              start_date,
              end_date,
              total_price: totalPrice,
              note: note || "",
              pricing_snapshot: pricingSnapshot,
              status: "pending",
            },
          ],
          { session }
        );
        createdBooking = booking;

        await Payment.create(
          [
            {
              booking_id: booking._id,
              amount: totalPrice,
              currency: vehicle.vehicle_hire_rate_currency || "VND",
              payment_status: "pending",
              payment_kind: "deposit",
              payment_method: "stripe",
            },
          ],
          { session }
        );
      });

      await auditLogService.record({
        actor_id: userId,
        actor_role: "user",
        action: "booking.create",
        entity: "booking",
        entity_id: createdBooking._id,
        before: null,
        after: createdBooking.toObject(),
      });

      return createdBooking;
    } finally {
      await session.endSession();
    }
  }

  static scopeFiltersByActor(filters = {}, actor = {}) {
    if (actor.role === "admin") return filters;
    if (actor.role === "showroom") {
      return { ...filters, showroom_id: actor.userId };
    }
    return { ...filters, user_id: actor.userId };
  }

  static async getListBookings(body = {}, actor = {}) {
    const scoped = this.scopeFiltersByActor(body, actor);
    const { search, status, user_id, showroom_id, sort_by, sort_by_price, page, limit } = scoped;

    const pagination = BaseService.parsePagination({ page, limit });
    const searchFilter = QueryBuilder.buildSearchFilter(search, { note: 1 });
    const fieldFilter = QueryBuilder.buildExactFieldFilter({ status, user_id, showroom_id });
    const filter = { $and: [searchFilter, fieldFilter] };
    const sortOptions = QueryBuilder.buildSortOptions([
      { field: "total_price", value: sort_by_price },
      { field: "createdAt", value: sort_by },
    ]);

    const { page: pageNum, limit: limitNum, skip } = pagination;
    const [data, total] = await Promise.all([
      Booking.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "user_id",
          select: "name email phone is_active",
        })
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
    };
  }

  static async getBookingById(id) {
    return Booking.findById(id);
  }

  static async assertBookingAccess(booking, actor = {}) {
    if (!booking) throwError("Booking không tồn tại", 404);
    if (actor.role === "admin" || actor.role === "system") return true;

    if (actor.role === "showroom") {
      if (String(booking.showroom_id) !== String(actor.userId)) {
        throwError("Bạn không có quyền truy cập booking này", 403);
      }
      return true;
    }

    if (String(booking.user_id) !== String(actor.userId)) {
      throwError("Bạn không có quyền truy cập booking này", 403);
    }
    return true;
  }

  static async getBookingByIdScoped(id, actor = {}) {
    const booking = await Booking.findById(id);
    await this.assertBookingAccess(booking, actor);
    return booking;
  }

  static async transitionBookingStatus(id, status, actor = {}) {
    const booking = await Booking.findById(id);
    await this.assertBookingAccess(booking, actor);

    const validStatuses = Booking.schema.path("status").enumValues;
    if (!validStatuses?.includes(status)) {
      throwError(`Trạng thái "${status}" không hợp lệ`, 422);
    }
    if (booking.status === status) return booking;
    if (!canTransition(booking.status, status)) {
      throwError(`Không thể chuyển từ "${booking.status}" sang "${status}"`, 422);
    }
    if (!canTransitionByRole(actor.role || "user", status)) {
      throwError("Bạn không có quyền chuyển booking sang trạng thái này", 403);
    }

    const before = booking.toObject();
    booking.status = status;
    await booking.save();

    await auditLogService.record({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "booking.status.transition",
      entity: "booking",
      entity_id: booking._id,
      before,
      after: booking.toObject(),
      metadata: { from: before.status, to: status },
    });

    return booking;
  }

  static async deleteBooking(id, actor = {}) {
    const booking = await Booking.findById(id);
    await this.assertBookingAccess(booking, actor);
    if (actor.role !== "admin" && !["pending", "cancelled"].includes(booking.status)) {
      throwError("Chỉ có thể xoá booking ở trạng thái pending/cancelled", 422);
    }

    const deleted = await Booking.findByIdAndDelete(id);
    await auditLogService.record({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "booking.delete",
      entity: "booking",
      entity_id: booking._id,
      before: booking.toObject(),
      after: null,
    });
    return deleted;
  }

  static async submitHandoverInspection(bookingId, files = [], actor = {}) {
    const booking = await Booking.findById(bookingId);
    await this.assertBookingAccess(booking, actor);
    if (!["showroom", "admin"].includes(actor.role)) {
      throwError("Chỉ showroom hoặc admin được tạo ảnh bàn giao ban đầu", 403);
    }

    const uploads = await Promise.all(
      (files || []).map((file) => UploadService.uploadBuffer(file.buffer, file.originalname))
    );
    const urls = uploads.map((item) => item.url);

    const before = booking.toObject();
    booking.inspection = {
      ...(booking.inspection || {}),
      handover_images: urls,
    };
    await booking.save();

    await auditLogService.record({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "booking.inspection.handover",
      entity: "booking",
      entity_id: booking._id,
      before,
      after: booking.toObject(),
    });

    return booking;
  }

  static async submitReturnInspection(bookingId, files = [], actor = {}) {
    const booking = await Booking.findById(bookingId);
    await this.assertBookingAccess(booking, actor);
    if (!["user", "admin"].includes(actor.role)) {
      throwError("Chỉ renter hoặc admin được gửi ảnh trả xe", 403);
    }

    const uploads = await Promise.all(
      (files || []).map((file) => UploadService.uploadBuffer(file.buffer, file.originalname))
    );
    const returnUrls = uploads.map((item) => item.url);
    const handoverImages = booking.inspection?.handover_images || [];

    let aiReport = null;
    if ((files || []).length > 0 && handoverImages.length > 0) {
      const beforeImage = await axios.get(handoverImages[0], { responseType: "arraybuffer" });
      aiReport = await AiService.compareVehicleRentalDamage(
        { buffer: Buffer.from(beforeImage.data), mimetype: "image/jpeg" },
        { buffer: files[files.length - 1].buffer, mimetype: files[files.length - 1].mimetype }
      );
    }

    const before = booking.toObject();
    booking.inspection = {
      ...(booking.inspection || {}),
      return_images: returnUrls,
      ai_report: aiReport,
      report_generated_at: aiReport ? new Date() : null,
    };
    await booking.save();

    await auditLogService.record({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "booking.inspection.return",
      entity: "booking",
      entity_id: booking._id,
      before,
      after: booking.toObject(),
    });

    return booking;
  }

  static async getInspectionReport(bookingId, actor = {}) {
    const booking = await Booking.findById(bookingId);
    await this.assertBookingAccess(booking, actor);
    return booking.inspection || {};
  }

  static mapAiReportPayload(booking) {
    const inspection = booking?.inspection || {};
    const hasResult = Boolean(inspection.ai_report);
    return {
      status: hasResult ? "ready" : "pending",
      pickup_image_url: inspection.handover_images?.[0] || "",
      return_image_urls: inspection.return_images || [],
      result: inspection.ai_report || null,
      analyzed_at: inspection.report_generated_at || null,
      error_message: hasResult ? "" : "Chưa có kết quả phân tích AI",
      report_id: booking?._id ? String(booking._id) : "",
    };
  }

  static async getAiReportByBookingId(bookingId, actor = {}) {
    const booking = await Booking.findById(bookingId);
    await this.assertBookingAccess(booking, actor);
    return this.mapAiReportPayload(booking);
  }

  static async generateAiReportFromUrls(bookingId, payload = {}, actor = {}) {
    const booking = await Booking.findById(bookingId);
    await this.assertBookingAccess(booking, actor);

    const pickupImageUrl = payload.pickup_image_url || booking?.inspection?.handover_images?.[0];
    const returnImageUrl = (payload.return_image_urls || booking?.inspection?.return_images || [])[0];
    if (!pickupImageUrl || !returnImageUrl) {
      throwError("Thiếu ảnh pickup/return để phân tích AI", 422);
    }

    const [beforeImage, afterImage] = await Promise.all([
      axios.get(pickupImageUrl, { responseType: "arraybuffer" }),
      axios.get(returnImageUrl, { responseType: "arraybuffer" }),
    ]);

    const aiReport = await AiService.compareVehicleRentalDamage(
      { buffer: Buffer.from(beforeImage.data), mimetype: "image/jpeg" },
      { buffer: Buffer.from(afterImage.data), mimetype: "image/jpeg" }
    );

    const before = booking.toObject();
    booking.inspection = {
      ...(booking.inspection || {}),
      handover_images: payload.pickup_image_url
        ? [payload.pickup_image_url]
        : booking.inspection?.handover_images || [],
      return_images: payload.return_image_urls || booking.inspection?.return_images || [],
      ai_report: aiReport,
      report_generated_at: new Date(),
    };
    await booking.save();

    await auditLogService.record({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "booking.inspection.generate_report",
      entity: "booking",
      entity_id: booking._id,
      before,
      after: booking.toObject(),
    });

    return this.mapAiReportPayload(booking);
  }
}

module.exports = BookingService;