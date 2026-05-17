import HandoverOtpInput from '../../../../components/renter/HandoverOtpInput';
import { FaCalendarAlt, FaClock, FaEnvelope, FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import StatusBadge from '../../../../components/common/StatusBadge';
import { RENTAL_CONTRACT_UI } from '../../../../constants/rentalContractTemplate';
import { canRenterViewRentalContractOnPendingPickupPage } from '../../../../utils/rentalContractEligibility';
import { PAYMENT_LABELS, formatDateTime, formatMoney } from '../../../../utils/renterBookingView';
import { waitingLabel } from '../pendingPickups.helpers';

const PickupBookingCard = ({
  booking,
  highlightedBookingId,
  otpInputs,
  setOtpInputs,
  otpLoading,
  otpErrors,
  handleVerifyOtp,
  setDetailModal,
  setContractBookingId,
}) => (
  <div
    key={booking.id}
    id={`renter-booking-card-${booking.id}`}
    className="booking-card-item"
    onClick={() => setDetailModal(booking)}
    style={
      String(booking.id) === String(highlightedBookingId)
        ? { border: '1px solid #bfdbfe', boxShadow: '0 12px 30px rgba(37, 99, 235, 0.12)', background: '#f8fbff', cursor: 'pointer' }
        : { cursor: 'pointer' }
    }
  >
    <div className="booking-card-left">
      <div className="booking-card-img" style={{ overflow: 'hidden', background: '#f3f4f6' }}>
        {booking.image ? (
          <img src={booking.image} alt={booking.vehicleName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <MdDirectionsCar style={{ fontSize: '2.5rem', color: '#00b14f' }} />
        )}
      </div>
      <div className="booking-card-info">
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>{booking.vehicleName}</div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 3 }}>{booking.showroomName}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
            <FaCalendarAlt size={11} /> {formatDateTime(booking.startDate)} — {formatDateTime(booking.endDate)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
            <FaClock size={11} /> {booking.durationDays} ngày
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
            <FaMapMarkerAlt size={11} /> {booking.locationLabel}
          </span>
        </div>
        <div style={{ marginTop: 8, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>{booking.statusHeadline}</div>
        <div style={{ marginTop: 4, fontSize: '0.76rem', color: '#6b7280', lineHeight: 1.6 }}>{booking.waitingForLabel}</div>
        {booking.pickupConfirmationHint && (
          <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#9a3412', lineHeight: 1.6 }}>{booking.pickupConfirmationHint}</div>
        )}
      </div>
    </div>

    <div className="booking-card-right">
      <div style={{ textAlign: 'right' }}>
        <StatusBadge status={booking.status} />
        <div style={{ marginTop: 6 }}>
          <StatusBadge status={booking.paymentStatus} customLabel={PAYMENT_LABELS[booking.paymentStatus] || booking.paymentStatus} />
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#00b14f', marginTop: 8 }}>{formatMoney(booking.totalPrice)}</div>
        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>Mã: {booking.id}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {canRenterViewRentalContractOnPendingPickupPage(booking) && (
          <button type="button" className="renter-btn-soft" style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            onClick={(e) => { e.stopPropagation(); setContractBookingId(booking.id); }}>
            {RENTAL_CONTRACT_UI.officialButton}
          </button>
        )}

        {booking.status === 'handed_over' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <HandoverOtpInput
                size="compact"
                value={otpInputs[booking.id] || ''}
                onValueChange={(v) => setOtpInputs((prev) => ({ ...prev, [booking.id]: v }))}
                disabled={otpLoading === booking.id}
              />
              <button type="button" className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                disabled={otpLoading === booking.id} onClick={() => handleVerifyOtp(booking.id)}>
                {otpLoading === booking.id ? <FaSpinner className="animate-spin" /> : 'Xác nhận'}
              </button>
            </div>
            {otpErrors[booking.id] && <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>{otpErrors[booking.id]}</div>}
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 8, padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, background: '#e2e8f0', color: '#475569' }}>
            {waitingLabel}
          </div>
        )}

        {booking.status !== 'handed_over' && booking.showroomEmail && (
          <a className="renter-btn-soft" href={`mailto:${booking.showroomEmail}`} onClick={(e) => e.stopPropagation()}>
            <FaEnvelope /> Liên hệ Showroom
          </a>
        )}
      </div>
    </div>
  </div>
);

export default PickupBookingCard;