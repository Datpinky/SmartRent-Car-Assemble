import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaClock,
  FaEnvelope,
  FaEye,
  FaMapMarkerAlt,
  FaSpinner,
  FaStore,
  FaTimesCircle,
} from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import { getCancelBookingNotice } from '../../../utils/bookingCancellationFeedback';
import {
  PAYMENT_LABELS,
  formatDateTime,
  formatMoney,
  mapRenterBooking,
} from '../../../utils/renterBookingView';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import RentalContractViewerModal from '../components/RentalContractViewerModal';
import { canRenterViewOfficialRentalContract } from '../../../utils/rentalContractEligibility';

const cardInfoStyle = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #f1f5f9',
  padding: 18,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const PendingShowroomProcessing = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlightedBookingId = params.get('bookingId') || '';
  const fromNotification = params.get('fromNotification') === '1';
  const handledHighlightRef = useRef('');
  const handledScrollRef = useRef('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState({ tone: '', text: '' });
  const [detailModal, setDetailModal] = useState(null);
  const [cancellingId, setCancellingId] = useState('');
  const [contractBookingId, setContractBookingId] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
      const mapped = (data || [])
        .map(mapRenterBooking)
        .filter((booking) => booking.isAwaitingShowroomProcessing);
      setBookings(mapped);
      setError('');
    } catch (err) {
      setBookings([]);
      setError(err.message || 'Không thể tải danh sách đang chờ showroom xử lý.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const summary = useMemo(
    () => ({
      total: bookings.length,
      paid: bookings.filter((booking) => booking.status === 'paid').length,
      confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
      successfulPayments: bookings.filter((booking) => booking.paymentStatus === 'successful').length,
    }),
    [bookings]
  );

  useEffect(() => {
    if (!highlightedBookingId || loading || bookings.length === 0) {
      return;
    }

    const handledKey = `${window.location.pathname}:${highlightedBookingId}`;
    if (handledHighlightRef.current === handledKey) {
      return;
    }

    const targetBooking = bookings.find((booking) => String(booking.id) === String(highlightedBookingId));
    if (!targetBooking) {
      return;
    }

    handledHighlightRef.current = handledKey;
    setDetailModal(targetBooking);
  }, [bookings, highlightedBookingId, loading]);

  useEffect(() => {
    if (!fromNotification || !highlightedBookingId || loading || bookings.length === 0) {
      return;
    }
    if (!bookings.some((b) => String(b.id) === String(highlightedBookingId))) {
      return;
    }
    const key = `${highlightedBookingId}:scroll`;
    if (handledScrollRef.current === key) {
      return;
    }
    handledScrollRef.current = key;
    requestAnimationFrame(() => {
      document.getElementById(`renter-booking-card-${highlightedBookingId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [bookings, fromNotification, highlightedBookingId, loading]);

  const getCancelActionLabel = (booking) => (
    booking.paymentStatus === 'successful'
      ? 'Hủy booking / hoàn tiền'
      : 'Hủy booking'
  );

  const getProcessingLabel = (booking) => {
    if (booking.status === 'confirmed') {
      return 'Showroom đang chuẩn bị bàn giao';
    }

    if (booking.status === 'paid') {
      return 'Đang chờ showroom xác nhận';
    }

    return 'Đang chờ showroom xử lý';
  };

  const handleCancelBooking = async (booking) => {
    const message = booking.paymentStatus === 'successful'
      ? `Hủy booking ${booking.id} cho xe ${booking.vehicleName}? Hệ thống sẽ chạy luồng hoàn tiền theo logic backend nếu booking đã thanh toán.`
      : `Hủy booking ${booking.id} cho xe ${booking.vehicleName}?`;
    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setCancellingId(booking.id);
    setError('');
    setNotice({ tone: '', text: '' });

    try {
      const cancelResult = await bookingService.cancelBooking(booking.id);
      setDetailModal(null);
      await loadBookings();
      setNotice(getCancelBookingNotice(booking, cancelResult));
    } catch (err) {
      setError(err.message || 'Không thể hủy booking lúc này.');
    } finally {
      setCancellingId('');
    }
  };

  return (
    <div className="pending-showroom-processing">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Chờ showroom xử lý</h1>
          <p className="page-subtitle">
            Theo dõi các booking đã thanh toán và đang chờ showroom xác nhận, chuẩn bị bàn giao xe. Đây là màn theo
            dõi trạng thái — showroom cập nhật trên hệ thống; bạn không hoàn tất bàn giao thay showroom tại đây.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="renter-btn-soft" onClick={() => navigate('/renter/pending-pickups')}>
            Chờ nhận xe
          </button>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Đặt xe mới
          </button>
        </div>
      </div>

      {notice.text && (
        <div
          style={{
            marginBottom: 16,
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: '0.84rem',
            lineHeight: 1.6,
            background: notice.tone === 'warning' ? '#fff7ed' : '#f0fdf4',
            border: notice.tone === 'warning' ? '1px solid #fdba74' : '1px solid #86efac',
            color: notice.tone === 'warning' ? '#9a3412' : '#166534',
          }}
        >
          {notice.text}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 16,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: '0.84rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng booking', val: summary.total, color: '#374151' },
          { label: 'Đã thanh toán', val: summary.successfulPayments, color: '#059669' },
          { label: 'Đang chờ xác nhận', val: summary.paid, color: '#d97706' },
          { label: 'Đang chuẩn bị giao', val: summary.confirmed, color: '#2563eb' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              ...cardInfoStyle,
              minWidth: 155,
              textAlign: 'center',
              padding: '14px 18px',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: item.color }}>{item.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <FaSpinner className="animate-spin" style={{ fontSize: '1.4rem', marginBottom: 10 }} />
          <div>Đang tải danh sách chờ showroom xử lý...</div>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ ...cardInfoStyle, textAlign: 'center', padding: 30 }}>
          <MdDirectionsCar style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: 14 }} />
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>Không có booking nào đang chờ showroom xử lý</div>
          <div style={{ fontSize: '0.84rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
            Các booking đã thanh toán nhưng chưa được showroom chuyển sang chờ bàn giao sẽ được hiện tại đây.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="renter-btn-soft" onClick={() => navigate('/renter/bookings')}>
              Mở Chuyến đi của tôi
            </button>
            <button className="btn-primary" onClick={() => navigate('/')}>
              Đặt xe mới
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-list">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              id={`renter-booking-card-${booking.id}`}
              className="booking-card-item"
              style={String(booking.id) === String(highlightedBookingId)
                ? {
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 12px 30px rgba(37, 99, 235, 0.12)',
                  background: '#f8fbff',
                }
                : undefined}
            >
              <div className="booking-card-left">
                <div className="booking-card-img" style={{ overflow: 'hidden', background: '#f3f4f6' }}>
                  {booking.image ? (
                    <img
                      src={booking.image}
                      alt={booking.vehicleName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <MdDirectionsCar style={{ fontSize: '2.5rem', color: '#00b14f' }} />
                  )}
                </div>

                <div className="booking-card-info">
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>{booking.vehicleName}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 3 }}>{booking.showroomName}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <FaCalendarAlt size={11} /> {formatDateTime(booking.startDate)} - {formatDateTime(booking.endDate)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <FaClock size={11} /> {booking.durationDays} ngày
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <FaMapMarkerAlt size={11} /> {booking.locationLabel}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>{booking.statusHeadline}</div>
                  <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#9a3412', lineHeight: 1.6 }}>
                    {booking.pickupConfirmationHint || 'Booking đang chờ showroom xử lý trước khi chuyển sang bước bàn giao xe.'}
                  </div>
                </div>
              </div>

              <div className="booking-card-right">
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={booking.status} />
                  <div style={{ marginTop: 6 }}>
                    <StatusBadge
                      status={booking.paymentStatus}
                      customLabel={PAYMENT_LABELS[booking.paymentStatus] || booking.paymentStatus}
                    />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#00b14f', marginTop: 8 }}>
                    {formatMoney(booking.totalPrice)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>Mã: {booking.id}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="btn-icon" onClick={() => setDetailModal(booking)} title="Chi tiết">
                    <FaEye />
                  </button>

                  {canRenterViewOfficialRentalContract(booking) && (
                    <button
                      type="button"
                      className="renter-btn-soft"
                      style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      onClick={() => setContractBookingId(booking.id)}
                    >
                      {RENTAL_CONTRACT_UI.officialButton}
                    </button>
                  )}

                  {booking.showroomEmail && (
                    <a className="btn-icon" href={`mailto:${booking.showroomEmail}`} title="Liên hệ showroom">
                      <FaEnvelope />
                    </a>
                  )}

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#e2e8f0',
                      color: '#475569',
                    }}
                  >
                    {getProcessingLabel(booking)}
                  </div>

                  {booking.canCancel && (
                    <button
                      className="renter-btn-soft-danger"
                      style={{ opacity: cancellingId === booking.id ? 0.65 : 1 }}
                      onClick={() => handleCancelBooking(booking)}
                      disabled={cancellingId === booking.id}
                    >
                      {cancellingId === booking.id ? 'Đang hủy...' : getCancelActionLabel(booking)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Chi tiết chờ showroom xử lý" width={560}>
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{detailModal.vehicleName}</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>{detailModal.showroomName}</div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              <div style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>{detailModal.statusHeadline}</div>
              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.65, marginBottom: 8 }}>
                {detailModal.waitingForLabel}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, marginBottom: 6 }}>
                {detailModal.waitingOwnerLabel}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
                Bước tiếp theo: {detailModal.nextStepLabel}
              </div>
              <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#0f766e', lineHeight: 1.6 }}>
                Việc bạn nên làm: {detailModal.renterActionHint}
              </div>
            </div>

            {[
              ['Mã booking', detailModal.id],
              ['Ngày nhận xe', formatDateTime(detailModal.startDate)],
              ['Ngày trả xe', formatDateTime(detailModal.endDate)],
              ['Tổng tiền', formatMoney(detailModal.totalPrice)],
              ['Trạng thái booking', detailModal.status],
              ['Trạng thái thanh toán', PAYMENT_LABELS[detailModal.paymentStatus] || detailModal.paymentStatus],
              ['Địa điểm giao nhận', detailModal.locationLabel],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderBottom: '1px solid #f3f4f6',
                  paddingBottom: 10,
                }}
              >
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</span>
              </div>
            ))}

            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                borderRadius: 12,
                padding: '12px 14px',
                fontSize: '0.8rem',
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontWeight: 800 }}>
                <FaStore />
                Đang chờ showroom xử lý
              </div>
              Showroom cần xác nhận và chuẩn bị bàn giao xe trước khi booking này được chuyển sang "Chờ nhận xe".
            </div>

            {detailModal.showroomEmail && (
              <a
                href={`mailto:${detailModal.showroomEmail}`}
                className="renter-btn-soft"
                style={{ justifyContent: 'center' }}
              >
                <FaEnvelope /> Liên hệ showroom
              </a>
            )}

            {canRenterViewOfficialRentalContract(detailModal) && (
              <button
                type="button"
                className="renter-btn-soft"
                style={{ justifyContent: 'center' }}
                onClick={() => setContractBookingId(detailModal.id)}
              >
                {RENTAL_CONTRACT_UI.officialButton}
              </button>
            )}

            {detailModal.canCancel && (
              <button
                className="renter-btn-soft-danger"
                style={{ justifyContent: 'center' }}
                onClick={() => handleCancelBooking(detailModal)}
              >
                <FaTimesCircle /> {getCancelActionLabel(detailModal)}
              </button>
            )}
          </div>
        )}
      </Modal>

      <RentalContractViewerModal
        isOpen={!!contractBookingId}
        bookingId={contractBookingId || ''}
        onClose={() => setContractBookingId(null)}
      />
    </div>
  );
};

export default PendingShowroomProcessing;
