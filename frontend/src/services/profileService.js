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
    }),
  );
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === '') return null;
  const nextValue = Number(normalized);
  return Number.isFinite(nextValue) ? nextValue : null;
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
  public_address: user.public_address || '',
  showroom_representative_name: user.showroom_representative_name || '',
  opening_hours: user.opening_hours || '',
  showroom_license_public: user.showroom_license_public || '',
  policy_text: user.policy_text || '',
  logo_url: user.logo_url || '',
  showroom_description: user.showroom_description || '',
  tax_code: user.tax_code || '',
  createdAt: user.createdAt || '',
  updatedAt: user.updatedAt || '',
  userLocation: user.userLocation || null,
  driver_license_number: user.driver_license_number || '',
  driver_license_fullname: user.driver_license_fullname || '',
  driver_license_dob: user.driver_license_dob || '',
  driver_license_class: user.driver_license_class || '',
  driver_license_expiry: user.driver_license_expiry || '',
  driver_license_front_image: user.driver_license_front_image || '',
  driver_license_back_image: user.driver_license_back_image || '',
  driver_license_status: user.driver_license_status || 'none',
  driver_license_reject_reason: user.driver_license_reject_reason || '',
});

const mergeProfileWithLocation = (user, userLocation) =>
  mapProfileUser({
    ...user,
    address: userLocation?.address || user?.address || '',
    userLocation,
  });

export const profileService = {
  async getProfileById(userId, options = { fetchUserLocation: false }) {
    if (!userId) {
      return null;
    }

    const { fetchUserLocation = false } = options || {};

    try {
      const profileRes = await apiClient.get(`/api/profile/getProfileById/${userId}`);

      let userLocation = null;
      if (fetchUserLocation) {
        try {
          userLocation = await userLocationService.getByUserId(userId);
        } catch (err) {
          const status = err?.status ?? err?.response?.status;
          if (status === 404) {
            userLocation = null;
          } else {
            throw err;
          }
        }
      }

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

    // Do not fetch stored userLocation by default for current profile.
    return this.getProfileById(userId, { fetchUserLocation: false });
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
      const plusCode =
        payload.plus_code ?? payload.plusCode ?? payload.userLocation?.plusCode ?? payload.location?.plusCode;
      const normalizedLatitude = toNumberOrNull(latitude);
      const normalizedLongitude = toNumberOrNull(longitude);
      const hasCoordinates = normalizedLatitude != null && normalizedLongitude != null;
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

  async updateDriverLicense(userId, payload = {}) {
    const res = await apiClient.put(`/api/profile/updateDriverLicense/${userId}`, payload);
    const updatedUser = res.data?.data || res.data;
    const mappedProfile = mapProfileUser(updatedUser);
    persistStoredUser(mappedProfile);
    return mappedProfile;
  },

  /** Renter đăng ký trở thành showroom (kèm chữ ký điện tử) */
  async becomeShowroom({ signature, business_name = '', tax_code = '' }) {
    const res = await apiClient.put('/api/profile/becomeShowroom', { signature, business_name, tax_code });
    const updatedUser = res.data?.data || res.data;
    const mappedProfile = mapProfileUser(updatedUser);
    persistStoredUser(mappedProfile);
    return mappedProfile;
  },

  /** Showroom cập nhật chữ ký điện tử */
  async updateSignature(signature) {
    const res = await apiClient.put('/api/profile/updateSignature', { signature });
    const updatedUser = res.data?.data || res.data;
    const mappedProfile = mapProfileUser(updatedUser);
    persistStoredUser(mappedProfile);
    return mappedProfile;
  },

  mapProfileUser,
};

export default profileService;
