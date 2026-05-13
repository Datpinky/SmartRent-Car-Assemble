const STATUS_CONFIG = {
  pending: { label: 'Chờ thanh toán', bg: '#fef3c7', color: '#d97706' },
  approved: { label: 'Đã duyệt', bg: '#d1fae5', color: '#059669' },
  rejected: { label: 'Từ chối', bg: '#fee2e2', color: '#dc2626' },
  active: { label: 'Đang thuê', bg: '#dbeafe', color: '#2563eb' },
  available: { label: 'Sẵn sàng', bg: '#d1fae5', color: '#059669' },
  maintenance: { label: 'Bảo dưỡng', bg: '#f3e8ff', color: '#7c3aed' },
  completed: { label: 'Hoàn thành', bg: '#d1fae5', color: '#059669' },
  cancel_pending: { label: 'Đang hủy/hoàn tiền', bg: '#dbeafe', color: '#2563eb' },
  cancel_failed: { label: 'Hủy/hoàn tiền lỗi', bg: '#fee2e2', color: '#dc2626' },
  cancelled: { label: 'Đã hủy', bg: '#f3f4f6', color: '#6b7280' },
  verified: { label: 'Đã xác minh', bg: '#d1fae5', color: '#059669' },
  unverified: { label: 'Chưa xác minh', bg: '#fef3c7', color: '#d97706' },
  locked: { label: 'Bị khóa', bg: '#fee2e2', color: '#dc2626' },
  processing: { label: 'Đang xử lý', bg: '#dbeafe', color: '#2563eb' },
  paid: { label: 'Đã thanh toán', bg: '#d1fae5', color: '#059669' },
  failed: { label: 'Thất bại', bg: '#fee2e2', color: '#dc2626' },
  consigned: { label: 'Ký gửi', bg: '#e0e7ff', color: '#4338ca' },
  new: { label: 'Mới', bg: '#cffafe', color: '#0891b2' },
  delivering: { label: 'Đang giao xe', bg: '#fef3c7', color: '#d97706' },
  returned: { label: 'Đã trả xe', bg: '#d1fae5', color: '#059669' },
  renting: { label: 'Đang thuê', bg: '#dbeafe', color: '#2563eb' },
  waiting: { label: 'Đang chờ', bg: '#fef3c7', color: '#d97706' },
  signed: { label: 'Đã ký', bg: '#d1fae5', color: '#059669' },
  expired: { label: 'Hết hạn', bg: '#f3f4f6', color: '#6b7280' },
  draft: { label: 'Nháp', bg: '#f3f4f6', color: '#6b7280' },
  confirmed: { label: 'Đã duyệt', bg: '#d1fae5', color: '#059669' },
  waiting_payment: { label: 'Chờ thanh toán', bg: '#fef3c7', color: '#d97706' },
  waiting_handover: { label: 'Chờ giao xe', bg: '#fef3c7', color: '#d97706' },
  handed_over: { label: 'Đã giao xe', bg: '#dbeafe', color: '#2563eb' },
  in_use: { label: 'Đang thuê', bg: '#dbeafe', color: '#2563eb' },
  waiting_return_confirmation: { label: 'Chờ xác nhận trả', bg: '#fef3c7', color: '#d97706' },
};

const StatusBadge = ({ status, customLabel }) => {
  const cfg = STATUS_CONFIG[status] || { label: status || 'N/A', bg: '#f3f4f6', color: '#6b7280' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 50,
        fontSize: '0.72rem',
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {customLabel || cfg.label}
    </span>
  );
};

export default StatusBadge;
