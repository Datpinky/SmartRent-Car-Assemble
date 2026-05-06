require('dotenv').config();
//https://wise.com/gb/blog/stripe-payments-test-cards



const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PaymentModel = require('../models/payment.model');
const Booking = require('../models/booking.model');
const throwError = require('../utils/throwError');
const BookingService = require('./booking.service');
const BaseService = require('./base.service');
const paymentModel = require('../models/payment.model');
const QueryBuilder = require('../utils/queryBuilder');
const auditLogService = require('./auditLog.service');
const ALLOWED_PAYMENT_STATUSES = [
  'pending',
  'waiting_payment'
];



class PaymentService {
  async ensureBookingAccess(booking, actor) {
    return BookingService.assertBookingAccess(booking, actor);
  }

  async createPaymentForBooking(bookingId, actor) {
    // Lấy booking, ngoài ra còn lấy total price để tạo amount trong payment db
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) throwError('Không tìm thấy booking', 404);
    await this.ensureBookingAccess(booking, actor);

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
    // Tìm payment cũ (pending)
    let payment = await PaymentModel.findOne({
      booking_id: bookingId,
      payment_status: 'pending'
    });

    // Nếu chưa có thì tạo mới
    if (!payment) {
      const session = await PaymentModel.startSession();
      try {
        await session.withTransaction(async () => {
          const [created] = await PaymentModel.create([{
            booking_id: bookingId,
            amount: booking.total_price,
            payment_status: 'pending',
            payment_kind: 'deposit',
          }], { session });
          payment = created;

          await BookingService.transitionBookingStatus(
            bookingId,
            'waiting_payment',
            { role: 'system', userId: actor?.userId }
          );
        });
      } finally {
        await session.endSession();
      }

    }

    if (["pending", "confirmed", "payment_failed"].includes(booking.status)) {
      await BookingService.transitionBookingStatus(
        bookingId,
        "waiting_payment",
        { role: "system", userId: actor?.userId }
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

    return { ...(payment.toObject ? payment.toObject() : payment), stripe_payment_intent_id: intent.id, client_secret: intent.client_secret };
  }

  async getPaymentState(bookingId, actor) {
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) throwError("Không tìm thấy booking", 404);
    await this.ensureBookingAccess(booking, actor);

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



  async getPaymentDBById(paymentId, actor = null) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      throw throwError('Không tìm thấy dữ liệu thanh toán', 404);
    }
    if (actor) {
      const booking = await BookingService.getBookingById(payment.booking_id);
      await this.ensureBookingAccess(booking, actor);
    }
    return payment
  }

  async getListPaymentDB(body = {}, actor = null) {
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

    let resolvedBookingId = booking_id;
    if (actor && actor.role !== "admin") {
      const bookingScope = actor.role === "showroom"
        ? { showroom_id: actor.userId }
        : { user_id: actor.userId };
      const allowedBookings = await Booking.find(bookingScope).select("_id").lean();
      const ids = allowedBookings.map((b) => b._id);
      const paginationScoped = BaseService.parsePagination({ page, limit });
      let bookingFilter;
      if (resolvedBookingId) {
        const rid = String(resolvedBookingId);
        const allowed = ids.some((id) => String(id) === rid);
        if (!allowed) {
          return {
            data: [],
            pagination: {
              total: 0,
              page: paginationScoped.page,
              limit: paginationScoped.limit,
              totalPages: 0,
            },
          };
        }
        bookingFilter = { booking_id: resolvedBookingId };
      } else {
        bookingFilter = { booking_id: { $in: ids } };
      }
      const scopedFilter = bookingFilter;
      const sortObj = QueryBuilder.buildSortOptions([{ field: 'amount', value: sort_by_amount }
        , { field: 'createdAt', value: sort_by }
      ]

      );
      return BaseService.findPaginated(paymentModel, { $and: [searchFilter, scopedFilter] }, sortObj, paginationScoped);
    }

    const fieldFilter = QueryBuilder.buildExactFieldFilter({ booking_id: resolvedBookingId });
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
  async syncPaymentIntentWithDB(paymentIntentId, actor) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const updatePaymentAndBooking = async (intent, paymentStatus, bookingStatus) => {
      const paymentId = intent.metadata.payment_id;
      const bookingId = intent.metadata.booking_id;

      const payment = await this.getPaymentDBById(paymentId, actor);
      const booking = await BookingService.getBookingById(bookingId);
      await this.ensureBookingAccess(booking, actor);
      await this.updatePaymentDBStatus(paymentId, paymentStatus);
      await BookingService.transitionBookingStatus(bookingId, bookingStatus, { role: 'system', userId: actor?.userId });

      if (paymentStatus === 'successful') {
        await PaymentModel.findByIdAndUpdate(payment._id, { paid_at: new Date() });
        const pricingSnapshot = BookingService.buildRevenueSnapshot(booking.total_price);
        await booking.constructor.findByIdAndUpdate(booking._id, {
          $set: { pricing_snapshot: pricingSnapshot }
        });
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
      const payment = await PaymentModel.findOne({ stripe_payment_intent_id: paymentIntentId });
      await auditLogService.record({
        actor_id: actor?.userId,
        actor_role: actor?.role,
        action: "payment.sync_intent",
        entity: "payment",
        entity_id: payment?._id,
        before: null,
        after: { paymentStatus, bookingStatus, intentStatus: intent.status },
        metadata: { paymentIntentId }
      });
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