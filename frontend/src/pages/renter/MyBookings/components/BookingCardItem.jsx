import { FaCalendarAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import StatusBadge from '../../../../components/common/StatusBadge';
import { RENTAL_CONTRACT_UI } from '../../../../constants/rentalContractTemplate';
import { canRenterViewOfficialRentalContract } from '../../../../utils/rentalContractEligibility';
import { formatDateTime, formatMoney, PAYMENT_LABELS } from '../../../../utils/renterBookingView';

const BookingCardItem = ({ booking, isHighlighted, onOpenDetail, onOpenContract, onOpenRentalFlow }) => (
  <div
    id={`renter-booking-card-${booking.id}`}
    className="booking-card-item"
    onClick={() => onOpenDetail(booking)}
    style={
      isHighlighted
        ? {
            border: '1px solid #bfdbfe',
            boxShadow: '0 12px 30px rgba(37, 99, 235, 0.12)',
            background: '#f8fbff',
            cursor: 'pointer',
          }
        : { cursor: 'pointer' }
    }
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
        <div style={{ marginTop: 8, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
          {booking.statusHeadline}
        </div>
        <div style={{ marginTop: 4, fontSize: '0.76rem', color: '#6b7280', lineHeight: 1.6 }}>
          {booking.waitingForLabel}
        </div>
        {(booking.canOpenRentalFlow || booking.isActive) && (
          <div
            style={{
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            AI: {booking.aiReportBadge}
          </div>
        )}
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
        {booking.hasAiInspectionReport && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              padding: '4px 10px',
              borderRadius: 999,
              background: '#ecfeff',
              color: '#0f766e',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            {booking.aiReportBadge}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {canRenterViewOfficialRentalContract(booking) && (
          <button
            type="button"
            className="renter-btn-soft"
            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            onClick={(event) => {
              event.stopPropagation();
              onOpenContract(booking.id);
            }}
          >
            {RENTAL_CONTRACT_UI.officialButton}
          </button>
        )}
        {booking.canOpenRentalFlow && (
          <button
            style={{
              background: '#00b14f',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={(event) => {
              event.stopPropagation();
              onOpenRentalFlow(booking);
            }}
          >
            {booking.rentalActionLabel}
          </button>
        )}
      </div>
    </div>
  </div>
);

export default BookingCardItem;
