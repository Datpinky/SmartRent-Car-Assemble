import { Elements } from '@stripe/react-stripe-js';
import { FaSpinner } from 'react-icons/fa';
import StripePaymentForm from '../../../../components/common/StripePaymentForm';

const PaymentStep = ({
  clientSecret,
  stripePromise,
  stripeOptions,
  bookingId,
  processing,
  setProcessing,
  payError,
  stripeSessionError,
  repairingSession,
  onRecreateSession,
  onError,
  onSessionBroken,
  onBack,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
    <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight mb-6">Thanh toán</h2>

    {stripeSessionError && (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="mb-3">{stripeSessionError}</p>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          onClick={onRecreateSession}
          disabled={repairingSession}
        >
          {repairingSession ? (
            <>
              <FaSpinner aria-hidden="true" className="animate-spin" /> Dang tao lai phien...
            </>
          ) : (
            'Tao lai phien thanh toan'
          )}
        </button>
      </div>
    )}

    {payError && (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{payError}</div>
    )}

    {clientSecret ? (
      <Elements stripe={stripePromise} options={stripeOptions} key={clientSecret}>
        <StripePaymentForm
          bookingId={bookingId}
          clientSecret={clientSecret}
          processing={processing}
          setProcessing={setProcessing}
          onError={onError}
          onSessionBroken={onSessionBroken}
        />
      </Elements>
    ) : (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="mb-3">Chua co phien thanh toan Stripe hop le cho booking nay.</p>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          onClick={onRecreateSession}
          disabled={repairingSession}
        >
          {repairingSession ? (
            <>
              <FaSpinner aria-hidden="true" className="animate-spin" /> Dang tao lai phien...
            </>
          ) : (
            'Tao lai phien thanh toan'
          )}
        </button>
      </div>
    )}

    <button
      type="button"
      className="mt-5 text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
      onClick={onBack}
    >
      Quay lại chỉnh thông tin
    </button>
  </div>
);

export default PaymentStep;
