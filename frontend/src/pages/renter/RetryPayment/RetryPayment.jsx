import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCreditCard,
  FaEnvelope,
  FaMoneyBillWave,
  FaSpinner,
  FaSyncAlt,
} from 'react-icons/fa';
import bookingService from '../../../services/bookingService';
import paymentService from '../../../services/paymentService';
import {
  formatDateTime,
  formatMoney,
  mapRenterBooking,
  PAYMENT_LABELS,
} from '../../../utils/renterBookingView';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY, {
  developerTools: {
    assistant: {
      enabled: process.env.REACT_APP_STRIPE_TESTING_ASSISTANT === 'true',
    },
  },
});

const buildRetrySessionError = (message = '') => {
  const normalized = String(message || '').toLowerCase();
  const looksExpiredSession =
    normalized.includes('client secret')
    || normalized.includes('payment intent')
    || normalized.includes('elements session')
    || normalized.includes('invalid')
    || normalized.includes('expired')
    || normalized.includes('loaderror');

  return looksExpiredSession
    ? 'Phiên thanh toán hiện tại không còn hợp lệ trên Stripe. Vui lòng tạo lại phiên thanh toán mới.'
    : 'Cổng thanh toán Stripe không tải được đầy đủ. Vui lòng tạo lại phiên thanh toán và thử lại.';
};

const StripeRetryForm = ({ bookingId, onError, onSessionBroken }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;

    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement || !paymentElementReady) {
      onError('Cổng thanh toán chưa sẵn sàng. Vui lòng đợi trong giây lát rồi thử lại.');
      return;
    }

    setSubmitting(true);
    onError('');

    try {
      const returnUrl = `${window.location.origin}/renter/payment-result?bookingId=${bookingId}`;
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });

      if (error) {
        onError(error.message || 'Không thể tiếp tục thanh toán lúc này.');
        setSubmitting(false);
      }
    } catch (error) {
      onError(error?.message || 'Không thể tiếp tục thanh toán lúc này.');
      setSubmitting(false);
    }
  };

  const handleLoadError = (event) => {
    setPaymentElementReady(false);
    onSessionBroken(buildRetrySessionError(event?.error?.message || event?.message || ''));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 16,
          background: '#fff',
          marginBottom: 18,
        }}
      >
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'never', googlePay: 'never' },
          }}
          onLoaderStart={() => setPaymentElementReady(false)}
          onReady={() => setPaymentElementReady(true)}
          onLoadError={handleLoadError}
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', minHeight: 46 }}
        disabled={!stripe || submitting || !paymentElementReady}
      >
        {submitting ? (
          <>
            <FaSpinner className="animate-spin" /> Đang xử lý...
          </>
        ) : (
          <>
            <FaCreditCard /> {paymentElementReady ? 'Thanh toán lại ngay' : 'Đang tải cổng thanh toán...'}
          </>
        )}
      </button>
    </form>
  );
};

const RetryPayment = () => {
  const { bookingId = '' } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [brokenClientSecret, setBrokenClientSecret] = useState('');
  const [error, setError] = useState('');
  const [needsNewSession, setNeedsNewSession] = useState(false);

  const autoPreparedRef = useRef('');

  const renterBooking = useMemo(
    () => (booking ? mapRenterBooking(booking) : null),
    [booking]
  );

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setError('Không tìm thấy booking để thanh toán lại.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await bookingService.getBookingById(bookingId);
      setBooking(data || null);
      setError('');
    } catch (err) {
      setBooking(null);
      setError(err.message || 'Không thể tải thông tin booking.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleRefreshBooking = useCallback(async () => {
    autoPreparedRef.current = '';
    setClientSecret('');
    setBrokenClientSecret('');
    setNeedsNewSession(false);
    setError('');
    await loadBooking();
  }, [loadBooking]);

  const inspectStripeIntentStatus = useCallback(async (secret) => {
    if (!secret) return '';

    try {
      const stripe = await stripePromise;
      if (!stripe || typeof stripe.retrievePaymentIntent !== 'function') {
        return '';
      }

      const { paymentIntent } = await stripe.retrievePaymentIntent(secret);
      return paymentIntent?.status || '';
    } catch {
      return '';
    }
  }, []);

  const handleTerminalClientSecret = useCallback(async (secret, targetBookingId) => {
    const intentStatus = await inspectStripeIntentStatus(secret);

    if (intentStatus === 'succeeded') {
      await paymentService.syncPaymentIntentFromClientSecret(secret).catch(() => null);
      navigate(`/renter/payment-result?bookingId=${targetBookingId}&status=success`);
      return true;
    }

    if (intentStatus === 'canceled') {
      await paymentService.syncPaymentIntentFromClientSecret(secret).catch(() => null);
      setBrokenClientSecret(secret);
      setClientSecret('');
      setNeedsNewSession(true);
      setError('Phien thanh toan cu da bi huy tren Stripe. Vui long tao lai phien thanh toan moi.');
      return true;
    }

    return false;
  }, [inspectStripeIntentStatus, navigate]);

  const prepareRetryPayment = useCallback(async (targetBooking = renterBooking) => {
    if (!targetBooking?.id) {
      setError('Không tìm thấy booking để tạo lại phiên thanh toán.');
      return;
    }

    setPreparing(true);
    setError('');
    setNeedsNewSession(false);

    try {
      const amount = Number(targetBooking.totalPrice || 0);
      const paymentData = brokenClientSecret
        ? await paymentService.recreatePaymentSession(targetBooking.id, amount, brokenClientSecret)
        : await paymentService.retryPaymentSession(targetBooking.id, amount);

      if (paymentData?.alreadyPaid) {
        navigate(`/renter/payment-result?bookingId=${targetBooking.id}&status=success`);
        return;
      }

      const secret = paymentData?.client_secret || paymentData?.clientSecret || '';

      if (!secret) {
        throw new Error('Không nhận được client secret để tiếp tục thanh toán.');
      }

      if (await handleTerminalClientSecret(secret, targetBooking.id)) {
        return;
      }

      setClientSecret(secret);
      setBrokenClientSecret('');
    } catch (err) {
      setClientSecret('');
      setNeedsNewSession(true);
      setError(err.message || 'Không thể tạo lại phiên thanh toán cho booking này.');
    } finally {
      setPreparing(false);
    }
  }, [brokenClientSecret, handleTerminalClientSecret, navigate, renterBooking]);

  useEffect(() => {
    if (!renterBooking?.id || !renterBooking.canRetryPayment || clientSecret) {
      return;
    }

    if (autoPreparedRef.current === renterBooking.id) {
      return;
    }

    autoPreparedRef.current = renterBooking.id;
    void prepareRetryPayment(renterBooking);
  }, [clientSecret, prepareRetryPayment, renterBooking]);

  const stripeOptions = useMemo(
    () => (clientSecret
      ? {
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: '#00b14f' },
        },
      }
      : undefined),
    [clientSecret]
  );

  const retryBlockedMessage = !renterBooking
    ? ''
    : renterBooking.paymentStatus === 'successful'
      ? 'Booking này đã thanh toán thành công, không cần tạo lại phiên thanh toán.'
      : renterBooking.status === 'cancelled'
        ? 'Booking đã bị hủy, không thể thanh toán lại.'
        : 'Booking này không ở trạng thái cho phép thanh toán lại.';

  const sessionRecoveryHint = needsNewSession
    ? 'Stripe không thể dùng phiên hiện tại. Bạn cần tạo lại phiên thanh toán mới cho booking này.'
    : 'Chưa khởi tạo được phiên thanh toán mới. Bạn có thể thử tạo lại phiên Stripe cho booking này.';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', color: '#6b7280', gap: 10 }}>
        <FaSpinner className="animate-spin" />
        Đang tải thông tin thanh toán...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', justifyContent: 'center', padding: '8px 0 28px' }}>
      <div style={{ width: '100%', maxWidth: 760 }}>
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="page-title">Thanh toán lại</h1>
            <p className="page-subtitle">Mở lại phiên Stripe cho booking đang chờ thanh toán hoặc cần retry</p>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: '0.84rem',
            }}
          >
            {error}
          </div>
        )}

        {renterBooking && (needsNewSession || Boolean(error)) && (
          <div
            style={{
              marginBottom: 16,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '14px 16px',
              fontSize: '0.82rem',
              lineHeight: 1.65,
              color: '#334155',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6, color: '#0f172a' }}>Nếu bạn đang kẹt thanh toán Stripe</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Bấm «Tạo lại phiên thanh toán» hoặc «Kiểm tra lại trạng thái booking» bên dưới.</li>
              <li>Quay về «Chờ thanh toán» để thử booking khác hoặc đợi vài phút rồi mở lại trang này.</li>
              <li>Gửi email showroom nếu booking đã thanh toán nhưng giao diện chưa đồng bộ.</li>
            </ul>
          </div>
        )}

        {!renterBooking ? (
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', padding: 24 }}>
            Không tìm thấy booking để thanh toán lại.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18 }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827' }}>{renterBooking.vehicleName}</div>
                  <div style={{ marginTop: 4, fontSize: '0.82rem', color: '#6b7280' }}>{renterBooking.showroomName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#00b14f' }}>
                    {formatMoney(renterBooking.totalPrice)}
                  </div>
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>Mã booking: {renterBooking.id}</div>
                </div>
              </div>

              <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                {[
                  ['Trạng thái booking', renterBooking.status],
                  ['Trạng thái thanh toán', PAYMENT_LABELS[renterBooking.paymentStatus] || renterBooking.paymentStatus],
                  ['Thời gian nhận xe', formatDateTime(renterBooking.startDate)],
                  ['Thời gian trả xe', formatDateTime(renterBooking.endDate)],
                  ['Phương thức', renterBooking.paymentMethod],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      paddingBottom: 10,
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaMoneyBillWave />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>Phiên thanh toán Stripe</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                    FE sẽ mở lại phiên thanh toán cho chính booking này. Nếu Stripe báo phiên không hợp lệ, bạn có thể tạo lại phiên mới ngay tại đây.
                  </div>
                </div>
              </div>

              {!renterBooking.canRetryPayment ? (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '14px 16px',
                    color: '#475569',
                    fontSize: '0.84rem',
                    lineHeight: 1.6,
                  }}
                >
                  {retryBlockedMessage}
                </div>
              ) : clientSecret ? (
                <>
                  <Elements stripe={stripePromise} options={stripeOptions} key={clientSecret}>
                    <StripeRetryForm
                      bookingId={renterBooking.id}
                      onError={setError}
                      onSessionBroken={(message) => {
                        setBrokenClientSecret(clientSecret);
                        setClientSecret('');
                        setNeedsNewSession(true);
                        setError(message);
                      }}
                    />
                  </Elements>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fcd34d',
                      color: '#92400e',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: '0.82rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {sessionRecoveryHint}
                  </div>
                  <button
                    className="btn-primary"
                    style={{ justifyContent: 'center' }}
                    onClick={() => prepareRetryPayment(renterBooking)}
                    disabled={preparing}
                  >
                    {preparing ? (
                      <>
                        <FaSpinner className="animate-spin" /> Đang tạo lại phiên thanh toán...
                      </>
                    ) : (
                      <>
                        <FaCreditCard /> Tạo lại phiên thanh toán
                      </>
                    )}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                <button className="renter-btn-soft" onClick={() => navigate('/renter/pending?tab=payment')}>
                  <FaArrowLeft /> Quay về Chờ thanh toán
                </button>
                <button className="renter-btn-soft" onClick={handleRefreshBooking} disabled={loading || preparing}>
                  <FaSyncAlt /> Kiểm tra lại trạng thái booking
                </button>
                {renterBooking.showroomEmail && (
                  <a className="renter-btn-soft" href={`mailto:${renterBooking.showroomEmail}`}>
                    <FaEnvelope /> Liên hệ showroom
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetryPayment;
