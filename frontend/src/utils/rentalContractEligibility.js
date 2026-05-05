/**
 * Đồng bộ điều kiện hiển thị nút "Xem hợp đồng thuê xe" với backend:
 * GET /api/rental-contract/by-booking/:id yêu cầu thanh toán successful và booking không hủy.
 *
 * @param {{ isCancelled?: boolean, status?: string, paymentStatus?: string } | null | undefined} booking
 */
export function canRenterViewOfficialRentalContract(booking) {
  if (!booking) return false;
  if (booking.isCancelled || booking.status === 'cancelled') return false;
  return booking.paymentStatus === 'successful';
}
