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
    console.log('🔍 inspectionService.list called with filters:', filters);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    const res = await apiClient.get(`/api/inspections?${params.toString()}`);
    console.log('✅ inspectionService.list response:', {
      itemsCount: res.data?.length || res.data?.data?.length || 0,
      data: res.data,
    });
    return normalizeList(res.data);
  },

  async getById(id) {
    const res = await apiClient.get(`/api/inspections/${id}`);
    return res.data?.data ?? null;
  },

  async create(payload) {
    console.log('📝 inspectionService.create called with payload:', {
      inspection_type: payload?.inspection_type,
      booking_id: payload?.booking_id,
      inspected_by_role: payload?.inspected_by_role,
      positionsCount: payload?.positions?.length,
      payload,
    });
    try {
      const res = await apiClient.post('/api/inspections', payload);
      console.log('✅ inspectionService.create response:', {
        inspectionId: res.data?.data?._id || res.data?._id,
        status: res.status,
        data: res.data,
      });
      return res.data?.data ?? null;
    } catch (err) {
      console.error('❌ inspectionService.create error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      throw err;
    }
  },
};

export default inspectionService;
