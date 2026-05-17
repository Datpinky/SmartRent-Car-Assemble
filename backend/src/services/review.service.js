const mongoose = require('mongoose');
const reviewModel = require('../models/review.model');
const vehicleModel = require('../models/vehicle.model');
const bookingModel = require('../models/booking.model');
const BaseService = require('./base.service');
const throwError = require('../utils/throwError');

class ReviewService {
  async createReview(body, userId) {
    const { booking_id, vehicle_id, rating, comment } = body;

    const vehicle = await vehicleModel.findById(vehicle_id);
    if (!vehicle) throwError('Không tìm thấy xe', 404);

    const booking = await bookingModel.findById(booking_id).lean();
    if (!booking) throwError('Không tìm thấy booking để đánh giá', 404);
    if (booking.user_id.toString() !== userId.toString()) {
      throwError('Bạn không có quyền đánh giá booking này', 403);
    }
    if (booking.vehicle_id.toString() !== vehicle_id.toString()) {
      throwError('Xe đánh giá không khớp với booking', 400);
    }
    if (booking.status !== 'completed') {
      throwError('Chỉ có thể đánh giá sau khi chuyến đi hoàn thành', 400);
    }

    const existing = await reviewModel.findOne({ booking_id, user: userId }).lean();
    if (existing) throwError('Booking này đã được đánh giá', 409);

    return reviewModel.create({
      user: userId,
      vehicle_id,
      booking_id,
      rating: Number(rating),
      comment: (comment || '').trim(),
    });
  }

  async updateReview(body, userId) {
    const { review_id, rating, comment } = body;

    const payload = { rating: Number(rating), comment: (comment || '').trim() };
    const review = await reviewModel.findOneAndUpdate({ _id: review_id, user: userId }, payload, { new: true });

    if (!review) throwError('Không tìm thấy đánh giá để cập nhật', 404);

    return review;
  }

  async getReviewsByVehicleId(vehicleId, body = {}) {
    const vehicle = await vehicleModel.findById(vehicleId);
    if (!vehicle) throwError('Không tìm thấy xe', 404);

    const filter = { vehicle_id: vehicleId };
    const pagination = BaseService.parsePagination(body);
    const sort = { createdAt: -1 };

    const [data, total] = await Promise.all([
      reviewModel
        .find(filter)
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate('user', 'name')
        .populate('booking_id', '_id status start_date end_date')
        .lean(),
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

  async getMyReviewsByVehicleId(vehicleId, userId) {
    const vehicle = await vehicleModel.findById(vehicleId).select('_id').lean();
    if (!vehicle) throwError('Không tìm thấy xe', 404);

    return reviewModel
      .find({ vehicle_id: vehicleId, user: userId })
      .sort({ createdAt: -1 })
      .populate('booking_id', '_id status start_date end_date')
      .lean();
  }

  async getBatchSummary(vehicleIds = []) {
    if (!vehicleIds.length) return {};

    const objectIds = vehicleIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const results = await reviewModel.aggregate([
      { $match: { vehicle_id: { $in: objectIds } } },
      {
        $group: {
          _id: '$vehicle_id',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const summary = {};
    for (const r of results) {
      summary[r._id.toString()] = {
        rating: Math.round(r.avgRating * 10) / 10,
        reviewCount: r.reviewCount,
      };
    }
    return summary;
  }
}

module.exports = new ReviewService();
