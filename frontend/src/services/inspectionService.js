import apiClient from './apiClient';

function normalizeList(raw) {
  if (Array.isArray(raw)) return { items: raw, pagination: null };
  if (raw && Array.isArray(raw.data)) {
    return { items: raw.data, pagination: raw.pagination ?? null };
  }
  return { items: [], pagination: null };
}

function resolveId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
}

function flattenPositionDifferences(positions = []) {
  return positions.flatMap((position, index) => {
    const label = position?.position || `Vi tri ${index + 1}`;
    const differences = Array.isArray(position?.differences) ? position.differences : [];

    if (differences.length > 0) {
      return differences.map((difference) => ({
        ...difference,
        area: difference?.area ? `${label} - ${difference.area}` : label,
        description:
          difference?.description || position?.notes || `AI ghi nhan thay doi o ${label.toLowerCase()}.`,
        likely_new_damage: difference?.likely_new_damage ?? position?.damage_detected ?? false,
      }));
    }

    if (!position?.damage_detected && !position?.notes) {
      return [];
    }

    return [
      {
        area: label,
        description: position?.notes || 'AI ghi nhan thay doi o vi tri nay.',
        likely_new_damage: position?.damage_detected ?? false,
      },
    ];
  });
}

function normalizeInspectionAiResult(inspection) {
  const payload = inspection?.ai_payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const directDifferences = Array.isArray(payload.differences) ? payload.differences : [];
  const positionSource = Array.isArray(payload.positions)
    ? payload.positions
    : Array.isArray(inspection?.position_results)
      ? inspection.position_results
      : [];

  return {
    ...payload,
    differences: directDifferences.length > 0 ? directDifferences : flattenPositionDifferences(positionSource),
  };
}

export function mapInspectionToAiInspection(inspection) {
  if (!inspection) {
    return null;
  }

  const positions = Array.isArray(inspection.positions) ? inspection.positions : [];
  const result = normalizeInspectionAiResult(inspection);
  const returnImageUrls = positions.map((position) => position?.after_url).filter(Boolean);
  const hasBeforeImage = positions.some((position) => Boolean(position?.before_url));

  return {
    status: result ? 'ready' : hasBeforeImage && returnImageUrls.length > 0 ? 'pending' : 'none',
    analyzed_at: result ? inspection.updatedAt || inspection.createdAt || null : null,
    pickup_image_url: positions.find((position) => position?.before_url)?.before_url || '',
    return_image_urls: returnImageUrls,
    result,
    inspection_id: resolveId(inspection),
    inspection_type: inspection.inspection_type || '',
    inspected_by_role: inspection.inspected_by_role || '',
  };
}

export function attachLatestAiInspectionToBookings(bookings = [], inspections = []) {
  const latestByBooking = new Map();

  inspections.forEach((inspection) => {
    const bookingId = resolveId(inspection?.booking_id);
    if (!bookingId || inspection?.inspection_type !== 'return') {
      return;
    }

    const mapped = mapInspectionToAiInspection(inspection);
    if (!mapped) {
      return;
    }

    const nextScore = mapped.result ? 1 : mapped.return_image_urls.length > 0 ? 0 : -1;
    const nextTime = new Date(inspection?.updatedAt || inspection?.createdAt || 0).getTime();
    const current = latestByBooking.get(bookingId);

    if (!current || nextScore > current.score || (nextScore === current.score && nextTime > current.time)) {
      latestByBooking.set(bookingId, { score: nextScore, time: nextTime, mapped });
    }
  });

  return (bookings || []).map((booking) => {
    const bookingId = resolveId(booking);
    const matched = latestByBooking.get(bookingId);
    if (!matched) {
      return booking;
    }

    return {
      ...booking,
      ai_inspection: matched.mapped,
    };
  });
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
