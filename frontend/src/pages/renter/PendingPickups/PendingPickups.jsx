import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaEnvelope, FaSpinner } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ContractModal from '../../../components/common/ContractModal';
import Modal from '../../../components/common/Modal';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import bookingService from '../../../services/bookingService';
import { canRenterViewOfficialRentalContract } from '../../../utils/rentalContractEligibility';
import { PAYMENT_LABELS, formatDateTime, formatMoney, mapRenterBooking } from '../../../utils/renterBookingView';
import PickupBookingCard from './components/PickupBookingCard';
import { cardInfoStyle, waitingLabel } from './pendingPickups.helpers';

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
  const [otpInputs, setOtpInputs] = useState({});
  const [otpLoading, setOtpLoading] = useState('');
  const [otpErrors, setOtpErrors] = useState({});

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
      const mapped = (data || []).map(mapRenterBooking).filter((b) => b.isAwaitingPickup);
      setBookings(mapped);
      setError('');
    } catch (err) {
      setBookings([]);
      setError(err.message || 'Không thể tải danh sách chờ nhận xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleOpenModal = useCallback((booking) => {
    setDetailModal(booking);
    // Clear OTP input for this booking when opening
    setOtpInputs((prev) => ({ ...prev, [booking.id]: '' }));
    setOtpErrors((prev) => ({ ...prev, [booking.id]: '' }));
  }, []);

  const handleCloseModal = useCallback(() => {
    setDetailModal((current) => {
      if (current) {
        // Clear OTP input when closing modal
        setOtpInputs((prev) => ({ ...prev, [current.id]: '' }));
        setOtpErrors((prev) => ({ ...prev, [current.id]: '' }));
      }
      return null;
    });
  }, []);

  const handleVerifyOtp = useCallback(
    async (bookingId) => {
      const otp = (otpInputs[bookingId] || '').trim();
      if (!otp) {
        setOtpErrors((prev) => ({ ...prev, [bookingId]: 'Vui lòng nhập mã OTP' }));
        return;
      }
      setOtpLoading(bookingId);
      setOtpErrors((prev) => ({ ...prev, [bookingId]: '' }));
      try {
        await bookingService.verifyHandoverOtp(bookingId, otp);
        await loadBookings();
        handleCloseModal();
      } catch (err) {
        setOtpErrors((prev) => ({
          ...prev,
          [bookingId]: err?.response?.data?.message || err?.message || 'Mã OTP không đúng',
        }));
      } finally {
        setOtpLoading('');
      }
    },
    [otpInputs, handleCloseModal],
  );

  useEffect(() => {
    if (!highlightedBookingId || loading || bookings.length === 0) return;
    const key = `${window.location.pathname}:${highlightedBookingId}`;
    if (handledHighlightRef.current === key) return;
    const target = bookings.find((b) => String(b.id) === String(highlightedBookingId));
    if (!target) return;
    handledHighlightRef.current = key;
    handleOpenModal(target);
  }, [bookings, highlightedBookingId, loading, handleOpenModal]);

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

  const summary = useMemo(
    () => ({
      total: bookings.length,
      needsRenterConfirm: bookings.filter((b) => b.status === 'handed_over').length,
      waitingShowroom: bookings.filter((b) => b.status === 'waiting_handover').length,
      contactable: bookings.filter((b) => Boolean(b.showroomEmail)).length,
    }),
    [bookings],
  );

  return (
    <div className="pending-pickups">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Chờ nhận xe</h1>
          <p className="page-subtitle" style={{ marginTop: 6, maxWidth: 720 }}>
            Theo dõi quá trình bàn giao xe. Khi showroom đã bàn giao, bạn sẽ cần xác nhận đã nhận xe để bắt đầu chuyến
            đi.
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
          { label: 'Tổng đơn', val: summary.total, color: '#374151' },
          { label: 'Chờ showroom bàn giao', val: summary.waitingShowroom, color: '#d97706' },
          { label: 'Cần bạn xác nhận nhận xe', val: summary.needsRenterConfirm, color: '#2563eb' },
          { label: 'Có email showroom', val: summary.contactable, color: '#059669' },
        ].map((item) => (
          <div key={item.label} style={{ ...cardInfoStyle, minWidth: 150, textAlign: 'center', padding: '14px 18px' }}>
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
            Booking sẽ hiện tại đây khi Showroom đã chuyển sang Chờ bàn giao và đang hoàn tất bước bàn giao trên hệ
            thống.
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
            <PickupBookingCard
              key={booking.id}
              booking={booking}
              highlightedBookingId={highlightedBookingId}
              otpInputs={otpInputs}
              setOtpInputs={setOtpInputs}
              otpLoading={otpLoading}
              otpErrors={otpErrors}
              handleVerifyOtp={handleVerifyOtp}
              setDetailModal={handleOpenModal}
              setContractBookingId={setContractBookingId}
            />
          ))}
        </div>
      )}

      <Modal isOpen={!!detailModal} onClose={handleCloseModal} title="Chi tiết chờ nhận xe" width={560}>
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
            {detailModal.status === 'handed_over' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: 12,
                    padding: '12px 14px',
                    fontSize: '0.8rem',
                    color: '#166534',
                    lineHeight: 1.6,
                  }}
                >
                  Showroom đã bàn giao xe. Hãy yêu cầu showroom đọc mã OTP và nhập vào ô bên dưới để xác nhận nhận xe.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Nhập mã OTP 6 số"
                    value={otpInputs[detailModal.id] || ''}
                    onChange={(e) =>
                      setOtpInputs((prev) => ({ ...prev, [detailModal.id]: e.target.value.replace(/\D/g, '') }))
                    }
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #00b14f',
                      fontSize: '1.1rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.2em',
                      outline: 'none',
                      textAlign: 'center',
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
                    disabled={otpLoading === detailModal.id}
                    onClick={() => handleVerifyOtp(detailModal.id)}
                  >
                    {otpLoading === detailModal.id ? <FaSpinner className="animate-spin" /> : 'Xác nhận nhận xe'}
                  </button>
                </div>
                {otpErrors[detailModal.id] && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#dc2626',
                      background: '#fef2f2',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    {otpErrors[detailModal.id]}
                  </div>
                )}
              </div>
            ) : (
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
                {waitingLabel}
              </div>
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

      <ContractModal
        isOpen={!!contractBookingId}
        bookingId={contractBookingId || ''}
        onClose={() => setContractBookingId(null)}
      />
    </div>
  );
};

export default PendingPickups;
