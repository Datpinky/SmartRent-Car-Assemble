import apiClient from './apiClient';

const LOCATION_GET_TTL_MS = 120_000;
const vehicleLocationGetCache = new Map();

const cacheVehicleLocationGet = (vehicleId, data) => {
  vehicleLocationGetCache.set(String(vehicleId || ''), {
    at: Date.now(),
    data,
  });
};

const invalidateVehicleLocationCache = (vehicleId) => {
  vehicleLocationGetCache.delete(String(vehicleId || ''));
};

export const vehicleLocationService = {
  /**
   * Create a location record for a vehicle (requires auth).
   * vehicleId: MongoDB ObjectId string
   * payload: { address?, latitude?, longitude?, plus_code? }
   */
  async create(vehicleId, payload = {}) {
    invalidateVehicleLocationCache(vehicleId);
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
    const key = String(vehicleId || '');
    const hit = vehicleLocationGetCache.get(key);
    if (hit && Date.now() - hit.at < LOCATION_GET_TTL_MS) {
      return hit.data;
    }

    const res = await apiClient.get(
      `/api/vehicle_location/getVehicleLocationByVehicleId/${vehicleId}`
    );
    const data = res.data.data;
    cacheVehicleLocationGet(vehicleId, data);
    return data;
  },

  /**
   * Update/upsert current location for a vehicle (requires auth).
   * payload: { latitude (required), longitude (required), address?, plus_code? }
   */
  async updateLocation(vehicleId, payload) {
    invalidateVehicleLocationCache(vehicleId);
    const res = await apiClient.put(
      `/api/vehicle_location/vehicle/${vehicleId}`,
      payload
    );
    return res.data.data;
  },
};

export default vehicleLocationService;
