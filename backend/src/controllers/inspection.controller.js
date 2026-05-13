const VehicleInspection = require('../models/vehicleInspection.model');

class InspectionController {
  async create(req, res, next) {
    try {
      const {
        vehicle_id,
        booking_id,
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

      const showroom_id = req.user.userId;
      const inspected_by_name = req.user.name || req.user.email || '';

      const doc = await VehicleInspection.create({
        vehicle_id,
        booking_id: booking_id || null,
        showroom_id,
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
      const showroom_id = req.user.userId;
      const { page = 1, limit = 30, vehicle_id, booking_id } = req.query;

      const filter = { showroom_id };
      if (vehicle_id) filter.vehicle_id = vehicle_id;
      if (booking_id) filter.booking_id = booking_id;

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        VehicleInspection.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number')
          .populate('booking_id', '_id start_date end_date'),
        VehicleInspection.countDocuments(filter),
      ]);

      return res.json({
        data: items,
        pagination: { total, page: Number(page), limit: Number(limit) },
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const showroom_id = req.user.userId;
      const doc = await VehicleInspection.findOne({
        _id: req.params.id,
        showroom_id,
      })
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
