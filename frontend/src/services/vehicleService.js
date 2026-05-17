import apiClient from './apiClient';

// --- Mapping helpers -----------------------------------------------------

const FUEL_MAP = {
  petrol: 'Xăng',
  diesel: 'Dầu',
  electric: 'Điện',
  hybrid: 'Hybrid',
  others: 'Khác',
};

const TRANS_MAP = {
  manual: 'Số sàn',
  automatic: 'Số tự động',
  'semi-auto': 'Bán tự động',
};

const STATUS_MAP = {
  available: 'Còn xe',
  waiting_handover: 'Chờ bàn giao',
  rented: 'Đang thuê',
  maintenance: 'Bảo dưỡng',
  reserved: 'Đã đặt',
};

/** Đồng bộ backend `vehicle.validation.js` ALLOWED_AMENITIES */
export const AMENITY_OPTIONS = ['Điều hòa', 'Camera lùi', 'Cảm biến', 'GPS', 'Bluetooth', 'USB', 'Bản đồ', 'Túi khí'];

function mapListerProfile(added) {
  if (!added || typeof added !== 'object') {
    return {
      displayName: '',
      role: null,
      isShowroom: false,
      listingSubtitle: '',
    };
  }
  const role = added.role;
  const isShowroom = role === 'showroom';
  const displayName = isShowroom ? added.business_name || added.name || '' : added.name || '';
  const listingSubtitle = isShowroom
    ? displayName
      ? `Showroom: ${displayName}`
      : ''
    : displayName
      ? `Chủ xe: ${displayName}`
      : '';
  return {
    displayName,
    role,
    isShowroom,
    listingSubtitle,
    businessName: added.business_name || '',
    name: added.name || '',
    publicAddress: added.public_address || '',
    address: added.address || '',
  };
}

/** Bỏ URL ảnh demo/seed không tồn tại (vd. cdn.example.com) để tránh lỗi net::ERR_NAME_NOT_RESOLVED */
export function sanitizeVehicleImageUrl(url) {
  if (url == null || typeof url !== 'string') return '';
  const t = url.trim();
  if (!t) return '';
  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase();
    if (host === 'example.com' || host === 'cdn.example.com' || host.endsWith('.example.com')) {
      return '';
    }
  } catch {
    // Đường dẫn tương đối hoặc không parse được thì giữ nguyên
    return t;
  }
  return t;
}

/**
 * Maps a backend Vehicle document to the shape expected by frontend components.
 * This is the central adapter - update here if either schema changes.
 */
export function mapVehicle(v) {
  const name =
    v.vehicle_name ||
    [v.vehicle_brand || v.brand, v.vehicle_model || v.model].filter(Boolean).join(' ') ||
    'Xe không tên';

  const rawImages = [...(v.vehicle_images_paths || []), ...(v.images || [])].filter(Boolean);
  const images = rawImages.map(sanitizeVehicleImageUrl).filter(Boolean);

  const showroomAddress = String(
    v.added_by && typeof v.added_by === 'object'
      ? v.added_by.public_address || v.added_by.address || ''
      : '',
  ).trim();
  const pickup =
    v.pickup_address != null && String(v.pickup_address).trim() !== '' ? String(v.pickup_address).trim() : '';
  const displayAddress = pickup || v.address || showroomAddress;
  const latRaw = v.pickup_latitude != null ? v.pickup_latitude : v.latitude;
  const lngRaw = v.pickup_longitude != null ? v.pickup_longitude : v.longitude;
  const lat = latRaw !== undefined && latRaw !== null && latRaw !== '' ? Number(latRaw) : null;
  const lng = lngRaw !== undefined && lngRaw !== null && lngRaw !== '' ? Number(lngRaw) : null;

  const lister = mapListerProfile(v.added_by && typeof v.added_by === 'object' ? v.added_by : null);
  const showroomDisplay = v.showroom || lister.displayName || '';

  const amenitiesRaw = v.amenities;
  const amenities = Array.isArray(amenitiesRaw)
    ? amenitiesRaw.filter((a) => typeof a === 'string' && AMENITY_OPTIONS.includes(a))
    : [];

  return {
    // Identifiers (use MongoDB _id as primary)
    _id: v._id,
    id: v._id,

    // Display fields mapped to what CarCard / CarDetail expect
    name,
    brand: v.vehicle_brand || v.brand || '',
    model: v.vehicle_model || v.model || '',
    type: v.vehicle_type || 'Sedan',
    category: v.vehicle_type || 'Sedan',
    fuel: FUEL_MAP[v.fuel_type] || v.fuel_type || 'Xăng',
    transmission: TRANS_MAP[v.transmission] || v.transmission || 'Số tự động',
    seats: v.number_of_seats || 5,

    // Pricing - hiển thị thống nhất VNĐ/ngày (dữ liệu API vẫn có thể có currency khác)
    price: Number(v.vehicle_hire_rate_in_figures) || 0,
    currency: 'VND',
    chargeUnit: 'day',

    // Media
    image: images[0] || '',
    images,

    pickupAddress: displayAddress,
    address: displayAddress,
    location: displayAddress || v.location || '',
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,

    listerProfile: lister,
    listingSubtitle: lister.listingSubtitle,

    // Meta
    status: v.status || 'available',
    statusLabel: STATUS_MAP[v.status] || v.status,
    plateNumber: v.vehicle_plate_number || '',
    engineNumber: v.vehicle_engine_number || '',
    vinNumber: v.vehicle_identification_number || '',
    addedBy: v.added_by || null,
    verified: v.verified || null,
    active: v.active !== false,
    companyOwned: v.company_owned || false,

    amenities,

    // UI defaults (enriched when reviews/location data is merged)
    rating: v.rating || 0,
    trips: v.trips || 0,
    showroom: showroomDisplay,
    description: v.description || '',
  };
}

// --- Service methods -----------------------------------------------------

export const vehicleService = {
  /**
   * Fetch paginated list of vehicles.
   * Params: { search, vehicle_type, added_by, sort_by, sort_by_price, page, limit }
   * Returns: { data: Vehicle[], pagination: { total, page, limit, totalPages } }
   */
  async getList(params = {}) {
    const res = await apiClient.post('/api/vehicles/getListVehicles', params);
    const { data, pagination } = res.data;
    return {
      data: (data || []).map(mapVehicle),
      pagination: pagination || { total: 0, page: 1, limit: 20, totalPages: 0 },
    };
  },

  /**
   * Fetch a single vehicle by Mongo _id.
   * Returns mapped Vehicle or null.
   */
  async getById(vehicleId) {
    const res = await apiClient.get(`/api/vehicles/getVehicleById/${vehicleId}`);
    const v = res.data?.data;
    return v ? mapVehicle(v) : null;
  },

  async getByIds(vehicleIds = []) {
    if (!vehicleIds.length) return {};
    const res = await apiClient.post('/api/vehicles/getVehiclesByIds', {
      vehicle_ids: vehicleIds,
    });
    const raw = res.data?.data || {};
    const mapped = {};
    for (const [id, v] of Object.entries(raw)) {
      mapped[String(id)] = v ? mapVehicle(v) : null;
    }
    return mapped;
  },

  /**
   * Create a new vehicle (requires auth).
   * payload: { vehicle_type, vehicle_brand, vehicle_model, vehicle_engine_number,
   *            vehicle_identification_number, vehicle_plate_number, ... }
   */
  async create(payload) {
    const res = await apiClient.post('/api/vehicles/create', payload);
    return mapVehicle(res.data.data);
  },

  /**
   * Update a vehicle (requires auth; only the owner can update).
   * payload fields: vehicle_brand, vehicle_model, vehicle_type, vehicle_plate_number,
   *   number_of_seats, transmission, fuel_type, vehicle_hire_rate_in_figures,
   *   vehicle_images_paths, description, vehicle_engine_number, vehicle_identification_number
   */
  async update(vehicleId, payload) {
    const res = await apiClient.put(`/api/vehicles/updateVehicle/${vehicleId}`, payload);
    return mapVehicle(res.data.data);
  },

  /**
   * Delete a vehicle by id (requires auth; currently no role guard in backend).
   */
  async deleteById(vehicleId) {
    const res = await apiClient.delete(`/api/vehicles/deleteVehicleById/${vehicleId}`);
    return res.data;
  },
};

export default vehicleService;
