const vehicleModel = require('../models/vehicle.model');
const BookingModel = require('../models/booking.model');
const BaseService = require('./base.service');

/** Trường dùng để search theo tên (regex) */
const SEARCH_FIELDS = ['vehicle_brand', 'vehicle_model', 'vehicle_name'];

/** Trạng thái booking khóa xe (xe không còn rảnh) */
const BLOCKING_STATUSES = [
  'confirmed',
  'paid',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
];

class VehicleService {
  async createVehicle(vehicle, userId) {
    return vehicleModel.create({ ...vehicle, added_by: userId });
  }

  async getListVehicles(body = {}) {
    const { search, vehicle_type, added_by, sort_by, sort_by_price, page, limit, brand, available_from, available_to } =
      body;

    const filter = {};

    if (search && String(search).trim()) {
      const words = String(search).trim().split(/\s+/).filter(Boolean);

      if (words.length === 1) {
        // single word: any field contains it
        const regex = new RegExp(words[0], 'i');
        filter.$or = SEARCH_FIELDS.map((field) => ({ [field]: regex }));
      } else {
        // multi-word: every word must appear in at least one field
        // e.g. "Toyota Camry" → brand has "Toyota" AND model has "Camry"
        filter.$and = words.map((word) => ({
          $or: SEARCH_FIELDS.map((field) => ({ [field]: new RegExp(word, 'i') })),
        }));
      }
    }

    if (brand && String(brand).trim() && brand !== 'all') {
      filter.vehicle_brand = new RegExp(String(brand).trim(), 'i');
    }

    if (vehicle_type) filter.vehicle_type = vehicle_type;
    if (added_by) filter.added_by = added_by;

    // Lọc xe còn rảnh trong khoảng ngày
    if (available_from && available_to) {
      const from = new Date(available_from);
      const to = new Date(available_to);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && to > from) {
        const conflictingVehicleIds = await BookingModel.distinct('vehicle_id', {
          status: { $in: BLOCKING_STATUSES },
          start_date: { $lte: to },
          end_date: { $gte: from },
        });
        filter._id = { $nin: conflictingVehicleIds };
      }
    }

    const parsedSortBy = BaseService.parseSortDirection(sort_by);
    const parsedSortByPrice = BaseService.parseSortDirection(sort_by_price);

    const sort = {
      createdAt: parsedSortBy !== null ? parsedSortBy : -1,
    };

    if (parsedSortByPrice !== null) {
      sort.vehicle_hire_rate_in_figures = parsedSortByPrice;
    }

    const pagination = BaseService.parsePagination({ page, limit });

    const ADDED_BY_PUBLIC_FIELDS =
      'name email phone address business_name role public_address logo_url policy_text showroom_representative_name opening_hours showroom_description';

    const [data, total] = await Promise.all([
      vehicleModel
        .find(filter)
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate({
          path: 'added_by',
          select: ADDED_BY_PUBLIC_FIELDS,
        })
        .lean(),
      vehicleModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit) || 0,
      },
    };
  }

  async getVehicleById(vehicleId) {
    return vehicleModel
      .findById(vehicleId)
      .populate({
        path: 'added_by',
        select:
          'name email phone address business_name role public_address opening_hours tax_code',
      });
  }

  async getVehiclesByIds(vehicleIds = []) {
    if (!vehicleIds.length) return {};

    const mongoose = require('mongoose');
    const objectIds = vehicleIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const vehicles = await vehicleModel.find({ _id: { $in: objectIds } }).lean();
    const map = {};
    for (const v of vehicles) {
      map[v._id.toString()] = v;
    }
    return map;
  }

  async deleteVehicleById(vehicleId) {
    return vehicleModel.findByIdAndDelete(vehicleId);
  }
}

module.exports = new VehicleService();
