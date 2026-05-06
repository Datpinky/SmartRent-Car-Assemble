
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");

router.post('/createPaymentDB', authMiddleware, authorizeRoles('admin'), paymentController.createPaymentDB);
router.get('/getPaymentIntent/:intentId', authMiddleware, paymentController.getPaymentIntentById);
router.get("/getPaymentById/:paymentId", authMiddleware, paymentController.getPaymentDBById);
router.post("/getListPayments", authMiddleware, paymentController.getListPaymentDB);
router.get("/getPaymentState/:bookingId", authMiddleware, paymentController.getPaymentState);
router.post('/sync-intent', authMiddleware, paymentController.syncPaymentIntentWithDB);

module.exports = router;
