import { FaCalendarAlt, FaClock, FaCreditCard, FaMapMarkerAlt } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import StatusBadge from '../../../../components/common/StatusBadge';
import { formatDateTime, formatMoney } from '../../../../utils/renterBookingView';
import { getCancelActionLabel, getRetryPaymentUrl } from '../pendingPayments.helpers';

const PaymentBookingCard = ({ booking, highlightedBookingId, cancellingId, setDetailModal, handleCancelBooking, navigate }) => (
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
      </div>
    </div>

    <div className="booking-card-right">
      <div style={{ textAlign: 'right' }}>
        <StatusBadge status={booking.canRetryPayment ? 'failed' : booking.status} customLabel={booking.canRetryPayment ? 'Cần thanh toán lại' : undefined} />
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#00b14f', marginTop: 10 }}>{formatMoney(booking.totalPrice)}</div>
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 3, letterSpacing: '0.04em' }}>#{String(booking.id).slice(-8).toUpperCase()}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        {booking.canRetryPayment ? (
          <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '7px 14px' }}
            onClick={(e) => { e.stopPropagation(); navigate(getRetryPaymentUrl(booking)); }}>
            <FaCreditCard /> Thanh toán ngay
          </button>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 8, padding: '6px 12px', fontSize: '0.74rem', fontWeight: 600, background: '#fef9c3', color: '#a16207', border: '1px solid #fde68a' }}>
            <FaClock style={{ marginRight: 5 }} /> Chờ thanh toán
          </div>
        )}
        {booking.canCancel && (
          <button className="renter-btn-soft-danger" style={{ opacity: cancellingId === booking.id ? 0.65 : 1, fontSize: '0.76rem' }}
            onClick={(e) => { e.stopPropagation(); handleCancelBooking(booking); }}
            disabled={cancellingId === booking.id}>
            {cancellingId === booking.id ? 'Đang hủy...' : getCancelActionLabel(booking)}
          </button>
        )}
      </div>
    </div>
  </div>
);

export default PaymentBookingCard;