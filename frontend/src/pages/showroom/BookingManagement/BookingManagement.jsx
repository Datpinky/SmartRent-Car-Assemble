import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaCheckCircle, FaEye, FaSpinner, FaTimes } from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import uploadService from '../../../services/uploadService';
import {
  CANCELLABLE_STATUSES,
  FILTER_TABS,
  fmtDate,
  getVehicleName,
  PRIMARY_ACTIONS,
  STATUS_LABELS,
  STATUS_ORDER,
} from './bookingManagement.helpers';
import HandoverPhotoModal from './components/HandoverPhotoModal';
import OtpModal from './components/OtpModal';
import StatusPipeline from './components/StatusPipeline';

const BookingManagement = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewModal, setViewModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');
  const [otpModal, setOtpModal] = useState(null);
  const [handoverPhotoModal, setHandoverPhotoModal] = useState(null);
  const [handoverUploading, setHandoverUploading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
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

  const goToReturnAiInspection = (bookingId) => {
    navigate(`/showroom/ai-inspection?bookingId=${encodeURIComponent(bookingId)}`);
  };

  const _doUpdateStatus = async (bookingId, nextStatus) => {
    setUpdatingId(bookingId);
    try {
      const updated = await bookingService.updateBookingStatus(bookingId, nextStatus);
      const resolvedStatus = updated?.status || nextStatus;
      setBookings((curr) => curr.map((b) => ((b._id || b.id) === bookingId ? { ...b, status: resolvedStatus } : b)));
      setViewModal((curr) =>
        curr && (curr._id || curr.id) === bookingId ? { ...curr, status: resolvedStatus } : curr,
      );
      if (nextStatus === 'handed_over' && updated?.handover_otp) {
        const row = bookings.find((b) => (b._id || b.id) === bookingId);
        const renter = row?.user_id || {};
        setViewModal(null);
        setOtpModal({
          bookingId,
          otp: updated.handover_otp,
          vehicleName: row?.vehicleName || row?.vehicle_id?.vehicle_name || 'Xe',
          renterName: renter.name || renter.email || 'Khách thuê',
        });
      }
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái đơn đặt xe.');
      await fetchBookings();
    } finally {
      setUpdatingId('');
    }
  };

  const updateStatus = async (bookingId, nextStatus) => {
    if (nextStatus === 'handed_over') {
      const row = bookings.find((b) => (b._id || b.id) === bookingId);
      setHandoverPhotoModal({ bookingId, vehicleName: row?.vehicleName || row?.vehicle_id?.vehicle_name || 'Xe' });
      return;
    }
    await _doUpdateStatus(bookingId, nextStatus);
  };

  const confirmHandover = async (handoverPhotos, skipPhotos) => {
    const { bookingId } = handoverPhotoModal;
    setHandoverUploading(true);
    try {
      if (!skipPhotos && Array.isArray(handoverPhotos) && handoverPhotos.length > 0) {
        const files = handoverPhotos.filter(Boolean).slice(0, 6);
        console.log('📸 Uploading handover photos:', files.length, 'files');
        try {
          const uploaded = await uploadService.uploadImages(files);
          console.log('✅ Uploaded:', uploaded);
          const urls = uploaded.map((u) => u?.url || u).filter(Boolean);
          console.log('✅ URLs:', urls);
          if (urls.length > 0) {
            console.log('📝 Saving pickup images to booking:', {
              bookingId,
              urlCount: urls.length,
              urls,
            });
            const saveResponse = await bookingService.savePickupImages(bookingId, urls);
            console.log('✅ Saved pickup images - API Response:', saveResponse);

            // Verify by refetching booking
            const verifyBooking = await bookingService.getBookingById(bookingId);
            console.log('🔍 Verify booking after save:', {
              bookingId,
              hasPickupImages: !!verifyBooking?.pickup_images,
              pickupImagesCount: verifyBooking?.pickup_images?.length || 0,
              pickupImages: verifyBooking?.pickup_images,
            });
          }
        } catch (err) {
          console.error('❌ Upload/save error:', err);
          /* photo upload failure doesn't block handover */
        }
      } else {
        console.log('⏭️ Skipping photos');
      }
      setHandoverPhotoModal(null);
    } finally {
      setHandoverUploading(false);
    }
    await _doUpdateStatus(bookingId, 'handed_over');
  };

  const cancelBooking = async (booking) => {
    const bookingId = booking?._id || booking?.id;
    if (!bookingId) return;
    setUpdatingId(bookingId);
    setLoadError('');
    try {
      const result = await bookingService.cancelBooking(bookingId);
      const nextStatus = result?.bookingStatus || 'cancelled';
      setBookings((curr) =>
        curr.map((item) => ((item._id || item.id) === bookingId ? { ...item, status: nextStatus } : item)),
      );
      setViewModal((curr) => (curr && (curr._id || curr.id) === bookingId ? { ...curr, status: nextStatus } : curr));
      setCancelModal(null);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể hủy đơn đặt xe hoặc hoàn tiền.');
      await fetchBookings();
    } finally {
      setUpdatingId('');
    }
  };

  const showOtpForBooking = async (bookingId) => {
    if (!bookingId) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const booking = await bookingService.getBookingById(bookingId);
      if (!booking) {
        setOtpError('Không tìm thấy booking');
        return;
      }
      if (!booking.handover_otp) {
        setOtpError('Mã OTP chưa được tạo hoặc đã bị xóa');
        return;
      }
      const renter = booking.user_id || {};
      setOtpModal({
        bookingId: booking._id || booking.id,
        otp: booking.handover_otp,
        vehicleName: booking.vehicle_id?.vehicle_name || booking.vehicleName || 'Xe',
        renterName: renter.name || renter.email || 'Khách thuê',
      });
    } catch (err) {
      setOtpError(err?.response?.data?.message || err?.message || 'Không thể lấy mã OTP');
    } finally {
      setOtpLoading(false);
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
    [bookings],
  );

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    const tab = FILTER_TABS.find((t) => t.key === statusFilter);
    const statuses = tab ? tab.statuses : [statusFilter];
    return rows.filter((row) => statuses.includes(row.status));
  }, [rows, statusFilter]);

  const countsByStatus = useMemo(
    () =>
      STATUS_ORDER.reduce((acc, status) => {
        acc[status] = rows.filter((r) => r.status === status).length;
        return acc;
      }, {}),
    [rows],
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
        <span
          style={{
            fontSize: '0.8rem',
            maxWidth: 180,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
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
                title="Hủy đơn đặt xe"
                aria-label="Hủy đơn đặt xe"
              >
                {isUpdating ? (
                  <FaSpinner aria-hidden="true" className="animate-spin" />
                ) : (
                  <FaTimes aria-hidden="true" />
                )}
              </button>
            )}
            {primaryAction && row.status !== 'waiting_return_confirmation' && (
              <button
                type="button"
                className="btn-icon"
                style={{
                  borderColor: '#2563eb',
                  color: '#2563eb',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  padding: '5px 8px',
                }}
                onClick={() => updateStatus(row.id, primaryAction.nextStatus)}
                disabled={isUpdating}
                aria-label={primaryAction.label}
                title={primaryAction.label}
              >
                {isUpdating ? (
                  <FaSpinner aria-hidden="true" className="animate-spin" />
                ) : (
                  <FaArrowRight aria-hidden="true" />
                )}
              </button>
            )}
            {row.status === 'waiting_return_confirmation' && (
              <button
                type="button"
                className="btn-icon"
                style={{
                  borderColor: '#2563eb',
                  color: '#2563eb',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  padding: '5px 8px',
                }}
                onClick={() => goToReturnAiInspection(row.id)}
                title="Kiểm tra AI trả xe"
                aria-label="Kiểm tra AI trả xe"
              >
                <FaArrowRight aria-hidden="true" />
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
          <p className="page-subtitle">Theo dõi và xử lý các đơn đặt xe của showroom theo đúng trạng thái hệ thống.</p>
        </div>
        {countsByStatus.pending > 0 && (
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
            {countsByStatus.pending} đơn chờ xác nhận
          </div>
        )}
      </div>

      <StatusPipeline countsByStatus={countsByStatus} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '5px 12px',
            borderRadius: 50,
            border: '1.5px solid',
            borderColor: statusFilter === 'all' ? '#00b14f' : '#e5e7eb',
            background: statusFilter === 'all' ? '#00b14f' : '#fff',
            color: statusFilter === 'all' ? '#fff' : '#374151',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Tất cả
        </button>
        {FILTER_TABS.map((tab) => {
          const count = tab.statuses.reduce((sum, s) => sum + (countsByStatus[s] || 0), 0);
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 50,
                border: '1.5px solid',
                borderColor: statusFilter === tab.key ? '#00b14f' : '#e5e7eb',
                background: statusFilter === tab.key ? '#00b14f' : '#fff',
                color: statusFilter === tab.key ? '#fff' : '#374151',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.label}
              <span className="tabular-nums" style={{ marginLeft: 5, opacity: 0.7 }}>
                ({count})
              </span>
            </button>
          );
        })}
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
            <div
              style={{
                background: '#f0fdf4',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span className="code-badge">{`BK${String(viewModal.id).slice(-6).toUpperCase()}`}</span>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginTop: 6 }}>
                  {viewModal.vehicleName}
                </div>
              </div>
              <StatusBadge
                status={viewModal.status}
                customLabel={STATUS_LABELS[viewModal.status] || viewModal.status}
              />
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
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f3f4f6',
                  paddingBottom: 10,
                  gap: 12,
                }}
              >
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                  {value}
                </span>
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
                  Hủy đơn đặt xe
                </button>
              )}
              {viewModal.status === 'waiting_return_confirmation' && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    goToReturnAiInspection(viewModal.id);
                    setViewModal(null);
                  }}
                >
                  Kiểm tra AI trả xe <FaCheckCircle aria-hidden="true" />
                </button>
              )}
              {PRIMARY_ACTIONS[viewModal.status] && viewModal.status !== 'waiting_return_confirmation' && (
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
              {viewModal.status === 'handed_over' && (
                <button
                  type="button"
                  className="btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => showOtpForBooking(viewModal._id || viewModal.id)}
                  disabled={otpLoading}
                >
                  {otpLoading ? 'Đang tải...' : 'Xem mã OTP'}
                </button>
              )}
            </div>
            {otpError && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 8 }}>{otpError}</div>}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Xác nhận hủy đơn đặt xe"
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
            Bạn đang hủy đơn đặt xe của khách hàng <b>{cancelModal.renterName}</b>. Nếu đơn đã thanh toán, hệ thống sẽ
            xử lý hoàn tiền trước khi chuyển đơn sang trạng thái đã hủy.
          </p>
        )}
      </Modal>

      <OtpModal otpModal={otpModal} onClose={() => setOtpModal(null)} />
      <HandoverPhotoModal
        handoverPhotoModal={handoverPhotoModal}
        handoverUploading={handoverUploading}
        onConfirm={confirmHandover}
        onClose={() => setHandoverPhotoModal(null)}
      />
    </div>
  );
};

export default BookingManagement;
