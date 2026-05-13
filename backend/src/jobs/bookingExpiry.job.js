const BookingService = require('../services/booking.service');

const INTERVAL_MS = 60 * 1000; // chạy mỗi 60 giây

function startBookingExpiryJob() {
  console.log('[BookingExpiry] Job started — kiểm tra booking hết hạn mỗi 60s');

  const run = async () => {
    try {
      const expired = await BookingService.expireStalePaymentBookings();
      if (expired.length > 0) {
        console.log(`[BookingExpiry] Đã hủy ${expired.length} booking hết hạn thanh toán:`, expired);
      }
    } catch (err) {
      console.error('[BookingExpiry] Lỗi khi kiểm tra booking hết hạn:', err.message);
    }
  };

  // Chạy ngay lần đầu sau khi khởi động
  run();

  // Sau đó lặp mỗi INTERVAL_MS
  return setInterval(run, INTERVAL_MS);
}

module.exports = { startBookingExpiryJob };
