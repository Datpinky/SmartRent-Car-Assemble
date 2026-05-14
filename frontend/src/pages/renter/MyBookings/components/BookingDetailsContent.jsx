import { FaCamera } from 'react-icons/fa';
import { RENTAL_CONTRACT_UI } from '../../../../constants/rentalContractTemplate';
import { canRenterViewOfficialRentalContract } from '../../../../utils/rentalContractEligibility';
import { formatDateTime, formatMoney, PAYMENT_LABELS } from '../../../../utils/renterBookingView';

const BookingDetailsContent = ({ booking, onOpenContract, onOpenRentalFlow }) => {
  if (!booking) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{booking.vehicleName}</div>
        <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>{booking.showroomName}</div>
      </div>

      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '14px 16px',
        }}
      >
        <div style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>{booking.statusHeadline}</div>
        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.65, marginBottom: 8 }}>
          {booking.waitingForLabel}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, marginBottom: 6 }}>
          {booking.waitingOwnerLabel}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
          Bước tiếp theo: {booking.nextStepLabel}
        </div>
        <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#0f766e', lineHeight: 1.6 }}>
          Việc bạn nên làm: {booking.renterActionHint}
        </div>
      </div>

      {(booking.canOpenRentalFlow || booking.isActive) && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '12px 14px',
            color: '#334155',
            fontSize: '0.8rem',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Trạng thái AI</div>
          <div>{booking.aiFlowHeadline}</div>
          <div style={{ marginTop: 6, fontSize: '0.76rem', color: '#64748b' }}>{booking.aiReportBadge}</div>
        </div>
      )}

      {booking.hasAiInspectionReport && (
        <div
          style={{
            background: '#ecfeff',
            border: '1px solid #a5f3fc',
            borderRadius: 12,
            padding: '12px 14px',
            color: '#0f766e',
            fontSize: '0.8rem',
            lineHeight: 1.6,
          }}
        >
          Báo cáo AI đã được lưu trên server theo đơn đặt xe. Bạn có thể mở trang Báo cáo AI hoặc xuất chi tiết từ đó.
        </div>
      )}

      {[
        ['Mã đơn', booking.id],
        ['Ngày nhận xe', formatDateTime(booking.startDate)],
        ['Ngày trả xe', formatDateTime(booking.endDate)],
        ['Số ngày thuê', `${booking.durationDays} ngày`],
        ['Tổng tiền', formatMoney(booking.totalPrice)],
        ['Trạng thái đơn', booking.status],
        ['Trạng thái thanh toán', PAYMENT_LABELS[booking.paymentStatus] || booking.paymentStatus],
        ['Địa điểm giao nhận', booking.locationLabel],
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

      {canRenterViewOfficialRentalContract(booking) && (
        <button
          type="button"
          className="renter-btn-soft"
          style={{ justifyContent: 'center' }}
          onClick={() => onOpenContract(booking.id)}
        >
          {RENTAL_CONTRACT_UI.officialButton}
        </button>
      )}

      <button
        className="renter-btn-soft-success"
        style={{ justifyContent: 'center' }}
        onClick={() => onOpenRentalFlow(booking)}
      >
        <FaCamera /> {booking.rentalActionLabel}
      </button>
    </div>
  );
};

export default BookingDetailsContent;
