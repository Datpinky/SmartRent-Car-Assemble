import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';
import { FaCreditCard, FaSpinner } from 'react-icons/fa';
import paymentService from '../../services/paymentService';

const BRAND_LABEL = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

/**
 * Shared Stripe payment form used by both Checkout and RetryPayment.
 *
 * Props:
 *  - bookingId        string   — booking to pay for
 *  - clientSecret     string   — Stripe PaymentIntent client_secret (must match the parent <Elements> key)
 *  - processing       bool     — external "processing" flag (Checkout keeps this in parent)
 *  - setProcessing    fn|null  — setter for external flag; if null, component manages its own
 *  - onError          fn       — (message: string) => void
 *  - onSessionBroken  fn       — (message: string) => void  — called when PaymentElement fails to load
 *  - submitLabel      string   — button label when ready (default "Thanh toán ngay")
 *  - accentColor      string   — Tailwind color token for button (default "blue-800")
 */
export default function StripePaymentForm({
  bookingId,
  clientSecret,
  processing: externalProcessing,
  setProcessing: setExternalProcessing,
  onError,
  onSessionBroken,
  submitLabel = 'Thanh toán ngay',
}) {
  const stripe = useStripe();
  const elements = useElements();

  // If parent owns processing state use it, otherwise keep local
  const [localProcessing, setLocalProcessing] = useState(false);
  const processing = setExternalProcessing != null ? externalProcessing : localProcessing;
  const setProcessing = setExternalProcessing ?? setLocalProcessing;

  const [paymentElementReady, setPaymentElementReady] = useState(false);

  // Saved cards
  const [savedCards, setSavedCards] = useState([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState(''); // '' = new card
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    paymentService
      .listSavedCards()
      .then((cards) => {
        const list = Array.isArray(cards) ? cards : [];
        setSavedCards(list);
        const defaultCard = list.find((c) => c.isDefault);
        if (defaultCard) setSelectedSavedCard(defaultCard.id);
      })
      .catch(() => setSavedCards([]))
      .finally(() => setLoadingCards(false));
  }, []);

  const usingSavedCard = selectedSavedCard !== '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || processing) return;

    if (!usingSavedCard && (!elements || !paymentElementReady)) {
      onError('Cổng thanh toán chưa sẵn sàng. Vui lòng đợi giây lát rồi thử lại.');
      return;
    }

    setProcessing(true);
    onError('');

    try {
      const returnUrl = `${window.location.origin}/renter/payment-result?bookingId=${bookingId}`;

      let stripeError;
      if (usingSavedCard) {
        const result = await stripe.confirmPayment({
          clientSecret,
          confirmParams: { return_url: returnUrl, payment_method: selectedSavedCard },
          redirect: 'if_required',
        });
        stripeError = result.error;
        if (!stripeError) {
          // Payment confirmed inline (no redirect) — pass payment_intent so PaymentResult can sync
          const intentId = result.paymentIntent?.id || '';
          const intentSecret = result.paymentIntent?.client_secret || '';
          window.location.href = `${returnUrl}&redirect_status=succeeded&payment_intent=${intentId}&payment_intent_client_secret=${intentSecret}`;
          return;
        }
      } else {
        ({ error: stripeError } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
        }));
      }

      if (stripeError) {
        onError(stripeError.message || 'Thanh toán thất bại. Vui lòng thử lại.');
        setProcessing(false);
      }
    } catch (err) {
      onError(err?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
      setProcessing(false);
    }
  };

  const handleLoadError = (event) => {
    setPaymentElementReady(false);
    if (typeof onSessionBroken === 'function') {
      onSessionBroken(event?.error?.message || event?.message || '');
    }
  };

  const isButtonDisabled = !stripe || processing || (!usingSavedCard && !paymentElementReady);

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Saved cards picker ── */}
      {!loadingCards && savedCards.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Thẻ đã lưu</p>
          <div className="flex flex-col gap-2">
            {savedCards.map((card) => (
              <label
                key={card.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  selectedSavedCard === card.id
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="stripe_payment_card"
                  value={card.id}
                  checked={selectedSavedCard === card.id}
                  onChange={() => setSelectedSavedCard(card.id)}
                  className="accent-blue-700"
                />
                <span className="flex-1 text-sm">
                  <span className="font-semibold capitalize">{BRAND_LABEL[card.brand] ?? card.brand}</span> ••••{' '}
                  {card.last4}
                  <span className="ml-2 text-xs text-gray-400">
                    {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                  </span>
                  {card.isDefault && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[0.65rem] font-bold text-blue-700">
                      Mặc định
                    </span>
                  )}
                </span>
              </label>
            ))}

            {/* Option: use new card */}
            <label
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                selectedSavedCard === ''
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="stripe_payment_card"
                value=""
                checked={selectedSavedCard === ''}
                onChange={() => setSelectedSavedCard('')}
                className="accent-blue-700"
              />
              <span className="text-sm font-semibold text-gray-700">+ Dùng thẻ mới</span>
            </label>
          </div>
        </div>
      )}

      {/* ── New card form ── */}
      {!usingSavedCard && (
        <div className="mb-5">
          {savedCards.length === 0 && !loadingCards && (
            <label className="block text-xs font-semibold text-gray-600 mb-2">Thông tin thẻ</label>
          )}
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
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
        </div>
      )}

      <button type="submit" disabled={isButtonDisabled} className="btn-primary w-full justify-center py-3 text-base">
        {processing ? (
          <>
            <FaSpinner aria-hidden="true" className="animate-spin" /> Đang xử lý...
          </>
        ) : usingSavedCard ? (
          <>
            <FaCreditCard aria-hidden="true" /> {submitLabel}
          </>
        ) : paymentElementReady ? (
          <>
            <FaCreditCard aria-hidden="true" /> {submitLabel}
          </>
        ) : (
          'Đang tải cổng thanh toán...'
        )}
      </button>
    </form>
  );
}
