import apiClient from './apiClient';

const AUTH_CLEARED_EVENT = 'smartrent:auth-cleared';

/**
 * Maps backend role to frontend role used in routing/UI.
 * Backend:  user | showroom | admin
 * Frontend: renter (=user) | showroom | admin
 */
export const mapBackendRole = (backendRole) => {
  if (backendRole === 'user') return 'renter';
  return backendRole;
};

const mapFrontendConsumerRoleToBackend = () => {
  return 'user';
};

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('smartrent_user') || 'null');
  } catch {
    return null;
  }
};

export const authService = {
  async login(email, password) {
    const res = await apiClient.post('/api/auth/login', { email, password });
    const payload = res.data?.data;

    if (!payload?.user || !payload?.token) {
      throw new Error('Phan hoi dang nhap khong hop le.');
    }

    const { user, token } = payload;
    const frontendUser = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: mapBackendRole(user.role),
      backendRole: user.role,
      phone: user.phone || '',
      showroom_status: user.showroom_status,
      business_name: user.business_name,
      address: user.userLocation?.address || '',
      tax_code: user.tax_code || '',
      public_address: user.public_address || '',
      opening_hours: user.opening_hours || '',
      policy_text: user.policy_text || '',
      logo_url: user.logo_url || '',
      showroom_description: user.showroom_description || '',
      showroom_representative_name: user.showroom_representative_name || '',
      showroom_license_public: user.showroom_license_public || '',
      license_document_urls: user.license_document_urls || [],
    };

    localStorage.setItem('smartrent_token', token);
    return { user: frontendUser, token };
  },

  async registerConsumer({ name, email, password, phone, account_type = 'renter' }) {
    const body = {
      name,
      email,
      password,
      account_type,
      role: mapFrontendConsumerRoleToBackend(account_type),
    };

    if (phone && String(phone).length === 10) {
      body.phone = phone;
    }

    const res = await apiClient.post('/api/auth/register', body);
    return res.data?.data;
  },

  async registerShowroom(payload) {
    const res = await apiClient.post('/api/auth/register', {
      ...payload,
      role: 'showroom',
    });
    return res.data?.data;
  },

  logout() {
    localStorage.removeItem('smartrent_token');
    localStorage.removeItem('smartrent_user');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
    }
  },

  mapUser(user) {
    if (!user) return null;

    return {
      id: user._id || user.id,
      _id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: mapBackendRole(user.role || user.backendRole),
      backendRole: user.backendRole || user.role,
      phone: user.phone || '',
      showroom_status: user.showroom_status,
      business_name: user.business_name || '',
      address: user.userLocation?.address || '',
      tax_code: user.tax_code || '',
      public_address: user.public_address || '',
      opening_hours: user.opening_hours || '',
      policy_text: user.policy_text || '',
      logo_url: user.logo_url || '',
      showroom_description: user.showroom_description || '',
      showroom_representative_name: user.showroom_representative_name || '',
      showroom_license_public: user.showroom_license_public || '',
      license_document_urls: user.license_document_urls || [],
    };
  },

  async getCurrentUser() {
    const storedUser = readStoredUser();
    if (!storedUser) {
      throw new Error('Khong tim thay thong tin nguoi dung da dang nhap.');
    }
    return this.mapUser(storedUser);
  },

  async getMe() {
    const storedUser = readStoredUser();
    if (!storedUser) {
      throw new Error('Khong tim thay thong tin nguoi dung da dang nhap.');
    }
    return this.mapUser(storedUser);
  },

  async updateProfile(payload) {
    const storedUser = readStoredUser();
    const userId = storedUser?._id || storedUser?.id || '';
    if (!userId) {
      throw new Error('Khong tim thay thong tin nguoi dung da dang nhap.');
    }
    const res = await apiClient.put(`/api/profile/updateProfile/${userId}`, payload);
    return this.mapUser(res.data?.data);
  },

  async updateSignature(signature) {
    const res = await apiClient.put('/api/profile/updateSignature', { signature });
    return this.mapUser(res.data?.data);
  },

  async changePassword() {
    throw new Error('Backend hien tai chua ho tro doi mat khau tu FE.');
  },

  async forgotPassword() {
    throw new Error('Backend hien tai chua ho tro dat lai mat khau tu FE.');
  },

  async listSessions() {
    return [];
  },
};

export default authService;
