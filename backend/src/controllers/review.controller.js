const reviewService = require("../services/review.service");

class ReviewController {
    async createReview(req, res, next) {
        try {
            const userId = req.user.userId;
            const result = await reviewService.createReview(req.body, userId);
            return res.status(201).json({ message: "Review created successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async updateReview(req, res, next) {
        try {
            const userId = req.user.userId;
            const result = await reviewService.updateReview(req.body, userId);
            return res.status(200).json({ message: "Review updated successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getReviewsByVehicleId(req, res, next) {
        try {
            const vehicleId = req.body.vehicle_id;
            const result = await reviewService.getReviewsByVehicleId(vehicleId, req.body);
            return res.status(200).json({ message: "Reviews received successfully", ...result });
        } catch (error) {
            next(error);
        }
    }

    async getBatchSummary(req, res, next) {
        try {
            const { vehicle_ids } = req.body;
            if (!Array.isArray(vehicle_ids) || vehicle_ids.length === 0) {
                return res.status(400).json({ message: "vehicle_ids phải là mảng không rỗng" });
            }
            const data = await reviewService.getBatchSummary(vehicle_ids);
            return res.status(200).json({ message: "Lấy batch summary thành công", data });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ReviewController();
