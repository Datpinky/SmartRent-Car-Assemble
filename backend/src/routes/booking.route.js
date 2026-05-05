const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/booking.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const bookingValidation = require("../validations/booking.validation");
const PaymentController = require("../controllers/payment.controller");

router.post(
  '/:bookingId/createPayment',
  PaymentController.createPaymentForBooking
);

router.post("/createBooking", authMiddleware, bookingValidation.createBooking, validate, bookingController.createBooking);
router.post("/getListBookings", authMiddleware, bookingValidation.getListBookings, validate, bookingController.getListBookings);
router.get("/getBookingById/:bookingId", authMiddleware, bookingValidation.getBookingById, validate, bookingController.getBookingById);
router.patch("/updateBookingStatus/:bookingId", authMiddleware, bookingValidation.updateBookingStatus, validate, bookingController.updateBookingStatus);
router.delete("/deleteBooking/:bookingId", authMiddleware, bookingValidation.deleteBooking, validate, bookingController.deleteBooking);


module.exports = router;