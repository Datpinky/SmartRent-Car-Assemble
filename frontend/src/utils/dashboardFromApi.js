/**
 * Helpers to build dashboard chart/table shapes from API data (no mock files).
 */

export function buildEmptyRevenueMonths(months = 6) {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      month: d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
      revenue: 0,
      payouts: 0,
    });
  }
  return out;
}

/** Legacy showroom charts use đơn vị triệu VND for revenue/profit/target. */
export function buildShowroomMonthlyFromBookings(bookings = [], monthsBack = 12) {
  const keys = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
    });
  }
  const sums = Object.fromEntries(keys.map((k) => [k.key, { revenueVnd: 0, bookings: 0 }]));
  for (const b of bookings) {
    const raw = b.createdAt || b.created_at || b.start_date;
    if (!raw) continue;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!sums[key]) continue;
    sums[key].revenueVnd += Number(b.total_price) || 0;
    sums[key].bookings += 1;
  }
  return keys.map(({ key, month }) => ({
    month,
    revenue: sums[key].revenueVnd / 1_000_000,
    profit: 0,
    target: 0,
    bookings: sums[key].bookings,
  }));
}

export function mapBookingToShowroomTableRow(b) {
  const renter = b.user_id?.name || b.user_id?.email || 'Khách thuê';
  let vehicle = 'Xe';
  if (b.vehicle_id && typeof b.vehicle_id === 'object') {
    const vb = b.vehicle_id.vehicle_brand || b.vehicle_id.brand;
    const vm = b.vehicle_id.vehicle_model || b.vehicle_id.model;
    vehicle = [vb, vm].filter(Boolean).join(' ') || b.vehicle_id.vehicle_name || vehicle;
  }
  const fmt = (dt) => (dt ? new Date(dt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  return {
    id: String(b._id || '').slice(-10) || '—',
    _id: b._id,
    renter,
    vehicle,
    from: fmt(b.start_date),
    to: fmt(b.end_date),
    total: Number(b.total_price) || 0,
    status: b.status,
  };
}

const PIE_FALLBACK = [{ name: 'Chưa có xe', value: 1, color: '#e5e7eb' }];

export function buildVehicleStatusPieFromVehicles(vehicles = []) {
  if (!vehicles.length) return PIE_FALLBACK;
  const counts = {};
  for (const v of vehicles) {
    const label = v.statusLabel || v.status || 'Khác';
    counts[label] = (counts[label] || 0) + 1;
  }
  const palette = ['#00b14f', '#2563eb', '#d97706', '#7c3aed', '#94a3b8', '#059669'];
  return Object.entries(counts).map(([name, value], i) => ({
    name,
    value,
    color: palette[i % palette.length],
  }));
}

export function buildShowroomAlertsFromBookings(bookings = [], limit = 5) {
  return bookings
    .filter((b) => b.status === 'pending')
    .slice(0, limit)
    .map((b, i) => {
      const row = mapBookingToShowroomTableRow(b);
      return {
        id: `al-${b._id || i}`,
        type: 'urgent',
        msg: `Đặt xe chờ xử lý: ${row.renter} — ${row.vehicle}`,
        action: '/showroom/bookings',
        actionLabel: 'Duyệt',
      };
    });
}

export function countUniqueRenters(bookings) {
  const s = new Set();
  for (const b of bookings) {
    const id = b.user_id?._id?.toString() || b.user_id?.toString();
    if (id) s.add(id);
  }
  return s.size;
}
