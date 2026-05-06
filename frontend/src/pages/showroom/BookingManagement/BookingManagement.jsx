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
} from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import { sanitizeVehicleImageUrl } from '../../../services/vehicleService';
import { sanitizeImageUrl } from '../../../utils/media';

const STATUS_ORDER = [
  'pending',
  'confirmed',
  'waiting_payment',
  'paid',
  'payment_failed',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
  'completed',
  'cancel_pending',
  'cancel_failed',
  'cancelled',
];

/** Không hiển thị trên phễu / nút lọc (booking đó vẫn xem trong «Tất cả»). */
const FUNNEL_EXCLUDED = new Set(['pending', 'confirmed', 'payment_failed']);
const FUNNEL_STATUS_ORDER = STATUS_ORDER.filter((s) => !FUNNEL_EXCLUDED.has(s));

const STATUS_LABELS = {
  pending: 'Chờ xác nhận đơn',
  confirmed: 'Đã xác nhận — chờ TT',
  waiting_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  waiting_handover: 'Chờ bàn giao',
  handed_over: 'Đã bàn giao',
  waiting_return_confirmation: 'Chờ xác nhận trả',
  completed: 'Hoàn thành',
  cancel_pending: 'Đang xử lý hủy/hoàn tiền',
  cancel_failed: 'Hủy/hoàn tiền lỗi',
  cancelled: 'Đã hủy',
  payment_failed: 'Thanh toán thất bại',
  in_use: 'Đang thuê',
};

const PRIMARY_ACTIONS = {
  /** Backend: pending → confirmed | waiting_payment | cancelled */
  pending: { nextStatus: 'confirmed', label: 'Xác nhận đơn' },
  /** Backend: paid → waiting_handover | cancelled */
  paid: { nextStatus: 'waiting_handover', label: 'Chuyển sang chờ bàn giao' },
  waiting_handover: { nextStatus: 'handed_over', label: 'Xác nhận đã bàn giao' },
  waiting_return_confirmation: { nextStatus: 'completed', label: 'Xác nhận trả xe' },
};

/** Vẫn cho phép hủy kể cả đơn còn ở trạng thái backend pending/confirmed (không hiển thị trên phễu). */
const CANCELLABLE_STATUSES = ['pending', 'waiting_payment', 'paid', 'confirmed', 'waiting_handover'];

const fmtDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—';

const getVehicleName = (vehicleOrId) => {
  if (vehicleOrId == null || vehicleOrId === '') return '—';
  if (typeof vehicleOrId === 'string') {
    const id = vehicleOrId;
    return id.length > 8 ? `Xe (…${id.slice(-6)})` : `Xe (${id})`;
  }
  const vehicle = vehicleOrId;
  return (
    vehicle?.vehicle_name
    || [vehicle?.vehicle_brand || vehicle?.brand, vehicle?.vehicle_model || vehicle?.model].filter(Boolean).join(' ')
    || '—'
  );
};

const getVehiclePlate = (vehicleOrId) => {
  if (!vehicleOrId || typeof vehicleOrId !== 'object') return '';
  const plate = vehicleOrId.vehicle_plate_number;
  return plate ? String(plate).trim() : '';
};

/** Trạng thái booking không còn «xác nhận đơn» có nghĩa (đã hủy / đang hủy). */
const ORDER_CONFIRM_EXCLUDED = new Set(['cancelled', 'cancel_pending', 'cancel_failed']);

/** Đơn showroom đã xử lý qua bước nhận đơn (không còn chờ duyệt pending). */
const isShowroomConfirmedOrder = (status) =>
  status !== 'pending' && !ORDER_CONFIRM_EXCLUDED.has(status);

/** Đơn đã qua bước showroom xác nhận (pending = khách vừa đặt, chờ showroom duyệt). */
const getOrderConfirmationMeta = (status) => {
  if (status === 'pending') {
    return { label: 'Chưa xác nhận', hint: 'Showroom chưa nhận đơn', variant: 'pending' };
  }
  if (ORDER_CONFIRM_EXCLUDED.has(status)) {
    return { label: '—', hint: '', variant: 'muted' };
  }
  return { label: 'Đã xác nhận', hint: 'Showroom đã xác nhận đơn', variant: 'ok' };
};

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
    name: name || 'Chưa cập nhật tên',
    email,
    missing: !name,
  };
};

const mergeBookingAfterStatusUpdate = (currentBooking, updatedBooking = {}) => {
  if (!updatedBooking || typeof updatedBooking !== 'object') {
    return currentBooking;
  }

  const merged = { ...currentBooking, ...updatedBooking };

  const updatedUserObj =
    updatedBooking.user_id && typeof updatedBooking.user_id === 'object'
      ? updatedBooking.user_id
      : null;
  const hasUpdatedUserDisplay = Boolean(
    (updatedUserObj?.name && String(updatedUserObj.name).trim())
      || (updatedUserObj?.full_name && String(updatedUserObj.full_name).trim())
      || (updatedBooking.renterName && String(updatedBooking.renterName).trim() && updatedBooking.renterName !== '—')
  );

  if (!hasUpdatedUserDisplay) {
    merged.user_id = currentBooking.user_id;
    merged.renterName = currentBooking.renterName;
    merged.renterEmail = currentBooking.renterEmail;
  }

  return merged;
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
    || 'Chưa có thông tin xe';

  useEffect(() => {
    setImgFailed(false);
  }, [bookingRow?.id, imgSrc]);

  return (
    <div className="flex gap-3 sm:gap-4">
      <div
        className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-[4.5rem] sm:w-[5.5rem]"
      >
        {showImg ? (
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <FaCar className="text-2xl" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 gap-y-1">
          <span className="font-mono text-[0.72rem] text-gray-500 tabular-nums">{`BK${String(bookingRow.id).slice(-6).toUpperCase()}`}</span>
          <StatusBadge status={bookingRow.status} customLabel={STATUS_LABELS[bookingRow.status]} />
        </div>
        <p className="m-0 mt-1 text-base font-semibold text-gray-900 leading-snug line-clamp-2">{displayName}</p>
        {plate ? (
          <p className="m-0 mt-0.5 text-sm text-gray-600 tabular-nums">{plate}</p>
        ) : null}
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
  const [confirmFilter, setConfirmFilter] = useState('all');
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
    setLoadError('');

    try {
      const id = String(bookingId);
      const updated = await bookingService.updateBookingStatus(id, nextStatus);
      setBookings((current) =>
        current.map((booking) =>
          String(booking._id || booking.id) === id ? mergeBookingAfterStatusUpdate(booking, updated) : booking
        )
      );
      setViewModal((current) =>
        current && String(current._id || current.id) === id
          ? {
            ...mergeBookingAfterStatusUpdate(current, updated),
            status: updated?.status || nextStatus,
          }
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
        const rawVehicle = booking.vehicle_id;
        const vehicle = rawVehicle && typeof rawVehicle === 'object' ? rawVehicle : null;

        return {
          ...booking,
          id: booking._id || booking.id,
          renterName: renter.name || renter.full_name || renter.email || '—',
          renterEmail: renter.email || '—',
          vehicleName: getVehicleName(vehicle || rawVehicle),
          vehiclePlate: getVehiclePlate(vehicle || {}),
          orderConfirm: getOrderConfirmationMeta(booking.status),
          confirmationSort:
            booking.status === 'pending'
              ? 0
              : ORDER_CONFIRM_EXCLUDED.has(booking.status)
                ? 2
                : 1,
          startDateLabel: fmtDate(booking.start_date),
          endDateLabel: fmtDate(booking.end_date),
          totalLabel: Number(booking.total_price || 0).toLocaleString('vi-VN'),
          totalPrice: Number(booking.total_price || 0),
          dayCount: Math.max(1, Math.round((new Date(booking.end_date) - new Date(booking.start_date)) / 86400000)),
        };
      }),
    [bookings]
  );

  const filteredRows = useMemo(() => {
    let list = statusFilter === 'all' ? rows : rows.filter((row) => row.status === statusFilter);
    if (confirmFilter === 'unconfirmed') {
      list = list.filter((row) => row.status === 'pending');
    } else if (confirmFilter === 'confirmed') {
      list = list.filter((row) => isShowroomConfirmedOrder(row.status));
    }
    return list;
  }, [rows, statusFilter, confirmFilter]);

  const confirmationCounts = useMemo(
    () => ({
      unconfirmed: rows.filter((row) => row.status === 'pending').length,
      confirmed: rows.filter((row) => isShowroomConfirmedOrder(row.status)).length,
    }),
    [rows]
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
        <div style={{ maxWidth: 200 }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#111827',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.vehicleName}
          </span>
          {row.vehiclePlate ? (
            <span className="tabular-nums" style={{ fontSize: '0.72rem', color: '#6b7280' }}>
              BKS {row.vehiclePlate}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'orderConfirm',
      label: 'Trạng thái xác nhận',
      render: (row) => {
        const { label, hint, variant } = row.orderConfirm || getOrderConfirmationMeta(row.status);
        if (variant === 'muted') {
          return <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>—</span>;
        }
        const bg = variant === 'pending' ? '#fffbeb' : '#ecfdf5';
        const border = variant === 'pending' ? '#fcd34d' : '#86efac';
        const color = variant === 'pending' ? '#b45309' : '#166534';
        return (
          <span
            title={hint}
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 999,
              background: bg,
              border: `1px solid ${border}`,
              color,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        );
      },
      sortable: true,
      accessor: 'confirmationSort',
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
      render: (row) => <StatusBadge status={row.status} customLabel={STATUS_LABELS[row.status]} />,
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
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #f0f0f0', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 820 }}>
          {FUNNEL_STATUS_ORDER.map((status, index) => (
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
              {index < FUNNEL_STATUS_ORDER.length - 1 && <div style={{ height: 1, background: '#e5e7eb', flex: 1.4 }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 700 }}>Xác nhận đơn:</span>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'unconfirmed', label: 'Chưa xác nhận', count: confirmationCounts.unconfirmed },
          { key: 'confirmed', label: 'Đã xác nhận', count: confirmationCounts.confirmed },
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => setConfirmFilter(item.key)}
            style={{
              padding: '5px 12px',
              borderRadius: 50,
              border: '1.5px solid',
              borderColor: confirmFilter === item.key ? '#2563eb' : '#e5e7eb',
              background: confirmFilter === item.key ? '#eff6ff' : '#fff',
              color: confirmFilter === item.key ? '#1d4ed8' : '#374151',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {item.label}
            {item.count != null && (
              <span className="tabular-nums" style={{ marginLeft: 5, opacity: 0.75 }}>
                ({item.count})
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['all', ...FUNNEL_STATUS_ORDER].map((status) => (
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

      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Chi tiết đặt xe" width={480}>
        {viewModal && (
          <div className="flex flex-col gap-0 text-gray-900">
            <BookingDetailHero key={viewModal.id} bookingRow={viewModal} />

            <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
              {(() => {
                const renter = getRenterDisplay(viewModal);
                return (
                  <div>
                    <p className="m-0 text-xs font-medium text-gray-500">Khách thuê</p>
                    <p className={`m-0 mt-0.5 text-sm font-semibold ${renter.missing ? 'text-gray-500' : 'text-gray-900'}`}>
                      {renter.name}
                    </p>
                    {renter.email ? (
                      <p className="m-0 mt-0.5 text-sm text-gray-600 break-all">{renter.email}</p>
                    ) : null}
                  </div>
                );
              })()}

              <div>
                <p className="m-0 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <FaCalendarAlt className="text-gray-400" aria-hidden />
                  Lịch thuê
                </p>
                <p className="m-0 mt-1.5 text-sm text-gray-900">
                  <span className="tabular-nums font-medium">{viewModal.startDateLabel}</span>
                  <span className="mx-2 text-gray-300">→</span>
                  <span className="tabular-nums font-medium">{viewModal.endDateLabel}</span>
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="tabular-nums text-gray-600">{viewModal.dayCount} ngày</span>
                </p>
                <p className="m-0 mt-2 text-lg font-bold tabular-nums text-primary">{viewModal.totalLabel}đ</p>
              </div>

              {(() => {
                const { deliveryLine, otherNote } = parseNoteSections(viewModal.note);
                if (!deliveryLine && (!otherNote || otherNote === '—')) return null;
                return (
                  <div className="space-y-3">
                    {deliveryLine ? (
                      <div>
                        <p className="m-0 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <FaMapMarkerAlt className="text-gray-400" aria-hidden />
                          Địa chỉ / giao xe
                        </p>
                        <p className="m-0 mt-1 text-sm text-gray-800 leading-relaxed">{deliveryLine}</p>
                      </div>
                    ) : null}
                    {otherNote ? (
                      <div>
                        <p className="m-0 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <FaStickyNote className="text-gray-400" aria-hidden />
                          Ghi chú
                        </p>
                        <p className="m-0 mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">{otherNote}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:gap-3">
              {CANCELLABLE_STATUSES.includes(viewModal.status) && (
                <button
                  type="button"
                  className="btn-danger flex-1 rounded-lg py-2.5 text-sm font-semibold"
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
                  className="btn-primary flex-1 rounded-lg py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2"
                  onClick={() => {
                    updateStatus(viewModal.id, PRIMARY_ACTIONS[viewModal.status].nextStatus);
                    setViewModal(null);
                  }}
                >
                  <span>{PRIMARY_ACTIONS[viewModal.status].label}</span>
                  <FaCheckCircle aria-hidden className="text-sm opacity-90" />
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
