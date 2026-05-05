function normalizeList(raw) {
  if (Array.isArray(raw)) return { items: raw, pagination: null };
  if (raw && Array.isArray(raw.data)) {
    return { items: raw.data, pagination: raw.pagination ?? null };
  }
  return { items: [], pagination: null };
}

const contractService = {
  async list(filters = {}) {
    return normalizeList([]);
  },

  async getById(contractId) {
    return null;
  },

  async create(payload) {
    throw new Error('Backend hien tai chua ho tro tao hop dong truc tiep tu FE.');
  },
};

export default contractService;
