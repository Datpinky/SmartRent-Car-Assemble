export const cardInfoStyle = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #f1f5f9',
  padding: 18,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

export const getPaymentResultUrl = (booking) =>
  `/renter/payment-result?bookingId=${booking.id}&status=${
    booking.paymentStatus === 'successful' ? 'success' : booking.paymentStatus === 'pending' ? 'pending' : 'error'
  }`;

export const getRetryPaymentUrl = (booking) => `/renter/retry-payment/${booking.id}`;

export const getCancelActionLabel = (booking) =>
  booking.paymentStatus === 'successful' ? 'Hủy đơn / hoàn tiền' : 'Hủy đơn đặt xe';
