/**
 * Đồng bộ điều kiện hiển thị nút "Xem hợp đồng thuê xe" với backend:
 * GET /api/rental-contract/by-booking/:id yêu cầu thanh toán successful và booking không hủy.
 *
 * @param {{ isCancelled?: boolean, status?: string, paymentStatus?: string } | null | undefined} booking
 */
export function canRenterViewOfficialRentalContract(booking) {
  if (!booking) return false;
  if (booking.isCancelled || ['cancelled', 'cancel_pending', 'cancel_failed', 'refund_requested'].includes(booking.status))
    return false;
  return booking.paymentStatus === 'successful';
}

/**
 * Màn Chờ nhận xe: không hiện nút hợp đồng khi đơn vẫn ở bước showroom bàn giao (Chờ giao xe).
 */
export function canRenterViewRentalContractOnPendingPickupPage(booking) {
  if (!canRenterViewOfficialRentalContract(booking)) return false;
  if (booking.status === 'waiting_handover') return false;
  return true;
}
