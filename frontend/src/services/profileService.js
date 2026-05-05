import apiClient from './apiClient';
import { mapBackendRole } from './authService';
import userLocationService from './userLocationService';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('smartrent_user') || 'null');
  } catch {
    return null;
  }
};

const persistStoredUser = (nextUser) => {
  if (!nextUser) {
    return;
  }

  const currentUser = readStoredUser();
  localStorage.setItem(
    'smartrent_user',
    JSON.stringify({
      ...(currentUser || {}),
      ...nextUser,
    })
  );
};

export const mapProfileUser = (user = {}) => ({
  id: user._id || user.id || '',
  _id: user._id || user.id || '',
  name: user.name || user.full_name || '',
  email: user.email || '',
  role: mapBackendRole(user.role || user.backendRole || ''),
  backendRole: user.backendRole || user.role || '',
  phone: user.phone || '',
  address: user.userLocation?.address || user.address || '',
  age: user.age ?? '',
  showroom_status: user.showroom_status || '',
  business_name: user.business_name || '',
  createdAt: user.createdAt || '',
  updatedAt: user.updatedAt || '',
  userLocation: user.userLocation || null,
});

const mergeProfileWithLocation = (user, userLocation) => mapProfileUser({
  ...user,
  address: userLocation?.address || user?.address || '',
  userLocation,
});

export const profileService = {
  async getProfileById(userId) {
    if (!userId) {
      return null;
    }

    try {
      const [profileRes, userLocation] = await Promise.all([
        apiClient.get(`/api/profile/getProfileById/${userId}`),
        userLocationService.getByUserId(userId),
      ]);

      const mappedProfile = mergeProfileWithLocation(profileRes.data?.data || profileRes.data, userLocation);
      const storedUser = readStoredUser();
      const storedUserId = storedUser?._id || storedUser?.id || '';

      if (storedUserId && storedUserId === userId) {
        persistStoredUser(mappedProfile);
      }

      return mappedProfile;
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      if (status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getCurrentProfile() {
    const storedUser = readStoredUser();
    const userId = storedUser?._id || storedUser?.id || '';

    if (!userId) {
      return null;
    }

    return this.getProfileById(userId);
  },

  async updateProfile(userId, payload = {}) {
    const storedUser = readStoredUser();
    const storedUserId = storedUser?._id || storedUser?.id || '';

    if (userId && storedUserId && userId !== storedUserId) {
      throw new Error('Backend hien tai chi ho tro cap nhat ho so cua tai khoan dang dang nhap.');
    }

    const body = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
      body.name = payload.name;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
      body.phone = payload.phone;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'address')) {
      body.address = payload.address;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'age')) {
      body.age = payload.age;
    }

    const res = await apiClient.put(`/api/profile/updateProfile/${userId}`, body);
    const updatedUser = res.data?.data || res.data;
    const hasAddressField = Object.prototype.hasOwnProperty.call(payload, 'address');

    let userLocation = null;
    if (hasAddressField) {
      const latitude = payload.latitude ?? payload.userLocation?.latitude ?? payload.location?.latitude;
      const longitude = payload.longitude ?? payload.userLocation?.longitude ?? payload.location?.longitude;
      const plusCode = payload.plus_code ?? payload.plusCode ?? payload.userLocation?.plusCode ?? payload.location?.plusCode;
      const normalizedLatitude = Number(latitude);
      const normalizedLongitude = Number(longitude);
      const hasCoordinates =
        Number.isFinite(normalizedLatitude) && Number.isFinite(normalizedLongitude);
      const trimmedAddress = String(payload.address || '').trim();

      if (!trimmedAddress) {
        await userLocationService.remove(userId);
      } else {
        userLocation = await userLocationService.upsert(userId, {
          address: trimmedAddress,
          latitude: hasCoordinates ? normalizedLatitude : null,
          longitude: hasCoordinates ? normalizedLongitude : null,
          plusCode,
        });
      }
    } else {
      userLocation = await userLocationService.getByUserId(userId);
    }

    const mappedProfile = mergeProfileWithLocation(updatedUser, userLocation);
    persistStoredUser(mappedProfile);
    return mappedProfile;
  },

  mapProfileUser,
};

export default profileService;
