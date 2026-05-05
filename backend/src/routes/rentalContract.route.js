const express = require('express');
const router = express.Router();
const rentalContractController = require('../controllers/rentalContract.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const bookingValidation = require('../validations/booking.validation');

router.get(
  '/by-booking/:bookingId',
  authMiddleware,
  bookingValidation.getBookingById,
  validate,
  rentalContractController.getByBookingId
);

module.exports = router;
