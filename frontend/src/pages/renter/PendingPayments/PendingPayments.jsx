import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCreditCard, FaMoneyBillWave, FaTimesCircle } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import Modal from '../../../components/common/Modal';
import SkeletonCard from '../../../components/common/SkeletonCard';
import bookingService from '../../../services/bookingService';
import { getCancelBookingNotice } from '../../../utils/bookingCancellationFeedback';
import { PAYMENT_LABELS, formatDateTime, formatMoney, mapRenterBooking } from '../../../utils/renterBookingView';
import PaymentBookingCard from './components/PaymentBookingCard';
import {
  cardInfoStyle,
  getCancelActionLabel,
  getPaymentResultUrl,
  getRetryPaymentUrl,
} from './pendingPayments.helpers';

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
  const [confirmCancelTarget, setConfirmCancelTarget] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
      const mapped = (data || []).map(mapRenterBooking).filter((b) => b.isAwaitingPayment);
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
      pending: bookings.filter((b) => b.paymentStatus === 'pending').length,
      retry: bookings.filter((b) => b.canRetryPayment).length,
      failed: bookings.filter((b) => ['failed', 'declined'].includes(b.paymentStatus)).length,
    }),
    [bookings],
  );

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

  const handleCancelBooking = (booking) => setConfirmCancelTarget(booking);

  const executeCancel = async () => {
    const booking = confirmCancelTarget;
    if (!booking) return;
    setConfirmCancelTarget(null);
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
    <div className="pending-payments">
      <ConfirmDialog
        isOpen={!!confirmCancelTarget}
        title="Xác nhận hủy đơn đặt xe"
        message={
          confirmCancelTarget?.paymentStatus === 'successful'
            ? `Bạn có chắc muốn hủy booking xe "${confirmCancelTarget?.vehicleName}"? Vì đã thanh toán, tiền hoàn lại sẽ được xử lý theo chính sách của hệ thống (5–10 ngày làm việc).`
            : `Bạn có chắc muốn hủy booking xe "${confirmCancelTarget?.vehicleName}"?`
        }
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ lại"
        confirmVariant="danger"
        loading={!!cancellingId}
        onConfirm={executeCancel}
        onCancel={() => setConfirmCancelTarget(null)}
      />

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

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng đơn', val: summary.total, color: '#374151' },
          { label: 'Đang chờ thanh toán', val: summary.pending, color: '#d97706' },
          { label: 'Cần thanh toán lại', val: summary.retry, color: '#059669' },
          { label: 'Thất bại / từ chối', val: summary.failed, color: '#dc2626' },
        ].map((item) => (
          <div key={item.label} style={{ ...cardInfoStyle, minWidth: 150, textAlign: 'center', padding: '14px 18px' }}>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: item.color }}>{item.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <SkeletonCard count={3} />
      ) : bookings.length === 0 ? (
        <div
          role="region"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <MdDirectionsCar style={{ fontSize: '2.8rem', color: '#cbd5e1' }} aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-gray-700 text-base mb-1.5">Không có booking chờ thanh toán</p>
            <p className="text-[0.82rem] text-gray-400 leading-relaxed max-w-sm">
              Booking chưa thanh toán hoặc cần thanh toán lại sẽ xuất hiện tại đây để bạn xử lý bất kỳ lúc nào.
            </p>
          </div>
          <div className="flex gap-2.5 justify-center flex-wrap mt-1">
            <button className="renter-btn-soft" onClick={() => navigate('/renter/bookings')}>
              Chuyến đi của tôi
            </button>
            <button className="btn-primary" onClick={() => navigate('/')}>
              Đặt xe mới
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-list" aria-label="Danh sách chờ thanh toán" aria-busy={loading}>
          {bookings.map((booking) => (
            <PaymentBookingCard
              key={booking.id}
              booking={booking}
              highlightedBookingId={highlightedBookingId}
              cancellingId={cancellingId}
              setDetailModal={setDetailModal}
              handleCancelBooking={handleCancelBooking}
              navigate={navigate}
            />
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
