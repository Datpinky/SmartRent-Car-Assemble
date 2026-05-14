import { useCallback, useEffect, useState } from 'react';
import { FaFilter, FaSpinner } from 'react-icons/fa';
import withdrawalService from '../../../services/withdrawalService';
import { fmtDate, fmtVnd } from './adminWithdrawals.helpers';
import ActionModal from './components/ActionModal';
import WithdrawalStatusBadge from './components/WithdrawalStatusBadge';

const AdminWithdrawals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await withdrawalService.listAll({ limit: 100, status: filterStatus || undefined });
      setRequests(data?.items || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };
  const totalPending = requests.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Quản lý rút tiền</h1>
          <p className="page-subtitle">Duyệt và quản lý yêu cầu rút tiền của showroom</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Tổng yêu cầu', val: counts.all, color: '#374151' },
          { label: 'Chờ duyệt', val: counts.pending, color: '#d97706' },
          { label: 'Đã duyệt', val: counts.approved, color: '#059669' },
          { label: 'Từ chối', val: counts.rejected, color: '#dc2626' },
          { label: 'Chờ chuyển khoản', val: fmtVnd(totalPending), color: '#2563eb' },
        ].map((c) => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: c.color }}>{c.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <FaFilter style={{ color: '#6b7280' }} />
        {[
          { value: '', label: 'Tất cả' },
          { value: 'pending', label: 'Chờ duyệt' },
          { value: 'approved', label: 'Đã duyệt' },
          { value: 'rejected', label: 'Từ chối' },
        ].map((f) => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${filterStatus === f.value ? '#2563eb' : '#e5e7eb'}`, background: filterStatus === f.value ? '#eff6ff' : '#fff', color: filterStatus === f.value ? '#2563eb' : '#6b7280', fontWeight: filterStatus === f.value ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer' }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <FaSpinner className="animate-spin" style={{ fontSize: '1.4rem', marginBottom: 10 }} />
          <div>Đang tải...</div>
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#9ca3af', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
          Không có yêu cầu nào.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((req) => (
            <div key={req._id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.05rem' }}>{fmtVnd(req.amount)}</span>
                  <WithdrawalStatusBadge status={req.status} />
                </div>
                <div style={{ fontSize: '0.82rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>🏢 <strong>{req.showroom_id?.business_name || req.showroom_id?.name}</strong> ({req.showroom_id?.email})</span>
                  <span>🏦 {req.bank_name} — <strong>{req.bank_account}</strong> ({req.bank_holder})</span>
                  {req.note && <span style={{ color: '#6b7280' }}>Ghi chú: {req.note}</span>}
                  {req.admin_note && <span style={{ color: req.status === 'rejected' ? '#dc2626' : '#059669', fontWeight: 600 }}>Ghi chú admin: {req.admin_note}</span>}
                  {req.receipt_image && (
                    <a href={req.receipt_image} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#2563eb', fontSize: '0.78rem', fontWeight: 600 }}>
                      🖼 Xem bill chuyển tiền
                    </a>
                  )}
                  <span style={{ color: '#9ca3af', fontSize: '0.76rem' }}>Tạo: {fmtDate(req.createdAt)}{req.processed_at && ` · Xử lý: ${fmtDate(req.processed_at)}`}</span>
                </div>
              </div>
              {req.status === 'pending' && (
                <button onClick={() => setSelected(req)}
                  style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Xử lý
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ActionModal request={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); load(); }} />
      )}
    </div>
  );
};

export default AdminWithdrawals;