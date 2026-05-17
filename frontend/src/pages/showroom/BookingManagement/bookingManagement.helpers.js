export const STATUS_LABELS = {
  pending: 'Chờ thanh toán',
  waiting_payment: 'Đang thanh toán',
  paid: 'Đã thanh toán',
  confirmed: 'Đã xác nhận',
  waiting_handover: 'Chờ bàn giao',
  handed_over: 'Đã bàn giao',
  in_use: 'Đang thuê',
  waiting_return_confirmation: 'Chờ xác nhận trả',
  completed: 'Hoàn thành',
  refund_requested: 'Chờ hoàn tiền',
  cancel_pending: 'Đang xử lý hủy',
  cancel_failed: 'Hủy (lỗi xử lý)',
  cancelled: 'Đã hủy',
};

const CANCEL_LIKE = ['cancelled', 'cancel_pending', 'cancel_failed'];

/** payment_status / batch state — dùng cho cột trạng thái & tab Đã hoàn tiền */
export const getBookingPaymentStatus = (booking) =>
  String(booking?.payment?.payment_status || booking?.paymentState?.paymentStatus || booking?.paymentStatus || '')
    .toLowerCase();

/** Đơn đã hủy (hoặc đang/lỗi hủy) và Stripe đã ghi nhận hoàn tiền */
export const isShowroomRefundedBooking = (booking) =>
  CANCEL_LIKE.includes(String(booking?.status || '')) && getBookingPaymentStatus(booking) === 'refunded';

export const getShowroomBookingStatusPresentation = (booking) => {
  if (isShowroomRefundedBooking(booking)) {
    return { badgeKey: 'refunded', label: 'Đã hoàn tiền' };
  }
  const st = booking?.status || '';
  return { badgeKey: st, label: STATUS_LABELS[st] || st };
};

export const getPipelineTabCount = (tab, countsByStatus, rows = []) => {
  if (tab.key === 'payment_refunded') {
    return rows.filter((r) => isShowroomRefundedBooking(r)).length;
  }
  if (!tab.statuses?.length) return 0;
  return tab.statuses.reduce((sum, s) => sum + (countsByStatus[s] || 0), 0);
};

export const PRIMARY_ACTIONS = {
  paid: { nextStatus: 'waiting_handover', label: 'Xác nhận & chốt bàn giao' },
  waiting_handover: { nextStatus: 'handed_over', label: 'Xác nhận đã bàn giao xe' },
};

export const CANCELLABLE_STATUSES = ['pending', 'waiting_payment', 'paid', 'cancel_failed'];

// Các tab lọc — "Đã bàn giao" và "Đang thuê" gộp trong một tab; các trạng thái hủy phụ gộp vào "Đã hủy".
export const FILTER_TABS = [
  { key: 'pending', label: 'Chờ thanh toán', statuses: ['pending'] },
  { key: 'waiting_payment', label: 'Đang thanh toán', statuses: ['waiting_payment'] },
  { key: 'paid', label: 'Đã thanh toán', statuses: ['paid'] },
  { key: 'refund_requested', label: 'Chờ hoàn tiền', statuses: ['refund_requested'] },
  { key: 'payment_refunded', label: 'Đã hoàn tiền', statuses: [] },
  { key: 'waiting_handover', label: 'Chờ bàn giao', statuses: ['waiting_handover'] },
  { key: 'in_use', label: 'Đã bàn giao / Đang thuê', statuses: ['handed_over', 'in_use'] },
  { key: 'waiting_return_confirmation', label: 'Chờ xác nhận trả', statuses: ['waiting_return_confirmation'] },
  { key: 'completed', label: 'Hoàn thành', statuses: ['completed'] },
  { key: 'cancelled', label: 'Đã hủy', statuses: ['cancelled', 'cancel_pending', 'cancel_failed'] },
];


export const fmtDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—';

export const getVehicleName = (vehicle) =>
  vehicle?.vehicle_name ||
  vehicle?.name ||
  [vehicle?.vehicle_brand || vehicle?.brand, vehicle?.vehicle_model || vehicle?.model].filter(Boolean).join(' ') ||
  '—';

