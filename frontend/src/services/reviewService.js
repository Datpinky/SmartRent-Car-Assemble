import apiClient from './apiClient';

const REVIEW_SUMMARY_TTL_MS = 120_000;
const reviewSummaryCache = new Map();

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
    const id = String(vehicleId || '');
    const cacheKey = `${id}|${limit}`;
    const hit = reviewSummaryCache.get(cacheKey);
    if (hit && Date.now() - hit.at < REVIEW_SUMMARY_TTL_MS) {
      return hit.value;
    }

    const response = await this.getByVehicleId(vehicleId, { page: 1, limit });
    const value = normalizeReviewSummary(response);
    reviewSummaryCache.set(cacheKey, { at: Date.now(), value });
    return value;
  },

  async enrichVehiclesWithSummary(vehicles = [], { limit = 100 } = {}) {
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return [];
    }

    const settled = await Promise.allSettled(
      vehicles.map((vehicle) => this.getSummaryByVehicleId(vehicle.id || vehicle._id, { limit }))
    );

    return vehicles.map((vehicle, index) => {
      const summary = settled[index]?.status === 'fulfilled'
        ? settled[index].value
        : null;

      return {
        ...vehicle,
        rating: summary ? summary.rating : Number(vehicle.rating || 0),
        reviewCount: summary ? summary.reviewCount : Number(vehicle.reviewCount ?? vehicle.trips ?? 0),
      };
    });
  },
};

export default reviewService;
