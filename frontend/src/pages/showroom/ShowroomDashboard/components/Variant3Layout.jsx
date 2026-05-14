import { Activity, AlertTriangle, Bell, Car, CheckCircle, Package, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip, PERIOD_SLICES, PERIODS } from '../showroomDashboard.helpers';

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
  useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);

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
    {
      label: 'Đang thuê',
      value: vehicles.filter((v) => v.status === 'rented' || v.status === 'in_use').length,
      icon: <Activity size={14} aria-hidden="true" />,
      color: '#2563eb',
    },
    {
      label: 'Bảo dưỡng',
      value: vehicles.filter((v) => v.status === 'maintenance').length,
      icon: <Package size={14} aria-hidden="true" />,
      color: '#d97706',
    },
    {
      label: 'Chuyến hoàn thành',
      value: completedTrips,
      icon: <CheckCircle size={14} aria-hidden="true" />,
      color: '#7c3aed',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-hidden">
        <div className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-extrabold shrink-0">
            {(showroom.name || '?').charAt(0)}
          </div>
          <div>
            <p className="font-extrabold text-gray-900">{showroom.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{showroom.address}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                <Star size={11} fill="currentColor" aria-hidden="true" />{' '}
                <span className="tabular-nums">{avgRating}</span>
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

        <div className="p-5 flex flex-col justify-center gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kỳ báo cáo</p>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${period === p ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 flex flex-wrap items-center gap-2">
          {[
            { label: 'Đơn hôm nay', value: String(bookingsTodayCount), bg: 'bg-blue-50 text-blue-700' },
            {
              label: 'Doanh thu (bucket)',
              value: `${sliced[sliced.length - 1]?.revenue ?? 0}M`,
              bg: 'bg-emerald-50 text-emerald-700',
            },
            { label: 'Cần xử lý', value: alerts.length, bg: 'bg-amber-50 text-amber-700' },
            { label: 'Đánh giá TB', value: `${avgRating}★`, bg: 'bg-purple-50 text-purple-700' },
          ].map((k) => (
            <span
              key={k.label}
              className={`inline-flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold ${k.bg}`}
            >
              <span className="text-[1rem] font-extrabold tabular-nums">{k.value}</span>
              <span className="font-medium opacity-70">{k.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-800 mb-4">Doanh thu vs Mục tiêu (triệu VND)</p>
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
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu"
                  stroke="#00b14f"
                  fill="url(#v3RevGrad)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Mục tiêu"
                  stroke="#94a3b8"
                  fill="transparent"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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

        <div className="flex flex-col gap-4">
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
                  {vehicleStatusPie.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
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

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-amber-500" aria-hidden="true" />
              <p className="text-xs font-bold text-gray-800">
                Cần xử lý (<span className="tabular-nums">{alerts.length}</span>)
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {alerts.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Không có thông báo</p>}
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs ${a.type === 'urgent' ? 'bg-red-50 border border-red-100 text-red-800' : 'bg-blue-50 border border-blue-100 text-blue-800'}`}
                >
                  <AlertTriangle size={13} className="shrink-0 mt-px" aria-hidden="true" />
                  <span className="flex-1 leading-snug">{a.msg}</span>
                  <button
                    type="button"
                    onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
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

export default Variant3Layout;
