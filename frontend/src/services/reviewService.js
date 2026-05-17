import apiClient from './apiClient';

const normalizeReviewSummary = (response) => {
  const reviews = Array.isArray(response?.data) ? response.data : [];
  const reviewCount = Number(response?.pagination?.total ?? reviews.length ?? 0);
  const rating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / reviews.length
    : 0;

  return {
    rating,
    reviewCount,
  };
};

export const reviewService = {
  /**
   * Get paginated reviews for a vehicle.
   * vehicleId: MongoDB ObjectId string
   * Returns: { data: Review[], pagination }
   */
  async getByVehicleId(vehicleId, { page = 1, limit = 10 } = {}) {
    const res = await apiClient.post('/api/reviews/get-by-vehicle', {
      vehicle_id: vehicleId,
      page,
      limit,
    });
    return res.data;
  },

  /**
   * Get current renter's reviews for a vehicle.
   * Returns: Review[]
   */
  async getMineByVehicleId(vehicleId) {
    const res = await apiClient.post('/api/reviews/my-by-vehicle', {
      vehicle_id: vehicleId,
    });
    return res.data.data || [];
  },

  /**
   * Create a review (requires auth + role user).
   * payload: { booking_id, vehicle_id, rating (1-5), comment? }
   */
  async create(payload) {
    const res = await apiClient.post('/api/reviews/create', payload);
    return res.data.data;
  },

  /**
   * Update own review (requires auth + role user).
   * payload: { review_id, rating (1-5), comment? }
   */
  async update(payload) {
    const res = await apiClient.patch('/api/reviews/update', payload);
    return res.data.data;
  },

  async getSummaryByVehicleId(vehicleId, { limit = 100 } = {}) {
    const response = await this.getByVehicleId(vehicleId, { page: 1, limit });
    return normalizeReviewSummary(response);
  },

  async getBatchSummary(vehicleIds = []) {
    if (!vehicleIds.length) return {};
    const res = await apiClient.post('/api/reviews/batch-summary', { vehicle_ids: vehicleIds });
    return res.data.data || {};
  },

  async enrichVehiclesWithSummary(vehicles = []) {
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return [];
    }

    const ids = vehicles.map((v) => v.id || v._id).filter(Boolean);
    let summaryMap = {};
    try {
      summaryMap = await this.getBatchSummary(ids);
    } catch {
      // nếu batch thất bại, giữ nguyên dữ liệu gốc
    }

    return vehicles.map((vehicle) => {
      const key = vehicle.id || vehicle._id;
      const summary = summaryMap[key] || null;
      return {
        ...vehicle,
        rating: summary ? summary.rating : Number(vehicle.rating || 0),
        reviewCount: summary ? summary.reviewCount : Number(vehicle.reviewCount || 0),
      };
    });
  },
};

export default reviewService;
