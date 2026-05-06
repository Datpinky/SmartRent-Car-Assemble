import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FaUsers, FaStore, FaCalendarCheck, FaMoneyBillWave, FaCar, FaExclamationTriangle, FaEye, FaSpinner } from 'react-icons/fa';
import StatCard from '../../../components/common/StatCard';
import StatusBadge from '../../../components/common/StatusBadge';
import adminService from '../../../services/adminService';
import { useNavigate } from 'react-router-dom';
import { formatVnd } from '../../../utils/currencyFormat';

const currentMonthYear = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date());

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#111827' }}>{label}</div>
      {payload.map((p, i) => {
        const isTriệuDoanhThu =
          typeof p.value === 'number' &&
          p.dataKey === 'revenue' &&
          String(p.name || '').toLowerCase().includes('doanh');
        const val = isTriệuDoanhThu ? formatVnd(p.value * 1_000_000) : p.value;
        return <div key={i} style={{ color: p.color }}>{p.name}: {val}</div>;
      })}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('revenue');
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([adminService.getDashboardStats(), adminService.getChartData()])
      .then(([s, c]) => {
        if (!mounted) return;
        setStats(s);
        setCharts(c);
      })
      .catch(() => {
        if (mounted) setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, gap: 10, color: '#6b7280' }}>
        <FaSpinner aria-hidden="true" className="animate-spin" /> Đang tải dữ liệu…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" style={{ padding: 32, textAlign: 'center', color: '#dc2626', background: '#fff', borderRadius: 14, margin: 20 }}>
        {error}
      </div>
    );
  }

  const vehicleStatusPie = charts?.vehicleStatusPie || [];
  const vehicleCategoryPie = charts?.vehicleCategoryPie || [];
  const revenueMonthly = charts?.revenueMonthly || [];
  const userGrowth = charts?.userGrowth || [];
  const recentBookings = stats?.recentBookings || [];

  return (
    <div className="admin-dash">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan hệ thống</h1>
          <p className="page-subtitle">Chào mừng trở lại! Đây là tóm tắt hoạt động hệ thống SmartRent Car.</p>
        </div>
        <div className="page-header-date">{currentMonthYear}</div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard title="Tổng người dùng"    value={stats?.totalUsers?.toLocaleString() ?? '—'}   icon={<FaUsers />}         color="#6d28d9" />
        <StatCard title="Tổng Showroom"       value={stats?.totalShowrooms?.toLocaleString() ?? '—'} icon={<FaStore />}        color="#0891b2" />
        <StatCard title="Tổng lượt đặt xe"   value={stats?.totalBookings?.toLocaleString() ?? '—'}  icon={<FaCalendarCheck />} color="#00b14f" />
        <StatCard title="Doanh thu hệ thống"  value={formatVnd(stats?.totalRevenue ?? 0)}                  icon={<FaMoneyBillWave />} color="#d97706" />
        <StatCard title="Xe đang hoạt động"  value={stats?.activeVehicles?.toLocaleString() ?? '—'} icon={<FaCar />}           color="#dc2626" />
        <StatCard title="Chờ duyệt"          value={stats?.pendingCount?.toLocaleString() ?? '—'}   icon={<FaExclamationTriangle />} color="#f59e0b" subtext="showroom chờ duyệt" />
      </div>

      {/* Charts row */}
      <div className="charts-grid">
        {/* Revenue Chart */}
        <div className="chart-card wide">
          <div className="chart-header">
            <div className="chart-title">Doanh thu & lượt đặt xe theo tháng</div>
            <div className="chart-tabs">
              {['revenue', 'bookings'].map(t => (
                <button key={t} type="button" className={activeTab === t ? 'active' : ''} aria-pressed={activeTab === t} onClick={() => setActiveTab(t)}>
                  {t === 'revenue' ? 'Doanh thu' : 'Lượt đặt'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueMonthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00b14f" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00b14f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {activeTab === 'revenue'
                ? <Area type="monotone" dataKey="revenue" name="Doanh thu (triệu VND)" stroke="#00b14f" fill="url(#colorRev)" strokeWidth={2.5} dot={false} />
                : <Area type="monotone" dataKey="bookings" name="Lượt đặt" stroke="#6d28d9" fill="#e0e7ff" strokeWidth={2.5} dot={false} />
              }
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle Status Pie */}
        <div className="chart-card">
          <div className="chart-header"><div className="chart-title">Trạng thái xe</div></div>
          {vehicleStatusPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={vehicleStatusPie} dataKey="value" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                    {vehicleStatusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value + ' xe', name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {vehicleStatusPie.map(d => (
                  <div key={d.name} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: d.color }} />
                    <span>{d.name}</span>
                    <span className="pie-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: '0.85rem' }}>Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* User Growth */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <div className="chart-header"><div className="chart-title">Tăng trưởng người dùng (6 tháng gần nhất)</div></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={userGrowth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem' }} />
            <Bar dataKey="renters"   name="Khách thuê" fill="#00b14f" radius={[4,4,0,0]} />
            <Bar dataKey="consignedVehicles"    name="Xe ký gửi"     fill="#0891b2" radius={[4,4,0,0]} />
            <Bar dataKey="showrooms" name="Showroom"   fill="#6d28d9" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Phân loại xe (trước đây ở trang Báo cáo — gộp vào Tổng quan) */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <div className="chart-header"><div className="chart-title">Phân loại xe (theo loại)</div></div>
        {vehicleCategoryPie.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={vehicleCategoryPie} dataKey="value" cx="50%" cy="50%" outerRadius={88} paddingAngle={3}>
                  {vehicleCategoryPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [value + ' xe', name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {vehicleCategoryPie.map(d => (
                <div key={d.name} className="pie-legend-item">
                  <span className="pie-dot" style={{ background: d.color }} />
                  <span>{d.name}</span>
                  <span className="pie-val">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: '0.85rem' }}>Chưa có dữ liệu</div>
        )}
      </div>

      {/* Recent bookings */}
      <div className="section-card" style={{ marginTop: 20 }}>
        <div className="section-header">
          <div className="section-title">Đặt xe gần đây</div>
          <button type="button" className="btn-link" onClick={() => navigate('/admin/transactions')}>Xem tất cả <FaEye aria-hidden="true" /></button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {recentBookings.length > 0 ? (
            <table className="simple-table">
              <thead><tr><th>Mã</th><th>Khách thuê</th><th>Xe</th><th>Từ</th><th>Đến</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr key={String(b.id)}>
                    <td><span className="code-badge">{b.code}</span></td>
                    <td>{b.renter}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.vehicle}</td>
                    <td>{b.from}</td>
                    <td>{b.to}</td>
                    <td className="tabular-nums" style={{ fontWeight: 600, color: '#00b14f' }}>{formatVnd(b.total)}</td>
                    <td><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: '0.85rem' }}>Chưa có đơn đặt xe nào</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
