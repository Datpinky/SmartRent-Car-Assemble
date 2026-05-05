import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import Modal from '../../../components/common/Modal';
import { FaEye, FaCheckCircle, FaTimesCircle, FaBuilding, FaPhone, FaEnvelope, FaIdCard } from 'react-icons/fa';
import adminService from '../../../services/adminService';

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
};

const ShowroomVerification = () => {
  const [showrooms, setShowrooms] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [viewModal, setViewModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await adminService.listShowrooms(filter);
      setShowrooms(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e.message || 'Không tải được danh sách.');
      setShowrooms([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (row) => {
    setActionError('');
    setSubmitting(true);
    try {
      await adminService.approveShowroom(row.id);
      await load();
      setViewModal(null);
    } catch (e) {
      setActionError(e.message || 'Phê duyệt thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!rejectModal) return;
    setActionError('');
    setSubmitting(true);
    try {
      await adminService.rejectShowroom(rejectModal.id, rejectReason.trim());
      await load();
      setRejectModal(null);
      setRejectReason('');
      setViewModal(null);
    } catch (e) {
      setActionError(e.message || 'Từ chối thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Tên doanh nghiệp',
      accessor: 'name',
      sortable: true,
      width: '26%',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, width: '100%' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4338ca',
              flexShrink: 0,
            }}
          >
            <FaBuilding aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#111827' }}>{row.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'contactName', label: 'Người liên hệ', accessor: 'contactName', sortable: true },
    {
      key: 'tax_code',
      label: 'Mã số thuế',
      accessor: 'tax_code',
      render: (row) => <span style={{ fontSize: '0.8rem' }}>{row.tax_code || '—'}</span>,
    },
    {
      key: 'vehicles',
      label: 'Số xe',
      accessor: 'vehicles',
      sortable: true,
      align: 'center',
    },
    { key: 'status', label: 'Trạng thái', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'createdAt',
      label: 'Ngày đăng ký',
      accessor: 'createdAt',
      sortable: true,
      render: (row) => <span style={{ fontSize: '0.8rem' }}>{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      label: 'Hành động',
      render: (row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn-icon" onClick={() => setViewModal(row)} title="Xem hồ sơ" aria-label="Xem hồ sơ">
            <FaEye />
          </button>
          {row.status === 'pending' && (
            <>
              <button
                type="button"
                className="btn-icon"
                style={{ borderColor: '#059669', color: '#059669' }}
                disabled={submitting}
                onClick={() => approve(row)}
                title="Phê duyệt"
                aria-label="Phê duyệt"
              >
                <FaCheckCircle />
              </button>
              <button
                type="button"
                className="btn-icon danger"
                disabled={submitting}
                onClick={() => setRejectModal(row)}
                title="Từ chối"
                aria-label="Từ chối"
              >
                <FaTimesCircle />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const pending = showrooms.filter((s) => s.status === 'pending').length;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Duyệt tài khoản Showroom</h1>
          <p className="page-subtitle">Xét duyệt đối tác đăng ký qua /partner/register — menu: Xác minh Showroom</p>
        </div>
        {pending > 0 && (
          <div
            style={{
              background: '#fef3c7',
              color: '#d97706',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {pending} hồ sơ chờ duyệt
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: filter === f.value ? '2px solid #00b14f' : '1.5px solid #e5e7eb',
              background: filter === f.value ? '#f0fdf4' : '#fff',
              color: filter === f.value ? '#047857' : '#374151',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem' }}>
          {loadError}
        </div>
      )}
      {actionError && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem' }}>
          {actionError}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải…</div>
      ) : (
        <DataTable
          columns={columns}
          data={showrooms}
          searchPlaceholder="Tìm theo tên, email, MST…"
          searchFields={['name', 'contactName', 'email', 'tax_code']}
        />
      )}

      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Hồ sơ Showroom" width={540}>
        {viewModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', marginBottom: 4 }}>{viewModal.name}</div>
              <StatusBadge status={viewModal.status} />
            </div>
            {[
              [<FaBuilding aria-hidden="true" />, 'Người liên hệ', viewModal.contactName],
              [<FaPhone aria-hidden="true" />, 'Điện thoại', viewModal.phone || '—'],
              [<FaEnvelope aria-hidden="true" />, 'Email', viewModal.email],
              [<FaIdCard aria-hidden="true" />, 'Mã số thuế', viewModal.tax_code || '—'],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ color: '#00b14f', marginTop: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#111827' }}>{val}</div>
                </div>
              </div>
            ))}
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 8 }}>Giấy phép / tài liệu đính kèm</div>
              {viewModal.license_document_urls && viewModal.license_document_urls.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem' }}>
                  {viewModal.license_document_urls.map((url, i) => (
                    <li key={i}>
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                        Tệp {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontWeight: 600, color: '#6b7280' }}>Chưa có tệp</div>
              )}
            </div>
            {viewModal.status === 'rejected' && viewModal.rejection_reason && (
              <div style={{ background: '#fef2f2', borderRadius: 10, padding: 12, fontSize: '0.82rem', color: '#991b1b' }}>
                <strong>Lý do từ chối:</strong> {viewModal.rejection_reason}
              </div>
            )}
            {viewModal.status === 'pending' && (
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  type="button"
                  className="btn-danger"
                  style={{ flex: 1 }}
                  disabled={submitting}
                  onClick={() => {
                    setRejectModal(viewModal);
                    setViewModal(null);
                  }}
                >
                  <FaTimesCircle /> Từ chối
                </button>
                <button type="button" className="btn-success" style={{ flex: 1 }} disabled={submitting} onClick={() => approve(viewModal)}>
                  <FaCheckCircle /> Phê duyệt
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectReason('');
        }}
        title="Từ chối Showroom"
        width={440}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
              Hủy
            </button>
            <button type="button" className="btn-danger" disabled={submitting} onClick={reject}>
              Xác nhận từ chối
            </button>
          </>
        }
      >
        {rejectModal && (
          <div>
            <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: 12 }}>
              Bạn đang từ chối showroom <b>{rejectModal.name}</b>. Có thể nhập lý do (tùy chọn):
            </p>
            <label htmlFor="reject-reason-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Lý do từ chối (tùy chọn)
            </label>
            <textarea
              id="reject-reason-input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối…"
              style={{
                width: '100%',
                minHeight: 100,
                border: '1.5px solid #e5e7eb',
                borderRadius: 9,
                padding: '10px 12px',
                fontSize: '0.85rem',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ShowroomVerification;
