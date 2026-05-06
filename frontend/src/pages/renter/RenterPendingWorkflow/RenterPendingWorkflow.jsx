import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaClock,
  FaCreditCard,
  FaEnvelope,
  FaEye,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaSpinner,
  FaStore,
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
  isPaymentStatusBadgeRedundant,
  mapRenterBooking,
} from '../../../utils/renterBookingView';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import RentalContractViewerModal from '../components/RentalContractViewerModal';
import { canRenterViewOfficialRentalContract } from '../../../utils/rentalContractEligibility';

const TAB_PAYMENT = 'payment';
const TAB_SHOWROOM = 'showroom';
const TAB_PICKUP = 'pickup';

const VALID_TABS = new Set([TAB_PAYMENT, TAB_SHOWROOM, TAB_PICKUP]);

const normalizeTab = (raw) => {
  const v = String(raw || '').trim();
  return VALID_TABS.has(v) ? v : TAB_PAYMENT;
};

const cardInfoStyle = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #f1f5f9',
  padding: 18,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const pickWaitingLabel = () => 'Đang chờ Showroom hoàn tất bàn giao';

const RenterPendingWorkflow = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = normalizeTab(searchParams.get('tab'));
  const highlightedBookingId = searchParams.get('bookingId') || '';
  const fromNotification = searchParams.get('fromNotification') === '1';

  const handledHighlightRef = useRef('');
  const handledScrollRef = useRef('');
  const syncedTabForBookingRef = useRef('');

  const [rawBookings, setRawBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState({ tone: '', text: '' });
  const [detailModal, setDetailModal] = useState(null);
  const [cancellingId, setCancellingId] = useState('');
  const [contractBookingId, setContractBookingId] = useState(null);

  const setTab = useCallback(
    (next) => {
      setDetailModal(null);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', next);
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams],
  );

  const loadBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
      const mapped = (data || []).map(mapRenterBooking);
      setRawBookings(mapped);
      setError('');
    } catch (err) {
      setRawBookings([]);
      setError(err.message || 'Không thể tải danh sách đặt xe đang chờ.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadBookings({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loadBookings]);

  const paymentBookings = useMemo(
    () => rawBookings.filter((b) => b.isAwaitingPayment),
    [rawBookings],
  );
  const showroomBookings = useMemo(
    () => rawBookings.filter((b) => b.isAwaitingShowroomProcessing),
    [rawBookings],
  );
  const pickupBookings = useMemo(
    () => rawBookings.filter((b) => b.isAwaitingPickup),
    [rawBookings],
  );

  const activeBookings = useMemo(() => {
    if (tab === TAB_PAYMENT) return paymentBookings;
    if (tab === TAB_SHOWROOM) return showroomBookings;
    return pickupBookings;
  }, [tab, paymentBookings, showroomBookings, pickupBookings]);

  const tabCounts = useMemo(
    () => ({
      [TAB_PAYMENT]: paymentBookings.length,
      [TAB_SHOWROOM]: showroomBookings.length,
      [TAB_PICKUP]: pickupBookings.length,
    }),
    [paymentBookings.length, showroomBookings.length, pickupBookings.length],
  );

  /** Đồng bộ tab khi deep-link bookingId thuộc nhóm khác */
  useEffect(() => {
    if (!highlightedBookingId || loading || rawBookings.length === 0) return;

    const booking = rawBookings.find((b) => String(b.id) === String(highlightedBookingId));
    if (!booking) return;

    if (!booking.isAwaitingPayment && !booking.isAwaitingShowroomProcessing && !booking.isAwaitingPickup) {
      return;
    }

    let preferred = TAB_PAYMENT;
    if (booking.isAwaitingShowroomProcessing) preferred = TAB_SHOWROOM;
    else if (booking.isAwaitingPickup) preferred = TAB_PICKUP;
    else preferred = TAB_PAYMENT;

    const marker = `${highlightedBookingId}:${preferred}`;
    if (syncedTabForBookingRef.current === marker) return;

    if (tab !== preferred) {
      syncedTabForBookingRef.current = marker;
      const next = new URLSearchParams(searchParams);
      next.set('tab', preferred);
      setSearchParams(next);
    } else {
      syncedTabForBookingRef.current = marker;
    }
  }, [highlightedBookingId, loading, rawBookings, tab, searchParams, setSearchParams]);


  useEffect(() => {
    if (!highlightedBookingId || loading || activeBookings.length === 0) return;

    const handledKey = `/renter/pending:${tab}:${highlightedBookingId}`;
    if (handledHighlightRef.current === handledKey) return;

    const targetBooking = activeBookings.find((b) => String(b.id) === String(highlightedBookingId));
    if (!targetBooking) return;

    handledHighlightRef.current = handledKey;
    setDetailModal(targetBooking);
  }, [activeBookings, highlightedBookingId, loading, tab]);

  useEffect(() => {
    if (!fromNotification || !highlightedBookingId || loading || activeBookings.length === 0) {
      return;
    }
    if (!activeBookings.some((b) => String(b.id) === String(highlightedBookingId))) {
      return;
    }
    const key = `${highlightedBookingId}:scroll:${tab}`;
    if (handledScrollRef.current === key) return;
    handledScrollRef.current = key;
    requestAnimationFrame(() => {
      document.getElementById(`renter-booking-card-${highlightedBookingId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [activeBookings, fromNotification, highlightedBookingId, loading, tab]);

  const getPaymentResultUrl = (booking) =>
    `/renter/payment-result?bookingId=${booking.id}&status=${booking.paymentStatus === 'successful'
      ? 'success'
      : booking.paymentStatus === 'pending'
        ? 'pending'
        : 'error'
    }`;

  const getRetryPaymentUrl = (booking) => `/renter/retry-payment/${booking.id}`;

  const getCancelActionLabel = (booking) =>
    booking.paymentStatus === 'successful' ? 'Hủy booking / hoàn tiền' : 'Hủy booking';

  const getPaymentWaitingLabel = (booking) => {
    if (booking.canRetryPayment) return 'Chờ bạn thanh toán lại';
    if (booking.paymentStatus === 'pending') return 'Chờ bạn thanh toán';
    return 'Đang chờ bạn hoàn tất thanh toán';
  };

  const handleCancelBooking = async (booking) => {
    const message =
      booking.paymentStatus === 'successful'
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

  const tabMeta = [
    { key: TAB_PAYMENT, label: 'Chờ thanh toán' },
    { key: TAB_SHOWROOM, label: 'Chờ showroom xử lý' },
    { key: TAB_PICKUP, label: 'Chờ nhận xe' },
  ];


  const emptyCopy = () => {
    if (tab === TAB_PAYMENT) {
      return {
        title: 'Không có booking nào đang chờ thanh toán',
        hint:
          'Các booking chưa thanh toán xong hoặc cần retry payment sẽ được lưu tại đây để bạn quay lại xử lý bất cứ lúc nào.',
      };
    }
    if (tab === TAB_SHOWROOM) {
      return {
        title: 'Không có booking nào đang chờ showroom xử lý',
        hint:
          'Các booking đã thanh toán nhưng chưa được showroom chuyển sang chờ bàn giao sẽ được hiện tại đây.',
      };
    }
    return {
      title: 'Không có booking nào chờ nhận xe',
      hint:
        'Booking sẽ hiện tại đây khi showroom đã chuyển sang chờ bàn giao và đang hoàn tất bước bàn giao trên hệ thống.',
    };
  };

  const cardHighlightStyle = {
    border: '1px solid #bfdbfe',
    boxShadow: '0 12px 30px rgba(37, 99, 235, 0.12)',
    background: '#f8fbff',
  };

  const isHighlightedBooking = (booking) =>
    Boolean(highlightedBookingId) && String(booking.id) === String(highlightedBookingId);

  const renderBookingList = () => (
    <div className="booking-list">
      {activeBookings.map((booking) => {
        const clickable = tab === TAB_PAYMENT || tab === TAB_PICKUP;
        return (
          <div
            key={booking.id}
            id={`renter-booking-card-${booking.id}`}
            className="booking-card-item"
            onClick={clickable ? () => setDetailModal(booking) : undefined}
            style={{
              ...(isHighlightedBooking(booking) ? cardHighlightStyle : {}),
              ...(clickable ? { cursor: 'pointer' } : {}),
            }}
          >
            {bookingCardInner(booking)}
          </div>
        );
      })}
    </div>
  );

  function bookingCardInner(booking) {
    const baseLeft = (
      <>
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
            <div style={{ marginTop: 8, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
              {booking.statusHeadline}
            </div>
            {tab === TAB_PAYMENT && (
              <div style={{ marginTop: 4, fontSize: '0.76rem', color: '#6b7280', lineHeight: 1.6 }}>
                {booking.waitingForLabel}
              </div>
            )}
            {tab === TAB_SHOWROOM && (
              <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#9a3412', lineHeight: 1.6 }}>
                {booking.pickupConfirmationHint ||
                  'Booking đang chờ showroom xử lý trước khi chuyển sang bước bàn giao xe.'}
              </div>
            )}
            {tab === TAB_PICKUP && (
              <>
                <div style={{ marginTop: 4, fontSize: '0.76rem', color: '#6b7280', lineHeight: 1.6 }}>
                  {booking.waitingForLabel}
                </div>
                {booking.pickupConfirmationHint && (
                  <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#9a3412', lineHeight: 1.6 }}>
                    {booking.pickupConfirmationHint}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </>
    );

    const badgesPrice = (
      <div className="booking-card-right">
        <div style={{ textAlign: 'right' }}>
          <StatusBadge status={booking.status} />
          {!isPaymentStatusBadgeRedundant(booking.status, booking.paymentStatus) && (
            <div style={{ marginTop: 6 }}>
              <StatusBadge
                status={booking.paymentStatus}
                customLabel={PAYMENT_LABELS[booking.paymentStatus] || booking.paymentStatus}
              />
            </div>
          )}
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#00b14f', marginTop: 8 }}>
            {formatMoney(booking.totalPrice)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>Mã: {booking.id}</div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {tab === TAB_PAYMENT && (
            <>
              {!booking.canRetryPayment && (
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
              )}
              {booking.canRetryPayment && (
                <button
                  className="renter-btn-soft-success"
                  type="button"
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
                  type="button"
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
            </>
          )}

          {tab === TAB_SHOWROOM && (
            <>
              <button
                type="button"
                className="renter-btn-soft"
                style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                onClick={(event) => {
                  event.stopPropagation();
                  setDetailModal(booking);
                }}
              >
                <FaEye />
                Chi tiết
              </button>
              {booking.showroomEmail && (
                <a className="btn-icon" href={`mailto:${booking.showroomEmail}`} title="Liên hệ showroom">
                  <FaEnvelope />
                </a>
              )}
              {booking.canCancel && (
                <button
                  className="renter-btn-soft-danger"
                  type="button"
                  style={{ opacity: cancellingId === booking.id ? 0.65 : 1 }}
                  onClick={() => handleCancelBooking(booking)}
                  disabled={cancellingId === booking.id}
                >
                  {cancellingId === booking.id ? 'Đang hủy...' : getCancelActionLabel(booking)}
                </button>
              )}
            </>
          )}

          {tab === TAB_PICKUP && (
            <>
              {canRenterViewOfficialRentalContract(booking) && (
                <button
                  type="button"
                  className="renter-btn-soft"
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setContractBookingId(booking.id);
                  }}
                >
                  {RENTAL_CONTRACT_UI.officialButton}
                </button>
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
                {pickWaitingLabel()}
              </div>
              {booking.showroomEmail && (
                <a
                  className="renter-btn-soft"
                  href={`mailto:${booking.showroomEmail}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <FaEnvelope /> Liên hệ Showroom
                </a>
              )}
            </>
          )}
        </div>
      </div>
    );

    return (
      <>
        {baseLeft}
        {badgesPrice}
      </>
    );
  }

  const ec = emptyCopy();

  return (
    <div className="renter-pending-workflow">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Đặt xe đang chờ</h1>
          <p className="page-subtitle" style={{ maxWidth: 760 }}>
            Theo dõi các bước chờ thanh toán, chờ showroom xử lý và chờ nhận xe — chọn nhóm bên dưới giống trang quản lý
            booking của showroom.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="renter-btn-soft" onClick={() => navigate('/renter/bookings')}>
            Chuyến đi của tôi
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate('/')}>
            Đặt xe mới
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabMeta.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              padding: '6px 14px',
              borderRadius: 50,
              border: '1.5px solid',
              borderColor: tab === key ? '#00b14f' : '#e5e7eb',
              background: tab === key ? '#00b14f' : '#fff',
              color: tab === key ? '#fff' : '#374151',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {label}
            <span className="tabular-nums" style={{ marginLeft: 6, opacity: 0.85 }}>
              ({tabCounts[key]})
            </span>
          </button>
        ))}
      </div>

      {notice.text && (tab === TAB_PAYMENT || tab === TAB_SHOWROOM) && (
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


      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <FaSpinner className="animate-spin" style={{ fontSize: '1.4rem', marginBottom: 10 }} />
          <div>Đang tải danh sách...</div>
        </div>
      ) : activeBookings.length === 0 ? (
        <div style={{ ...cardInfoStyle, textAlign: 'center', padding: 30 }}>
          <MdDirectionsCar style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: 14 }} />
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>{ec.title}</div>
          <div style={{ fontSize: '0.84rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>{ec.hint}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="renter-btn-soft" onClick={() => navigate('/renter/bookings')}>
              Mở Chuyến đi của tôi
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate('/')}>
              Đặt xe mới
            </button>
          </div>
        </div>
      ) : (
        renderBookingList()
      )}

      <Modal
        isOpen={!!detailModal && tab === TAB_PAYMENT}
        onClose={() => setDetailModal(null)}
        title="Chi tiết chờ thanh toán"
        width={560}
      >
        {detailModal && tab === TAB_PAYMENT && (
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
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                  {value}
                </span>
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
                type="button"
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => navigate(getPaymentResultUrl(detailModal))}
              >
                <FaMoneyBillWave /> Xem kết quả thanh toán
              </button>

              {detailModal.canRetryPayment && (
                <button
                  type="button"
                  className="renter-btn-soft-success"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => navigate(getRetryPaymentUrl(detailModal))}
                >
                  <FaCreditCard /> Thanh toán lại
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!detailModal && tab === TAB_SHOWROOM}
        onClose={() => setDetailModal(null)}
        title="Chi tiết chờ showroom xử lý"
        width={560}
      >
        {detailModal && tab === TAB_SHOWROOM && (
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
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                  {value}
                </span>
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
              Showroom cần xác nhận và chuẩn bị bàn giao xe trước khi booking chuyển sang «Chờ nhận xe».
            </div>

            {detailModal.showroomEmail && (
              <a href={`mailto:${detailModal.showroomEmail}`} className="renter-btn-soft" style={{ justifyContent: 'center' }}>
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
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!detailModal && tab === TAB_PICKUP}
        onClose={() => setDetailModal(null)}
        title="Chi tiết chờ nhận xe"
        width={560}
      >
        {detailModal && tab === TAB_PICKUP && (
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
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                  {value}
                </span>
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

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                background: '#e2e8f0',
                color: '#475569',
                padding: '12px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                minHeight: 42,
                textAlign: 'center',
              }}
            >
              {pickWaitingLabel()}
            </div>

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

            {detailModal.showroomEmail && (
              <a className="renter-btn-soft" href={`mailto:${detailModal.showroomEmail}`} style={{ justifyContent: 'center' }}>
                <FaEnvelope /> Liên hệ Showroom xác nhận bàn giao
              </a>
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

export default RenterPendingWorkflow;
