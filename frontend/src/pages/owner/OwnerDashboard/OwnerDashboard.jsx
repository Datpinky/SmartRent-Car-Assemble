import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaCar, FaMoneyBillWave, FaRoute, FaChartLine, FaSpinner } from 'react-icons/fa';
import StatCard from '../../../components/common/StatCard';
import StatusBadge from '../../../components/common/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { formatVnd } from '../../../utils/currencyFormat';
import { useAuth } from '../../../contexts/AuthContext';
import vehicleService from '../../../services/vehicleService';
import { buildEmptyOwnerRevenueMonths } from '../../../utils/dashboardFromApi';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        if (!user?._id) {
          setVehicles([]);
          return;
        }
        const { data } = await vehicleService.getList({ added_by: user._id, limit: 100 });
        if (!cancelled) setVehicles(data || []);
      } catch (e) {
        if (!cancelled) {
          setVehicles([]);
          setLoadError(e?.response?.data?.message || e.message || 'Không tải được dữ liệu.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?._id]);

  const chartData = useMemo(() => buildEmptyOwnerRevenueMonths(6), []);

  const rentedCount = vehicles.filter((v) => v.status === 'rented' || v.status === 'in_use').length;
  const tripsTotal = vehicles.reduce((s, v) => s + (Number(v.trips) || 0), 0);

  const currentMonthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Tổng quan chủ xe</h1>
          <p className="page-subtitle">Số liệu theo xe ký gửi của bạn từ hệ thống (không dùng dữ liệu mẫu).</p>
        </div>
        <div className="page-header-date">{currentMonthLabel}</div>
      </div>

      {loadError && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#b91c1c', fontSize: '0.85rem' }}>
          {loadError}
        </div>
      )}

      <div className="stats-grid">
        <StatCard title="Xe đang ký gửi" value={loading ? '…' : vehicles.length} icon={<FaCar aria-hidden="true" />} color="#0891b2" />
        <StatCard title="Xe đang cho thuê" value={loading ? '…' : rentedCount} icon={<FaCar aria-hidden="true" />} color="#00b14f" />
        <StatCard title="Tổng doanh thu" value={formatVnd(0)} icon={<FaMoneyBillWave aria-hidden="true" />} color="#d97706" subtext="Chờ API booking theo chủ xe" />
        <StatCard title="Chờ nhận tiền" value={formatVnd(0)} icon={<FaMoneyBillWave aria-hidden="true" />} color="#7c3aed" subtext="—" />
        <StatCard title="Tổng chuyến (theo xe)" value={loading ? '…' : tripsTotal} icon={<FaRoute aria-hidden="true" />} color="#059669" />
        <StatCard title="Biểu đồ doanh thu" value="0 VNĐ" icon={<FaChartLine aria-hidden="true" />} color="#dc2626" subtext="Cập nhật khi có API tổng hợp" />
      </div>

      <div className="chart-card" style={{ marginTop: 20, marginBottom: 20 }}>
        <div className="chart-header">
          <div className="chart-title">Doanh thu – Chi trả theo tháng (VNĐ)</div>
          <button type="button" className="btn-link" onClick={() => navigate('/owner/revenue')}>Chi tiết →</button>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toLocaleString('vi-VN')} tr`} />
            <Tooltip formatter={(v, n) => [formatVnd(v), n]} />
            <Bar dataKey="revenue" name="Doanh thu" fill="#0891b2" radius={[4, 4, 0, 0]} />
            <Bar dataKey="payouts" name="Đã chi trả" fill="#00b14f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 8, padding: '0 8px' }}>
          Biểu đồ hiển thị các tháng gần đây; giá trị 0 khi chưa có API tổng hợp doanh thu theo chủ xe.
        </p>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Xe của tôi</div>
          <button type="button" className="btn-link" onClick={() => navigate('/owner/vehicles')}>Xem tất cả →</button>
        </div>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280' }}>
            <FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} aria-hidden="true" />
            Đang tải…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {vehicles.length === 0 && (
              <p style={{ padding: '16px 20px', color: '#9ca3af', fontSize: '0.88rem' }}>Chưa có xe ký gửi. Thêm xe tại mục Quản lý xe.</p>
            )}
            {vehicles.map((v) => (
              <div key={v._id || v.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #f9fafb' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaCar style={{ color: '#0891b2', fontSize: '1.1rem' }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{v.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
                    BKS: {v.plateNumber || '—'} · {v.showroom || '—'}
                  </div>
                </div>
                <StatusBadge status={v.status} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#6b7280' }} className="tabular-nums">{formatVnd(0)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>doanh thu</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
