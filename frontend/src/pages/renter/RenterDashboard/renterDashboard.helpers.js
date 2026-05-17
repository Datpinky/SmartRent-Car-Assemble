import { FaClock, FaMoneyBillWave, FaReceipt, FaUndoAlt } from 'react-icons/fa';
import { getBookingPaymentStatus } from '../../../utils/bookingFlowState';
import {
  canReviewBooking,
  resolveBookingVehicleId,
  resolveReviewBookingId,
} from '../../../utils/bookingReviewEligibility';
import { sanitizeImageList } from '../../../utils/media';
import { formatMoney, PAYMENT_LABELS } from '../../../utils/renterBookingView';

export const PAYMENT_VISUALS = {
  successful: { label: 'Đã ghi nhận', bg: '#dcfce7', color: '#166534' },
  refunded: { label: 'Đã hoàn trả', bg: '#dbeafe', color: '#1d4ed8' },
  refund_pending: { label: 'Đang xử lý hoàn trả', bg: '#dbeafe', color: '#1d4ed8' },
  pending: { label: 'Chờ thanh toán', bg: '#fef3c7', color: '#b45309' },
  failed: { label: 'Thất bại', bg: '#fee2e2', color: '#b91c1c' },
  declined: { label: 'Bị từ chối', bg: '#fee2e2', color: '#b91c1c' },
};

/** Lưới 2×5 — khớp luồng trạng thái đặt xe (tab lọc showroom / thiết kế cũ dashboard). */
export const RENTER_STATUS_GRID_TABS = [
  { key: 'pending', label: 'Chờ thanh toán', statuses: ['pending'] },
  { key: 'waiting_payment', label: 'Đang thanh toán', statuses: ['waiting_payment'] },
  { key: 'paid', label: 'Đã thanh toán', statuses: ['paid', 'confirmed'] },
  { key: 'waiting_handover', label: 'Chờ bàn giao', statuses: ['waiting_handover'] },
  { key: 'in_use', label: 'Đã bàn giao / Đang thuê', statuses: ['handed_over', 'in_use'] },
  { key: 'waiting_return_confirmation', label: 'Chờ xác nhận trả', statuses: ['waiting_return_confirmation'] },
  { key: 'completed', label: 'Hoàn thành', statuses: ['completed'] },
  { key: 'cancelled', label: 'Đã hủy', statuses: ['cancelled', 'cancel_pending', 'cancel_failed'] },
];

export const countBookingsByStatusGrid = (items, tabs = RENTER_STATUS_GRID_TABS) => {
  const list = Array.isArray(items) ? items : [];
  const counts = Object.fromEntries(tabs.map((t) => [t.key, 0]));
  for (const row of list) {
    const st = String(row?.status ?? '');
    const tab = tabs.find((t) => t.statuses.includes(st));
    if (tab) counts[tab.key] += 1;
  }
  return counts;
};

export const SUMMARY_CARD_CONFIG = [
  {
    key: 'recordedAmount',
    label: 'Tiền đặt xe đã ghi nhận',
    icon: FaMoneyBillWave,
    accent: '#059669',
    tint: 'rgba(5, 150, 105, 0.12)',
  },
  {
    key: 'refundTrackingAmount',
    label: 'Hoàn trả đã ghi nhận',
    icon: FaUndoAlt,
    accent: '#2563eb',
    tint: 'rgba(37, 99, 235, 0.12)',
  },
  {
    key: 'refundTrackingCount',
    label: 'Đơn theo dõi hoàn trả',
    icon: FaReceipt,
    accent: '#7c3aed',
    tint: 'rgba(124, 58, 237, 0.12)',
  },
  {
    key: 'pendingAmount',
    label: 'Số tiền chờ thanh toán',
    icon: FaClock,
    accent: '#d97706',
    tint: 'rgba(217, 119, 6, 0.12)',
  },
];

export const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const timestampOf = (value) => (value instanceof Date ? value.getTime() : 0);

export const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const getMonthLabel = (date) => `T${date.getMonth() + 1}/${date.getFullYear()}`;

export const createRecentMonthBuckets = (count = 6) => {
  const anchor = new Date();
  anchor.setDate(1);
  anchor.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - (count - index - 1), 1);
    return { key: getMonthKey(date), label: getMonthLabel(date) };
  });
};

export const getPaymentVisual = (item) => {
  if (item.refundCompleted) return PAYMENT_VISUALS.refunded;
  if (item.refundPending) return PAYMENT_VISUALS.refund_pending;
  return (
    PAYMENT_VISUALS[item.paymentStatus] || {
      label: PAYMENT_LABELS[item.paymentStatus] || item.paymentStatus || 'N/A',
      bg: '#f3f4f6',
      color: '#4b5563',
    }
  );
};

export const resolveFinanceItem = (booking) => {
  const payment = booking.payment || null;
  const paymentStatus = getBookingPaymentStatus(booking);
  const amount = Number(payment?.amount || booking.total_price || 0);
  const createdAt =
    parseDate(payment?.createdAt) || parseDate(booking.createdAt) || parseDate(booking.start_date) || new Date();
  const paidAt =
    parseDate(payment?.paid_at) || parseDate(payment?.updatedAt) || parseDate(booking.updatedAt) || createdAt;
  const updatedAt = parseDate(booking.updatedAt) || parseDate(payment?.updatedAt) || paidAt;
  const paymentRecorded = ['successful', 'refunded'].includes(paymentStatus);
  const refundPending = ['cancel_pending', 'cancel_failed'].includes(booking.status) || (booking.status === 'cancelled' && paymentStatus === 'successful');
  const refundCompleted = paymentStatus === 'refunded';
  const pendingPayment = paymentStatus === 'pending' && booking.status !== 'cancelled';
  const images = sanitizeImageList([
    ...(booking.vehicle?.images || []),
    ...(booking.vehicle_id?.vehicle_images_paths || []),
    ...(booking.vehicle_id?.images || []),
  ]);
  return {
    id: payment?._id || booking._id,
    bookingId: booking._id,
    vehicleId: resolveBookingVehicleId(booking),
    canReviewVehicle: canReviewBooking(booking),
    vehicleName: booking.vehicle?.name || booking.vehicle_id?.vehicle_name || 'Xe không tên',
    showroomName: booking.showroom?.name || booking.showroom_id?.name || 'SmartRent',
    amount,
    status: booking.status,
    paymentStatus,
    paymentMethod: payment?.payment_method || 'Chưa có',
    transactionCode: payment?.transaction_code || payment?.stripe_payment_intent_id || '',
    createdAt,
    paidAt,
    updatedAt,
    timelineDate: updatedAt || paidAt || createdAt,
    paymentRecorded,
    refundPending,
    refundCompleted,
    hasRefundActivity: refundPending || refundCompleted,
    pendingPayment,
    image: images[0] || '',
    refundHint: refundCompleted
      ? 'Khoản hoàn trả đã được ghi nhận trên hệ thống.'
      : booking.status === 'cancel_failed'
        ? 'Đơn đặt xe đã hủy nhưng hoàn tiền gặp lỗi. Vui lòng liên hệ showroom hoặc admin để xử lý.'
        : refundPending
        ? 'Đơn đặt xe đã hủy sau khi thanh toán thành công. Đang theo dõi để đối chiếu hoàn trả.'
        : pendingPayment
          ? 'Đơn đặt xe này chưa có thanh toán thành công.'
          : 'Khoản tiền đã được ghi nhận trên hệ thống.',
  };
};

export const cardValue = (key, summary) => {
  if (key === 'refundTrackingCount') return summary[key];
  return formatMoney(summary[key]);
};

export const cardHint = (key, summary) => {
  if (key === 'recordedAmount') return `${summary.recordedCount} đơn đã ghi nhận thanh toán`;
  if (key === 'refundTrackingAmount') {
    if (!summary.refundTrackingCount) return 'Chưa có đơn nào cần theo dõi hoàn trả';
    if (summary.refundPendingCount && summary.refundCompletedCount)
      return `${summary.refundCompletedCount} đã hoàn trả, ${summary.refundPendingCount} đang xử lý`;
    if (summary.refundCompletedCount) return `${summary.refundCompletedCount} đơn đã hoàn trả`;
    return `${summary.refundPendingCount} booking đang xử lý hoàn trả`;
  }
  if (key === 'refundTrackingCount') {
    if (!summary.refundTrackingCount) return 'Chưa có yêu cầu hoàn trả nào cần theo dõi';
    if (summary.refundCompletedCount && summary.refundPendingCount) return 'Bao gồm đơn đã hoàn trả và đơn đang xử lý';
    if (summary.refundCompletedCount) return 'Tất cả đơn trong nhóm này đã hoàn trả';
    return 'Mở danh sách bên dưới để xem từng đơn';
  }
  return summary.pendingCount
    ? `${summary.pendingCount} đơn vẫn đang chờ thanh toán`
    : 'Không có đơn nào đang chờ thanh toán';
};

export { resolveReviewBookingId };
