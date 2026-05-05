import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaClock,
  FaCreditCard,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaSpinner,
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

const cardInfoStyle = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #f1f5f9',
  padding: 18,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const PendingPayments = () => {
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

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
      const mapped = (data || []).map(mapRenterBooking).filter((booking) => booking.isAwaitingPayment);
      setBookings(mapped);
      setError('');
    } catch (err) {
      setBookings([]);
      setError(err.message || 'Không thể tải danh sách chờ thanh toán.');
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
      pending: bookings.filter((booking) => booking.paymentStatus === 'pending').length,
      retry: bookings.filter((booking) => booking.canRetryPayment).length,
      failed: bookings.filter((booking) => ['failed', 'declined'].includes(booking.paymentStatus)).length,
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

  const getPaymentResultUrl = (booking) =>
    `/renter/payment-result?bookingId=${booking.id}&status=${booking.paymentStatus === 'successful'
      ? 'success'
      : booking.paymentStatus === 'pending'
        ? 'pending'
        : 'error'
    }`;

  const getRetryPaymentUrl = (booking) => `/renter/retry-payment/${booking.id}`;

  const getCancelActionLabel = (booking) => (
    booking.paymentStatus === 'successful'
      ? 'Hủy booking / hoàn tiền'
      : 'Hủy booking'
  );

  const getPaymentWaitingLabel = (booking) => {
    if (booking.canRetryPayment) {
      return 'Chờ bạn thanh toán lại';
    }

    if (booking.paymentStatus === 'pending') {
      return 'Chờ bạn thanh toán';
    }

    return 'Đang chờ bạn hoàn tất thanh toán';
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
    <div className="pending-payments">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Chờ thanh toán</h1>
          <p className="page-subtitle">
            Lưu và theo dõi các booking đang chờ thanh toán hoặc cần thanh toán lại trước khi showroom bàn giao xe.
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
          { label: 'Đang chờ thanh toán', val: summary.pending, color: '#d97706' },
          { label: 'Cần thanh toán lại', val: summary.retry, color: '#059669' },
          { label: 'Thất bại / từ chối', val: summary.failed, color: '#dc2626' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              ...cardInfoStyle,
              minWidth: 150,
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
          <div>Đang tải danh sách chờ thanh toán...</div>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ ...cardInfoStyle, textAlign: 'center', padding: 30 }}>
          <MdDirectionsCar style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: 14 }} />
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>Không có booking nào đang chờ thanh toán</div>
          <div style={{ fontSize: '0.84rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
            Các booking chưa thanh toán xong hoặc cần retry payment sẽ được lưu tại đây để bạn quay lại xử lý bất cứ lúc nào.
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
              onClick={() => setDetailModal(booking)}
              style={String(booking.id) === String(highlightedBookingId)
                ? {
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 12px 30px rgba(37, 99, 235, 0.12)',
                  background: '#f8fbff',
                  cursor: 'pointer',
                }
                : { cursor: 'pointer' }}
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
                  <div style={{ marginTop: 4, fontSize: '0.76rem', color: '#6b7280', lineHeight: 1.6 }}>
                    {booking.waitingForLabel}
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
                    {getPaymentWaitingLabel(booking)}
                  </div>

                  {booking.canRetryPayment && (
                    <button
                      className="renter-btn-soft-success"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(getRetryPaymentUrl(booking));
                      }}
                    >
                      <FaCreditCard /> Thanh toán lại
                    </button>
                  )}

                  {booking.canCancel && (
                    <button
                      className="renter-btn-soft-danger"
                      style={{ opacity: cancellingId === booking.id ? 0.65 : 1 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCancelBooking(booking);
                      }}
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

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Chi tiết chờ thanh toán" width={560}>
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
              ['Phương thức thanh toán', detailModal.paymentMethod],
              ['Ghi chú / nhận xe', detailModal.locationLabel],
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

            {detailModal.pickupConfirmationHint && (
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fdba74',
                  color: '#9a3412',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                }}
              >
                {detailModal.pickupConfirmationHint}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => navigate(getPaymentResultUrl(detailModal))}
              >
                <FaMoneyBillWave /> Xem kết quả thanh toán
              </button>

              {detailModal.canRetryPayment && (
                <button
                  className="renter-btn-soft-success"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => navigate(getRetryPaymentUrl(detailModal))}
                >
                  <FaCreditCard /> Thanh toán lại
                </button>
              )}

              {detailModal.canCancel && (
                <button
                  className="renter-btn-soft-danger"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => handleCancelBooking(detailModal)}
                >
                  <FaTimesCircle /> {getCancelActionLabel(detailModal)}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingPayments;
