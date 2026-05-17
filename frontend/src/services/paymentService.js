import apiClient from './apiClient';

const resolveId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const resolvePaymentStatus = (booking, payment, paymentState) =>
  payment?.payment_status ||
  paymentState?.paymentStatus ||
  booking?.payment?.payment_status ||
  booking?.paymentState?.paymentStatus ||
  (booking?.status === 'paid' ? 'successful' : 'pending');

const resolveRefundStatus = (booking, paymentStatus) => {
  const bookingStatus = booking?.status || booking?.paymentState?.bookingStatus || '';
  if (bookingStatus === 'refund_requested') return 'awaiting_showroom_refund';
  if (bookingStatus === 'cancel_pending') return 'refund_pending';
  if (bookingStatus === 'cancel_failed') return 'refund_failed';
  if (paymentStatus === 'refunded') return 'refunded';
  if (bookingStatus === 'cancelled' && paymentStatus === 'successful') return 'refund_pending';
  if (bookingStatus === 'cancelled') return 'not_required';
  return '';
};

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
      throw new Error('Không tìm thấy mã đơn để tạo thanh toán.');
    }

    if (options.forceNew && options.previousClientSecret) {
      const syncResult = await this.syncPaymentIntentFromClientSecret(options.previousClientSecret).catch(() => null);
      if (syncResult?.paymentStatus === 'successful') {
        return { alreadyPaid: true, syncResult };
      }
    }

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
    if (!bookings.length) return [];

    const bookingIds = bookings.map(resolveId).filter(Boolean);

    // 1 request lấy tất cả payments thay vì N requests
    let paymentsMap = {};
    try {
      const res = await apiClient.post('/api/payment/batch-payments-by-bookings', {
        booking_ids: bookingIds,
      });
      paymentsMap = res.data?.data || {};
    } catch {
      // fallback: dùng embedded payment trong booking
    }

    const rows = bookings.flatMap((booking) => {
      const bookingId = resolveId(booking);
      if (!bookingId) return [];

      const paymentState = booking?.paymentState || null;
      const paymentRows = paymentsMap[bookingId] || [];

      if (paymentRows.length === 0) {
        const fallbackPayment = booking?.payment || null;
        const fallbackStatus = resolvePaymentStatus(booking, fallbackPayment, paymentState);
        if (!fallbackPayment && !paymentState) return [];
        const fallbackRefundStatus = resolveRefundStatus(booking, fallbackStatus);

        return [
          {
            id: resolveId(fallbackPayment) || `${bookingId}-fallback`,
            bookingId,
            vehicleName: booking?.vehicle?.name || booking?.vehicle_id?.vehicle_name || 'Xe khong ten',
            showroomName: booking?.showroom?.name || booking?.showroom_id?.name || 'SmartRent',
            amount: Number(fallbackPayment?.amount || booking?.total_price || 0),
            method: fallbackPayment?.payment_method || 'stripe',
            status: fallbackStatus,
            refundStatus: fallbackRefundStatus,
            transactionCode: fallbackPayment?.transaction_code || fallbackPayment?.stripe_payment_intent_id || '',
            paidAt: fallbackPayment?.paid_at || '',
            createdAt: fallbackPayment?.createdAt || booking?.createdAt || '',
            bookingStatus: paymentState?.bookingStatus || booking?.status || '',
            image:
              booking?.image || booking?.vehicle?.images?.[0] || booking?.vehicle_id?.vehicle_images_paths?.[0] || '',
            raw: { booking, payment: fallbackPayment, paymentState },
          },
        ];
      }

      return paymentRows.map((payment) => {
        const status = resolvePaymentStatus(booking, payment, paymentState);
        return {
          id:
            resolveId(payment) ||
            `${bookingId}-${payment?.transaction_code || payment?.stripe_payment_intent_id || 'payment'}`,
          bookingId,
          vehicleName: booking?.vehicle?.name || booking?.vehicle_id?.vehicle_name || 'Xe khong ten',
          showroomName: booking?.showroom?.name || booking?.showroom_id?.name || 'SmartRent',
          amount: Number(payment?.amount || booking?.total_price || 0),
          method: payment?.payment_method || 'stripe',
          status,
          refundStatus: resolveRefundStatus(booking, status),
          transactionCode: payment?.transaction_code || payment?.stripe_payment_intent_id || '',
          paidAt: payment?.paid_at || '',
          createdAt: payment?.createdAt || booking?.createdAt || '',
          bookingStatus: paymentState?.bookingStatus || booking?.status || '',
          image: booking?.image || booking?.vehicle?.images?.[0] || booking?.vehicle_id?.vehicle_images_paths?.[0] || '',
          raw: { booking, payment, paymentState },
        };
      });
    });

    return rows.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
  },

  // ─── Saved Card Management ────────────────────────────────────────────────

  async listSavedCards() {
    const res = await apiClient.get('/api/payment/saved-cards');
    return res.data?.data ?? [];
  },

  async createSetupIntent() {
    const res = await apiClient.post('/api/payment/saved-cards/setup-intent');
    return res.data?.data ?? res.data;
  },

  async deleteSavedCard(pmId) {
    await apiClient.delete(`/api/payment/saved-cards/${pmId}`);
  },

  async setDefaultCard(pmId) {
    await apiClient.post('/api/payment/saved-cards/set-default', { pmId });
  },
};

export default paymentService;
