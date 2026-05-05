const reviewModel = require("../models/review.model");
const vehicleModel = require("../models/vehicle.model");
const BaseService = require("./base.service");
const throwError = require("../utils/throwError");

class ReviewService {
    async createReview(body, userId) {
        const { vehicle_id, rating, comment } = body;

        const vehicle = await vehicleModel.findById(vehicle_id);
        if (!vehicle) throwError("Không tìm thấy xe", 404);

        const payload = { rating: Number(rating), comment: (comment || "").trim() };
        return reviewModel.create({
            user: userId,
            vehicle_id,
            ...payload,
        });
    }

    async updateReview(body, userId) {
        const { review_id, rating, comment } = body;

        const payload = { rating: Number(rating), comment: (comment || "").trim() };
        const review = await reviewModel.findOneAndUpdate(
            { _id: review_id, user: userId },
            payload,
            { new: true }
        );

        if (!review) throwError("Không tìm thấy đánh giá để cập nhật", 404);

        return review;
    }

    async getReviewsByVehicleId(vehicleId, body = {}) {
        const vehicle = await vehicleModel.findById(vehicleId);
        if (!vehicle) throwError("Không tìm thấy xe", 404);

        const filter = { vehicle_id: vehicleId };
        const pagination = BaseService.parsePagination(body);
        const sort = { createdAt: -1 };

        const [data, total] = await Promise.all([
            reviewModel.find(filter).sort(sort).skip(pagination.skip).limit(pagination.limit).populate("user", "name").lean(),
            reviewModel.countDocuments(filter),
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

module.exports = new ReviewService();
