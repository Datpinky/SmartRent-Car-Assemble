import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaEye,
  FaMapMarkerAlt,
  FaSpinner,
  FaStickyNote,
  FaTimes,
  FaCar,
  FaUser,
} from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import { sanitizeVehicleImageUrl } from '../../../services/vehicleService';
import { sanitizeImageUrl } from '../../../utils/media';

const STATUS_ORDER = [
  'waiting_payment',
  'paid',
  'pending',
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
  waiting_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  pending: 'Chờ xác nhận',
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

const getBookingVehicleImage = (vehicle) => {
  if (!vehicle || typeof vehicle !== 'object') return '';
  const paths = [...(vehicle.vehicle_images_paths || []), ...(vehicle.images || [])].filter(Boolean);
  const first = paths.map((p) => sanitizeVehicleImageUrl(p)).find(Boolean);
  if (!first || typeof first !== 'string') return '';
  return sanitizeImageUrl(first.trim());
};

const getRenterDisplay = (bookingRow) => {
  const u = bookingRow?.user_id;
  const fromObj =
    u && typeof u === 'object'
      ? {
          name: u.name || u.full_name || '',
          email: u.email || '',
        }
      : { name: '', email: '' };
  let rawName = (fromObj.name || bookingRow?.renterName || '').trim();
  let rawEmail = (fromObj.email || bookingRow?.renterEmail || '').trim();
  if (rawName === '—') rawName = '';
  if (rawEmail === '—') rawEmail = '';
  const name = rawName ? rawName : null;
  const email = rawEmail ? rawEmail : null;
  return {
    name: name || 'Chưa có tên trên hệ thống',
    email: email || '—',
    missing: !name,
  };
};

function parseNoteSections(note) {
  const raw = String(note || '').trim();
  if (!raw || raw === '—') return { deliveryLine: '', otherNote: '' };
  const m = raw.match(/^Giao xe:\s*(.+)$/i);
  if (m) {
    return { deliveryLine: m[1].trim(), otherNote: '' };
  }
  return { deliveryLine: '', otherNote: raw };
}

function BookingDetailHero({ bookingRow }) {
  const vehicle = bookingRow?.vehicle_id && typeof bookingRow.vehicle_id === 'object' ? bookingRow.vehicle_id : null;
  const imgSrc = getBookingVehicleImage(vehicle);
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = Boolean(imgSrc) && !imgFailed;
  const plate = vehicle?.vehicle_plate_number ? String(vehicle.vehicle_plate_number).trim() : '';
  const fromVehicle = getVehicleName(vehicle);
  const displayName =
    (bookingRow?.vehicleName && String(bookingRow.vehicleName).trim() && bookingRow.vehicleName !== '—'
      ? String(bookingRow.vehicleName).trim()
      : null)
    || (fromVehicle && fromVehicle !== '—' ? fromVehicle : null)
    || 'Xe (đang tải hoặc chưa populate vehicle)';

  useEffect(() => {
    setImgFailed(false);
  }, [bookingRow?.id, imgSrc]);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      <div className="relative flex flex-col sm:flex-row gap-0 sm:gap-0">
        <div
          className={`relative sm:w-[9.5rem] shrink-0 aspect-[4/3] sm:aspect-auto sm:min-h-[8.5rem] flex items-stretch ${
            showImg ? 'bg-gray-100' : 'bg-gradient-to-br from-primary-light/90 to-emerald-100/80'
          }`}
        >
          {showImg ? (
            <img
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-primary/90">
              <FaCar className="text-5xl sm:text-4xl opacity-80" aria-hidden />
            </div>
          )}
          <div className="absolute top-2 left-2 sm:hidden">
            <span className="inline-flex items-center rounded-md bg-black/55 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-white backdrop-blur-sm">
              {`BK${String(bookingRow.id).slice(-6).toUpperCase()}`}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-4 py-4 sm:px-5 sm:py-5 bg-gradient-to-b from-white to-gray-50/80">
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-2">
            <span className="code-badge font-mono">{`BK${String(bookingRow.id).slice(-6).toUpperCase()}`}</span>
            <StatusBadge status={bookingRow.status} customLabel={STATUS_LABELS[bookingRow.status] || bookingRow.status} />
          </div>
          <div className="sm:hidden flex justify-end -mt-1">
            <StatusBadge status={bookingRow.status} customLabel={STATUS_LABELS[bookingRow.status] || bookingRow.status} />
          </div>
          <div>
            <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-gray-500">Xe đặt</p>
            <h3 className="m-0 mt-1 text-lg sm:text-xl font-extrabold text-gray-900 leading-tight tracking-tight">
              {displayName}
            </h3>
            {plate ? (
              <p className="m-0 mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[0.75rem] font-semibold tabular-nums text-gray-700">
                <span className="text-gray-400 font-normal">Biển</span>
                {plate}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

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

      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Chi tiết đặt xe" width={640}>
        {viewModal && (
          <div className="flex flex-col gap-5 text-gray-900 -mx-0.5">
            <BookingDetailHero key={viewModal.id} bookingRow={viewModal} />

            {(() => {
              const renter = getRenterDisplay(viewModal);
              return (
                <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm">
                  <p className="m-0 mb-3 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gray-500">
                    <FaUser className="text-primary text-sm" aria-hidden />
                    Khách thuê
                  </p>
                  <div className="flex items-start gap-3 rounded-xl bg-gray-50/95 px-3.5 py-3 border border-gray-100">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-primary shadow-sm">
                      <FaUser className="text-lg" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`m-0 text-[0.95rem] font-bold leading-snug ${renter.missing ? 'text-gray-500' : 'text-gray-900'}`}>
                        {renter.name}
                      </p>
                      <p className="m-0 mt-1 text-[0.82rem] text-gray-600 break-all">{renter.email}</p>
                      {renter.missing && (
                        <p className="m-0 mt-2 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-2 text-[0.72rem] text-amber-900 leading-snug">
                          Chưa có thông tin khách từ API. Kiểm tra populate{' '}
                          <code className="text-[0.68rem] bg-amber-100/80 px-1 rounded">user_id</code> khi trả danh sách
                          booking.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm">
              <p className="m-0 mb-3 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gray-500">
                <FaCalendarAlt className="text-primary text-sm" aria-hidden />
                Lịch thuê
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-3.5 py-3">
                  <p className="m-0 text-[0.7rem] font-semibold text-emerald-800/80">Nhận xe</p>
                  <p className="m-0 mt-1 text-sm font-bold text-gray-900 tabular-nums">{viewModal.startDateLabel}</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/40 px-3.5 py-3">
                  <p className="m-0 text-[0.7rem] font-semibold text-sky-800/80">Trả xe</p>
                  <p className="m-0 mt-1 text-sm font-bold text-gray-900 tabular-nums">{viewModal.endDateLabel}</p>
                </div>
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3">
                  <div>
                    <p className="m-0 text-[0.7rem] font-medium text-gray-500">Số ngày thuê</p>
                    <p className="m-0 mt-0.5 text-base font-bold text-gray-900 tabular-nums">{viewModal.dayCount} ngày</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="m-0 text-[0.7rem] font-medium text-gray-500">Tổng thanh toán</p>
                    <p className="m-0 mt-0.5 text-xl font-extrabold text-primary tabular-nums tracking-tight">
                      {viewModal.totalLabel}đ
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const { deliveryLine, otherNote } = parseNoteSections(viewModal.note);
              if (!deliveryLine && (!otherNote || otherNote === '—')) return null;
              return (
                <div className="space-y-3">
                  {deliveryLine ? (
                    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-light/35 to-white px-4 py-3.5 shadow-sm">
                      <p className="m-0 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wide text-primary">
                        <FaMapMarkerAlt className="text-base" aria-hidden />
                        Địa chỉ / hình thức giao xe
                      </p>
                      <p className="m-0 mt-2 text-[0.88rem] font-medium text-gray-900 leading-relaxed">{deliveryLine}</p>
                    </div>
                  ) : null}
                  {otherNote ? (
                    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3.5">
                      <p className="m-0 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wide text-amber-900/80">
                        <FaStickyNote aria-hidden />
                        Ghi chú
                      </p>
                      <p className="m-0 mt-2 text-[0.85rem] text-amber-950 leading-relaxed whitespace-pre-wrap break-words">
                        {otherNote}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-gray-100">
              {CANCELLABLE_STATUSES.includes(viewModal.status) && (
                <button
                  type="button"
                  className="btn-danger flex-1 rounded-xl py-3 text-[0.9rem] font-semibold shadow-sm transition hover:opacity-95"
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
                  className="btn-primary flex-1 rounded-xl py-3 text-[0.9rem] font-semibold shadow-md inline-flex items-center justify-center gap-2 transition hover:opacity-95"
                  onClick={() => {
                    updateStatus(viewModal.id, PRIMARY_ACTIONS[viewModal.status].nextStatus);
                    setViewModal(null);
                  }}
                >
                  <span>{PRIMARY_ACTIONS[viewModal.status].label}</span>
                  <FaCheckCircle aria-hidden="true" className="text-base opacity-90" />
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
