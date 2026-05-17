import { useEffect, useRef, useState } from 'react';
import { FaEnvelope, FaSpinner, FaStore, FaTimesCircle } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ContractModal from '../../../components/common/ContractModal';
import Modal from '../../../components/common/Modal';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import bookingService from '../../../services/bookingService';
import { getCancelBookingNotice } from '../../../utils/bookingCancellationFeedback';
import { canRenterViewOfficialRentalContract } from '../../../utils/rentalContractEligibility';
import { PAYMENT_LABELS, formatDateTime, formatMoney, mapRenterBooking } from '../../../utils/renterBookingView';
import ProcessingBookingCard from './components/ProcessingBookingCard';
import { cardInfoStyle, getCancelActionLabel } from './pendingShowroomProcessing.helpers';

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
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
      const mapped = (data || []).map(mapRenterBooking).filter((b) => b.isAwaitingShowroomProcessing);
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

  useEffect(() => {
    if (!highlightedBookingId || loading || bookings.length === 0) return;
    const key = `${window.location.pathname}:${highlightedBookingId}`;
    if (handledHighlightRef.current === key) return;
    const target = bookings.find((b) => String(b.id) === String(highlightedBookingId));
    if (!target) return;
    handledHighlightRef.current = key;
    setDetailModal(target);
  }, [bookings, highlightedBookingId, loading]);

  useEffect(() => {
    if (!fromNotification || !highlightedBookingId || loading || bookings.length === 0) return;
    if (!bookings.some((b) => String(b.id) === String(highlightedBookingId))) return;
    const key = `${highlightedBookingId}:scroll`;
    if (handledScrollRef.current === key) return;
    handledScrollRef.current = key;
    requestAnimationFrame(() => {
      document
        .getElementById(`renter-booking-card-${highlightedBookingId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [bookings, fromNotification, highlightedBookingId, loading]);

  const handleCancelBooking = (booking) => setCancelConfirmBooking(booking);

  const executeCancelBooking = async (booking) => {
    setCancelConfirmBooking(null);
    setCancellingId(booking.id);
    setError('');
    setNotice({ tone: '', text: '' });
    try {
      const cancelResult = await bookingService.cancelBooking(booking.id);
      setDetailModal(null);
      await loadBookings();
      setNotice(getCancelBookingNotice(booking, cancelResult));
    } catch (err) {
      setError(err.message || 'Không thể hủy đơn đặt xe lúc này.');
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
            Theo dõi các booking đã thanh toán và đang chờ showroom xác nhận, chuẩn bị bàn giao xe.
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <FaSpinner className="animate-spin" style={{ fontSize: '1.4rem', marginBottom: 10 }} />
          <div>Đang tải danh sách chờ showroom xử lý...</div>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ ...cardInfoStyle, textAlign: 'center', padding: 30 }}>
          <MdDirectionsCar style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: 14 }} />
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>
            Không có booking nào đang chờ showroom xử lý
          </div>
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
            <ProcessingBookingCard
              key={booking.id}
              booking={booking}
              highlightedBookingId={highlightedBookingId}
              cancellingId={cancellingId}
              setContractBookingId={setContractBookingId}
              handleCancelBooking={handleCancelBooking}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Chi tiết chờ showroom xử lý"
        width={560}
      >
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{detailModal.vehicleName}</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>{detailModal.showroomName}</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
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
              ['Mã đơn', detailModal.id],
              ['Ngày nhận xe', formatDateTime(detailModal.startDate)],
              ['Ngày trả xe', formatDateTime(detailModal.endDate)],
              ['Tổng tiền', formatMoney(detailModal.totalPrice)],
              ['Trạng thái đơn', detailModal.status],
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
                <FaStore /> Đang chờ showroom xử lý
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

      <ContractModal
        isOpen={!!contractBookingId}
        bookingId={contractBookingId || ''}
        onClose={() => setContractBookingId(null)}
      />

      <Modal
        isOpen={!!cancelConfirmBooking}
        onClose={() => setCancelConfirmBooking(null)}
        title="Xác nhận hủy đơn đặt xe"
        width={460}
        footer={
          <>
            <button className="btn-outline" onClick={() => setCancelConfirmBooking(null)}>
              Giữ đơn
            </button>
            <button
              className="btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
              onClick={() => executeCancelBooking(cancelConfirmBooking)}
              disabled={cancellingId === cancelConfirmBooking?.id}
            >
              {cancellingId === cancelConfirmBooking?.id ? 'Đang hủy...' : 'Hủy đơn đặt xe'}
            </button>
          </>
        }
      >
        {cancelConfirmBooking && (
          <div style={{ color: '#374151', fontSize: '0.9rem' }}>
            <p style={{ marginBottom: 8 }}>
              Bạn có chắc muốn hủy đơn đặt xe cho xe <strong>{cancelConfirmBooking.vehicleName}</strong>?
            </p>
            {cancelConfirmBooking.paymentStatus === 'successful' && (
              <p
                style={{
                  margin: 0,
                  padding: '8px 12px',
                  background: '#fef3c7',
                  borderRadius: 8,
                  color: '#92400e',
                  fontSize: '0.82rem',
                }}
              >
                ⚠️ Booking đã thanh toán. Hệ thống sẽ tự động xử lý hoàn tiền sau khi hủy.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingShowroomProcessing;
