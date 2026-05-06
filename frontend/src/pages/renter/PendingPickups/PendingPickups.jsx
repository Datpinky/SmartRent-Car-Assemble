import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaClock,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSpinner,
} from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
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

const cardInfoStyle = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #f1f5f9',
  padding: 18,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const PendingPickups = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlightedBookingId = params.get('bookingId') || '';
  const fromNotification = params.get('fromNotification') === '1';
  const handledHighlightRef = useRef('');
  const handledScrollRef = useRef('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [contractBookingId, setContractBookingId] = useState(null);

  const loadBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed({ bypassCache: true });
      const mapped = (data || [])
        .map(mapRenterBooking)
        .filter((booking) => booking.isAwaitingPickup);
      setBookings(mapped);
      setError('');
    } catch (err) {
      setBookings([]);
      setError(err.message || 'Không thể tải danh sách chờ nhận xe.');
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

  const summary = useMemo(
    () => ({
      total: bookings.length,
      waiting: bookings.length,
      readyForHandover: bookings.filter((booking) => booking.status === 'waiting_handover').length,
      contactable: bookings.filter((booking) => Boolean(booking.showroomEmail)).length,
    }),
    [bookings]
  );

  return (
    <div className="pending-pickups">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Chờ nhận xe</h1>
          <p className="page-subtitle" style={{ marginTop: 6, maxWidth: 720 }}>
            Theo dõi booking đang chờ showroom hoàn tất bàn giao.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="renter-btn-soft" onClick={() => navigate('/renter/pending-showroom-processing')}>
            Chờ showroom xử lý
          </button>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Đặt xe mới
          </button>
        </div>
      </div>

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
          { label: 'Đang chờ bàn giao', val: summary.waiting, color: '#d97706' },
          { label: 'Đã sẵn sàng giao', val: summary.readyForHandover, color: '#2563eb' },
          { label: 'Có email showroom', val: summary.contactable, color: '#059669' },
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
          <div>Đang tải danh sách chờ nhận xe...</div>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ ...cardInfoStyle, textAlign: 'center', padding: 30 }}>
          <MdDirectionsCar style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: 14 }} />
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>Không có booking nào chờ nhận xe</div>
          <div style={{ fontSize: '0.84rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
            Booking sẽ hiện tại đây khi Showroom đã chuyển sang Chờ bàn giao và đang hoàn tất bước bàn giao trên hệ thống.
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
                </div>
              </div>

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
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>Ma: {booking.id}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                  {booking.showroomEmail && (
                    <a
                      className="renter-btn-soft"
                      href={`mailto:${booking.showroomEmail}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <FaEnvelope /> Liên hệ Showroom
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Chi tiet cho nhan xe" width={560}>
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
              <div style={{ fontWeight: 800, color: '#111827' }}>{detailModal.statusHeadline}</div>
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
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</span>
              </div>
            ))}

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
              <a
                className="renter-btn-soft"
                href={`mailto:${detailModal.showroomEmail}`}
                style={{ justifyContent: 'center' }}
              >
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

export default PendingPickups;
