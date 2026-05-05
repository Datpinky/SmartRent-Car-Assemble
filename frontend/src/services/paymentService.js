import apiClient from './apiClient';

const resolveId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const resolvePaymentStatus = (booking, payment, paymentState) =>
  payment?.payment_status
  || paymentState?.paymentStatus
  || booking?.payment?.payment_status
  || booking?.paymentState?.paymentStatus
  || (booking?.status === 'paid' ? 'successful' : 'pending');

const normalizePaymentList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
};

const listPaymentsForBooking = async (bookingId, limit = 20) => {
  if (!bookingId) {
    return [];
  }

  const res = await apiClient.post('/api/payment/getListPayments', {
    booking_id: bookingId,
    sort_by: -1,
    page: 1,
    limit,
  });

  return normalizePaymentList(res.data?.data ?? res.data);
};

const getLatestPaymentForBooking = async (bookingId) => {
  const payments = await listPaymentsForBooking(bookingId, 1).catch(() => []);
  return Array.isArray(payments) && payments.length > 0 ? payments[0] : null;
};

const ensurePendingPaymentForBooking = async (bookingId, amount) => {
  const payments = await listPaymentsForBooking(bookingId, 20).catch(() => []);
  const hasPendingPayment = Array.isArray(payments)
    && payments.some((payment) => payment?.payment_status === 'pending');

  if (hasPendingPayment) {
    return;
  }

  await apiClient.post('/api/payment/createPaymentDB', {
    booking_id: bookingId,
    amount: Number(amount || 0),
    currency: 'vnd',
    payment_method: 'stripe',
    payment_status: 'pending',
  });
};

const extractPaymentIntentIdFromClientSecret = (clientSecret) => {
  if (!clientSecret || typeof clientSecret !== 'string') {
    return '';
  }

  const secretIndex = clientSecret.indexOf('_secret_');
  if (secretIndex <= 0) {
    return '';
  }

  return clientSecret.slice(0, secretIndex);
};

const paymentService = {
  async createPaymentSession(bookingOrOptions, amount) {
    const options =
      bookingOrOptions && typeof bookingOrOptions === 'object'
        ? bookingOrOptions
        : { bookingId: bookingOrOptions, amount };
    const bookingId = options.bookingId || options.id || '';

    if (!bookingId) {
      throw new Error('Khong tim thay booking id de tao payment.');
    }

    if (options.forceNew && options.previousClientSecret) {
      const syncResult = await this.syncPaymentIntentFromClientSecret(options.previousClientSecret).catch(() => null);
      if (syncResult?.paymentStatus === 'successful') {
        return { alreadyPaid: true, syncResult };
      }
    }

    await ensurePendingPaymentForBooking(bookingId, options.amount || amount);

    const res = await apiClient.post(`/api/booking/${bookingId}/createPayment`);
    return res.data?.data ?? res.data;
  },

  async createPayment(bookingOrOptions, amount) {
    return this.createPaymentSession(bookingOrOptions, amount);
  },

  async getPaymentState(bookingId) {
    const res = await apiClient.get(`/api/payment/getPaymentState/${bookingId}`);
    return res.data?.data ?? res.data;
  },

  async getMyPaymentState(bookingId) {
    return this.getPaymentState(bookingId);
  },

  async confirmPayment(paymentIntentId) {
    if (!paymentIntentId) {
      return null;
    }

    const res = await apiClient.post('/api/payment/sync-intent', { paymentIntentId });
    return res.data?.data ?? res.data;
  },

  getPaymentIntentIdFromClientSecret(clientSecret) {
    return extractPaymentIntentIdFromClientSecret(clientSecret);
  },

  async syncPaymentIntentFromClientSecret(clientSecret) {
    const paymentIntentId = extractPaymentIntentIdFromClientSecret(clientSecret);
    if (!paymentIntentId) {
      return null;
    }

    return this.confirmPayment(paymentIntentId);
  },

  async getLatestPaymentByBookingId(bookingId) {
    return getLatestPaymentForBooking(bookingId);
  },

  async retryPaymentSession(bookingId, amount, paymentMethod = 'stripe') {
    return this.createPaymentSession({
      bookingId,
      amount,
      paymentMethod,
    });
  },

  async recreatePaymentSession(bookingId, amount, previousClientSecret = '') {
    return this.createPaymentSession({
      bookingId,
      amount,
      previousClientSecret,
      forceNew: true,
    });
  },

  async getMyTransactions(bookings = []) {
    const transactionResults = await Promise.allSettled(
      (bookings || []).map(async (booking) => {
        const bookingId = resolveId(booking);
        if (!bookingId) {
          return [];
        }

        const payments = await listPaymentsForBooking(bookingId, 20).catch(() => []);
        const paymentState = booking?.paymentState || await this.getMyPaymentState(bookingId).catch(() => null);
        const paymentRows = Array.isArray(payments) ? payments : [];

        if (paymentRows.length === 0) {
          const fallbackStatus = resolvePaymentStatus(booking, booking?.payment, paymentState);
          const fallbackPayment = booking?.payment || null;

          if (!fallbackPayment && !paymentState) {
            return [];
          }

          return [{
            id: resolveId(fallbackPayment) || `${bookingId}-fallback`,
            bookingId,
            vehicleName: booking?.vehicle?.name || booking?.vehicle_id?.vehicle_name || 'Xe khong ten',
            showroomName: booking?.showroom?.name || booking?.showroom_id?.name || 'SmartRent',
            amount: Number(fallbackPayment?.amount || booking?.total_price || 0),
            method: fallbackPayment?.payment_method || 'stripe',
            status: fallbackStatus,
            transactionCode: fallbackPayment?.transaction_code || fallbackPayment?.stripe_payment_intent_id || '',
            paidAt: fallbackPayment?.paid_at || '',
            createdAt: fallbackPayment?.createdAt || booking?.createdAt || '',
            bookingStatus: paymentState?.bookingStatus || booking?.status || '',
            image: booking?.image || booking?.vehicle?.images?.[0] || booking?.vehicle_id?.vehicle_images_paths?.[0] || '',
            raw: {
              booking,
              payment: fallbackPayment,
              paymentState,
            },
          }];
        }

        return paymentRows.map((payment) => ({
          id: resolveId(payment) || `${bookingId}-${payment?.transaction_code || payment?.stripe_payment_intent_id || 'payment'}`,
          bookingId,
          vehicleName: booking?.vehicle?.name || booking?.vehicle_id?.vehicle_name || 'Xe khong ten',
          showroomName: booking?.showroom?.name || booking?.showroom_id?.name || 'SmartRent',
          amount: Number(payment?.amount || booking?.total_price || 0),
          method: payment?.payment_method || 'stripe',
          status: resolvePaymentStatus(booking, payment, paymentState),
          transactionCode: payment?.transaction_code || payment?.stripe_payment_intent_id || '',
          paidAt: payment?.paid_at || '',
          createdAt: payment?.createdAt || booking?.createdAt || '',
          bookingStatus: paymentState?.bookingStatus || booking?.status || '',
          image: booking?.image || booking?.vehicle?.images?.[0] || booking?.vehicle_id?.vehicle_images_paths?.[0] || '',
          raw: {
            booking,
            payment,
            paymentState,
          },
        }));
      })
    );

    return transactionResults
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value)
      .sort((left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime());
  },
};

export default paymentService;
