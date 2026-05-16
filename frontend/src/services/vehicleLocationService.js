import apiClient from './apiClient';

const toNumberOrNull = (value) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
};

const normalizeVehicleLocation = (location = {}) => ({
  id: location._id || location.id || '',
  _id: location._id || location.id || '',
  vehicleId:
    (typeof location.vehicle === 'object' ? location.vehicle?._id || location.vehicle?.id : location.vehicle)
    || location.vehicleId
    || '',
  address: location.address || '',
  latitude: toNumberOrNull(location.latitude),
  longitude: toNumberOrNull(location.longitude),
  plusCode: location.plus_code || location.plusCode || '',
  createdAt: location.createdAt || '',
  updatedAt: location.updatedAt || '',
});

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
    return normalizeVehicleLocation(res.data.data);
  },

  /**
   * Get location info for a vehicle (requires auth).
   * Returns: { address, latitude, longitude, plus_code, vehicle } or null
   */
  async getByVehicleId(vehicleId) {
    try {
      const res = await apiClient.get(
        `/api/vehicle_location/getVehicleLocationByVehicleId/${vehicleId}`
      );
      return normalizeVehicleLocation(res.data.data);
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      if (status === 404) {
        return null;
      }
      throw error;
    }
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
    return normalizeVehicleLocation(res.data.data);
  },
};

export default vehicleLocationService;
