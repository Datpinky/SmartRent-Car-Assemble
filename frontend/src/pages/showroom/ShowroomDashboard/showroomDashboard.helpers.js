import { BarChart2, CalendarCheck, DollarSign, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { formatVnd } from '../../../utils/currencyFormat';
import { countUniqueRenters } from '../../../utils/dashboardFromApi';

export const fmtNum = (v) => Number(v).toLocaleString('vi-VN');
export const PERIODS = ['Tháng 3', 'Quý 1', '6 tháng', 'Năm 2026'];
export const PERIOD_SLICES = { 'Tháng 3': 1, 'Quý 1': 3, '6 tháng': 6, 'Năm 2026': 12 };

export const ChartTooltip = ({ active, payload, label }) => {
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

export const SummaryBar = ({ period, monthlySeries, bookingRows, bookings }) => {
  const sliceN = PERIOD_SLICES[period] || 12;
  const sliced = monthlySeries.slice(-sliceN);
  const totalRevenue = sliced.reduce((s, m) => s + m.revenue, 0);
  const totalBookings = bookingRows.length;
  const avgOrder = totalRevenue > 0 && totalBookings > 0 ? Math.round((totalRevenue * 1_000_000) / totalBookings) : 0;
  const newCustomers = countUniqueRenters(bookings || []);

  const kpis = [
    {
      label: 'Doanh thu',
      value: formatVnd(totalRevenue * 1_000_000),
      trend: 0,
      up: true,
      icon: <DollarSign size={14} aria-hidden="true" />,
    },
    {
      label: 'Tổng đặt xe',
      value: fmtNum(totalBookings),
      trend: 0,
      up: true,
      icon: <CalendarCheck size={14} aria-hidden="true" />,
    },
    {
      label: 'Giá trị TB/đơn',
      value: formatVnd(avgOrder),
      trend: 0,
      up: true,
      icon: <BarChart2 size={14} aria-hidden="true" />,
    },
    {
      label: 'Khách (theo đơn)',
      value: fmtNum(newCustomers),
      trend: 0,
      up: true,
      icon: <Users size={14} aria-hidden="true" />,
    },
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
            <span
              className={`inline-flex items-center gap-0.5 text-[0.65rem] font-bold px-1.5 py-px rounded-full ${k.up ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}
            >
              {k.up ? <TrendingUp size={9} aria-hidden="true" /> : <TrendingDown size={9} aria-hidden="true" />}
              <span className="tabular-nums">{Math.abs(k.trend)}%</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
