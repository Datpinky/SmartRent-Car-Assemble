require('dotenv').config();
//https://wise.com/gb/blog/stripe-payments-test-cards

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PaymentModel = require('../models/payment.model');
const UserModel = require('../models/user.model');
const throwError = require('../utils/throwError');
const BookingService = require('./booking.service');
const BaseService = require('./base.service');
const paymentModel = require('../models/payment.model');
const QueryBuilder = require('../utils/queryBuilder');
const contractService = require('./contract.service');
const ALLOWED_PAYMENT_STATUSES = ['pending', 'waiting_payment'];

class PaymentService {
  async createPaymentForBooking(bookingId, userId = null) {
    // Lấy booking, ngoài ra còn lấy total price để tạo amount trong payment db
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) throwError('Không tìm thấy booking', 404);

    if (booking.status === 'paid') {
      throwError('Booking đã thanh toán', 400);
    }

    // Kiểm tra có được phép thanh toán không
    if (!ALLOWED_PAYMENT_STATUSES.includes(booking.status)) {
      throwError(
        `Booking ở trạng thái "${booking.status}" không thể thanh toán. 
    Chỉ các trạng thái được phép: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`,
        400,
      );
    }

    // Lấy Stripe Customer nếu có userId
    let customerId = null;
    if (userId) {
      try {
        const user = await UserModel.findById(userId);
        if (user) customerId = await this.getOrCreateStripeCustomer(user);
      } catch {
        // Không block luồng thanh toán nếu Customer creation fails
      }
    }

    // Tìm payment cũ (pending)
    let payment = await PaymentModel.findOne({
      booking_id: bookingId,
      payment_status: 'pending',
    });

    // Nếu chưa có → tạo mới và chuyển booking sang waiting_payment
    if (!payment) {
      payment = await this.createPaymentDB({
        booking_id: bookingId,
        amount: booking.total_price,
        payment_status: 'pending',
      });
      await BookingService._setStatusInternal(bookingId, 'waiting_payment');
    }

    let intent;
    // Nếu đã có intent → dùng lại, update customer nếu chưa có
    if (payment.stripe_payment_intent_id) {
      intent = await this.getPaymentIntentById(payment.stripe_payment_intent_id);
      // Gắn customer vào intent cũ nếu chưa có
      if (customerId && !intent.customer) {
        intent = await stripe.paymentIntents.update(payment.stripe_payment_intent_id, {
          customer: customerId,
          setup_future_usage: 'off_session',
        });
      }
    } else {
      // Nếu chưa có → tạo mới
      intent = await this.createPaymentIntent({
        paymentId: payment._id,
        customerId,
      });

      await PaymentModel.findByIdAndUpdate(payment._id, {
        stripe_payment_intent_id: intent.id,
      });
    }

    return {
      ...payment,
      stripe_payment_intent_id: intent.id,
      client_secret: intent.client_secret,
    };
  }

  async getPaymentState(bookingId) {
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) throwError('Không tìm thấy booking', 404);

    const payment = await PaymentModel.findOne({
      booking_id: bookingId,
    }).sort({ createdAt: -1 });

    let intent = null;

    if (payment?.stripe_payment_intent_id) {
      intent = await this.getPaymentIntentById(payment.stripe_payment_intent_id);
    }

    return {
      bookingStatus: booking.status,
      paymentStatus: payment?.payment_status || null,
      intentStatus: intent?.status || null,
    };
  }

  async createPaymentIntent(body = {}) {
    const { paymentId, customerId } = body;

    const payment = await this.getPaymentDBById(paymentId);

    if (!payment) {
      throw throwError('Payment không tồn tại', 404);
    }

    const intentOptions = {
      amount: payment.amount,
      currency: payment.currency,
      metadata: {
        booking_id: payment.booking_id.toString(),
        payment_id: payment._id.toString(),
      },
    };

    if (customerId) {
      intentOptions.customer = customerId;
      intentOptions.setup_future_usage = 'off_session';
    }

    const intent = await stripe.paymentIntents.create(intentOptions);

    return intent;
  }

  async createPaymentDB(body) {
    const transactionCode = `TXN-${Date.now()}`;

    const payment = await PaymentModel.create({
      transaction_code: transactionCode,
      ...body,
    });

    return payment.toObject();
  }

  async getPaymentIntentById(intentId) {
    return await stripe.paymentIntents.retrieve(intentId);
  }

  async getPaymentDBById(paymentId) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      throw throwError('Không tìm thấy dữ liệu thanh toán', 404);
    }
    return payment;
  }

  async getListPaymentDB(body = {}) {
    const { search, page, limit, sort_by, sort_by_amount, transaction_code, booking_id } = body;

    // Pagination
    const pagination = BaseService.parsePagination({ page, limit });

    const searchFilter = QueryBuilder.buildSearchFilter(search, { transaction_code });

    const fieldFilter = QueryBuilder.buildExactFieldFilter({ booking_id });
    const filter = { $and: [searchFilter, fieldFilter] };
    const sortObj = QueryBuilder.buildSortOptions([
      { field: 'amount', value: sort_by_amount },
      { field: 'createdAt', value: sort_by },
    ]);
    return BaseService.findPaginated(paymentModel, filter, sortObj, pagination);
  }

  async updatePaymentDBStatus(paymentId, newStatus) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) throw throwError('Không tìm thấy dữ liệu thanh toán', 404);

    payment.payment_status = newStatus;

    await payment.save();
    return payment.toObject();
  }
  /**
   * Phát hành hoàn tiền Stripe cho một booking đã thanh toán.
   * Gọi khi huỷ booking có payment_status = 'successful'.
   * @returns {{ refundId, amount, status, paymentStatus: 'refunded' }}
   */
  async issueRefund(bookingId) {
    const payment = await PaymentModel.findOne({ booking_id: bookingId, payment_status: 'successful' })
      .sort({ createdAt: -1 })
      .lean();

    if (!payment) {
      // Không có payment đã thanh toán → không cần hoàn tiền
      return null;
    }

    // Tránh refund 2 lần
    if (payment.stripe_refund_id) {
      return { refundId: payment.stripe_refund_id, alreadyRefunded: true };
    }

    if (!payment.stripe_payment_intent_id) {
      throwError('Không tìm thấy Stripe PaymentIntent để hoàn tiền', 500);
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: 'requested_by_customer',
    });

    await PaymentModel.findByIdAndUpdate(payment._id, {
      payment_status: 'refunded',
      stripe_refund_id: refund.id,
      refund_amount: refund.amount,
      refunded_at: new Date(),
    });

    return {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
      paymentStatus: 'refunded',
    };
  }

  /** cập nhật trạng thái thanh toán db và booking db, trả về object result cho controller xử lý lấy field cụ thể */
  async syncPaymentIntentWithDB(paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const updatePaymentAndBooking = async (intent, paymentStatus, bookingStatus) => {
      const paymentId = intent.metadata.payment_id;
      const bookingId = intent.metadata.booking_id;

      // Idempotency guard: nếu đã xử lý rồi thì bỏ qua
      const existing = await PaymentModel.findById(paymentId).lean();
      if (existing?.payment_status === 'successful' && paymentStatus === 'successful') {
        return; // Đã sync trước đó, không tạo hợp đồng trùng
      }

      await this.updatePaymentDBStatus(paymentId, paymentStatus);
      await BookingService._setStatusInternal(bookingId, bookingStatus);

      if (paymentStatus === 'successful') {
        await PaymentModel.findByIdAndUpdate(paymentId, { paid_at: new Date() });
        // Tự động tạo bản ghi hợp đồng sau khi thanh toán thành công
        contractService
          .createAfterPayment(bookingId)
          .catch((err) => console.error('[ContractService] createAfterPayment error:', err));
      }
    };

    // Gom logic xác định trạng thái
    let paymentStatus = null;
    let bookingStatus = null;

    if (intent.status === 'succeeded') {
      paymentStatus = 'successful';
      bookingStatus = 'paid';
    } else if (['requires_payment_method', 'canceled'].includes(intent.status)) {
      paymentStatus = 'failed';
      bookingStatus = 'waiting_payment';
    }

    // Nếu có trạng thái thì update DB
    if (paymentStatus && bookingStatus) {
      await updatePaymentAndBooking(intent, paymentStatus, bookingStatus);
    }

    // Trả về object thống nhất
    return {
      intent,
      paymentStatus,
      bookingStatus,
    };
  }

  async getBatchPaymentStates(bookingIds = []) {
    if (!bookingIds.length) return {};

    const mongoose = require('mongoose');
    const objectIds = bookingIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Lấy payment mới nhất của mỗi booking bằng aggregation
    const payments = await PaymentModel.aggregate([
      { $match: { booking_id: { $in: objectIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$booking_id',
          payment_status: { $first: '$payment_status' },
          amount: { $first: '$amount' },
          payment_method: { $first: '$payment_method' },
          stripe_payment_intent_id: { $first: '$stripe_payment_intent_id' },
          paid_at: { $first: '$paid_at' },
        },
      },
    ]);

    const result = {};
    for (const p of payments) {
      result[p._id.toString()] = {
        paymentStatus: p.payment_status,
        amount: p.amount,
        paymentMethod: p.payment_method,
        stripeIntentId: p.stripe_payment_intent_id || null,
        paidAt: p.paid_at || null,
      };
    }
    return result;
  }

  async getBatchPaymentsByBookings(bookingIds = []) {
    if (!bookingIds.length) return {};

    const mongoose = require('mongoose');
    const objectIds = bookingIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const payments = await PaymentModel.find({ booking_id: { $in: objectIds } })
      .sort({ createdAt: -1 })
      .lean();

    const map = {};
    for (const p of payments) {
      const key = p.booking_id.toString();
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  }

  // ─── Saved Card Management ────────────────────────────────────────────────

  /** Lấy hoặc tạo Stripe Customer cho user, lưu stripe_customer_id vào DB */
  async getOrCreateStripeCustomer(user) {
    if (user.stripe_customer_id) {
      // Kiểm tra customer còn tồn tại trên Stripe
      try {
        const existing = await stripe.customers.retrieve(user.stripe_customer_id);
        if (!existing.deleted) return user.stripe_customer_id;
      } catch {
        // Customer không tồn tại hoặc bị xóa → tạo lại
      }
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { user_id: user._id.toString() },
    });

    await UserModel.findByIdAndUpdate(user._id, { stripe_customer_id: customer.id });
    return customer.id;
  }

  /** Liệt kê thẻ đã lưu của user */
  async listSavedCards(userId) {
    const user = await UserModel.findById(userId);
    if (!user) throwError('Không tìm thấy người dùng', 404);
    if (!user.stripe_customer_id) return [];

    const [pms, customer] = await Promise.all([
      stripe.paymentMethods.list({ customer: user.stripe_customer_id, type: 'card' }),
      stripe.customers.retrieve(user.stripe_customer_id),
    ]);

    const defaultPmId = customer.invoice_settings?.default_payment_method || null;

    return pms.data.map((pm) => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
      isDefault: pm.id === defaultPmId,
    }));
  }

  /** Tạo SetupIntent để lưu thẻ mới mà không cần charge ngay */
  async createSetupIntent(userId) {
    const user = await UserModel.findById(userId);
    if (!user) throwError('Không tìm thấy người dùng', 404);

    const customerId = await this.getOrCreateStripeCustomer(user);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return { clientSecret: setupIntent.client_secret };
  }

  /** Xóa thẻ đã lưu */
  async deleteSavedCard(userId, paymentMethodId) {
    const user = await UserModel.findById(userId);
    if (!user?.stripe_customer_id) throwError('Không có thẻ được lưu', 400);

    // Xác minh thẻ thuộc customer này
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== user.stripe_customer_id) {
      throwError('Không có quyền xóa thẻ này', 403);
    }

    await stripe.paymentMethods.detach(paymentMethodId);
    return { success: true };
  }

  /** Đặt thẻ mặc định */
  async setDefaultCard(userId, paymentMethodId) {
    const user = await UserModel.findById(userId);
    if (!user?.stripe_customer_id) throwError('Không có thẻ được lưu', 400);

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== user.stripe_customer_id) {
      throwError('Không có quyền đặt thẻ này làm mặc định', 403);
    }

    await stripe.customers.update(user.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    return { success: true };
  }
}

module.exports = new PaymentService();
