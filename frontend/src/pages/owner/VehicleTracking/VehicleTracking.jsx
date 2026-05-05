import React, { useEffect, useState } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import { FaSpinner } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import { useAuth } from '../../../contexts/AuthContext';
import vehicleService from '../../../services/vehicleService';

const VehicleTracking = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
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
          setError(e?.response?.data?.message || e.message || 'Không tải được danh sách xe.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?._id]);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Theo dõi xe</h1>
          <p className="page-subtitle">Trạng thái xe ký gửi từ hệ thống. Lịch sử đặt xe theo từng xe sẽ nối API booking sau.</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#b91c1c', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', padding: 20 }}>
            <FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} aria-hidden="true" />
            Đang tải…
          </div>
        )}
        {!loading && vehicles.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Chưa có xe để hiển thị.</p>
        )}
        {!loading && vehicles.map((v) => (
          <div key={v._id || v.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MdDirectionsCar style={{ fontSize: '1.6rem', color: '#0891b2' }} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>{v.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>
                  BKS: {v.plateNumber || '—'} · {v.showroom || '—'}
                </div>
              </div>
              <StatusBadge status={v.status} />
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Lịch sử hoạt động</div>
              <p style={{ fontSize: '0.82rem', color: '#9ca3af', margin: 0 }}>
                Chưa có dữ liệu lịch sử đặt xe cho xe này (cần API booking lọc theo xe/chủ xe).
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehicleTracking;
