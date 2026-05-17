export const STATUS_ORDER = [
  'pending',
  'waiting_payment',
  'paid',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
  'completed',
  'cancel_pending',
  'cancel_failed',
  'cancelled',
];

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
  cancel_pending: 'Đang xử lý hủy/hoàn tiền',
  cancel_failed: 'Hủy/hoàn tiền lỗi',
  cancelled: 'Đã hủy',
};

export const PRIMARY_ACTIONS = {
  paid: { nextStatus: 'waiting_handover', label: 'Xác nhận & chốt bàn giao' },
  waiting_handover: { nextStatus: 'handed_over', label: 'Xác nhận đã bàn giao xe' },
};

export const CANCELLABLE_STATUSES = ['pending', 'waiting_payment'];

// Các tab lọc — "Đã bàn giao" và "Đang thuê" được gộp vào một tab
export const FILTER_TABS = [
  { key: 'pending', label: 'Chờ thanh toán', statuses: ['pending'] },
  { key: 'waiting_payment', label: 'Đang thanh toán', statuses: ['waiting_payment'] },
  { key: 'paid', label: 'Đã thanh toán', statuses: ['paid'] },
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
