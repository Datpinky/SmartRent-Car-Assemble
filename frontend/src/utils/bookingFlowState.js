const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const UPCOMING_STATUSES = ['pending', 'confirmed', 'waiting_payment', 'paid', 'waiting_handover'];
export const ACTIVE_STATUSES = ['handed_over', 'in_use', 'waiting_return_confirmation'];
export const AWAITING_PAYMENT_STATUSES = ['pending', 'waiting_payment'];
export const SHOWROOM_PROCESSING_STATUSES = ['confirmed', 'paid'];
export const AWAITING_PICKUP_STATUSES = ['waiting_handover'];
export const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'waiting_payment', 'paid', 'waiting_handover'];
export const RENTAL_FLOW_STATUSES = ['waiting_handover', 'handed_over', 'in_use', 'waiting_return_confirmation', 'completed'];

const RECEIVE_READY_STATUSES = ['waiting_handover', 'handed_over', 'in_use', 'waiting_return_confirmation', 'completed'];
const RETURN_READY_STATUSES = ['handed_over', 'in_use', 'waiting_return_confirmation', 'completed'];

export const getBookingPaymentStatus = (booking) =>
  booking?.payment?.payment_status
  || booking?.paymentState?.paymentStatus
  || booking?.paymentStatus
  || (booking?.status === 'paid' ? 'successful' : 'pending');

export const getBookingFlowState = (booking, fallbackPaymentStatus) => {
  const rawBooking = booking?.raw || booking || {};
  const status = booking?.status || rawBooking.status || '';
  const paymentStatus = fallbackPaymentStatus || getBookingPaymentStatus(rawBooking);
  const startAt = parseDate(booking?.startDate || rawBooking.start_date || rawBooking.startDate);
  const endAt = parseDate(booking?.endDate || rawBooking.end_date || rawBooking.endDate);
  const now = Date.now();
  const hasStarted = Boolean(startAt) && now >= startAt.getTime();
  const hasEnded = Boolean(endAt) && now >= endAt.getTime();
  const isCancelled = ['cancelled', 'cancel_pending', 'cancel_failed'].includes(status);
  const isCompleted = status === 'completed';
  const hasSuccessfulPayment = paymentStatus === 'successful';
  const requiresRetryPayment = ['failed', 'declined'].includes(paymentStatus);

  const isAwaitingPayment =
    !isCancelled
    && !isCompleted
    && AWAITING_PAYMENT_STATUSES.includes(status)
    && !hasSuccessfulPayment
    && paymentStatus !== 'refunded';

  const isAwaitingShowroomProcessing =
    !isCancelled
    && !isCompleted
    && !isAwaitingPayment
    && paymentStatus !== 'refunded'
    && hasSuccessfulPayment
    && SHOWROOM_PROCESSING_STATUSES.includes(status);

  const isAwaitingPickup =
    !isCancelled
    && !isCompleted
    && !isAwaitingPayment
    && !isAwaitingShowroomProcessing
    && paymentStatus !== 'refunded'
    && hasSuccessfulPayment
    && AWAITING_PICKUP_STATUSES.includes(status);

  const pickupReadyByTime = startAt ? hasStarted : hasSuccessfulPayment;
  const canConfirmPickup = false;
  const timeBasedRentalAccess = false;

  const canOpenRentalFlow = RENTAL_FLOW_STATUSES.includes(status) || timeBasedRentalAccess;
  const canHandleReceive = RECEIVE_READY_STATUSES.includes(status) || timeBasedRentalAccess;
  const canHandleReturn = RETURN_READY_STATUSES.includes(status) || timeBasedRentalAccess;

  const isUpcoming =
    !isCancelled
    && !isCompleted
    && !timeBasedRentalAccess
    && (UPCOMING_STATUSES.includes(status) || (hasSuccessfulPayment && !hasStarted));

  const isActive =
    !isCancelled
    && !isCompleted
    && (ACTIVE_STATUSES.includes(status) || timeBasedRentalAccess);

  const effectiveFlowStatus = RENTAL_FLOW_STATUSES.includes(status)
    ? status
    : timeBasedRentalAccess
      ? hasEnded
        ? 'in_use'
        : 'handed_over'
      : 'waiting_handover';

  const rentalActionLabel = isCompleted
    ? 'Xem biên bản'
    : status === 'waiting_return_confirmation'
      ? 'Đang chờ xác nhận'
      : canHandleReturn && hasEnded
        ? 'Trả xe ngay'
        : status === 'waiting_handover'
          ? 'Chờ bàn giao xe'
          : canOpenRentalFlow
            ? 'Yêu cầu trả xe'
            : '';

  const rentalAccessHint = timeBasedRentalAccess
    ? hasEnded
      ? 'Đã quá hạn trả xe. Bạn có thể mở giao diện trả xe ngay.'
      : 'Đã đến lịch thuê. Bạn sẽ mở được quy trình trả xe khi đến đúng thời gian.'
    : '';

  const pickupConfirmationHint = !(isAwaitingPickup || isAwaitingShowroomProcessing)
    ? ''
    : requiresRetryPayment
      ? 'Thanh toán trước đó chưa thành công. Vui lòng thanh toán lại để tiếp tục quy trình nhận xe.'
      : !hasSuccessfulPayment
        ? 'Booking đang chờ thanh toán. Sau khi thanh toán thành công, showroom mới có thể bàn giao xe.'
        : isAwaitingShowroomProcessing
          ? 'Showroom đang xử lý booking và chuẩn bị bàn giao xe. Booking sẽ chuyển sang Chờ giao xe khi showroom hoàn tất xử lý.'
          : !pickupReadyByTime && startAt
            ? `Showroom sẽ hoàn tất bàn giao khi đến mốc ${startAt.toLocaleString('vi-VN')}.`
            : 'Showroom đã hoàn tất bước bàn giao trên hệ thống. Đây là màn theo dõi — bạn không cần bấm «xác nhận đã nhận xe» ở đây; khi trạng thái đồng bộ, booking sẽ hiện ở Chuyến đi của tôi.';

  return {
    canConfirmPickup,
    canHandleReceive,
    canHandleReturn,
    canOpenRentalFlow,
    effectiveFlowStatus,
    hasEnded,
    hasStarted,
    hasSuccessfulPayment,
    isActive,
    isAwaitingPayment,
    isAwaitingShowroomProcessing,
    isAwaitingPickup,
    isCancelled,
    isCompleted,
    isUpcoming,
    paymentStatus,
    pickupConfirmationHint,
    rentalAccessHint,
    rentalActionLabel,
    timeBasedRentalAccess,
  };
};
