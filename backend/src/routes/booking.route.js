const express = require("express");
const router = express.Router();
const multer = require("multer");

const bookingController = require("../controllers/booking.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const bookingValidation = require("../validations/booking.validation");
const PaymentController = require("../controllers/payment.controller");
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/:bookingId/createPayment',
  authMiddleware,
  PaymentController.createPaymentForBooking
);

router.post("/createBooking", authMiddleware, bookingValidation.createBooking, validate, bookingController.createBooking);
router.post("/getListBookings", authMiddleware, bookingValidation.getListBookings, validate, bookingController.getListBookings);
router.get("/getBookingById/:bookingId", authMiddleware, bookingValidation.getBookingById, validate, bookingController.getBookingById);
router.patch("/updateBookingStatus/:bookingId", authMiddleware, bookingValidation.updateBookingStatus, validate, bookingController.updateBookingStatus);
router.delete("/deleteBooking/:bookingId", authMiddleware, bookingValidation.deleteBooking, validate, bookingController.deleteBooking);
router.post(
  "/:bookingId/inspection/handover",
  authMiddleware,
  upload.array("files", 5),
  bookingValidation.getBookingById,
  validate,
  bookingController.submitHandoverInspection
);
router.post(
  "/:bookingId/inspection/return",
  authMiddleware,
  upload.array("files", 5),
  bookingValidation.getBookingById,
  validate,
  bookingController.submitReturnInspection
);
router.get(
  "/:bookingId/inspection/report",
  authMiddleware,
  bookingValidation.getBookingById,
  validate,
  bookingController.getInspectionReport
);


module.exports = router;