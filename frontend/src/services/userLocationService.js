import apiClient from './apiClient';

const toNumberOrNull = (value) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
};

const normalizeLocation = (location = {}) => ({
  id: location._id || location.id || '',
  _id: location._id || location.id || '',
  userId:
    (typeof location.user === 'object' ? location.user?._id || location.user?.id : location.user)
    || location.userId
    || '',
  address: location.address || '',
  latitude: toNumberOrNull(location.latitude),
  longitude: toNumberOrNull(location.longitude),
  plusCode: location.plus_code || location.plusCode || '',
  createdAt: location.createdAt || '',
  updatedAt: location.updatedAt || '',
});

const buildPayload = (payload = {}) => {
  const latitude = payload.latitude ?? payload.lat;
  const longitude = payload.longitude ?? payload.lng;
  const normalizedLatitude = toNumberOrNull(latitude);
  const normalizedLongitude = toNumberOrNull(longitude);

  return {
    address: String(payload.address || '').trim(),
    latitude: normalizedLatitude != null ? String(normalizedLatitude) : null,
    longitude: normalizedLongitude != null ? String(normalizedLongitude) : null,
    plus_code: String(payload.plus_code || payload.plusCode || '').trim() || null,
  };
};

export const userLocationService = {
  isSupported() {
    return true;
  },

  async getByUserId(userId) {
    if (!userId) {
      return null;
    }

    try {
      const res = await apiClient.get(`/api/user_location/getUserLocationByUserId/${userId}`);
      return normalizeLocation(res.data?.data || res.data);
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      if (status === 404) {
        return null;
      }
      throw error;
    }
  },

  async create(userId, payload = {}) {
    const res = await apiClient.post(
      `/api/user_location/createUserLocation/${userId}`,
      buildPayload(payload)
    );
    return normalizeLocation(res.data?.data || res.data);
  },

  async update(userId, payload = {}) {
    try {
      const res = await apiClient.put(
        `/api/user_location/updateUserLocationByUserId/${userId}`,
        buildPayload(payload)
      );
      return normalizeLocation(res.data?.data || res.data);
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      if (status === 404) {
        return null;
      }
      throw error;
    }
  },

  async upsert(userId, payload = {}) {
    const body = buildPayload(payload);
    if (!userId || !body.address) {
      return null;
    }

    const updated = await this.update(userId, body);
    if (updated) {
      return updated;
    }

    return this.create(userId, body);
  },

  async remove(userId) {
    if (!userId) {
      return null;
    }

    try {
      const res = await apiClient.delete(`/api/user_location/deleteUserLocationByUserId/${userId}`);
      return normalizeLocation(res.data?.data || res.data);
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      if (status === 404) {
        return null;
      }
      throw error;
    }
  },

  normalizeLocation,
};

export default userLocationService;
