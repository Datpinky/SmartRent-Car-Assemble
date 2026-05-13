import { useCallback, useEffect, useState } from 'react';
import { FaCalendarAlt, FaCheckCircle, FaEye, FaIdCard, FaTimesCircle, FaUser } from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
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

const LICENSE_STATUS_MAP = {
  pending: 'pending',
  approved: 'active',
  rejected: 'rejected',
};

const DriverLicenseVerification = () => {
  const [items, setItems] = useState([]);
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
      const data = await adminService.listDriverLicenses(filter);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e.message || 'Không tải được danh sách.');
      setItems([]);
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
      await adminService.approveDriverLicense(row.id);
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
      await adminService.rejectDriverLicense(rejectModal.id, rejectReason.trim());
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
      label: 'Người dùng',
      accessor: 'name',
      sortable: true,
      width: '24%',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#047857',
              flexShrink: 0,
            }}
          >
            <FaUser aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#111827' }}>{row.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'licenseNumber',
      label: 'Số GPLX',
      accessor: 'licenseNumber',
      render: (row) => <span style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{row.licenseNumber || '—'}</span>,
    },
    {
      key: 'licenseClass',
      label: 'Hạng',
      accessor: 'licenseClass',
      align: 'center',
      render: (row) => (
        <span
          style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            borderRadius: 6,
            padding: '2px 8px',
            fontWeight: 700,
            fontSize: '0.78rem',
          }}
        >
          {row.licenseClass || '—'}
        </span>
      ),
    },
    {
      key: 'licenseExpiry',
      label: 'Hết hạn',
      accessor: 'licenseExpiry',
      render: (row) => <span style={{ fontSize: '0.8rem' }}>{formatDate(row.licenseExpiry)}</span>,
    },
    {
      key: 'licenseStatus',
      label: 'Trạng thái',
      render: (row) => <StatusBadge status={LICENSE_STATUS_MAP[row.licenseStatus] || row.licenseStatus} />,
    },
    {
      key: 'actions',
      label: 'Hành động',
      render: (row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setViewModal(row)}
            title="Xem chi tiết"
            aria-label="Xem chi tiết"
          >
            <FaEye />
          </button>
          {row.licenseStatus === 'pending' && (
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

  const pending = items.filter((s) => s.licenseStatus === 'pending').length;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Xác minh Giấy phép lái xe</h1>
          <p className="page-subtitle">Duyệt GPLX do người thuê xe nộp</p>
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
            {pending} GPLX chờ duyệt
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
        <div
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 12,
            fontSize: '0.85rem',
          }}
        >
          {loadError}
        </div>
      )}
      {actionError && (
        <div
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 12,
            fontSize: '0.85rem',
          }}
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải…</div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Tìm theo tên, email, số GPLX…"
          searchFields={['name', 'email', 'licenseNumber', 'licenseFullname']}
        />
      )}

      {/* Detail modal */}
      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Chi tiết GPLX" width={560}>
        {viewModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', marginBottom: 4 }}>
                {viewModal.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {viewModal.email} · {viewModal.phone || 'Chưa có SĐT'}
              </div>
              <div style={{ marginTop: 8 }}>
                <StatusBadge status={LICENSE_STATUS_MAP[viewModal.licenseStatus] || viewModal.licenseStatus} />
              </div>
            </div>

            {[
              [<FaIdCard aria-hidden="true" />, 'Số GPLX', viewModal.licenseNumber || '—'],
              [<FaUser aria-hidden="true" />, 'Họ tên trên GPLX', viewModal.licenseFullname || '—'],
              [<FaCalendarAlt aria-hidden="true" />, 'Ngày sinh', formatDate(viewModal.licenseDob)],
              [<FaIdCard aria-hidden="true" />, 'Hạng GPLX', viewModal.licenseClass || '—'],
              [<FaCalendarAlt aria-hidden="true" />, 'Ngày hết hạn', formatDate(viewModal.licenseExpiry)],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ color: '#00b14f', marginTop: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#111827' }}>{val}</div>
                </div>
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {viewModal.licenseFrontImage ? (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6 }}>Mặt trước GPLX</div>
                  <img
                    src={viewModal.licenseFrontImage}
                    alt="Mặt trước GPLX"
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      maxHeight: 160,
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Mặt trước GPLX</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.82rem' }}>Chưa có ảnh</div>
                </div>
              )}
              {viewModal.licenseBackImage ? (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6 }}>Mặt sau GPLX</div>
                  <img
                    src={viewModal.licenseBackImage}
                    alt="Mặt sau GPLX"
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      maxHeight: 160,
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Mặt sau GPLX</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.82rem' }}>Chưa có ảnh</div>
                </div>
              )}
            </div>

            {viewModal.licenseStatus === 'rejected' && viewModal.rejectReason && (
              <div
                style={{ background: '#fef2f2', borderRadius: 10, padding: 12, fontSize: '0.82rem', color: '#991b1b' }}
              >
                <strong>Lý do từ chối:</strong> {viewModal.rejectReason}
              </div>
            )}

            {viewModal.licenseStatus === 'pending' && (
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
                <button
                  type="button"
                  className="btn-success"
                  style={{ flex: 1 }}
                  disabled={submitting}
                  onClick={() => approve(viewModal)}
                >
                  <FaCheckCircle /> Phê duyệt
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject reason modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectReason('');
        }}
        title="Từ chối GPLX"
        width={440}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setRejectModal(null);
                setRejectReason('');
              }}
            >
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
              Bạn đang từ chối GPLX của <b>{rejectModal.name}</b>. Nhập lý do để người dùng biết cần sửa gì:
            </p>
            <label
              htmlFor="reject-license-reason"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}
            >
              Lý do từ chối
            </label>
            <textarea
              id="reject-license-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Ảnh GPLX bị mờ, thông tin không khớp…"
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

export default DriverLicenseVerification;
