import { Activity, ArrowRight, Car, Clock, DollarSign, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DataTable from '../../../../components/common/DataTable';
import StatCard from '../../../../components/common/StatCard';
import StatusBadge from '../../../../components/common/StatusBadge';
import { formatVnd } from '../../../../utils/currencyFormat';
import { ChartTooltip, fmtNum, PERIOD_SLICES } from '../showroomDashboard.helpers';

const bookingColumns = [
  {
    key: 'id',
    label: 'Mã đặt xe',
    render: (r) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{r.id}</span>,
  },
  { key: 'renter', label: 'Khách thuê', accessor: 'renter' },
  {
    key: 'vehicle',
    label: 'Xe',
    accessor: 'vehicle',
    render: (r) => <span className="max-w-[160px] truncate block text-xs text-gray-700">{r.vehicle}</span>,
  },
  { key: 'from', label: 'Nhận xe', accessor: 'from' },
  { key: 'to', label: 'Trả xe', accessor: 'to' },
  {
    key: 'total',
    label: 'Tổng',
    accessor: 'total',
    render: (r) => <span className="font-semibold text-primary tabular-nums">{formatVnd(r.total)}</span>,
  },
  { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
];

const Variant1Layout = ({ period, navigate, monthlySeries, vehicles, bookingRows }) => {
  const sliceN = PERIOD_SLICES[period] || 12;
  const sliced = monthlySeries.slice(-sliceN);
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.status === 'rented' || v.status === 'in_use').length;
  const pendingBookings = bookingRows.filter((b) => b.status === 'pending').length;
  const monthRevenue = monthlySeries[monthlySeries.length - 1]?.revenue ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Tổng xe"
          value={totalVehicles}
          icon={<Car size={18} />}
          color="#00b14f"
          trend={6.7}
          trendLabel="so T2"
        />
        <StatCard
          title="Đang cho thuê"
          value={activeVehicles}
          icon={<Activity size={18} />}
          color="#2563eb"
          trend={9.1}
          trendLabel="so T2"
        />
        <StatCard
          title="Đơn chờ"
          value={pendingBookings}
          icon={<Clock size={18} />}
          color="#d97706"
          subtext="cần xử lý"
        />
        <StatCard
          title="Doanh thu T3"
          value={formatVnd(monthRevenue * 1_000_000)}
          icon={<DollarSign size={18} />}
          color="#dc2626"
          trend={14.2}
          trendLabel="so T2"
        />
        <StatCard
          title="Khách (đơn)"
          value={fmtNum(new Set(bookingRows.map((b) => b.renter)).size)}
          icon={<Users size={18} />}
          color="#7c3aed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              <Area
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke="#00b14f"
                fill="url(#v1RevGrad)"
                strokeWidth={2.5}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Lợi nhuận"
                stroke="#2563eb"
                fill="url(#v1ProfGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
        <DataTable columns={bookingColumns} data={bookingRows.slice(0, 5)} searchable={false} />
      </div>
    </div>
  );
};

export default Variant1Layout;
