const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
router.post('/createPaymentDB', authMiddleware, paymentController.createPaymentDB);
router.get('/getPaymentIntent/:intentId', paymentController.getPaymentIntentById);
router.get('/getPaymentById/:paymentId', paymentController.getPaymentDBById);
router.post('/getListPayments', paymentController.getListPaymentDB);
router.get('/getPaymentState/:bookingId', paymentController.getPaymentState);
router.post('/batch-payment-states', paymentController.getBatchPaymentStates);
router.post('/batch-payments-by-bookings', paymentController.getBatchPaymentsByBookings);
router.post('/sync-intent', authMiddleware, paymentController.syncPaymentIntentWithDB);

// Saved card management
router.get('/saved-cards', authMiddleware, paymentController.listSavedCards);
router.post('/saved-cards/setup-intent', authMiddleware, paymentController.createSetupIntent);
router.delete('/saved-cards/:pmId', authMiddleware, paymentController.deleteSavedCard);
router.post('/saved-cards/set-default', authMiddleware, paymentController.setDefaultCard);

module.exports = router;
