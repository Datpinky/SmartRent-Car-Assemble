const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');
const BaseService = require('./base.service');
const throwError = require('../utils/throwError');
const QueryBuilder = require('../utils/queryBuilder');

// Lazy-require để tránh circular dependency (PaymentService cũng require BookingService)
const getPaymentService = () => require('./payment.service');

const PAYMENT_HOLD_MS = 5 * 60 * 1000; // 5 phút

const VEHICLE_STATUS_ON_BOOKING = {
  waiting_handover: 'waiting_handover',
  handed_over: 'rented',
  in_use: 'rented',
  completed: 'available',
  cancelled: 'available',
};

const ALLOWED_TRANSITIONS = {
  showroom: {
    // Showroom chỉ có thể hủy trước khi renter thanh toán
    pending: ['cancelled'],
    // Sau khi thanh toán: chốt bàn giao hoặc hủy (sẽ hoàn tiền)
    paid: ['waiting_handover', 'cancelled'],
    waiting_handover: ['handed_over'],
    waiting_return_confirmation: ['completed', 'in_use'],
  },
  renter: {
    waiting_payment: ['cancelled'],
    // Renter có thể hủy sau khi đã thanh toán — hệ thống tự động hoàn tiền Stripe
    paid: ['cancelled'],
    // handed_over → in_use: renter phải xác nhận qua OTP, không cho phép trực tiếp
    in_use: ['waiting_return_confirmation'],
  },
  admin: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['waiting_payment', 'cancelled'],
    waiting_payment: ['paid', 'cancelled'],
    paid: ['waiting_handover', 'cancelled'],
    waiting_handover: ['handed_over'],
    handed_over: ['in_use'],
    in_use: ['waiting_return_confirmation'],
    waiting_return_confirmation: ['completed', 'in_use'],
  },
};

class BookingService {
  static async createBooking(data, userId) {
    const {
      vehicle_id,
      showroom_id,
      start_date,
      end_date,
      note,
      delivery_type,
      delivery_address,
      delivery_latitude,
      delivery_longitude,
      delivery_plus_code,
    } = data;

    // 1. Kiểm tra driver_license phía server (không phụ thuộc frontend)
    const renter = await User.findById(userId).select('driver_license_status').lean();
    if (!renter) throwError('Người dùng không tồn tại', 404);
    if (renter.driver_license_status !== 'approved') {
      throwError('Giấy phép lái xe chưa được xác minh. Bạn không thể đặt xe.', 403);
    }

    // 2. Validate ngày
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throwError('Ngày không hợp lệ', 400);
    if (endDate <= startDate) throwError('Ngày trả xe phải sau ngày nhận xe', 400);

    // 3. Kiểm tra xe tồn tại và không bảo trì
    const vehicle = await Vehicle.findById(vehicle_id).lean();
    if (!vehicle) throwError('Xe không tồn tại', 404);
    // Chỉ chặn các trạng thái xe bị khoá vĩnh viễn bởi chủ xe.
    // Trạng thái 'rented' / 'waiting_handover' vẫn cho phép đặt trước — conflict ngày thực tế
    // được kiểm tra trong transaction bên dưới.
    if (vehicle.status === 'maintenance') throwError('Xe đang bảo trì và không thể đặt lúc này', 409);

    // 4. Validate showroom_id khớp với chủ xe
    const vehicleOwner = vehicle.added_by.toString();
    if (showroom_id && vehicleOwner !== showroom_id.toString()) {
      throwError('Thông tin chủ xe không hợp lệ', 400);
    }

    // 5. Kiểm tra xung đột lịch đặt + tạo booking trong cùng 1 transaction (tránh double-booking)
    // 6. Tính total_price
    const rate = Number(vehicle.vehicle_hire_rate_in_figures) || 0;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const subtotal = rate * days;
    const serviceFee = Math.round(subtotal * 0.05);
    const total_price = subtotal + serviceFee;
    if (total_price <= 0) throwError('Không thể tính giá thuê xe', 400);

    let booking;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const conflict = await Booking.findOne({
          vehicle_id,
          status: { $nin: ['cancelled', 'completed'] },
          start_date: { $lt: endDate },
          end_date: { $gt: startDate },
          // Bỏ qua các booking waiting_payment đã hết giờ giữ chỗ
          $nor: [{ status: 'waiting_payment', payment_expires_at: { $lte: now } }],
        }).session(session);

        if (conflict) throwError('Xe đã có lịch đặt trong khoảng thời gian này', 409);

        // Validate delivery fields server-side
        const dType = String(delivery_type || 'self');
        const dAddr = String(delivery_address || '').trim();
        let dLat = null;
        let dLng = null;
        if (delivery_latitude !== undefined && delivery_latitude !== null && delivery_latitude !== '') {
          const n = Number(delivery_latitude);
          if (!Number.isFinite(n) || n < -90 || n > 90) throwError('delivery_latitude không hợp lệ', 400);
          dLat = n;
        }
        if (delivery_longitude !== undefined && delivery_longitude !== null && delivery_longitude !== '') {
          const n = Number(delivery_longitude);
          if (!Number.isFinite(n) || n < -180 || n > 180) throwError('delivery_longitude không hợp lệ', 400);
          dLng = n;
        }
        if (dType === 'delivery') {
          if (!dAddr || dAddr.length < 6)
            throwError('Khi chọn giao tận nơi, delivery_address phải có ít nhất 6 ký tự', 400);
        }

        [booking] = await Booking.create(
          [
            {
              user_id: userId,
              vehicle_id,
              showroom_id: showroom_id || vehicleOwner,
              start_date: startDate,
              end_date: endDate,
              total_price,
              note: note || '',
              delivery_type: dType,
              delivery_address: dAddr || '',
              delivery_latitude: dLat,
              delivery_longitude: dLng,
              delivery_plus_code: delivery_plus_code || '',
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    return booking;
  }

  static async getListBookings(body = {}) {
    const { search, status, user_id, showroom_id, vehicle_id, sort_by, sort_by_price, page, limit } = body;

    const pagination = BaseService.parsePagination({ page, limit });

    const searchFilter = QueryBuilder.buildSearchFilter(search, { note: 1 });
    const fieldFilter = QueryBuilder.buildExactFieldFilter({ status, user_id, showroom_id, vehicle_id });

    const filter = { $and: [searchFilter, fieldFilter] };
    const sortOptions = QueryBuilder.buildSortOptions([
      { field: 'total_price', value: sort_by_price },
      { field: 'createdAt', value: sort_by },
    ]);

    const { page: pg, limit: lm, skip } = pagination;
    const [data, total] = await Promise.all([
      Booking.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(lm)
        .populate('user_id', 'name email phone avatar')
        .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model images status')
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page: pg,
        limit: lm,
        totalPages: Math.ceil(total / lm) || 0,
      },
    };
  }

  static async getBookingById(id) {
    return Booking.findById(id).populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number');
  }

  static async updateBookingStatus(id, status, role, userId) {
    const booking = await Booking.findById(id);
    if (!booking) throwError('Booking không tồn tại', 404);

    // DB lưu role 'user' cho khách thuê; ánh xạ về 'renter' để dùng ALLOWED_TRANSITIONS
    const normalizedRole = role === 'user' ? 'renter' : role;

    if (normalizedRole === 'renter') {
      if (booking.user_id.toString() !== userId.toString()) {
        throwError('Bạn không có quyền cập nhật booking này', 403);
      }
    }
    if (normalizedRole === 'showroom') {
      const vehicle = await Vehicle.findById(booking.vehicle_id).select('added_by').lean();
      if (!vehicle || vehicle.added_by.toString() !== userId.toString()) {
        throwError('Bạn không có quyền cập nhật booking này', 403);
      }
    }

    const allowedForRole = ALLOWED_TRANSITIONS[normalizedRole];
    if (!allowedForRole) throwError(`Role "${role}" không có quyền cập nhật trạng thái booking`, 403);

    const allowedNextStatuses = allowedForRole[booking.status];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
      throwError(`Không thể chuyển từ "${booking.status}" sang "${status}" với role "${role}"`, 403);
    }

    booking.status = status;
    if (status === 'waiting_payment') {
      booking.payment_expires_at = new Date(Date.now() + PAYMENT_HOLD_MS);
    } else if (status === 'paid') {
      booking.payment_expires_at = null;
    } else if (status === 'handed_over') {
      // Sinh OTP 6 chữ số, hiệu lực 24h
      booking.handover_otp = String(Math.floor(100000 + Math.random() * 900000));
      booking.handover_otp_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (status === 'cancelled') {
      // Hoàn tiền Stripe nếu booking đã thanh toán
      const paymentService = getPaymentService();
      const refundResult = await paymentService.issueRefund(booking._id.toString()).catch((err) => {
        console.error('[BookingService] issueRefund error:', err.message);
        return null;
      });
      booking._refundResult = refundResult; // đính kèm để controller trả về client
    }
    await booking.save();

    const vehicleStatus = VEHICLE_STATUS_ON_BOOKING[status];
    if (vehicleStatus) {
      await Vehicle.findByIdAndUpdate(booking.vehicle_id, { status: vehicleStatus });
    }

    return booking;
  }

  static async verifyHandoverOtp(bookingId, otp, userId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throwError('Booking không tồn tại', 404);
    if (booking.user_id.toString() !== userId.toString()) throwError('Bạn không có quyền xác nhận booking này', 403);
    if (booking.status !== 'handed_over') throwError('Booking không ở trạng thái chờ xác nhận nhận xe', 400);
    if (!booking.handover_otp) throwError('Mã OTP chưa được tạo, vui lòng liên hệ showroom', 400);
    if (new Date() > booking.handover_otp_expires_at)
      throwError('Mã OTP đã hết hạn (24h), vui lòng liên hệ showroom', 400);
    if (booking.handover_otp !== String(otp).trim()) throwError('Mã OTP không đúng', 400);

    booking.status = 'in_use';
    booking.handover_otp = null;
    booking.handover_otp_expires_at = null;
    await booking.save();

    await Vehicle.findByIdAndUpdate(booking.vehicle_id, { status: 'rented' });

    return booking;
  }

  static async savePickupImages(bookingId, showroomUserId, images) {
    console.log('🔔 Service.savePickupImages called:', { bookingId, imagesCount: images?.length, showroomUserId });
    const booking = await Booking.findById(bookingId);
    if (!booking) throwError('Booking không tồn tại', 404);
    console.log('📋 Booking found. showroom_id:', booking.showroom_id.toString(), 'userId:', showroomUserId.toString());
    if (booking.showroom_id.toString() !== showroomUserId.toString())
      throwError('Bạn không có quyền cập nhật booking này', 403);
    const safeImages = images.filter((u) => typeof u === 'string' && u.startsWith('http')).slice(0, 6);
    console.log('📸 Safe images after filter:', safeImages.length);
    booking.pickup_images = safeImages;
    await booking.save();
    console.log('✅ Saved to DB. pickup_images count:', booking.pickup_images.length);
    return booking;
  }

  static async _setStatusInternal(id, status) {
    const booking = await Booking.findById(id);
    if (!booking) throwError('Booking không tồn tại', 404);
    booking.status = status;
    if (status === 'waiting_payment') {
      booking.payment_expires_at = new Date(Date.now() + PAYMENT_HOLD_MS);
    } else if (status === 'paid') {
      booking.payment_expires_at = null;
    }
    await booking.save();
    const vehicleStatus = VEHICLE_STATUS_ON_BOOKING[status];
    if (vehicleStatus) {
      await Vehicle.findByIdAndUpdate(booking.vehicle_id, { status: vehicleStatus });
    }
    return booking;
  }

  /**
   * Hủy các booking waiting_payment đã hết thời gian giữ chỗ.
   * Gọi bởi background job mỗi 60 giây.
   */
  static async expireStalePaymentBookings() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - PAYMENT_HOLD_MS);

    const stale = await Booking.find({
      status: 'waiting_payment',
      $or: [
        { payment_expires_at: { $lte: now } },
        // Legacy: không có payment_expires_at, đã chờ > 5 phút
        { payment_expires_at: null, updatedAt: { $lt: fiveMinutesAgo } },
      ],
    })
      .select('_id vehicle_id')
      .lean();

    if (stale.length === 0) return [];

    const results = [];
    for (const b of stale) {
      // Cập nhật có điều kiện: chỉ huỷ nếu vẫn đang waiting_payment
      // (tránh ghi đè nếu Stripe vừa xử lý xong trong cùng lúc)
      const updated = await Booking.findOneAndUpdate(
        { _id: b._id, status: 'waiting_payment' },
        { $set: { status: 'cancelled', payment_expires_at: null } },
        { new: true },
      );
      if (updated) {
        await Vehicle.findByIdAndUpdate(b.vehicle_id, { status: 'available' });
        results.push(b._id);
      }
    }

    return results;
  }

  static async deleteBooking(id) {
    return Booking.findByIdAndDelete(id);
  }
}

module.exports = BookingService;
