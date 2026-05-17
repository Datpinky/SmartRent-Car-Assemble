const STATUS_CONFIG = {
  rented: { label: 'Đang thuê', bg: '#dbeafe', color: '#2563eb' },
  pending: { label: 'Chưa thanh toán', bg: '#fef3c7', color: '#d97706' },
  approved: { label: 'Đã duyệt', bg: '#d1fae5', color: '#059669' },
  rejected: { label: 'Từ chối', bg: '#fee2e2', color: '#dc2626' },
  active: { label: 'Đang thuê', bg: '#dbeafe', color: '#2563eb' },
  available: { label: 'Sẵn sàng', bg: '#d1fae5', color: '#059669' },
  maintenance: { label: 'Bảo dưỡng', bg: '#f3e8ff', color: '#7c3aed' },
  completed: { label: 'Hoàn thành', bg: '#d1fae5', color: '#059669' },
  cancel_pending: { label: 'Đang xử lý hủy', bg: '#dbeafe', color: '#2563eb' },
  cancel_failed: { label: 'Hủy (lỗi xử lý)', bg: '#fee2e2', color: '#dc2626' },
  cancelled: { label: 'Đã hủy', bg: '#f3f4f6', color: '#6b7280' },
  refund_pending: { label: 'Đang hoàn tiền', bg: '#dbeafe', color: '#1d4ed8' },
  refund_failed: { label: 'Hoàn tiền lỗi', bg: '#fee2e2', color: '#dc2626' },
  not_required: { label: 'Không cần hoàn', bg: '#f3f4f6', color: '#6b7280' },
  verified: { label: 'Đã xác thực', bg: '#d1fae5', color: '#059669' },
  unverified: { label: 'Chưa xác minh', bg: '#fef3c7', color: '#d97706' },
  locked: { label: 'Bị khóa', bg: '#fee2e2', color: '#dc2626' },
  processing: { label: 'Đang xử lý', bg: '#dbeafe', color: '#2563eb' },
  paid: { label: 'Đã thanh toán', bg: '#d1fae5', color: '#059669' },
  refund_requested: { label: 'Chờ hoàn trả', bg: '#fef3c7', color: '#b45309' },
  awaiting_showroom_refund: { label: 'Chờ hoàn tiền', bg: '#fef3c7', color: '#b45309' },
  refunded: { label: 'Đã hoàn tiền', bg: '#e0f2fe', color: '#0369a1' },
  successful: { label: 'Thành công', bg: '#d1fae5', color: '#059669' },
  failed: { label: 'Thất bại', bg: '#fee2e2', color: '#dc2626' },
  declined: { label: 'Bị từ chối', bg: '#fee2e2', color: '#dc2626' },
  consigned: { label: 'Ký gửi', bg: '#e0e7ff', color: '#4338ca' },
  new: { label: 'Mới', bg: '#cffafe', color: '#0891b2' },
  delivering: { label: 'Đang giao xe', bg: '#fef3c7', color: '#d97706' },
  returned: { label: 'Đã trả xe', bg: '#d1fae5', color: '#059669' },
  renting: { label: 'Đang thuê', bg: '#dbeafe', color: '#2563eb' },
  waiting: { label: 'Đang chờ', bg: '#fef3c7', color: '#d97706' },
  signed: { label: 'Đã ký', bg: '#d1fae5', color: '#059669' },
  pending_signature: { label: 'Chờ ký', bg: '#fef3c7', color: '#d97706' },
  voided: { label: 'Vô hiệu', bg: '#f3f4f6', color: '#6b7280' },
  expired: { label: 'Hết hạn', bg: '#f3f4f6', color: '#6b7280' },
  draft: { label: 'Nhập', bg: '#f3f4f6', color: '#6b7280' },
  confirmed: { label: 'Đã duyệt', bg: '#d1fae5', color: '#059669' },
  waiting_payment: { label: 'Chờ thanh toán', bg: '#fef3c7', color: '#d97706' },
  waiting_handover: { label: 'Chờ bàn giao xe', bg: '#fef3c7', color: '#d97706' },
  handed_over: { label: 'Đã giao xe', bg: '#dbeafe', color: '#2563eb' },
  in_use: { label: 'Đang thuê', bg: '#dbeafe', color: '#2563eb' },
  waiting_return_confirmation: { label: 'Chờ xác nhận trả', bg: '#fef3c7', color: '#d97706' },
};

const LICENSE_STATUS_MAP = {
  pending: { label: 'Đang chờ duyệt', bg: '#fef3c7', color: '#d97706' },
  approved: { label: 'Đã duyệt', bg: '#d1fae5', color: '#059669' },
  rejected: { label: 'Từ chối', bg: '#fee2e2', color: '#dc2626' },
};

const StatusBadge = ({ status, customLabel, isLicenseStatus }) => {
  const cfg = (isLicenseStatus ? LICENSE_STATUS_MAP : STATUS_CONFIG)[status] || {
    label: status || 'N/A',
    bg: '#f3f4f6',
    color: '#6b7280',
  };

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

