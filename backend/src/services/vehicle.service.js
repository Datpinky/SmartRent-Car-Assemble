const vehicleModel = require("../models/vehicle.model");
const BaseService = require("./base.service");

/** Trường dùng để search theo tên (regex) */
const SEARCH_FIELDS = ["vehicle_brand", "vehicle_model"];

class VehicleService {
    async createVehicle(vehicle, userId) {
        return vehicleModel.create({ ...vehicle, added_by: userId });
    }

    async getListVehicles(body = {}) {
        const { search, vehicle_type, added_by, sort_by, sort_by_price, page, limit } = body;

        const filter = {};

        if (search && String(search).trim()) {
            const regex = new RegExp(String(search).trim(), 'i');
            filter.$or = SEARCH_FIELDS.map((field) => ({ [field]: regex }));
        }

        if (vehicle_type) filter.vehicle_type = vehicle_type;
        if (added_by) filter.added_by = added_by;

        const parsedSortBy = BaseService.parseSortDirection(sort_by);
        const parsedSortByPrice = BaseService.parseSortDirection(sort_by_price);

        const sort = {
            createdAt: parsedSortBy !== null ? parsedSortBy : -1,
        };

        if (parsedSortByPrice !== null) {
            sort.vehicle_hire_rate_in_figures = parsedSortByPrice;
        }

        const pagination = BaseService.parsePagination({ page, limit });

        return BaseService.findPaginated(vehicleModel, filter, sort, pagination);
    }

    async getVehicleById(vehicleId) {
        return vehicleModel.findById(vehicleId);
    }

    async deleteVehicleById(vehicleId) {
        return vehicleModel.findByIdAndDelete(vehicleId);
    }
}

module.exports = new VehicleService();
