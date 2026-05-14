const VehicleInspection = require('../models/vehicleInspection.model');

class InspectionController {
  async create(req, res, next) {
    try {
      const {
        vehicle_id,
        booking_id,
        inspection_type, // 'pickup' or 'return'
        inspected_by_role, // 'showroom' or 'renter'
        inspected_by_id, // user who did the inspection
        vehicle_name,
        vehicle_plate,
        booking_code,
        positions,
        ai_payload,
        damage_detected,
        severity,
        positions_analyzed,
        position_results,
      } = req.body;

      const user_id = req.user.userId;
      const user_role = req.user.role || 'unknown';
      // Normalize role: 'user' in DB means 'renter'
      const normalizedUserRole = user_role === 'user' ? 'renter' : user_role;
      const inspected_by_name = req.user.name || req.user.email || '';
      const effectiveInspectedByRole =
        normalizedUserRole === 'admin' ? inspected_by_role || 'showroom' : normalizedUserRole;

      // Access control: ensure user role matches inspection role
      if (inspected_by_role && inspected_by_role !== normalizedUserRole && normalizedUserRole !== 'admin') {
        return res.status(403).json({ message: 'Khong co quyen tao kiem tra voi vai tro nay' });
      }

      const doc = await VehicleInspection.create({
        vehicle_id,
        booking_id: booking_id || null,
        showroom_id: effectiveInspectedByRole === 'showroom' ? user_id : null,
        inspected_by_id: inspected_by_id || user_id,
        inspection_type: inspection_type || 'pickup',
        inspected_by_role: effectiveInspectedByRole,
        inspected_by_name,
        vehicle_name: vehicle_name || '',
        vehicle_plate: vehicle_plate || '',
        booking_code: booking_code || '',
        positions: Array.isArray(positions) ? positions : [],
        positions_analyzed: Number(positions_analyzed) || 0,
        ai_payload: ai_payload || {},
        damage_detected: !!damage_detected,
        severity: severity || 'none',
        position_results: Array.isArray(position_results) ? position_results : [],
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
      const normalizedUserRole = user_role === 'user' ? 'renter' : user_role;
      const { page = 1, limit = 30, vehicle_id, booking_id, inspection_type, inspected_by_role } = req.query;

      // For showroom: filter by showroom_id. For renter/user: filter by inspected_by_id
      const baseFilter = normalizedUserRole === 'showroom' ? { showroom_id: user_id } : { inspected_by_id: user_id };
      if (vehicle_id) baseFilter.vehicle_id = vehicle_id;
      if (booking_id) baseFilter.booking_id = booking_id;
      if (inspection_type) baseFilter.inspection_type = inspection_type;
      if (inspected_by_role) baseFilter.inspected_by_role = inspected_by_role;

      const skip = (Number(page) - 1) * Number(limit);

      // Get user's own inspections
      const userInspections = await VehicleInspection.find(baseFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number')
        .populate('booking_id', '_id start_date end_date');

      // For transparency: also fetch related inspections from OTHER roles for the same bookings
      // This ensures both showroom and renter can see all inspection images for a booking
      const relatedInspections = [];
      let bookingIds = [];

      if (booking_id) {
        // If booking_id is specified, always fetch related inspections from other roles
        bookingIds = [booking_id];
      } else if (userInspections.length > 0) {
        // Otherwise, collect booking IDs from user's inspections
        bookingIds = userInspections.filter((i) => i.booking_id).map((i) => i.booking_id._id || i.booking_id);
      }

      if (bookingIds.length > 0 && !inspected_by_role) {
        // Fetch inspections from OTHER roles for the same bookings
        const otherRoleFilter = {
          booking_id: { $in: bookingIds },
          inspected_by_role: { $ne: normalizedUserRole }, // Get inspections from OTHER roles
        };
        if (inspection_type) otherRoleFilter.inspection_type = inspection_type;
        const otherInspections = await VehicleInspection.find(otherRoleFilter)
          .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number')
          .populate('booking_id', '_id start_date end_date');
        relatedInspections.push(...otherInspections);
      }

      // Merge and deduplicate
      const allInspections = [...userInspections, ...relatedInspections];
      const uniqueInspections = Array.from(new Map(allInspections.map((item) => [item._id.toString(), item])).values());

      // Re-sort by createdAt descending
      uniqueInspections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const total = await VehicleInspection.countDocuments(baseFilter);

      return res.json({
        data: uniqueInspections,
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
      const normalizedUserRole = user_role === 'user' ? 'renter' : user_role;

      // For showroom: check showroom_id. For renter/user: check inspected_by_id
      const filter =
        normalizedUserRole === 'showroom'
          ? { _id: req.params.id, showroom_id: user_id }
          : { _id: req.params.id, inspected_by_id: user_id };

      const doc = await VehicleInspection.findOne(filter)
        .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number')
        .populate('booking_id', '_id start_date end_date');

      if (!doc) return res.status(404).json({ message: 'Không tìm thấy báo cáo' });
      return res.json({ data: doc });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InspectionController();
