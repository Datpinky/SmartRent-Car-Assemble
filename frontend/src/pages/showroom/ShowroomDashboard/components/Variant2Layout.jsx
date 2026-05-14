import { ChevronDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatusBadge from '../../../../components/common/StatusBadge';
import { ChartTooltip, PERIOD_SLICES } from '../showroomDashboard.helpers';

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

  const topVehicles = [...vehicles].sort((a, b) => (b.trips || 0) - (a.trips || 0)).slice(0, 5);
  const maxTrips = topVehicles[0]?.trips || 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-2 flex-1 min-w-[180px]">
          <Search size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            onChange={(e) => setStatusFilter(e.target.value)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-gray-800">Phễu chuyển đổi đặt xe</p>
            <span className="text-[0.65rem] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {period}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Phễu marketing cần tích hợp analytics — hiện chỉ hiển thị dữ liệu booking/xe thật ở các tab khác.
          </p>
        </div>

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
              <Area
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke="#00b14f"
                fill="url(#v2RevGrad)"
                strokeWidth={2.5}
                dot={false}
              />
              <ReferenceLine
                y={sliced.length ? sliced.reduce((s, d) => s + d.revenue, 0) / sliced.length : 0}
                stroke="#94a3b8"
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Đặt xe gần đây</p>
          <div className="flex flex-col gap-2">
            {filteredBookings.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">{(b.renter || '?')[0]}</span>
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Top xe theo số chuyến</p>
          <div className="flex flex-col gap-3">
            {topVehicles.map((v, i) => (
              <div key={v.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 truncate max-w-[140px]">
                    <span className="text-gray-400 mr-1 tabular-nums">#{i + 1}</span>
                    {v.name}
                  </span>
                  <span className="font-bold text-gray-900 shrink-0 tabular-nums">{v.trips} chuyến</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(v.trips / maxTrips) * 100}%`,
                      background: i === 0 ? '#00b14f' : i === 1 ? '#2563eb' : '#7c3aed',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

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
                {vehicleStatusPie.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
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

export default Variant2Layout;
