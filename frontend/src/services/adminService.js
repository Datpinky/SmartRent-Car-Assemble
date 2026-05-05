import apiClient from './apiClient';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

const mapRole = (role) => (role === 'user' ? 'renter' : role || 'renter');

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const normalizePaginationPayload = (payload) => ({
  data: normalizeList(payload),
  pagination: payload?.pagination || payload?.data?.pagination || null,
});

const mapUserRow = (user = {}) => ({
  id: user._id || user.id || '',
  _id: user._id || user.id || '',
  name: user.name || user.email || 'Nguoi dung',
  email: user.email || '',
  phone: user.phone || '',
  role: mapRole(user.role),
  backendRole: user.role || '',
  status: user.is_active === false ? 'locked' : 'active',
  bookings: user.bookings || 0,
  createdAt: formatDate(user.createdAt),
  raw: user,
});

const mapShowroomRow = (user = {}) => ({
  id: user._id || user.id || '',
  _id: user._id || user.id || '',
  name: user.business_name || user.name || user.email || 'Showroom',
  contactName: user.name || '',
  email: user.email || '',
  phone: user.phone || '',
  tax_code: user.tax_code || '',
  vehicles: user.vehicles || 0,
  status: user.showroom_status || (user.is_active === false ? 'rejected' : 'approved'),
  createdAt: user.createdAt || '',
  license_document_urls: user.license_document_urls || [],
  raw: user,
});

const mapPaymentRow = (payment = {}) => {
  const booking = payment.booking_id || payment.booking || {};
  const status =
    payment.payment_status === 'successful'
      ? 'paid'
      : payment.payment_status === 'failed'
        ? 'failed'
        : 'processing';

  return {
    id: payment._id || payment.id || '',
    code: payment.transaction_code || payment.stripe_payment_intent_id || `GD${String(payment._id || '').slice(-6).toUpperCase()}`,
    bookingId: booking?._id ? `BK${String(booking._id).slice(-6).toUpperCase()}` : String(payment.booking_id || ''),
    renter: payment.renter?.name || booking?.user_id?.name || '-',
    showroom: payment.showroom?.name || booking?.showroom_id?.name || '-',
    vehicle: booking?.vehicle_id?.vehicle_name || '-',
    amount: Number(payment.amount || booking?.total_price || 0),
    method: payment.payment_method || 'stripe',
    status,
    date: formatDate(payment.paid_at || payment.createdAt),
    raw: payment,
  };
};

const fetchUsers = async (filters = {}) => {
  const res = await apiClient.post('/api/profile/getListProfiles', {
    page: 1,
    limit: 100,
    ...filters,
  });
  return normalizePaginationPayload(res.data);
};

const fetchVehicles = async (filters = {}) => {
  const res = await apiClient.post('/api/vehicles/getListVehicles', {
    page: 1,
    limit: 100,
    ...filters,
  });
  return normalizePaginationPayload(res.data);
};

const fetchBookings = async (filters = {}) => {
  const res = await apiClient.post('/api/booking/getListBookings', {
    page: 1,
    limit: 100,
    sort_by: -1,
    ...filters,
  });
  return normalizePaginationPayload(res.data?.data ?? res.data);
};

const fetchPayments = async (filters = {}) => {
  const res = await apiClient.post('/api/payment/getListPayments', {
    page: 1,
    limit: 100,
    sort_by: -1,
    ...filters,
  });
  return normalizePaginationPayload(res.data?.data ?? res.data);
};

const adminService = {
  async listUsers(search = '') {
    const { data } = await fetchUsers(search ? { search } : {});
    return data.map(mapUserRow);
  },

  async setUserActive(userId, isActive) {
    throw new Error('Backend hien tai chua co API khoa/mo khoa tai khoan.');
  },

  async listShowrooms(status = 'all') {
    const { data } = await fetchUsers({ role: 'showroom' });
    const showrooms = data.map(mapShowroomRow);
    return status === 'all' ? showrooms : showrooms.filter((item) => item.status === status);
  },

  async approveShowroom(id) {
    throw new Error('Backend hien tai chua co API phe duyet showroom.');
  },

  async rejectShowroom(id, reason) {
    throw new Error('Backend hien tai chua co API tu choi showroom.');
  },

  async getDashboardStats() {
    const [usersResult, vehiclesResult, bookingsResult, paymentsResult] = await Promise.allSettled([
      fetchUsers(),
      fetchVehicles(),
      fetchBookings(),
      fetchPayments(),
    ]);

    const users = usersResult.status === 'fulfilled' ? usersResult.value.data : [];
    const vehicles = vehiclesResult.status === 'fulfilled' ? vehiclesResult.value.data : [];
    const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value.data : [];
    const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data : [];
    const paidPayments = payments.filter((payment) => payment.payment_status === 'successful');

    return {
      totalUsers: users.length,
      totalShowrooms: users.filter((user) => user.role === 'showroom').length,
      totalBookings: bookings.length,
      totalRevenue: paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      activeVehicles: vehicles.filter((vehicle) => vehicle.active !== false).length,
      pendingCount: users.filter((user) => user.role === 'showroom' && user.showroom_status === 'pending').length,
      recentBookings: bookings.slice(0, 8).map((booking) => ({
        id: booking._id || booking.id,
        code: `BK${String(booking._id || booking.id || '').slice(-6).toUpperCase()}`,
        renter: booking.user_id?.name || '-',
        vehicle: booking.vehicle_id?.vehicle_name || booking.vehicle_id?.vehicle_brand || '-',
        from: formatDate(booking.start_date),
        to: formatDate(booking.end_date),
        total: Number(booking.total_price || 0),
        status: booking.status || 'pending',
      })),
    };
  },

  async getChartData() {
    const [vehiclesResult, usersResult, paymentsResult, bookingsResult] = await Promise.allSettled([
      fetchVehicles(),
      fetchUsers(),
      fetchPayments(),
      fetchBookings(),
    ]);

    const vehicles = vehiclesResult.status === 'fulfilled' ? vehiclesResult.value.data : [];
    const users = usersResult.status === 'fulfilled' ? usersResult.value.data : [];
    const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data : [];
    const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value.data : [];

    const statusColors = {
      available: '#00b14f',
      waiting_handover: '#2563eb',
      rented: '#f59e0b',
      maintenance: '#dc2626',
      reserved: '#6d28d9',
    };
    const vehicleStatusPie = Object.entries(
      vehicles.reduce((acc, vehicle) => {
        const key = vehicle.status || 'available';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value, color: statusColors[name] || '#6b7280' }));

    const categoryColors = ['#00b14f', '#2563eb', '#f59e0b', '#6d28d9', '#dc2626', '#0891b2'];
    const vehicleCategoryPie = Object.entries(
      vehicles.reduce((acc, vehicle) => {
        const key = vehicle.vehicle_type || vehicle.type || 'Khac';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value], index) => ({ name, value, color: categoryColors[index % categoryColors.length] }));

    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        month: `T${date.getMonth() + 1}`,
      };
    });

    const revenueMonthly = monthKeys.map(({ key, month }) => {
      const revenue = payments
        .filter((payment) => String(payment.createdAt || '').startsWith(key) && payment.payment_status === 'successful')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const bookingCount = bookings.filter((booking) => String(booking.createdAt || '').startsWith(key)).length;
      return { month, revenue: Math.round(revenue / 1_000_000), bookings: bookingCount };
    });

    const userGrowth = monthKeys.map(({ key, month }) => {
      const rows = users.filter((user) => String(user.createdAt || '').startsWith(key));
      return {
        month,
        renters: rows.filter((user) => user.role === 'user').length,
        owners: rows.filter((user) => user.role === 'owner').length,
        showrooms: rows.filter((user) => user.role === 'showroom').length,
      };
    });

    return {
      vehicleStatusPie,
      vehicleCategoryPie,
      revenueMonthly,
      userGrowth,
    };
  },

  async listTransactions(status = 'all') {
    const { data } = await fetchPayments();
    const transactions = data.map(mapPaymentRow);
    return status === 'all' ? transactions : transactions.filter((item) => item.status === status);
  },
};

export default adminService;
