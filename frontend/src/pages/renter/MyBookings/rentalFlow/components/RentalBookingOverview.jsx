import { FaCalendarAlt, FaCheckCircle, FaMapMarkerAlt, FaStore } from 'react-icons/fa';
import StatusBadge from '../../../../../components/common/StatusBadge';
import { FLOW_STEPS } from '../rentalFlow.constants';
import { formatFlowDateTime } from '../rentalFlow.utils';

const RentalBookingOverview = ({ booking, currentStepIndex }) => (
  <div style={{ background: '#f9fafb', borderRadius: 16, padding: 16 }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{booking.vehicleName}</div>
        <div
          style={{
            fontSize: '0.8rem',
            color: '#6b7280',
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FaStore size={11} /> {booking.showroomName}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FaCalendarAlt size={11} /> {formatFlowDateTime(booking.startDate)} - {formatFlowDateTime(booking.endDate)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FaMapMarkerAlt size={11} /> {booking.locationLabel}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <StatusBadge status={booking.status} />
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
      {FLOW_STEPS.map((step, index) => {
        const isDone = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;

        return (
          <div
            key={step.status}
            style={{
              borderRadius: 14,
              padding: '12px 10px',
              border: `1px solid ${isCurrent ? '#86efac' : '#e5e7eb'}`,
              background: isCurrent ? '#f0fdf4' : isDone ? '#f9fafb' : '#fff',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                margin: '0 auto 8px',
                borderRadius: '50%',
                background: isCurrent ? '#00b14f' : isDone ? '#d1fae5' : '#f3f4f6',
                color: isCurrent ? '#fff' : isDone ? '#059669' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.82rem',
                fontWeight: 800,
              }}
            >
              {isDone ? <FaCheckCircle /> : index + 1}
            </div>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#374151' }}>{step.label}</div>
          </div>
        );
      })}
    </div>
  </div>
);

export default RentalBookingOverview;
