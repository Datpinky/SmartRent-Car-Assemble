import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  LayoutGrid, List, LayoutTemplate, Download, TrendingUp, TrendingDown,
  Search, AlertTriangle, CheckCircle, Clock, Car, Users,
  DollarSign, CalendarCheck, ArrowRight, Star, Bell, X,
  ChevronDown, BarChart2, Activity, Package,
} from 'lucide-react';
import StatCard from '../../../components/common/StatCard';
import StatusBadge from '../../../components/common/StatusBadge';
import DataTable from '../../../components/common/DataTable';
import { useNavigate } from 'react-router-dom';
import { formatVnd } from '../../../utils/currencyFormat';
import { useAuth } from '../../../contexts/AuthContext';
import vehicleService from '../../../services/vehicleService';
import bookingService from '../../../services/bookingService';
import {
  buildShowroomMonthlyFromBookings,
  mapBookingToShowroomTableRow,
  buildVehicleStatusPieFromVehicles,
  buildShowroomAlertsFromBookings,
  countUniqueRenters,
} from '../../../utils/dashboardFromApi';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtNum = (v) => Number(v).toLocaleString('vi-VN');

const PERIODS = ['Tháng 3', 'Quý 1', '6 tháng', 'Năm 2026'];
const PERIOD_SLICES = { 'Tháng 3': 1, 'Quý 1': 3, '6 tháng': 6, 'Năm 2026': 12 };

// ─── Tooltip chung ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-md px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p) => {
        const isMoney =
          typeof p.value === 'number' &&
          (String(p.dataKey || '').match(/revenue|profit|target|amount|total/i) ||
            String(p.name || '').includes('Doanh') ||
            String(p.name || '').includes('thu'));
        const display = isMoney ? formatVnd(p.value * 1_000_000) : fmtNum(p.value);
        return (
          <p key={p.dataKey} style={{ color: p.color }} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-bold tabular-nums">{display}</span>
          </p>
        );
      })}
    </div>
  );
};

// ─── SummaryBar ────────────────────────────────────────────────────────────────
const SummaryBar = ({ period, monthlySeries, bookingRows, bookings }) => {
  const sliceN = PERIOD_SLICES[period] || 12;
  const sliced = monthlySeries.slice(-sliceN);
  const totalRevenue = sliced.reduce((s, m) => s + m.revenue, 0);
  const totalBookings = bookingRows.length;
  const avgOrder = totalRevenue > 0 && totalBookings > 0 ? Math.round((totalRevenue * 1_000_000) / totalBookings) : 0;
  const newCustomers = countUniqueRenters(bookings || []);

  const kpis = [
    { label: 'Doanh thu', value: formatVnd(totalRevenue * 1_000_000), trend: 0, up: true, icon: <DollarSign size={14} aria-hidden="true" /> },
    { label: 'Tổng đặt xe', value: fmtNum(totalBookings), trend: 0, up: true, icon: <CalendarCheck size={14} aria-hidden="true" /> },
    { label: 'Giá trị TB/đơn', value: formatVnd(avgOrder), trend: 0, up: true, icon: <BarChart2 size={14} aria-hidden="true" /> },
    { label: 'Khách (theo booking)', value: fmtNum(newCustomers), trend: 0, up: true, icon: <Users size={14} aria-hidden="true" /> },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex divide-x divide-gray-100 overflow-hidden">
      {kpis.map((k, i) => (
        <div key={i} className="flex-1 flex items-center gap-3 px-5 py-3.5 min-w-0">
          <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            {k.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium">{k.label}</p>
            <p className="text-[1.1rem] font-extrabold text-gray-900 leading-tight tabular-nums">{k.value}</p>
            <span className={`inline-flex items-center gap-0.5 text-[0.65rem] font-bold px-1.5 py-px rounded-full ${k.up ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
              {k.up ? <TrendingUp size={9} aria-hidden="true" /> : <TrendingDown size={9} aria-hidden="true" />}
              <span className="tabular-nums">{Math.abs(k.trend)}%</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// VARIANT 1 — Overview Grid
// ══════════════════════════════════════════════════════════════════════════════
const Variant1Layout = ({ period, navigate, monthlySeries, vehicles, bookingRows }) => {
  const sliceN = PERIOD_SLICES[period] || 12;
  const sliced = monthlySeries.slice(-sliceN);
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.status === 'rented' || v.status === 'in_use').length;
  const pendingBookings = bookingRows.filter((b) => b.status === 'pending').length;
  const monthRevenue = monthlySeries[monthlySeries.length - 1]?.revenue ?? 0;

  const bookingColumns = [
    {
      key: 'id', label: 'Mã đặt xe',
      render: r => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{r.id}</span>
    },
    { key: 'renter', label: 'Khách thuê', accessor: 'renter' },
    {
      key: 'vehicle', label: 'Xe', accessor: 'vehicle',
      render: r => <span className="max-w-[160px] truncate block text-xs text-gray-700">{r.vehicle}</span>
    },
    { key: 'from', label: 'Nhận xe', accessor: 'from' },
    { key: 'to', label: 'Trả xe', accessor: 'to' },
    {
      key: 'total', label: 'Tổng', accessor: 'total',
      render: r => <span className="font-semibold text-primary tabular-nums">{formatVnd(r.total)}</span>
    },
    { key: 'status', label: 'Trạng thái', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Tổng xe"         value={totalVehicles}  icon={<Car size={18} />}          color="#00b14f" trend={6.7}  trendLabel="so T2" />
        <StatCard title="Đang cho thuê"   value={activeVehicles} icon={<Activity size={18} />}     color="#2563eb" trend={9.1}  trendLabel="so T2" />
        <StatCard title="Booking chờ"     value={pendingBookings} icon={<Clock size={18} />}         color="#d97706" subtext="cần xử lý" />
        <StatCard title="Doanh thu T3"    value={formatVnd(monthRevenue * 1_000_000)} icon={<DollarSign size={18} />} color="#dc2626" trend={14.2} trendLabel="so T2" />
        <StatCard title="Khách (booking)" value={fmtNum(new Set(bookingRows.map((b) => b.renter)).size)} icon={<Users size={18} />} color="#7c3aed" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-800">Doanh thu &amp; Lợi nhuận (triệu VND)</p>
            <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{period}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sliced} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="v1RevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00b14f" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#00b14f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="v1ProfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#00b14f" fill="url(#v1RevGrad)" strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#2563eb" fill="url(#v1ProfGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart bookings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-800 mb-4">Lượt đặt xe</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sliced} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="bookings" name="Lượt đặt" fill="#00b14f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent bookings DataTable */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-800">Đặt xe gần đây</p>
          <button
            type="button"
            onClick={() => navigate('/showroom/bookings')}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Xem tất cả <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
        <DataTable
          columns={bookingColumns}
          data={bookingRows.slice(0, 5)}
          searchable={false}
        />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// VARIANT 2 — Analytics & Funnel
// ══════════════════════════════════════════════════════════════════════════════
const Variant2Layout = ({ period, monthlySeries, vehicles, bookingRows, vehicleStatusPie }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const sliceN = PERIOD_SLICES[period] || 12;
  const sliced = monthlySeries.slice(-sliceN);

  const filteredBookings = useMemo(() => {
    let d = bookingRows;
    if (statusFilter !== 'all') d = d.filter((b) => b.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter((b) => b.renter.toLowerCase().includes(q) || b.vehicle.toLowerCase().includes(q));
    }
    return d;
  }, [search, statusFilter, bookingRows]);

  const FUNNEL = [
    { stage: 'Chưa có dữ liệu phễu', count: 0, pct: 0, abandon: null, color: '#94a3b8' },
  ];

  const topVehicles = [...vehicles]
    .sort((a, b) => (b.trips || 0) - (a.trips || 0))
    .slice(0, 5);
  const maxTrips = topVehicles[0]?.trips || 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-2 flex-1 min-w-[180px]">
          <Search size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm khách thuê hoặc xe…"
            name="search"
            aria-label="Tìm kiếm"
            className="bg-transparent border-none text-sm text-gray-700 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2 border border-gray-200 rounded-full px-3.5 py-2 bg-gray-50 text-sm text-gray-600">
          <ChevronDown size={14} className="text-gray-400" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Lọc trạng thái"
            className="bg-transparent border-none text-sm text-gray-700 cursor-pointer focus:outline-none focus-visible:ring-primary"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Đang chờ</option>
            <option value="active">Đang thuê</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full font-medium tabular-nums">
          {filteredBookings.length} kết quả
        </span>
      </div>

      {/* Main row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-gray-800">Phễu chuyển đổi đặt xe</p>
            <span className="text-[0.65rem] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{period}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {FUNNEL.map((f, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">{f.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 tabular-nums">{fmtNum(f.count)}</span>
                    {f.abandon && (
                      <span className="text-[0.62rem] text-red-400 bg-red-50 px-1.5 py-px rounded-full tabular-nums">-{f.abandon}</span>
                    )}
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${f.pct}%`, background: f.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Phễu marketing cần tích hợp analytics — hiện chỉ hiển thị dữ liệu booking/xe thật ở các tab khác.
          </p>
        </div>

        {/* Area chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-800 mb-4">Xu hướng doanh thu (triệu VND)</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={sliced} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="v2RevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00b14f" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00b14f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#00b14f" fill="url(#v2RevGrad)" strokeWidth={2.5} dot={false} />
              <ReferenceLine y={sliced.length ? sliced.reduce((s, d) => s + d.revenue, 0) / sliced.length : 0} stroke="#94a3b8" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent bookings compact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Đặt xe gần đây</p>
          <div className="flex flex-col gap-2">
            {filteredBookings.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Car size={14} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{b.renter}</p>
                  <p className="text-[0.65rem] text-gray-400 truncate">{b.vehicle}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
            {filteredBookings.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Không có kết quả</p>
            )}
          </div>
        </div>

        {/* Top vehicles by trips */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Top xe theo số chuyến</p>
          <div className="flex flex-col gap-3">
            {topVehicles.map((v, i) => (
              <div key={v.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 truncate max-w-[140px]">
                    <span className="text-gray-400 mr-1 tabular-nums">#{i + 1}</span>{v.name}
                  </span>
                  <span className="font-bold text-gray-900 shrink-0 tabular-nums">{v.trips} chuyến</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(v.trips / maxTrips) * 100}%`, background: i === 0 ? '#00b14f' : i === 1 ? '#2563eb' : '#7c3aed' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle status pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Trạng thái xe</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={vehicleStatusPie}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={3}
              >
                {vehicleStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} xe`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-2">
            {vehicleStatusPie.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="flex-1 text-gray-600">{d.name}</span>
                <span className="font-bold text-gray-900 tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// VARIANT 3 — Executive View
// ══════════════════════════════════════════════════════════════════════════════
const Variant3Layout = ({
  period,
  setPeriod,
  user,
  monthlySeries,
  vehicles,
  vehicleStatusPie,
  bookingRows,
  initialAlerts,
  bookingsTodayCount,
}) => {
  const [alerts, setAlerts] = useState(initialAlerts);
  useEffect(() => { setAlerts(initialAlerts); }, [initialAlerts]);

  const sliceN = PERIOD_SLICES[period] || 12;
  const sliced = monthlySeries.slice(-sliceN);
  const showroom = {
    name: user?.business_name || user?.name || 'Showroom',
    address: user?.address || '—',
    vehicles: vehicles.length,
  };
  const avgRating = vehicles.length
    ? (vehicles.reduce((s, v) => s + (Number(v.rating) || 0), 0) / vehicles.length).toFixed(1)
    : '0.0';
  const completedTrips = bookingRows.filter((b) => b.status === 'completed').length;

  const KPI_RAIL = [
    { label: 'Tổng xe', value: vehicles.length, icon: <Car size={14} aria-hidden="true" />, color: '#00b14f' },
    { label: 'Đang thuê', value: vehicles.filter((v) => v.status === 'rented' || v.status === 'in_use').length, icon: <Activity size={14} aria-hidden="true" />, color: '#2563eb' },
    { label: 'Bảo dưỡng', value: vehicles.filter((v) => v.status === 'maintenance').length, icon: <Package size={14} aria-hidden="true" />, color: '#d97706' },
    { label: 'Booking hoàn thành', value: completedTrips, icon: <CheckCircle size={14} aria-hidden="true" />, color: '#7c3aed' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Top 3-col identity card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-hidden">
        {/* Showroom identity */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-extrabold shrink-0">
            {(showroom.name || '?').charAt(0)}
          </div>
          <div>
            <p className="font-extrabold text-gray-900">{showroom.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{showroom.address}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                <Star size={11} fill="currentColor" aria-hidden="true" /> <span className="tabular-nums">{avgRating}</span>
              </span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400 tabular-nums">{showroom.vehicles} xe</span>
              <span className="text-gray-200">·</span>
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                <CheckCircle size={9} aria-hidden="true" /> Đã xác minh
              </span>
            </div>
          </div>
        </div>

        {/* Period tabs */}
        <div className="p-5 flex flex-col justify-center gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kỳ báo cáo</p>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map(p => (
              <button
                type="button"
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                  period === p
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Quick stat pills */}
        <div className="p-5 flex flex-wrap items-center gap-2">
          {[
            { label: 'Booking hôm nay', value: String(bookingsTodayCount), bg: 'bg-blue-50 text-blue-700' },
            { label: 'Doanh thu (bucket)', value: `${sliced[sliced.length - 1]?.revenue ?? 0}M`, bg: 'bg-emerald-50 text-emerald-700' },
            { label: 'Cần xử lý', value: alerts.length, bg: 'bg-amber-50 text-amber-700' },
            { label: 'Đánh giá TB', value: `${avgRating}★`, bg: 'bg-purple-50 text-purple-700' },
          ].map(k => (
            <span key={k.label} className={`inline-flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold ${k.bg}`}>
              <span className="text-[1rem] font-extrabold tabular-nums">{k.value}</span>
              <span className="font-medium opacity-70">{k.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main content: 2/1 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: stacked charts */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Area + target */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-800">Doanh thu vs Mục tiêu (triệu VND)</p>
              <div className="flex items-center gap-3 text-[0.65rem] text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block w-5 h-0.5 bg-primary rounded" />Thực tế</span>
                <span className="flex items-center gap-1"><span className="inline-block w-5 border-t-2 border-dashed border-gray-400" />Mục tiêu</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={sliced} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="v3RevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00b14f" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00b14f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#00b14f" fill="url(#v3RevGrad)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="target" name="Mục tiêu" stroke="#94a3b8" fill="transparent" strokeWidth={1.5} strokeDasharray="6 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly bookings bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-800 mb-4">Lượt đặt xe theo tháng</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={sliced} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="bookings" name="Lượt đặt" fill="#00b14f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: KPI rail + pie + alerts */}
        <div className="flex flex-col gap-4">
          {/* KPI rail */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Chỉ số xe</p>
            <div className="flex flex-col gap-2">
              {KPI_RAIL.map((k, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: k.color + '18', color: k.color }}
                  >
                    {k.icon}
                  </span>
                  <span className="text-xs text-gray-600 flex-1">{k.label}</span>
                  <span className="text-sm font-extrabold text-gray-900 tabular-nums">{k.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pie + legend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Trạng thái xe</p>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie
                  data={vehicleStatusPie}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                >
                  {vehicleStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} xe`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
              {vehicleStatusPie.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[0.65rem]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-gray-600 truncate">{d.name}</span>
                  <span className="ml-auto font-bold text-gray-900 tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-amber-500" aria-hidden="true" />
              <p className="text-xs font-bold text-gray-800">Cần xử lý (<span className="tabular-nums">{alerts.length}</span>)</p>
            </div>
            <div className="flex flex-col gap-2">
              {alerts.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Không có thông báo</p>
              )}
              {alerts.map(a => (
                <div
                  key={a.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs ${
                    a.type === 'urgent'
                      ? 'bg-red-50 border border-red-100 text-red-800'
                      : 'bg-blue-50 border border-blue-100 text-blue-800'
                  }`}
                >
                  <AlertTriangle size={13} className="shrink-0 mt-px" aria-hidden="true" />
                  <span className="flex-1 leading-snug">{a.msg}</span>
                  <button
                    type="button"
                    onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
                    aria-label="Đóng thông báo"
                    className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ShowroomDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeVariant, setActiveVariant] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState('Tháng 3');
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      setLoadError('');
      try {
        const vFilters = user?._id ? { added_by: user._id, limit: 100 } : {};
        const [{ data: vData }, { items: bItems }] = await Promise.all([
          vehicleService.getList(vFilters),
          bookingService.getListBookings({ limit: 100 }),
        ]);
        if (!cancelled) {
          setVehicles(vData || []);
          setBookings(bItems || []);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.response?.data?.message || e.message || 'Không tải được dữ liệu.');
          setVehicles([]);
          setBookings([]);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?._id]);

  const monthlySeries = useMemo(() => buildShowroomMonthlyFromBookings(bookings, 12), [bookings]);
  const bookingRows = useMemo(() => (bookings || []).map(mapBookingToShowroomTableRow), [bookings]);
  const vehicleStatusPie = useMemo(() => buildVehicleStatusPieFromVehicles(vehicles), [vehicles]);
  const initialAlerts = useMemo(() => buildShowroomAlertsFromBookings(bookings, 8), [bookings]);
  const bookingsTodayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return (bookings || []).filter((b) => {
      const t = new Date(b.createdAt || b.created_at || b.start_date);
      return t >= start && t <= end;
    }).length;
  }, [bookings]);

  const VARIANTS = [
    { id: 1, icon: <LayoutGrid size={15} aria-hidden="true" />,     label: 'Tổng quan' },
    { id: 2, icon: <List size={15} aria-hidden="true" />,           label: 'Phân tích' },
    { id: 3, icon: <LayoutTemplate size={15} aria-hidden="true" />, label: 'Điều hành' },
  ];

  const showroomTitle = user?.business_name || user?.name || 'Showroom';

  return (
    <div className="flex flex-col gap-5 bg-slate-50 min-h-full">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Tổng quan Showroom</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {showroomTitle}
            {dataLoading ? ' · Đang tải…' : ''}
            {loadError ? ` · ${loadError}` : ''}
            &nbsp;·&nbsp; {selectedPeriod}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period select */}
          <div className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-full px-3 py-1.5">
            <ChevronDown size={13} className="text-gray-400" aria-hidden="true" />
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              aria-label="Chọn kỳ"
              className="bg-transparent border-none text-sm text-gray-700 font-medium cursor-pointer pr-1 focus:outline-none focus-visible:ring-primary"
            >
              {PERIODS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* Export */}
          <button
            type="button"
            title="Tải JSON danh sách booking (dữ liệu API)"
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 border border-gray-200 bg-white rounded-full px-4 py-1.5 cursor-pointer hover:border-primary hover:text-primary"
            onClick={() => {
              const blob = new Blob([JSON.stringify((bookings || []).slice(0, 80), null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'showroom-bookings-export.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={14} aria-hidden="true" /> Xuất báo cáo
          </button>

          {/* Variant toggles */}
          <div className="flex items-center border border-gray-200 bg-white rounded-full p-1 gap-0.5">
            {VARIANTS.map(v => (
              <button
                type="button"
                key={v.id}
                onClick={() => setActiveVariant(v.id)}
                title={v.label}
                aria-label={v.label}
                aria-pressed={activeVariant === v.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeVariant === v.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Summary bar (always visible) ───────────────────────────────────── */}
      <SummaryBar
        period={selectedPeriod}
        monthlySeries={monthlySeries}
        bookingRows={bookingRows}
        bookings={bookings}
      />

      {/* ── Variant content ─────────────────────────────────────────────────── */}
      {activeVariant === 1 && (
        <Variant1Layout
          period={selectedPeriod}
          navigate={navigate}
          monthlySeries={monthlySeries}
          vehicles={vehicles}
          bookingRows={bookingRows}
        />
      )}
      {activeVariant === 2 && (
        <Variant2Layout
          period={selectedPeriod}
          monthlySeries={monthlySeries}
          vehicles={vehicles}
          bookingRows={bookingRows}
          vehicleStatusPie={vehicleStatusPie}
        />
      )}
      {activeVariant === 3 && (
        <Variant3Layout
          period={selectedPeriod}
          setPeriod={setSelectedPeriod}
          user={user}
          monthlySeries={monthlySeries}
          vehicles={vehicles}
          vehicleStatusPie={vehicleStatusPie}
          bookingRows={bookingRows}
          initialAlerts={initialAlerts}
          bookingsTodayCount={bookingsTodayCount}
        />
      )}
    </div>
  );
};

export default ShowroomDashboard;
