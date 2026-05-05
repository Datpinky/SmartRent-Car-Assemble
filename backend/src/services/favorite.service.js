const favoriteModel = require("../models/favorite.model");
const vehicleModel = require("../models/vehicle.model");
const throwError = require("../utils/throwError");
const BaseService = require("./base.service");

class FavoriteService {
    async toggleFavorite(vehicleId, userId) {
        const vehicle = await vehicleModel.findById(vehicleId);
        if (!vehicle) throwError("khong tim thay xe ", 404);

        const existing = await favoriteModel.findOne({ user_id: userId, vehicle_id: vehicleId });

        if (existing) {
            await favoriteModel.findByIdAndDelete(existing._id);
            return { favorited: false, vehicle_id: vehicleId };
        }

        await favoriteModel.create({ user_id: userId, vehicle_id: vehicleId });
        return { favorite: true, vehicle_id: vehicleId };
    }

    async getMyFavorites(userId, query = {}) {
        const filter = { user_id: userId };
        const pagination = BaseService.parsePagination(query);
        const sort = { createdAt: -1 };

        const [data, total] = await Promise.all([
            favoriteModel
                .find(filter)
                .sort(sort)
                .skip(pagination.skip)
                .limit(pagination.limit)
                .populate("vehicle_id", "vehicle_name brand model vehicle_hire_rate_in_figures status images")
                .lean(),
            favoriteModel.countDocuments(filter),
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
}

module.exports = new FavoriteService();
