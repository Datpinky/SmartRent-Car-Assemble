import apiClient from './apiClient';
import vehicleService from './vehicleService';
import paymentService from './paymentService';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('smartrent_user') || 'null');
  } catch {
    return null;
  }
};

const resolveId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const NON_BLOCKING_STATUSES = new Set(['cancelled']);
const DAY_MS = 24 * 60 * 60 * 1000;

const parseDateTime = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toStartOfDay = (value) => {
  const parsed = parseDateTime(value);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const toDateKey = (value) => {
  const parsed = toStartOfDay(value);
  if (!parsed) return '';
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
};

const dateRangesOverlapByDay = (leftStart, leftEnd, rightStart, rightEnd) => {
  const aStart = toStartOfDay(leftStart);
  const aEnd = toStartOfDay(leftEnd);
  const bStart = toStartOfDay(rightStart);
  const bEnd = toStartOfDay(rightEnd);

  if (!aStart || !aEnd || !bStart || !bEnd) {
    return false;
  }

  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
};

const expandDateKeys = (startValue, endValue) => {
  const start = toStartOfDay(startValue);
  const end = toStartOfDay(endValue);
  if (!start || !end || end < start) {
    return [];
  }

  const keys = [];
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    keys.push(toDateKey(new Date(time)));
  }
  return keys;
};

const normalizeBookingInterval = (booking) => {
  const start = parseDateTime(booking?.start_date || booking?.startDate);
  const end = parseDateTime(booking?.end_date || booking?.endDate);

  if (!start || !end || end < start) {
    return null;
  }

  return {
    bookingId: resolveId(booking),
    vehicleId: resolveId(booking?.vehicle_id),
    status: booking?.status || '',
    start: start.toISOString(),
    end: end.toISOString(),
    dateKeys: expandDateKeys(start, end),
    raw: booking,
  };
};

const isBlockingBooking = (booking) => !NON_BLOCKING_STATUSES.has(String(booking?.status || '').toLowerCase());

const isDateInIntervals = (date, intervals = []) => {
  const key = toDateKey(date);
  if (!key) return false;
  return (intervals || []).some((interval) =>
    Array.isArray(interval?.dateKeys)
      ? interval.dateKeys.includes(key)
      : dateRangesOverlapByDay(date, date, interval?.start, interval?.end)
  );
};

const rentalWindowOverlapsIntervals = ({ pickupDate, returnDate, intervals = [], excludeBookingId = '' }) => {
  const pickup = parseDateTime(pickupDate);
  const ret = parseDateTime(returnDate);

  if (!pickup || !ret || ret <= pickup) {
    return [];
  }

  return (intervals || []).filter((interval) => {
    if (excludeBookingId && interval.bookingId === excludeBookingId) {
      return false;
    }
    return dateRangesOverlapByDay(pickup, ret, interval.start, interval.end);
  });
};

function normalizeListPayload(raw) {
  if (Array.isArray(raw)) return { items: raw, pagination: null };
  if (raw && Array.isArray(raw.data)) {
    return { items: raw.data, pagination: raw.pagination ?? null };
  }
  return { items: [], pagination: null };
}

const extractBookingList = (payload) => {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
};

const toLegacyVehicleShape = (vehicle) => {
  if (!vehicle) {
    return null;
  }

  return {
    ...(vehicle.raw || {}),
    _id: vehicle._id || vehicle.id,
    id: vehicle.id || vehicle._id,
    vehicle_name: vehicle.name,
    vehicle_images_paths: vehicle.raw?.vehicle_image_path || vehicle.raw?.vehicle_images_paths || vehicle.images || [],
    images: vehicle.images || [],
    address: vehicle.address || '',
    location: vehicle.address || vehicle.location || '',
  };
};

const toLegacyShowroomShape = (showroom) => {
  if (!showroom) {
    return null;
  }

  return {
    _id: showroom._id || showroom.id,
    id: showroom.id || showroom._id,
    name: showroom.name || '',
    email: showroom.email || '',
    phone: showroom.phone || '',
    address: showroom.address || '',
  };
};

const deriveShowroomFromVehicle = (vehicle) => {
  const addedBy = vehicle?.addedBy;
  if (!addedBy || typeof addedBy !== 'object') {
    return null;
  }

  return {
    _id: addedBy._id || '',
    id: addedBy._id || '',
    name: addedBy.business_name || addedBy.name || '',
    email: addedBy.email || '',
    phone: addedBy.phone || '',
    address: vehicle?.address || vehicle?.pickupAddress || '',
  };
};

const normalizeBooking = ({
  booking,
  vehicle = null,
  showroom = null,
  payment = null,
  paymentState = null,
}) => ({
  ...booking,
  id: booking?._id || booking?.id || '',
  _id: booking?._id || booking?.id || '',
  vehicle,
  showroom,
  payment,
  paymentState,
  vehicle_id: toLegacyVehicleShape(vehicle) || booking?.vehicle_id || null,
  showroom_id: toLegacyShowroomShape(showroom) || booking?.showroom_id || null,
});

const buildBookingFallback = (booking) => {
  const showroomId = resolveId(booking?.showroom_id);
  const fallbackShowroom =
    booking?.showroom_id && typeof booking.showroom_id === 'object'
      ? toLegacyShowroomShape(booking.showroom_id)
      : showroomId
        ? { _id: showroomId, id: showroomId, name: 'SmartRent', email: '', phone: '', address: '' }
        : null;

  return normalizeBooking({
    booking,
    vehicle: null,
    showroom: fallbackShowroom,
    payment: booking?.payment || null,
    paymentState: booking?.paymentState || null,
  });
};

const enrichBooking = async (booking) => {
  const vehicleId = resolveId(booking?.vehicle_id);
  const showroomId = resolveId(booking?.showroom_id);
  const bookingId = resolveId(booking);

  const [vehicleResult, paymentResult, paymentStateResult] = await Promise.allSettled([
    vehicleId ? vehicleService.getById(vehicleId) : Promise.resolve(null),
    bookingId ? paymentService.getLatestPaymentByBookingId(bookingId) : Promise.resolve(null),
    bookingId ? paymentService.getPaymentState(bookingId) : Promise.resolve(null),
  ]);

  const vehicle = vehicleResult.status === 'fulfilled' ? vehicleResult.value : null;
  const showroomFromVehicle = deriveShowroomFromVehicle(vehicle);
  const fallbackShowroom =
    booking?.showroom_id && typeof booking.showroom_id === 'object'
      ? toLegacyShowroomShape(booking.showroom_id)
      : showroomId
        ? { _id: showroomId, id: showroomId, name: 'SmartRent', email: '', phone: '', address: '' }
        : null;

  return normalizeBooking({
    booking,
    vehicle,
    showroom: showroomFromVehicle || fallbackShowroom,
    payment: paymentResult.status === 'fulfilled' ? paymentResult.value : booking?.payment || null,
    paymentState: paymentStateResult.status === 'fulfilled' ? paymentStateResult.value : booking?.paymentState || null,
  });
};

const enrichBookingsSafely = async (bookings = []) =>
  Promise.all(
    (bookings || []).map(async (booking) => {
      try {
        return await enrichBooking(booking);
      } catch {
        return buildBookingFallback(booking);
      }
    })
  );

export const bookingService = {
  async createBooking(payload = {}) {
    const currentUser = readStoredUser();
    const vehicleId = resolveId(payload.vehicle_id) || resolveId(payload.vehicleId);
    const showroomId =
      resolveId(payload.showroom_id)
      || resolveId(payload.showroomId)
      || resolveId(payload.showroom)
      || resolveId(payload.car?.addedBy)
      || resolveId(payload.vehicle?.addedBy);

    if (!vehicleId || !showroomId) {
      throw new Error('Thieu vehicle_id hoac showroom_id de tao booking.');
    }

    const deliveryAddress = String(payload.delivery_address || '').trim();
    const note = String(
      payload.delivery_type === 'delivery' && deliveryAddress
        ? `Giao xe: ${deliveryAddress}`
        : payload.note
          || (payload.delivery_type === 'delivery'
            ? `Giao xe: ${deliveryAddress}`.trim()
            : 'Tu den lay')
    ).slice(0, 500);

    const body = {
      user_id: resolveId(payload.user_id) || resolveId(payload.userId) || resolveId(currentUser),
      vehicle_id: vehicleId,
      showroom_id: showroomId,
      start_date: payload.start_date,
      end_date: payload.end_date,
      total_price: Number(payload.total_price || 0),
      note,
    };


    const res = await apiClient.post('/api/booking/createBooking', body);
    return res.data.data;
  },

  async getMyBookings(filters = {}) {
    const bookings = await this.getCurrentRoleBookings();

    return (bookings || []).filter((booking) => {
      if (filters.status && booking?.status !== filters.status) {
        return false;
      }

      if (filters.vehicle_id && resolveId(booking?.vehicle_id) !== resolveId(filters.vehicle_id)) {
        return false;
      }

      if (filters.showroom_id && resolveId(booking?.showroom_id) !== resolveId(filters.showroom_id)) {
        return false;
      }

      return true;
    });
  },

  async getCurrentRoleBookings() {
    const currentUser = readStoredUser();
    const currentUserId = resolveId(currentUser);
    const backendRole = currentUser?.backendRole || currentUser?.role;
    const filters = {
      page: 1,
      limit: 100,
      sort_by: -1,
    };

    if (backendRole === 'showroom') {
      filters.showroom_id = currentUserId;
    } else {
      filters.user_id = currentUserId;
    }

    const res = await apiClient.post('/api/booking/getListBookings', filters);
    return extractBookingList(res.data);
  },

  async getCurrentRoleBookingsDetailed() {
    const bookings = await this.getCurrentRoleBookings();
    return enrichBookingsSafely(bookings);
  },

  async getListBookings(filters = {}) {
    const safeLimit = Math.min(100, Math.max(1, Number(filters.limit || 100)));
    const safePage = Math.max(1, Number(filters.page || 1));
    const res = await apiClient.post('/api/booking/getListBookings', {
      ...filters,
      limit: safeLimit,
      page: safePage,
    });
    return normalizeListPayload(res.data);
  },

  async getMyBookingsDetailed(filters = {}) {
    const bookings = await this.getMyBookings(filters);
    return enrichBookingsSafely(bookings);
  },

  async getBookingById(id) {
    const res = await apiClient.get(`/api/booking/getBookingById/${id}`);
    const booking = res.data.data;
    if (!booking) {
      return null;
    }

    try {
      return await enrichBooking(booking);
    } catch {
      return buildBookingFallback(booking);
    }
  },

  async checkAvailability({ vehicleId, pickupDate, returnDate, excludeBookingId } = {}) {
    if (!vehicleId || !pickupDate || !returnDate) {
      throw new Error('Thieu vehicleId, pickupDate hoac returnDate de kiem tra lich thue.');
    }

    const pickup = parseDateTime(pickupDate);
    const ret = parseDateTime(returnDate);

    if (!pickup || !ret) {
      throw new Error('Thoi gian nhan xe hoac tra xe khong hop le.');
    }

    if (ret <= pickup) {
      return {
        isAvailable: false,
        available: false,
        conflicts: [],
        message: 'Thoi gian tra xe phai sau thoi gian nhan xe.',
      };
    }

    if (toDateKey(pickup) === toDateKey(ret)) {
      return {
        isAvailable: false,
        available: false,
        conflicts: [],
        message: 'Ngay tra xe khong duoc trung voi ngay nhan xe.',
      };
    }

    const { intervals } = await this.getUnavailableDateIntervals(vehicleId);
    const conflicts = rentalWindowOverlapsIntervals({
      pickupDate: pickup,
      returnDate: ret,
      intervals,
      excludeBookingId,
    });

    if (conflicts.length > 0) {
      return {
        isAvailable: false,
        available: false,
        conflicts,
        intervals,
        message: 'Xe da co booking trong ngay ban chon. Vui long chon ngay khac.',
      };
    }

    return {
      isAvailable: true,
      available: true,
      conflicts: [],
      intervals,
    };
  },

  async getUnavailableDateIntervals(vehicleId, { from, to } = {}) {
    if (!vehicleId) {
      throw new Error('Thieu vehicleId de lay lich ban.');
    }

    const vehicleIdText = resolveId(vehicleId);
    const firstPage = await this.getListBookings({
      vehicle_id: vehicleIdText,
      page: 1,
      limit: 100,
      sort_by: -1,
    });

    const totalPages = Math.min(10, Math.max(1, Number(firstPage.pagination?.totalPages || 1)));
    const pageResults =
      totalPages > 1
        ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            this.getListBookings({
              vehicle_id: vehicleIdText,
              page: index + 2,
              limit: 100,
              sort_by: -1,
            }).catch(() => ({ items: [] }))
          )
        )
        : [];

    const bookings = [
      ...(firstPage.items || []),
      ...pageResults.flatMap((page) => page.items || []),
    ];

    const intervals = bookings
      .filter((booking) => resolveId(booking?.vehicle_id) === vehicleIdText)
      .filter(isBlockingBooking)
      .map(normalizeBookingInterval)
      .filter(Boolean)
      .filter((interval) => {
        if (!from && !to) {
          return true;
        }
        return dateRangesOverlapByDay(
          interval.start,
          interval.end,
          from || interval.start,
          to || interval.end
        );
      });

    return { intervals };
  },

  isDateBooked(date, intervals = []) {
    return isDateInIntervals(date, intervals);
  },

  getBookingConflicts({ pickupDate, returnDate, intervals = [], excludeBookingId = '' } = {}) {
    return rentalWindowOverlapsIntervals({ pickupDate, returnDate, intervals, excludeBookingId });
  },

  async cancelBooking(id) {
    const res = await apiClient.patch(`/api/booking/updateBookingStatus/${id}`, { status: 'cancelled' });
    return res.data.data;
  },

  async createBookingAndPaymentSession(payload = {}) {
    const booking = await this.createBooking(payload);
    const bookingId = resolveId(booking);
    const amount = Number(booking?.total_price || payload.total_price || 0);
    const paymentData = await paymentService.createPaymentSession({
      bookingId,
      amount,
    });

    return {
      booking,
      bookingId,
      paymentData,
      clientSecret: paymentData?.client_secret || paymentData?.clientSecret || '',
    };
  },

  async getShowroomBookings(filters = {}) {
    const currentUser = readStoredUser();
    const showroomId = resolveId(filters.showroom_id) || resolveId(currentUser);
    const res = await apiClient.post('/api/booking/getListBookings', {
      page: 1,
      limit: 100,
      sort_by: -1,
      showroom_id: showroomId,
      ...filters,
    });

    return extractBookingList(res.data);
  },

  async updateBookingStatus(id, status) {
    const res = await apiClient.patch(`/api/booking/updateBookingStatus/${id}`, { status });
    return res.data.data;
  },

  async confirmPickup(id) {
    throw new Error('Backend hien chi cho showroom cap nhat buoc ban giao xe. Renter chua the tu xac nhan nhan xe bang status API nay.');
  },

  async requestReturn(id) {
    throw new Error('Backend hien chua ho tro renter gui yeu cau tra xe bang status API rieng. FE chi co the luu bien ban va anh doi chieu tren trinh duyet hien tai.');
  },

  async confirmPickupForRenter(id) {
    return this.confirmPickup(id);
  },

  async requestReturnForRenter(id) {
    return this.requestReturn(id);
  },
};

export default bookingService;


