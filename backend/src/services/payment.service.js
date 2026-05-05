require('dotenv').config();
//https://wise.com/gb/blog/stripe-payments-test-cards



const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PaymentModel = require('../models/payment.model');
const throwError = require('../utils/throwError');
const BookingService = require('./booking.service');
const BaseService = require('./base.service');
const paymentModel = require('../models/payment.model');
const QueryBuilder = require('../utils/queryBuilder');
const ALLOWED_PAYMENT_STATUSES = [
  'pending',
  'waiting_payment'
];



class PaymentService {
  async createPaymentForBooking(bookingId) {
    // Lấy booking, ngoài ra còn lấy total price để tạo amount trong payment db
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) throwError('Không tìm thấy booking', 404);

    if (booking.status === "paid") {
      throwError("Booking đã thanh toán", 400);
    }

    // Kiểm tra có được phép thanh toán không
    if (!ALLOWED_PAYMENT_STATUSES.includes(booking.status)) {
      throwError(
        `Booking ở trạng thái "${booking.status}" không thể thanh toán. 
    Chỉ các trạng thái được phép: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`,
        400
      );
    }
    // Tìm payment cũ
    let payment = await PaymentModel.findOne({
      booking_id: bookingId,
      payment_status: 'pending'
    })

    if (payment.payment_status !== "pending") {
      throw throwError('Chỉ có thanh toán pending mới được tạo intent', 400);
    }

    // Nếu chưa có thì tạo mới
    if (!payment) {
      payment = await this.createPaymentDB({
        booking_id: bookingId,
        amount: booking.total_price,
        payment_status: 'pending'
      });
      await BookingService.updateBookingStatus(
        bookingId,
        'waiting_payment'
      );

    }


    let intent;
    // Nếu đã có intent → dùng lại
    if (payment.stripe_payment_intent_id) {
      intent = await this.getPaymentIntentById(payment.stripe_payment_intent_id);

    } else {
      // Nếu chưa có → tạo mới
      intent = await this.createPaymentIntent({
        paymentId: payment._id
      });

      await PaymentModel.findByIdAndUpdate(payment._id, {
        stripe_payment_intent_id: intent.id
      });

    }

    return { ...payment, stripe_payment_intent_id: intent.id, client_secret: intent.client_secret };
  }

  async getPaymentState(bookingId) {
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) throwError("Không tìm thấy booking", 404);

    const payment = await PaymentModel.findOne({
      booking_id: bookingId,
    }).sort({ createdAt: -1 });


    let intent = null;

    if (payment?.stripe_payment_intent_id) {
      intent = await this.getPaymentIntentById(
        payment.stripe_payment_intent_id
      );
    }

    return {
      bookingStatus: booking.status,
      paymentStatus: payment?.payment_status || null,
      intentStatus: intent?.status || null,
    };
  }

  async createPaymentIntent(body = {}) {
    const { paymentId } = body;

    const payment = await this.getPaymentDBById(paymentId);

    if (!payment) {
      throw throwError('Payment không tồn tại', 404);
    }

    const intent = await stripe.paymentIntents.create({
      amount: payment.amount,
      currency: payment.currency,
      metadata: {
        booking_id: payment.booking_id.toString(),
        payment_id: payment._id.toString()
      }
    });

    return intent;
  }



  async createPaymentDB(body) {
    const transactionCode = `TXN-${Date.now()}`;

    const payment = await PaymentModel.create({
      transaction_code: transactionCode,
      ...body
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
    return payment
  }

  async getListPaymentDB(body = {}) {
    const {
      search,
      page,
      limit,
      sort_by,
      sort_by_amount,
      transaction_code,
      booking_id
    } = body;

    // Pagination
    const pagination = BaseService.parsePagination({ page, limit });

    const searchFilter = QueryBuilder.buildSearchFilter(search, { transaction_code });

    const fieldFilter = QueryBuilder.buildExactFieldFilter({ booking_id });
    const filter = { $and: [searchFilter, fieldFilter] };
    const sortObj = QueryBuilder.buildSortOptions([{ field: 'amount', value: sort_by_amount }
      , { field: 'createdAt', value: sort_by }
    ]

    );
    return BaseService.findPaginated(paymentModel, filter, sortObj, pagination);
  }





  async updatePaymentDBStatus(paymentId, newStatus) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) throw throwError('Không tìm thấy dữ liệu thanh toán', 404);

    payment.payment_status = newStatus;

    await payment.save();
    return payment.toObject();
  }
  /** cập nhật trạng thái thanh toán db và booking db, trả về object result cho controller xử lý lấy field cụ thể */
  async syncPaymentIntentWithDB(paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const updatePaymentAndBooking = async (intent, paymentStatus, bookingStatus) => {
      const paymentId = intent.metadata.payment_id;
      const bookingId = intent.metadata.booking_id;

      const payment = await this.getPaymentDBById(paymentId);
      await this.updatePaymentDBStatus(paymentId, paymentStatus);
      await BookingService.updateBookingStatus(bookingId, bookingStatus);

      if (paymentStatus === 'successful') {
        await PaymentModel.findByIdAndUpdate(payment._id, { paid_at: new Date() });
      }
    };

    // Gom logic xác định trạng thái
    let paymentStatus = null;
    let bookingStatus = null;

    if (intent.status === "succeeded") {
      paymentStatus = 'successful';
      bookingStatus = 'paid';
    } else if (["requires_payment_method", "canceled"].includes(intent.status)) {
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
}




module.exports = new PaymentService();