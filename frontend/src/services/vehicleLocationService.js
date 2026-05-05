import apiClient from './apiClient';

export const vehicleLocationService = {
  /**
   * Create a location record for a vehicle (requires auth).
   * vehicleId: MongoDB ObjectId string
   * payload: { address?, latitude?, longitude?, plus_code? }
   */
  async create(vehicleId, payload = {}) {
    const res = await apiClient.post(
      `/api/vehicle_location/createVehicleLocation/${vehicleId}`,
      payload
    );
    return res.data.data;
  },

  /**
   * Get location info for a vehicle (requires auth).
   * Returns: { address, latitude, longitude, plus_code, vehicle } or null
   */
  async getByVehicleId(vehicleId) {
    const res = await apiClient.get(
      `/api/vehicle_location/getVehicleLocationByVehicleId/${vehicleId}`
    );
    return res.data.data;
  },

  /**
   * Update/upsert current location for a vehicle (requires auth).
   * payload: { latitude (required), longitude (required), address?, plus_code? }
   */
  async updateLocation(vehicleId, payload) {
    const res = await apiClient.put(
      `/api/vehicle_location/vehicle/${vehicleId}`,
      payload
    );
    return res.data.data;
  },
};

export default vehicleLocationService;
