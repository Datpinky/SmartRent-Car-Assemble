import apiClient from './apiClient';

function normalizeList(raw) {
  if (Array.isArray(raw)) return { items: raw, pagination: null };
  if (raw && Array.isArray(raw.data)) {
    return { items: raw.data, pagination: raw.pagination ?? null };
  }
  return { items: [], pagination: null };
}

const inspectionService = {
  async list(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    const res = await apiClient.get(`/api/inspections?${params.toString()}`);
    return normalizeList(res.data);
  },

  async getById(id) {
    const res = await apiClient.get(`/api/inspections/${id}`);
    return res.data?.data ?? null;
  },

  async create(payload) {
    const res = await apiClient.post('/api/inspections', payload);
    return res.data?.data ?? null;
  },
};

export default inspectionService;
