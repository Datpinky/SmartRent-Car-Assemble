import apiClient from './apiClient';

function normalizeList(raw) {
  if (Array.isArray(raw)) return { items: raw, pagination: null };
  if (raw && Array.isArray(raw.data)) {
    return { items: raw.data, pagination: raw.pagination ?? null };
  }
  return { items: [], pagination: null };
}

const contractService = {
  /** Lấy hợp đồng theo bookingId (tạo mới nếu chưa có) */
  async getByBookingId(bookingId) {
    const res = await apiClient.get(`/api/contracts/by-booking/${bookingId}`);
    return res.data?.data || res.data;
  },

  /** Renter ký hợp đồng — signature là base64 PNG data URI */
  async signContract(contractId, signature) {
    const res = await apiClient.post(`/api/contracts/sign/${contractId}`, { signature });
    return res.data?.data || res.data;
  },

  /** Danh sách hợp đồng của renter (đang đăng nhập) */
  async listMyContracts({ page = 1, limit = 10 } = {}) {
    const res = await apiClient.get('/api/contracts/my', { params: { page, limit } });
    return normalizeList(res.data);
  },

  /** Danh sách hợp đồng của showroom (đang đăng nhập) */
  async listShowroomContracts({ page = 1, limit = 10 } = {}) {
    const res = await apiClient.get('/api/contracts/showroom', { params: { page, limit } });
    return normalizeList(res.data);
  },

  /** Admin: tất cả hợp đồng */
  async listAll({ page = 1, limit = 20, status } = {}) {
    const params = { page, limit };
    if (status) params.status = status;
    const res = await apiClient.get('/api/contracts/admin', { params });
    return normalizeList(res.data);
  },

  /** Tạo lại PDF cho hợp đồng đã ký (fix PDF cũ bị lỗi font) */
  async regeneratePdf(contractId) {
    const res = await apiClient.post(`/api/contracts/regenerate-pdf/${contractId}`);
    return res.data?.data || res.data;
  },

  /** Backward-compat list — showroom uses this */
  async list(filters = {}) {
    return this.listShowroomContracts(filters);
  },
};

export default contractService;
