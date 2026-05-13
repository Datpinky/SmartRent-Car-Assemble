import { useCallback, useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaClock, FaFilter, FaImage, FaSpinner, FaTimesCircle } from 'react-icons/fa';
import uploadService from '../../../services/uploadService';
import withdrawalService from '../../../services/withdrawalService';

const fmtVnd = (n) => (n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—');
const fmtDate = (d) =>
  d
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(d))
    : '—';

const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', color: '#d97706', bg: '#fffbeb', icon: FaClock },
  approved: { label: 'Đã duyệt', color: '#059669', bg: '#f0fdf4', icon: FaCheckCircle },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fef2f2', icon: FaTimesCircle },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 8,
        padding: '3px 10px',
        fontSize: '0.78rem',
        fontWeight: 700,
      }}
    >
      <Icon style={{ fontSize: '0.75rem' }} /> {cfg.label}
    </span>
  );
};

// Modal xử lý (approve / reject)
const ActionModal = ({ request, onClose, onDone }) => {
  const [action, setAction] = useState('approve');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptUploading, setReceiptUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleReceiptChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptPreview(URL.createObjectURL(file));
    setReceiptUploading(true);
    setError('');
    try {
      const urls = await uploadService.uploadImages([file]);
      setReceiptUrl(urls[0] || '');
    } catch {
      setError('Tải ảnh bill thất bại. Vui lòng thử lại.');
      setReceiptPreview(null);
    } finally {
      setReceiptUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (action === 'reject' && !adminNote.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }
    if (action === 'approve' && receiptUploading) {
      setError('Đang tải ảnh, vui lòng chờ...');
      return;
    }
    setLoading(true);
    try {
      if (action === 'approve') {
        await withdrawalService.approve(request._id, adminNote, receiptUrl);
      } else {
        await withdrawalService.reject(request._id, adminNote);
      }
      onDone();
    } catch (err) {
      setError(err?.response?.data?.message || 'Xử lý thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 480,
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <h3 style={{ fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>Xử lý yêu cầu rút tiền</h3>
        <p style={{ color: '#6b7280', fontSize: '0.84rem', marginBottom: 20 }}>
          Showroom: <strong>{request.showroom_id?.business_name || request.showroom_id?.name}</strong>
        </p>

        {/* Thông tin yêu cầu */}
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 20,
            fontSize: '0.84rem',
            color: '#374151',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div>
            💰 Số tiền: <strong style={{ color: '#2563eb' }}>{fmtVnd(request.amount)}</strong>
          </div>
          <div>
            🏦 Ngân hàng: <strong>{request.bank_name}</strong>
          </div>
          <div>
            📋 Số TK: <strong>{request.bank_account}</strong>
          </div>
          <div>
            👤 Chủ TK: <strong>{request.bank_holder}</strong>
          </div>
          {request.note && <div>📝 Ghi chú: {request.note}</div>}
          <div style={{ color: '#9ca3af' }}>Tạo lúc: {fmtDate(request.createdAt)}</div>
        </div>

        {/* Action selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[
            { value: 'approve', label: '✅ Duyệt & chuyển tiền', color: '#059669', bg: '#f0fdf4', border: '#86efac' },
            { value: 'reject', label: '❌ Từ chối', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAction(opt.value)}
              style={{
                flex: 1,
                padding: '9px 8px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                border: `2px solid ${action === opt.value ? opt.border : '#e5e7eb'}`,
                background: action === opt.value ? opt.bg : '#fff',
                color: action === opt.value ? opt.color : '#6b7280',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#374151', marginBottom: 6 }}>
            {action === 'reject' ? 'Lý do từ chối *' : 'Ghi chú cho showroom (tuỳ chọn)'}
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => {
              setAdminNote(e.target.value);
              setError('');
            }}
            placeholder={
              action === 'reject' ? 'Nhập lý do từ chối...' : 'VD: Đã chuyển khoản lúc 10:00 ngày 10/05/2026'
            }
            rows={3}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: '0.88rem',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#dc2626',
              fontSize: '0.82rem',
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {action === 'approve' && (
          <>
            {/* Receipt image upload */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#374151', marginBottom: 6 }}
              >
                <FaImage style={{ display: 'inline', marginRight: 5, color: '#2563eb' }} />
                Hình bill chuyển tiền (tuỳ chọn)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleReceiptChange}
              />
              {receiptPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={receiptPreview}
                    alt="bill"
                    style={{
                      width: '100%',
                      maxHeight: 180,
                      objectFit: 'contain',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  {receiptUploading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,255,255,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                      }}
                    >
                      <FaSpinner className="animate-spin" style={{ color: '#2563eb', fontSize: '1.4rem' }} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptPreview(null);
                      setReceiptUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1.5px dashed #93c5fd',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  + Thêm hình bill
                </button>
              )}
            </div>
            <div
              style={{
                background: '#fefce8',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: '0.78rem',
                color: '#78350f',
                marginBottom: 14,
              }}
            >
              ⚠️ Hãy đảm bảo bạn <strong>đã chuyển khoản thực tế</strong> cho showroom trước khi bấm Duyệt. Hành động
              này không thể hoàn tác.
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: '1.5px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: action === 'approve' ? '#059669' : '#dc2626',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" /> Đang xử lý...
              </>
            ) : action === 'approve' ? (
              'Xác nhận duyệt'
            ) : (
              'Xác nhận từ chối'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

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

  useEffect(() => {
    load();
  }, [load]);

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

      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Tổng yêu cầu', val: counts.all, color: '#374151' },
          { label: 'Chờ duyệt', val: counts.pending, color: '#d97706' },
          { label: 'Đã duyệt', val: counts.approved, color: '#059669' },
          { label: 'Từ chối', val: counts.rejected, color: '#dc2626' },
          { label: 'Chờ chuyển khoản', val: fmtVnd(totalPending), color: '#2563eb' },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid #f1f5f9',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: c.color }}>{c.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <FaFilter style={{ color: '#6b7280' }} />
        {[
          { value: '', label: 'Tất cả' },
          { value: 'pending', label: 'Chờ duyệt' },
          { value: 'approved', label: 'Đã duyệt' },
          { value: 'rejected', label: 'Từ chối' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: `1.5px solid ${filterStatus === f.value ? '#2563eb' : '#e5e7eb'}`,
              background: filterStatus === f.value ? '#eff6ff' : '#fff',
              color: filterStatus === f.value ? '#2563eb' : '#6b7280',
              fontWeight: filterStatus === f.value ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <FaSpinner className="animate-spin" style={{ fontSize: '1.4rem', marginBottom: 10 }} />
          <div>Đang tải...</div>
        </div>
      ) : requests.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 0',
            color: '#9ca3af',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #f1f5f9',
          }}
        >
          Không có yêu cầu nào.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((req) => (
            <div
              key={req._id}
              style={{
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #f1f5f9',
                padding: '16px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.05rem' }}>{fmtVnd(req.amount)}</span>
                  <StatusBadge status={req.status} />
                </div>
                <div
                  style={{ fontSize: '0.82rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: 3 }}
                >
                  <span>
                    🏢 <strong>{req.showroom_id?.business_name || req.showroom_id?.name}</strong> (
                    {req.showroom_id?.email})
                  </span>
                  <span>
                    🏦 {req.bank_name} — <strong>{req.bank_account}</strong> ({req.bank_holder})
                  </span>
                  {req.note && <span style={{ color: '#6b7280' }}>Ghi chú: {req.note}</span>}
                  {req.admin_note && (
                    <span style={{ color: req.status === 'rejected' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                      Ghi chú admin: {req.admin_note}
                    </span>
                  )}
                  {req.receipt_image && (
                    <a
                      href={req.receipt_image}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        color: '#2563eb',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      <FaImage /> Xem bill chuyển tiền
                    </a>
                  )}
                  <span style={{ color: '#9ca3af', fontSize: '0.76rem' }}>
                    Tạo: {fmtDate(req.createdAt)}
                    {req.processed_at && ` · Xử lý: ${fmtDate(req.processed_at)}`}
                  </span>
                </div>
              </div>

              {req.status === 'pending' && (
                <button
                  onClick={() => setSelected(req)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Xử lý
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ActionModal
          request={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
};

export default AdminWithdrawals;
