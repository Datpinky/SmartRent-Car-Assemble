const REFUND_STATUS_LABELS = {
  pending: 'đang xử lý',
  processing: 'đang xử lý',
  succeeded: 'đã hoàn tiền',
  failed: 'thất bại',
  canceled: 'đã hủy',
  requires_action: 'cần xử lý thêm',
};

export const getCancelBookingNotice = (booking, cancelResult) => {
  const vehiclePart = booking?.vehicleName ? ` cho ${booking.vehicleName}` : '';
  const paymentStatus = cancelResult?.paymentStatus || booking?.paymentStatus || '';
  const refundStatus = cancelResult?.refundStatus || '';

  if (paymentStatus === 'refunded') {
    const refundLabel = REFUND_STATUS_LABELS[refundStatus] || refundStatus;
    const refundSuffix = refundLabel ? ` Trạng thái refund: ${refundLabel}.` : '';

    return {
      tone: 'success',
      text: `Booking${vehiclePart} đã được hủy và hệ thống đã ghi nhận hoàn tiền.${refundSuffix}`,
    };
  }

  if (paymentStatus === 'declined') {
    return {
      tone: 'warning',
      text: `Booking${vehiclePart} đã được hủy. Giao dịch thanh toán chưa hoàn tất nên hệ thống đã đóng yêu cầu thanh toán.`,
    };
  }

  return {
    tone: 'success',
    text: `Booking${vehiclePart} đã được hủy thành công.`,
  };
};
