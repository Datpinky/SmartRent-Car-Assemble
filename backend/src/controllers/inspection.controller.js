const VehicleInspection = require('../models/vehicleInspection.model');
const Booking = require('../models/booking.model');
const InspectionReturnReviewService = require('../services/inspectionReturnReview.service');

function normalizeRole(role) {
  return role === 'user' ? 'renter' : role;
}

/** Renter must not see draft AI / audit runs before showroom publishes. */
function sanitizeInspectionForRenter(doc) {
  if (!doc) return doc;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  if (o.published_to_renter) return o;
  delete o.analysis_runs;
  delete o.ai_payload;
  o.damage_detected = false;
  o.severity = 'none';
  o.observations = [];
  o.summary = '';
  o.conclusion = '';
  o.disclaimer = '';
  o.ai_status = 'not_run';
  return o;
}

class InspectionController {
  async create(req, res, next) {
    try {
      const {
        vehicle_id,
        booking_id,
        inspection_type,
        inspected_by_role,
        inspected_by_id,
        vehicle_name,
        vehicle_plate,
        booking_code,
        pickup_images,
        return_images,
        gallery_images,
        gallery_analyzed,
        ai_payload,
        damage_detected,
        severity,
        observations,
        summary,
        conclusion,
        disclaimer,
        comparison_mode,
      } = req.body;

      const user_id = req.user.userId;
      const user_role = req.user.role || 'unknown';
      const normalizedUserRole = normalizeRole(user_role);
      const inspected_by_name = req.user.name || req.user.email || '';
      const effectiveInspectedByRole =
        normalizedUserRole === 'admin' ? inspected_by_role || 'showroom' : normalizedUserRole;

      if (inspected_by_role && inspected_by_role !== normalizedUserRole && normalizedUserRole !== 'admin') {
        return res.status(403).json({ message: 'Khong co quyen tao kiem tra voi vai tro nay' });
      }

      const type = inspection_type || 'pickup';
      let showroomIdForDoc = effectiveInspectedByRole === 'showroom' ? user_id : null;

      if (type === 'return' && effectiveInspectedByRole === 'renter' && booking_id) {
        const b = await Booking.findById(booking_id).select('showroom_id user_id').lean();
        if (!b) return res.status(400).json({ message: 'Booking không tồn tại' });
        if (b.user_id.toString() !== user_id.toString()) {
          return res.status(403).json({ message: 'Không thể tạo biên bản trả cho booking của người khác' });
        }
        showroomIdForDoc = b.showroom_id || null;
      }

      const isRenterReturn = type === 'return' && effectiveInspectedByRole === 'renter';

      const doc = await VehicleInspection.create({
        vehicle_id,
        booking_id: booking_id || null,
        showroom_id: showroomIdForDoc,
        inspected_by_id: inspected_by_id || user_id,
        inspection_type: type,
        inspected_by_role: effectiveInspectedByRole,
        inspected_by_name,
        vehicle_name: vehicle_name || '',
        vehicle_plate: vehicle_plate || '',
        booking_code: booking_code || '',
        pickup_images: Array.isArray(pickup_images) ? pickup_images.slice(0, 6) : [],
        return_images: Array.isArray(return_images) ? return_images.slice(0, 6) : [],
        gallery_images: isRenterReturn
          ? Array.isArray(return_images)
            ? return_images.slice(0, 6)
            : []
          : Array.isArray(gallery_images)
            ? gallery_images.slice(0, 6)
            : [],
        gallery_analyzed: isRenterReturn ? 0 : Number(gallery_analyzed) || 0,
        ai_status: 'not_run',
        published_to_renter: false,
        analysis_runs: [],
        ai_payload: isRenterReturn ? {} : ai_payload || {},
        damage_detected: isRenterReturn ? false : !!damage_detected,
        severity: isRenterReturn ? 'none' : severity || 'none',
        observations: isRenterReturn ? [] : Array.isArray(observations) ? observations : [],
        summary: isRenterReturn ? '' : summary || ai_payload?.summary || '',
        conclusion: isRenterReturn ? '' : conclusion || ai_payload?.conclusion || '',
        disclaimer: isRenterReturn ? '' : disclaimer || ai_payload?.disclaimer || '',
        comparison_mode: comparison_mode || 'gallery',
      });

      return res.status(201).json({ message: 'Lưu báo cáo kiểm tra thành công', data: doc });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const user_id = req.user.userId;
      const user_role = req.user.role || 'showroom';
      const normalizedUserRole = normalizeRole(user_role);
      const { page = 1, limit = 30, vehicle_id, booking_id, inspection_type, inspected_by_role } = req.query;

      const baseFilter =
        normalizedUserRole === 'showroom' || normalizedUserRole === 'admin'
          ? normalizedUserRole === 'admin'
            ? {}
            : { showroom_id: user_id }
          : { inspected_by_id: user_id };

      if (vehicle_id) baseFilter.vehicle_id = vehicle_id;
      if (booking_id) baseFilter.booking_id = booking_id;
      if (inspection_type) baseFilter.inspection_type = inspection_type;
      if (inspected_by_role) baseFilter.inspected_by_role = inspected_by_role;

      const skip = (Number(page) - 1) * Number(limit);

      let userInspections = await VehicleInspection.find(baseFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number')
        .populate('booking_id', '_id start_date end_date status');

      if (normalizedUserRole === 'renter') {
        userInspections = userInspections.map((doc) => sanitizeInspectionForRenter(doc));
      } else {
        const relatedInspections = [];
        let bookingIds = [];

        if (booking_id) {
          bookingIds = [booking_id];
        } else if (userInspections.length > 0) {
          bookingIds = userInspections.filter((i) => i.booking_id).map((i) => i.booking_id._id || i.booking_id);
        }

        if (bookingIds.length > 0 && !inspected_by_role && normalizedUserRole !== 'admin') {
          const otherRoleFilter = {
            booking_id: { $in: bookingIds },
            inspected_by_role: { $ne: 'showroom' },
          };
          if (inspection_type) otherRoleFilter.inspection_type = inspection_type;
          const otherInspections = await VehicleInspection.find(otherRoleFilter)
            .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number')
            .populate('booking_id', '_id start_date end_date status');
          relatedInspections.push(...otherInspections);
        }

        const allInspections = [...userInspections, ...relatedInspections];
        userInspections = Array.from(new Map(allInspections.map((item) => [item._id.toString(), item])).values());
        userInspections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      const total = await VehicleInspection.countDocuments(baseFilter);

      return res.json({
        data: userInspections,
        pagination: { total, page: Number(page), limit: Number(limit) },
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const user_id = req.user.userId;
      const user_role = req.user.role || 'showroom';
      const normalizedUserRole = normalizeRole(user_role);

      let filter;
      if (normalizedUserRole === 'admin') {
        filter = { _id: req.params.id };
      } else if (normalizedUserRole === 'showroom') {
        filter = { _id: req.params.id, showroom_id: user_id };
      } else {
        filter = { _id: req.params.id, inspected_by_id: user_id };
      }

      let doc = await VehicleInspection.findOne(filter)
        .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number')
        .populate('booking_id', '_id start_date end_date status');

      if (!doc) return res.status(404).json({ message: 'Không tìm thấy báo cáo' });

      if (normalizedUserRole === 'renter') {
        doc = sanitizeInspectionForRenter(doc);
      }

      return res.json({ data: doc });
    } catch (err) {
      next(err);
    }
  }

  async getReturnReview(req, res, next) {
    try {
      const data = await InspectionReturnReviewService.getReturnReview(
        req.params.bookingId,
        req.user.role,
        req.user.userId,
      );
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async analyzeReturnReview(req, res, next) {
    try {
      const { analysis } = await InspectionReturnReviewService.analyze(
        req.params.bookingId,
        req.user.role,
        req.user.userId,
      );
      return res.status(200).json({ message: 'Phân tích AI hoàn tất', data: analysis });
    } catch (err) {
      next(err);
    }
  }

  async confirmReturnReview(req, res, next) {
    try {
      const manual = !!req.body?.manual;
      const note = typeof req.body?.note === 'string' ? req.body.note : '';
      const result = await InspectionReturnReviewService.confirm(req.params.bookingId, req.user.role, req.user.userId, {
        manual,
        note,
      });
      return res.status(200).json({
        message: manual
          ? 'Đã xác nhận trả xe thủ công và hoàn tất booking.'
          : 'Đã xác nhận kết quả AI và hoàn tất booking.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InspectionController();
