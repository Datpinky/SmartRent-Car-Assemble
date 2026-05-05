import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaCheckCircle, FaEye, FaSpinner, FaTimes } from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';

const STATUS_ORDER = [
  'pending',
  'waiting_payment',
  'paid',
  'confirmed',
  'waiting_handover',
  'handed_over',
  'waiting_return_confirmation',
  'completed',
  'cancel_pending',
  'cancel_failed',
  'cancelled',
];

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  waiting_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  confirmed: 'Đã xác nhận',
  waiting_handover: 'Chờ bàn giao',
  handed_over: 'Đã bàn giao',
  waiting_return_confirmation: 'Chờ xác nhận trả',
  completed: 'Hoàn thành',
  cancel_pending: 'Đang xử lý hủy/hoàn tiền',
  cancel_failed: 'Hủy/hoàn tiền lỗi',
  cancelled: 'Đã hủy',
};

const PRIMARY_ACTIONS = {
  pending: { nextStatus: 'confirmed', label: 'Xác nhận đơn' },
  paid: { nextStatus: 'confirmed', label: 'Xác nhận đơn' },
  confirmed: { nextStatus: 'waiting_handover', label: 'Chuyển sang chờ bàn giao' },
  waiting_handover: { nextStatus: 'handed_over', label: 'Xác nhận đã bàn giao' },
  waiting_return_confirmation: { nextStatus: 'completed', label: 'Xác nhận trả xe' },
};

const CANCELLABLE_STATUSES = ['pending', 'waiting_payment', 'paid', 'confirmed', 'waiting_handover'];

const fmtDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—';

const getVehicleName = (vehicle) =>
  vehicle?.vehicle_name
  || [vehicle?.vehicle_brand || vehicle?.brand, vehicle?.vehicle_model || vehicle?.model].filter(Boolean).join(' ')
  || '—';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewModal, setViewModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await bookingService.getCurrentRoleBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu đặt xe.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateStatus = async (bookingId, nextStatus) => {
    setUpdatingId(bookingId);

    try {
      const updated = await bookingService.updateBookingStatus(bookingId, nextStatus);
      setBookings((current) =>
        current.map((booking) => ((booking._id || booking.id) === bookingId ? { ...booking, ...updated } : booking))
      );
      setViewModal((current) =>
        current && (current._id || current.id) === bookingId
          ? { ...current, ...(updated || {}), status: updated?.status || nextStatus }
          : current
      );
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái booking.');
      await fetchBookings();
    } finally {
      setUpdatingId('');
    }
  };

  const cancelBooking = async (booking) => {
    const bookingId = booking?._id || booking?.id;
    if (!bookingId) return;

    setUpdatingId(bookingId);
    setLoadError('');

    try {
      const result = await bookingService.cancelBooking(bookingId);
      const nextStatus = result?.bookingStatus || 'cancelled';

      setBookings((current) =>
        current.map((item) => ((item._id || item.id) === bookingId ? { ...item, status: nextStatus } : item))
      );
      setViewModal((current) =>
        current && (current._id || current.id) === bookingId
          ? { ...current, status: nextStatus }
          : current
      );
      setCancelModal(null);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể hủy booking hoặc hoàn tiền.');
      await fetchBookings();
    } finally {
      setUpdatingId('');
    }
  };

  const rows = useMemo(
    () =>
      bookings.map((booking) => {
        const renter = booking.user_id || {};
        const vehicle = booking.vehicle_id || {};

        return {
          ...booking,
          id: booking._id || booking.id,
          renterName: renter.name || renter.full_name || renter.email || '—',
          renterEmail: renter.email || '—',
          vehicleName: getVehicleName(vehicle),
          startDateLabel: fmtDate(booking.start_date),
          endDateLabel: fmtDate(booking.end_date),
          totalLabel: Number(booking.total_price || 0).toLocaleString('vi-VN'),
          totalPrice: Number(booking.total_price || 0),
          dayCount: Math.max(1, Math.round((new Date(booking.end_date) - new Date(booking.start_date)) / 86400000)),
        };
      }),
    [bookings]
  );

  const filteredRows = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((row) => row.status === statusFilter)),
    [rows, statusFilter]
  );

  const countsByStatus = useMemo(
    () =>
      STATUS_ORDER.reduce((acc, status) => {
        acc[status] = rows.filter((row) => row.status === status).length;
        return acc;
      }, {}),
    [rows]
  );

  const columns = [
    {
      key: 'id',
      label: 'Mã đặt',
      render: (row) => <span className="code-badge">{`BK${String(row.id).slice(-6).toUpperCase()}`}</span>,
    },
    {
      key: 'renterName',
      label: 'Khách thuê',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111827' }}>{row.renterName}</div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{row.renterEmail}</div>
        </div>
      ),
      sortable: true,
      accessor: 'renterName',
    },
    {
      key: 'vehicleName',
      label: 'Xe',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.vehicleName}
        </span>
      ),
    },
    { key: 'startDateLabel', label: 'Nhận xe', accessor: 'startDateLabel' },
    { key: 'endDateLabel', label: 'Trả xe', accessor: 'endDateLabel' },
    { key: 'dayCount', label: 'Ngày', accessor: 'dayCount', align: 'center' },
    {
      key: 'totalPrice',
      label: 'Tổng tiền',
      render: (row) => (
        <span className="tabular-nums" style={{ fontWeight: 700, color: '#00b14f', whiteSpace: 'nowrap' }}>
          {row.totalLabel}đ
        </span>
      ),
      sortable: true,
      accessor: 'totalPrice',
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} customLabel={STATUS_LABELS[row.status] || row.status} />,
    },
    {
      key: 'actions',
      label: 'Hành động',
      render: (row) => {
        const primaryAction = PRIMARY_ACTIONS[row.status];
        const canCancel = CANCELLABLE_STATUSES.includes(row.status);
        const isUpdating = updatingId === row.id;

        return (
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setViewModal(row)}
              title="Chi tiết"
              aria-label="Xem chi tiết đặt xe"
            >
              <FaEye aria-hidden="true" />
            </button>

            {canCancel && (
              <button
                type="button"
                className="btn-icon danger"
                onClick={() => setCancelModal(row)}
                disabled={isUpdating}
                title="Hủy booking"
                aria-label="Hủy booking"
              >
                {isUpdating ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaTimes aria-hidden="true" />}
              </button>
            )}

            {primaryAction && (
              <button
                type="button"
                className="btn-icon"
                style={{ borderColor: '#2563eb', color: '#2563eb', fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '5px 8px' }}
                onClick={() => updateStatus(row.id, primaryAction.nextStatus)}
                disabled={isUpdating}
                aria-label={primaryAction.label}
                title={primaryAction.label}
              >
                {isUpdating ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaArrowRight aria-hidden="true" />}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Quản lý đặt xe</h1>
          <p className="page-subtitle">Theo dõi và xử lý các booking của showroom theo đúng trạng thái backend.</p>
        </div>
        {countsByStatus.pending > 0 && (
          <div style={{ background: '#fef3c7', color: '#d97706', padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600 }}>
            {countsByStatus.pending} booking chờ xác nhận
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #f0f0f0', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 820 }}>
          {STATUS_ORDER.map((status, index) => (
            <React.Fragment key={status}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: countsByStatus[status] ? '#00b14f' : '#e5e7eb' }} />
                <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="tabular-nums" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#111827' }}>
                  {countsByStatus[status]}
                </span>
              </div>
              {index < STATUS_ORDER.length - 1 && <div style={{ height: 1, background: '#e5e7eb', flex: 1.4 }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['all', ...STATUS_ORDER].map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '5px 12px',
              borderRadius: 50,
              border: '1.5px solid',
              borderColor: statusFilter === status ? '#00b14f' : '#e5e7eb',
              background: statusFilter === status ? '#00b14f' : '#fff',
              color: statusFilter === status ? '#fff' : '#374151',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {status === 'all' ? 'Tất cả' : STATUS_LABELS[status] || status}
            {status !== 'all' && (
              <span className="tabular-nums" style={{ marginLeft: 5, opacity: 0.7 }}>
                ({countsByStatus[status] || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FaSpinner aria-hidden="true" className="animate-spin text-primary text-xl" />
          <span>Đang tải dữ liệu…</span>
        </div>
      ) : loadError ? (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {loadError}
        </div>
      ) : (
        <DataTable columns={columns} data={filteredRows} searchPlaceholder="Tìm theo tên khách, xe…" />
      )}

      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Chi tiết đặt xe" width={520}>
        {viewModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="code-badge">{`BK${String(viewModal.id).slice(-6).toUpperCase()}`}</span>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginTop: 6 }}>{viewModal.vehicleName}</div>
              </div>
              <StatusBadge status={viewModal.status} customLabel={STATUS_LABELS[viewModal.status] || viewModal.status} />
            </div>

            {[
              ['Khách thuê', viewModal.renterName],
              ['Email', viewModal.renterEmail],
              ['Thời gian nhận', viewModal.startDateLabel],
              ['Thời gian trả', viewModal.endDateLabel],
              ['Số ngày', viewModal.dayCount],
              ['Tổng tiền', `${viewModal.totalLabel}đ`],
              ['Ghi chú', viewModal.note || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 10, gap: 12 }}>
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              {CANCELLABLE_STATUSES.includes(viewModal.status) && (
                <button
                  type="button"
                  className="btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setCancelModal(viewModal);
                    setViewModal(null);
                  }}
                >
                  Hủy booking
                </button>
              )}

              {PRIMARY_ACTIONS[viewModal.status] && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    updateStatus(viewModal.id, PRIMARY_ACTIONS[viewModal.status].nextStatus);
                    setViewModal(null);
                  }}
                >
                  {PRIMARY_ACTIONS[viewModal.status].label} <FaCheckCircle aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Xác nhận hủy booking"
        width={420}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCancelModal(null)}>
              Bỏ qua
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => cancelBooking(cancelModal)}
              disabled={updatingId === (cancelModal?._id || cancelModal?.id)}
            >
              {updatingId === (cancelModal?._id || cancelModal?.id) ? 'Đang xử lý...' : 'Xác nhận hủy'}
            </button>
          </>
        }
      >
        {cancelModal && (
          <p style={{ fontSize: '0.85rem', color: '#374151' }}>
            Bạn đang hủy booking của khách hàng <b>{cancelModal.renterName}</b>. Nếu booking đã thanh toán,
            hệ thống sẽ gọi API refund trước khi chuyển booking sang trạng thái đã hủy.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default BookingManagement;
