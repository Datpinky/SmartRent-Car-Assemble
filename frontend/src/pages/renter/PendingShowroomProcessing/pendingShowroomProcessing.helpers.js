export const cardInfoStyle = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #f1f5f9',
  padding: 18,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

export const getCancelActionLabel = (booking) =>
  booking.paymentStatus === 'successful' ? 'Hủy đơn / hoàn tiền' : 'Hủy đơn đặt xe';

export const getProcessingLabel = (booking) => {
  if (booking.status === 'confirmed') return 'Showroom đang chuẩn bị bàn giao';
  if (booking.status === 'paid') return 'Đang chờ showroom xác nhận';
  return 'Đang chờ showroom xử lý';
};
