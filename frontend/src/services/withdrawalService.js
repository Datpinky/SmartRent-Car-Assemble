import apiClient from './apiClient';

const withdrawalService = {
  /** Showroom: xem số dư khả dụng */
  async getBalance() {
    const res = await apiClient.get('/api/withdrawals/my/balance');
    return res.data?.data;
  },

  /** Showroom: tạo yêu cầu rút tiền */
  async createRequest({ amount, bank_name, bank_account, bank_holder, note }) {
    const res = await apiClient.post('/api/withdrawals', { amount, bank_name, bank_account, bank_holder, note });
    return res.data?.data;
  },

  /** Showroom: lịch sử yêu cầu của mình */
  async listMy({ page = 1, limit = 10 } = {}) {
    const res = await apiClient.get('/api/withdrawals/my', { params: { page, limit } });
    return res.data;
  },

  /** Admin: tất cả yêu cầu */
  async listAll({ page = 1, limit = 20, status } = {}) {
    const params = { page, limit };
    if (status) params.status = status;
    const res = await apiClient.get('/api/withdrawals/admin', { params });
    return res.data;
  },

  /** Admin: duyệt yêu cầu */
  async approve(id, admin_note = '', receipt_image = '') {
    const res = await apiClient.put(`/api/withdrawals/${id}/approve`, { admin_note, receipt_image });
    return res.data?.data;
  },

  /** Admin: từ chối yêu cầu (bắt buộc có admin_note) */
  async reject(id, admin_note) {
    const res = await apiClient.put(`/api/withdrawals/${id}/reject`, { admin_note });
    return res.data?.data;
  },
};

export default withdrawalService;
