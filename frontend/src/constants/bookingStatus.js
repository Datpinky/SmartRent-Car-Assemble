/**
 * Trạng thái booking — đồng bộ với backend/src/models/booking.model.js
 */
export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'waiting_payment',
  'paid',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
];

/** Thứ tự hiển thị pipeline (không gồm cancelled). */
export const BOOKING_PROGRESS_ORDER = [
  'pending',
  'confirmed',
  'waiting_payment',
  'paid',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
  'completed',
];

export const BOOKING_STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Showroom đã duyệt',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
  waiting_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  waiting_handover: 'Chờ giao xe',
  handed_over: 'Đã giao xe',
  in_use: 'Đang thuê',
  waiting_return_confirmation: 'Chờ xác nhận trả xe',
};

/** Showroom bấm "bước tiếp" — không can thiệp khi khách đang chờ thanh toán. */
export const SHOWROOM_CAN_ADVANCE_FROM = new Set([
  'paid',
  'waiting_handover',
  'handed_over',
  'in_use',
  'waiting_return_confirmation',
]);

export function bookingNextStatus(current) {
  const i = BOOKING_PROGRESS_ORDER.indexOf(current);
  if (i < 0 || i >= BOOKING_PROGRESS_ORDER.length - 1) return null;
  return BOOKING_PROGRESS_ORDER[i + 1];
}
