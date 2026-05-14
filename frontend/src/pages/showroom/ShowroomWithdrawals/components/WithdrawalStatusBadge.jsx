import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';

const CONFIG = {
  pending: { label: 'Đang chờ', bg: '#fef3c7', color: '#b45309', Icon: FaClock },
  approved: { label: 'Đã duyệt', bg: '#dcfce7', color: '#166534', Icon: FaCheckCircle },
  rejected: { label: 'Từ chối', bg: '#fee2e2', color: '#b91c1c', Icon: FaTimesCircle },
};

const WithdrawalStatusBadge = ({ status }) => {
  const cfg = CONFIG[status] || { label: status || 'N/A', bg: '#f3f4f6', color: '#374151', Icon: FaClock };
  const { label, bg, color, Icon } = cfg;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, color, padding: '4px 10px', borderRadius: 999, fontSize: '0.76rem', fontWeight: 700 }}>
      <Icon size={11} /> {label}
    </span>
  );
};

export default WithdrawalStatusBadge;