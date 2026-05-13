const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PaymentModel = require('../models/payment.model');
const BookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');
const contractService = require('../services/contract.service');

/**
 * POST /api/webhook/stripe
 * Nhận sự kiện từ Stripe. Yêu cầu raw body (không qua express.json).
 * Đảm bảo dòng tiền được cập nhật ngay cả khi frontend mất kết nối sau thanh toán.
 */
async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        await handlePaymentSucceeded(intent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        await handlePaymentFailed(intent);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        await handleChargeRefunded(charge);
        break;
      }
      default:
        // Bỏ qua các event không xử lý
        break;
    }
  } catch (err) {
    console.error(`[Webhook] Error handling event ${event.type}:`, err.message);
    // Trả 200 để Stripe không retry liên tục — lỗi sẽ được log
    return res.status(200).json({ received: true, error: err.message });
  }

  return res.status(200).json({ received: true });
}

/**
 * payment_intent.succeeded → đảm bảo booking chuyển sang 'paid' kể cả khi frontend không redirect
 */
async function handlePaymentSucceeded(intent) {
  const paymentId = intent.metadata?.payment_id;
  const bookingId = intent.metadata?.booking_id;
  if (!paymentId || !bookingId) return;

  // Idempotency: bỏ qua nếu đã là successful
  const existing = await PaymentModel.findById(paymentId).lean();
  if (!existing || existing.payment_status === 'successful') return;

  await PaymentModel.findByIdAndUpdate(paymentId, {
    payment_status: 'successful',
    paid_at: new Date(),
  });

  await BookingService._setStatusInternal(bookingId, 'paid');

  contractService
    .createAfterPayment(bookingId)
    .catch((err) => console.error('[Webhook] createAfterPayment error:', err.message));

  console.log(`[Webhook] payment_intent.succeeded synced: booking=${bookingId}`);
}

/**
 * payment_intent.payment_failed → đánh dấu failed, giữ booking ở waiting_payment
 */
async function handlePaymentFailed(intent) {
  const paymentId = intent.metadata?.payment_id;
  if (!paymentId) return;

  const existing = await PaymentModel.findById(paymentId).lean();
  if (!existing || existing.payment_status !== 'pending') return;

  await PaymentModel.findByIdAndUpdate(paymentId, { payment_status: 'failed' });
  console.log(`[Webhook] payment_intent.payment_failed: payment=${paymentId}`);
}

/**
 * charge.refunded → cập nhật payment_status = 'refunded' nếu chưa được set
 */
async function handleChargeRefunded(charge) {
  const intentId = charge.payment_intent;
  if (!intentId) return;

  const payment = await PaymentModel.findOne({ stripe_payment_intent_id: intentId }).lean();
  if (!payment || payment.payment_status === 'refunded') return;

  const refund = charge.refunds?.data?.[0];
  await PaymentModel.findByIdAndUpdate(payment._id, {
    payment_status: 'refunded',
    stripe_refund_id: refund?.id || null,
    refund_amount: charge.amount_refunded,
    refunded_at: new Date(),
  });

  console.log(`[Webhook] charge.refunded synced: payment=${payment._id}`);
}

module.exports = { stripeWebhook };
