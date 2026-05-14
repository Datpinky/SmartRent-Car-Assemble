import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ContractModal from '../../../components/common/ContractModal';
import Modal from '../../../components/common/Modal';
import SkeletonCard from '../../../components/common/SkeletonCard';
import bookingService from '../../../services/bookingService';
import inspectionService, { attachLatestAiInspectionToBookings } from '../../../services/inspectionService';
import { mapRenterBooking } from '../../../utils/renterBookingView';
import BookingCardItem from './components/BookingCardItem';
import BookingDetailsContent from './components/BookingDetailsContent';
import BookingsSearchBar from './components/BookingsSearchBar';
import BookingsSummaryCards from './components/BookingsSummaryCards';
import EmptyActiveBookingsState from './components/EmptyActiveBookingsState';
import { applyRenterBookingUpdate, buildActiveBookingsSummary, filterActiveBookingsByTerm } from './myBookings.helpers';
import RentalFlowModal from './RentalFlowModal';

const MyBookings = () => {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [rentalModalBooking, setRentalModalBooking] = useState(null);
  const [contractBookingId, setContractBookingId] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const [data, inspectionResponse] = await Promise.all([
        bookingService.getCurrentRoleBookingsDetailed(),
        inspectionService.list({ inspection_type: 'return', page: 1, limit: 200 }),
      ]);
      const withAi = attachLatestAiInspectionToBookings(data || [], inspectionResponse?.items || []);
      setBookings(withAi.map(mapRenterBooking));
      setError('');
    } catch (err) {
      setBookings([]);
      setError(err.message || 'Không thể tải danh sách xe đang thuê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const activeBookings = useMemo(() => bookings.filter((booking) => booking.isActive), [bookings]);

  const displayedBookings = useMemo(
    () => filterActiveBookingsByTerm(activeBookings, searchTerm),
    [activeBookings, searchTerm],
  );

  useEffect(() => {
    if (!fromNotification || !highlightedBookingId || loading) {
      return;
    }
    if (!displayedBookings.some((b) => String(b.id) === String(highlightedBookingId))) {
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
  }, [displayedBookings, fromNotification, highlightedBookingId, loading]);

  const summary = useMemo(() => buildActiveBookingsSummary(activeBookings), [activeBookings]);

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

    if (targetBooking.isAwaitingPayment) {
      navigate(
        `/renter/pending-payments?bookingId=${targetBooking.id}&fromNotification=${fromNotification ? '1' : '0'}`,
        { replace: true },
      );
      return;
    }

    if (targetBooking.isAwaitingShowroomProcessing) {
      navigate(
        `/renter/pending-showroom-processing?bookingId=${targetBooking.id}&fromNotification=${fromNotification ? '1' : '0'}`,
        { replace: true },
      );
      return;
    }

    if (targetBooking.isAwaitingPickup) {
      navigate(
        `/renter/pending-pickups?bookingId=${targetBooking.id}&fromNotification=${fromNotification ? '1' : '0'}`,
        { replace: true },
      );
      return;
    }

    if (targetBooking.isActive) {
      setDetailModal(targetBooking);
    }
  }, [bookings, fromNotification, highlightedBookingId, loading, navigate]);

  const handleWorkflowSaved = (payload) => {
    const targetId = rentalModalBooking?.id;
    if (!targetId) {
      return;
    }

    const nextWorkflow = payload?.workflow || payload;
    const nextStatus = payload?.status || '';

    const applyByTarget = (booking) => {
      if (!booking || booking.id !== targetId) {
        return booking;
      }

      return applyRenterBookingUpdate(booking, nextStatus, nextWorkflow, payload?.ai_inspection);
    };

    setBookings((current) => current.map((booking) => applyByTarget(booking)));
    setDetailModal((current) => (current ? applyByTarget(current) : current));
    setRentalModalBooking((current) => (current ? applyByTarget(current) : current));

    if (payload?.notice?.text) {
      setNotice(payload.notice);
      return;
    }

    if (nextStatus === 'waiting_return_confirmation') {
      setNotice({
        tone: 'success',
        text: 'Trạng thái đơn trên hệ thống: chờ showroom xác nhận trả xe (nếu bạn vừa chỉ lưu hồ sơ cục bộ, hãy vẫn liên hệ showroom để đóng đơn đặt xe).',
      });
    }
  };

  return (
    <div className="my-bookings">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Chuyến đi của tôi</h1>
          <p className="page-subtitle">Xem danh sách thuê xe và quản lý quy trình trả xe khi đến hạn.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Hành trình mới
        </button>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
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

      {notice.text && (
        <div
          role="status"
          aria-live="polite"
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

      <BookingsSummaryCards summary={summary} />

      <BookingsSearchBar value={searchTerm} onChange={setSearchTerm} />

      <div className="booking-list" aria-label="Danh sách chuyến đi" aria-busy={loading}>
        {loading ? (
          <SkeletonCard count={3} />
        ) : displayedBookings.length === 0 ? (
          <EmptyActiveBookingsState
            onOpenPendingShowroom={() => navigate('/renter/pending-showroom-processing')}
            onOpenPendingPickups={() => navigate('/renter/pending-pickups')}
            onCreateBooking={() => navigate('/')}
          />
        ) : (
          displayedBookings.map((booking) => (
            <BookingCardItem
              key={booking.id}
              booking={booking}
              isHighlighted={String(booking.id) === String(highlightedBookingId)}
              onOpenDetail={setDetailModal}
              onOpenContract={setContractBookingId}
              onOpenRentalFlow={setRentalModalBooking}
            />
          ))
        )}
      </div>

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Chi tiết xe đang thuê" width={520}>
        <BookingDetailsContent
          booking={detailModal}
          onOpenContract={setContractBookingId}
          onOpenRentalFlow={setRentalModalBooking}
        />
      </Modal>

      <RentalFlowModal
        isOpen={!!rentalModalBooking}
        onClose={() => setRentalModalBooking(null)}
        booking={rentalModalBooking}
        onSaved={handleWorkflowSaved}
      />

      <ContractModal
        isOpen={!!contractBookingId}
        bookingId={contractBookingId || ''}
        onClose={() => setContractBookingId(null)}
      />
    </div>
  );
};

export default MyBookings;
