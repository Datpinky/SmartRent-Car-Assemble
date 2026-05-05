
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middlewares/auth.middleware");
router.post('/createPaymentDB', paymentController.createPaymentDB);
router.get('/getPaymentIntent/:intentId', paymentController.getPaymentIntentById);
router.get("/getPaymentById/:paymentId",paymentController.getPaymentDBById);
router.post("/getListPayments", paymentController.getListPaymentDB);
router.get("/getPaymentState/:bookingId", paymentController.getPaymentState);
router.post('/sync-intent', authMiddleware, paymentController.syncPaymentIntentWithDB);



module.exports = router;