import apiClient from './apiClient';

export const favoriteService = {
  /**
   * Toggle favorite status for a vehicle.
   * vehicleId: MongoDB ObjectId string
   * Returns: { favorited: boolean, vehicle_id: string }
   */
  async toggle(vehicleId) {
    const res = await apiClient.post('/api/favorites/toggle', { vehicle_id: vehicleId });
    return res.data.data;
  },

  /**
   * Get paginated list of current user's favorites.
   * Returns: { data: Favorite[], pagination }
   * Each item: { _id, user_id, vehicle_id: { vehicle_name, brand, model, ... } }
   */
  async getMyFavorites({ page = 1, limit = 20 } = {}) {
    const res = await apiClient.post('/api/favorites/my-favorites', { page, limit });
    return res.data;
  },
};

export default favoriteService;
