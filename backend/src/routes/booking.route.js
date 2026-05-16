const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const bookingValidation = require('../validations/booking.validation');
const PaymentController = require('../controllers/payment.controller');

router.post('/:bookingId/createPayment', authMiddleware, PaymentController.createPaymentForBooking);

router.post(
  '/createBooking',
  authMiddleware,
  bookingValidation.createBooking,
  validate,
  bookingController.createBooking,
);
router.post(
  '/getListBookings',
  authMiddleware,
  bookingValidation.getListBookings,
  validate,
  bookingController.getListBookings,
);
router.get(
  '/getBookingById/:bookingId',
  authMiddleware,
  bookingValidation.getBookingById,
  validate,
  bookingController.getBookingById,
);
router.patch(
  '/updateBookingStatus/:bookingId',
  authMiddleware,
  bookingValidation.updateBookingStatus,
  validate,
  bookingController.updateBookingStatus,
);
router.delete(
  '/deleteBooking/:bookingId',
  authMiddleware,
  bookingValidation.deleteBooking,
  validate,
  bookingController.deleteBooking,
);

// Renter xác nhận nhận xe bằng OTP showroom cung cấp
router.post('/verifyHandoverOtp/:bookingId', authMiddleware, bookingController.verifyHandoverOtp);

// Showroom/Admin tạo lại hoặc gửi lại mã OTP bàn giao
router.post('/resendHandoverOtp/:bookingId', authMiddleware, bookingController.resendHandoverOtp);

// Showroom lưu ảnh chụp xe trước khi bàn giao (tuỳ chọn)
router.patch('/:bookingId/pickup-images', authMiddleware, bookingController.savePickupImages);

module.exports = router;
