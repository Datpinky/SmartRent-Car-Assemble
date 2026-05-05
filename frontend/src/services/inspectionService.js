function normalizeList(raw) {
  if (Array.isArray(raw)) return { items: raw, pagination: null };
  if (raw && Array.isArray(raw.data)) {
    return { items: raw.data, pagination: raw.pagination ?? null };
  }
  return { items: [], pagination: null };
}

const inspectionService = {
  async list(filters = {}) {
    return normalizeList([]);
  },

  async create(payload) {
    return {
      ...payload,
      _id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  },
};

export default inspectionService;
