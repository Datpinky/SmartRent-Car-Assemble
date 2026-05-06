const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const bookingValidation = require("../validations/booking.validation");
const validate = require("../middlewares/validate.middleware");
const bookingAiController = require("../controllers/bookingAi.controller");

const router = express.Router();

router.get(
  "/report/:bookingId",
  authMiddleware,
  bookingValidation.getBookingById,
  validate,
  bookingAiController.getReport
);

router.post(
  "/report/:bookingId/generate",
  authMiddleware,
  bookingValidation.getBookingById,
  validate,
  bookingAiController.generateReport
);

module.exports = router;
