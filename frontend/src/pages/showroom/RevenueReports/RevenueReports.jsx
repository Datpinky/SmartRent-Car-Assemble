import { useEffect, useMemo, useState } from 'react';
import { FaChartLine, FaDownload, FaMoneyBillWave, FaSpinner } from 'react-icons/fa';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../../contexts/AuthContext';
import bookingService from '../../../services/bookingService';
import vehicleService from '../../../services/vehicleService';
import { formatVnd } from '../../../utils/currencyFormat';
import { buildShowroomMonthlyFromBookings } from '../../../utils/dashboardFromApi';

const downloadBlob = (filename, text, mime) => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const RevenueReports = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('year');
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const vFilters = user?._id ? { added_by: user._id, limit: 100 } : {};
        const [{ data: vData }, bItems] = await Promise.all([
          vehicleService.getList(vFilters),
          bookingService.getCurrentRoleBookings(), // lọc đúng showroom
        ]);
        if (!cancelled) {
          setVehicles(vData || []);
          setBookings(Array.isArray(bItems) ? bItems : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e.message || 'Không tải được dữ liệu.');
          setVehicles([]);
          setBookings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  const showroomRevenue = useMemo(() => {
    const monthly = buildShowroomMonthlyFromBookings(bookings, 12);
    return monthly.map((m) => ({
      ...m,
      expense: 0,
      profit: 0,
    }));
  }, [bookings]);

  const totalRevenue = showroomRevenue.reduce((s, m) => s + m.revenue, 0);
  const totalProfit = showroomRevenue.reduce((s, m) => s + m.profit, 0);
  const lastMonth = showroomRevenue[showroomRevenue.length - 1];
  const monthRevenueVnd = (lastMonth?.revenue || 0) * 1_000_000;
  const completedTrips = bookings.filter((b) => b.status === 'completed').length;

  const exportCsv = () => {
    const rows = [
      ['month', 'revenue_triệu', 'expense_triệu', 'profit_triệu'].join(','),
      ...showroomRevenue.map((m) => [m.month, m.revenue, m.expense, m.profit].join(',')),
    ];
    downloadBlob(`showroom-revenue-${period}.csv`, rows.join('\n'), 'text/csv;charset=utf-8');
  };

  const exportPdfHint = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Doanh thu &amp; Báo cáo</h1>
          <p className="page-subtitle">Thống kê từ booking và xe showroom (dữ liệu thật từ API).</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn-outline" onClick={exportCsv} title="Tải CSV theo dữ liệu đang hiển thị">
            <FaDownload aria-hidden="true" /> CSV
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={exportPdfHint}
            title="Mở hộp thoại in (xuất PDF qua trình duyệt)"
          >
            <FaDownload aria-hidden="true" /> In / PDF
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            color: '#b91c1c',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: '#6b7280' }}>
          <FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} aria-hidden="true" />
          Đang tải…
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: 'Tổng doanh thu (12 tháng gần đây)',
            value: formatVnd(totalRevenue * 1_000_000),
            color: '#00b14f',
            icon: <FaMoneyBillWave />,
          },
          {
            label: 'Lợi nhuận (chưa tách chi phí)',
            value: formatVnd(totalProfit * 1_000_000),
            color: '#2563eb',
            icon: <FaChartLine />,
          },
          {
            label: 'Doanh thu tháng hiện tại (bucket)',
            value: formatVnd(monthRevenueVnd),
            color: '#d97706',
            icon: <FaMoneyBillWave />,
          },
          { label: 'Chuyến hoàn thành', value: String(completedTrips), color: '#7c3aed', icon: <FaChartLine /> },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: 18,
              border: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                background: `${k.color}20`,
                color: k.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
              }}
            >
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-header">
          <div className="chart-title">Doanh thu – Chi phí – Lợi nhuận (triệu VND)</div>
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
            {['month', 'quarter', 'year'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: period === p ? '#fff' : 'transparent',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: period === p ? '#111827' : '#6b7280',
                  cursor: 'pointer',
                }}
              >
                {p === 'month' ? 'Tháng' : p === 'quarter' ? 'Quý' : 'Năm'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={showroomRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00b14f" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00b14f" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="proGr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v, n) => [formatVnd(v * 1_000_000), n]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem' }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Doanh thu"
              stroke="#00b14f"
              fill="url(#revGr)"
              strokeWidth={2.5}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="profit"
              name="Lợi nhuận"
              stroke="#2563eb"
              fill="url(#proGr)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="Chi phí"
              stroke="#dc2626"
              fill="transparent"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-header">
          <div className="chart-title">Xe showroom (theo số chuyến ghi trên xe)</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Tên xe</th>
                <th>BKS</th>
                <th>Loại</th>
                <th>Số chuyến</th>
                <th>Giá/ngày</th>
              </tr>
            </thead>
            <tbody>
              {[...vehicles]
                .sort((a, b) => (b.trips || 0) - (a.trips || 0))
                .map((v) => (
                  <tr key={v._id || v.id}>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td>
                      <span className="code-badge">{v.plateNumber || '—'}</span>
                    </td>
                    <td>{v.type || v.category || '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{v.trips ?? 0}</td>
                    <td style={{ fontWeight: 700, color: '#00b14f' }}>{formatVnd(v.price || 0)}</td>
                  </tr>
                ))}
              {!loading && vehicles.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: '#9ca3af', padding: 16 }}>
                    Chưa có xe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueReports;
