import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { FaCcMastercard, FaCcVisa, FaCreditCard, FaSpinner, FaTrash } from 'react-icons/fa';
import { MdAdd, MdStar, MdStarOutline } from 'react-icons/md';
import paymentService from '../../services/paymentService';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY, {
  developerTools: { assistant: { enabled: false } },
});

const BRAND_LABEL = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

const brandColors = {
  visa: 'text-blue-700',
  mastercard: 'text-red-600',
};

function BrandIcon({ brand }) {
  if (brand === 'visa') return <FaCcVisa className="text-2xl text-blue-700" aria-hidden="true" />;
  if (brand === 'mastercard') return <FaCcMastercard className="text-2xl text-red-600" aria-hidden="true" />;
  return <FaCreditCard className={`text-2xl ${brandColors[brand] ?? 'text-gray-400'}`} aria-hidden="true" />;
}

// ─── Inner form (inside <Elements>) ─────────────────────────────────────────
function AddCardForm({ onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');

    try {
      const { error: stripeErr } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/renter/profile?cardSaved=1`,
        },
        redirect: 'if_required',
      });

      if (stripeErr) {
        setError(stripeErr.message || 'Không thể lưu thẻ. Vui lòng thử lại.');
      } else {
        onSuccess?.();
      }
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <PaymentElement
        options={{
          layout: { type: 'accordion', defaultCollapsed: false, radios: 'never', spacedAccordionItems: false },
          fields: { billingDetails: { name: 'auto' } },
          wallets: { applePay: 'never', googlePay: 'never' },
          paymentMethodOrder: ['card'],
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2.5">
        <button
          type="submit"
          disabled={submitting || !stripe}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
        >
          {submitting ? <FaSpinner className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? 'Đang lưu...' : 'Lưu thẻ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function SavedCardManager() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [settingDefaultId, setSettingDefaultId] = useState('');

  const fetchCards = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await paymentService.listSavedCards();
      setCards(Array.isArray(data) ? data : []);
    } catch {
      setError('Không thể tải danh sách thẻ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
    // Xử lý redirect từ Stripe (3DS)
    const params = new URLSearchParams(window.location.search);
    if (params.get('cardSaved') === '1') {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('cardSaved');
      window.history.replaceState({}, '', clean.toString());
    }
  }, []);

  const handleOpenAddForm = async () => {
    setLoadingSetup(true);
    setError('');
    try {
      const result = await paymentService.createSetupIntent();
      setSetupSecret(result.clientSecret);
      setShowAddForm(true);
    } catch {
      setError('Không thể mở form thêm thẻ. Vui lòng thử lại.');
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleDelete = async (pmId) => {
    setDeletingId(pmId);
    try {
      await paymentService.deleteSavedCard(pmId);
      setCards((prev) => prev.filter((c) => c.id !== pmId));
    } catch {
      setError('Không thể xóa thẻ. Vui lòng thử lại.');
    } finally {
      setDeletingId('');
    }
  };

  const handleSetDefault = async (pmId) => {
    setSettingDefaultId(pmId);
    try {
      await paymentService.setDefaultCard(pmId);
      setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === pmId })));
    } catch {
      setError('Không thể đặt thẻ mặc định. Vui lòng thử lại.');
    } finally {
      setSettingDefaultId('');
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setSetupSecret('');
    fetchCards();
  };

  const stripeOptions = setupSecret ? { clientSecret: setupSecret } : undefined;

  return (
    <section aria-labelledby="saved-cards-heading" className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 id="saved-cards-heading" className="font-bold text-gray-800 text-base">
          Thẻ thanh toán đã lưu
        </h3>
        {!showAddForm && (
          <button
            type="button"
            onClick={handleOpenAddForm}
            disabled={loadingSetup}
            className="flex items-center gap-1.5 rounded-xl bg-blue-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
            aria-label="Thêm thẻ mới"
          >
            {loadingSetup ? (
              <FaSpinner className="animate-spin" aria-hidden="true" />
            ) : (
              <MdAdd className="text-base" aria-hidden="true" />
            )}
            Thêm thẻ
          </button>
        )}
      </div>

      {error && (
        <p role="alert" aria-live="polite" className="mb-3 text-xs text-red-600">
          {error}
        </p>
      )}

      {/* Add card form */}
      {showAddForm && stripeOptions && (
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="mb-3 text-sm font-semibold text-blue-900">Thêm thẻ mới</p>
          <Elements stripe={stripePromise} options={stripeOptions} key={setupSecret}>
            <AddCardForm
              onSuccess={handleAddSuccess}
              onCancel={() => {
                setShowAddForm(false);
                setSetupSecret('');
              }}
            />
          </Elements>
        </div>
      )}

      {/* Card list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <FaSpinner className="animate-spin" aria-hidden="true" />
          Đang tải thẻ...
        </div>
      ) : cards.length === 0 && !showAddForm ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <FaCreditCard className="mx-auto mb-2 text-3xl text-gray-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-gray-500">Chưa có thẻ nào được lưu</p>
          <p className="mt-1 text-xs text-gray-400">
            Thẻ sẽ được lưu tự động sau lần thanh toán đầu tiên hoặc khi bạn thêm thủ công.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5" aria-label="Danh sách thẻ đã lưu" role="list">
          {cards.map((card) => (
            <li
              key={card.id}
              role="listitem"
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
                card.isDefault ? 'border-blue-300 bg-blue-50/60' : 'border-gray-100 bg-white'
              }`}
            >
              <BrandIcon brand={card.brand} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {BRAND_LABEL[card.brand] ?? card.brand} •••• {card.last4}
                </p>
                <p className="text-xs text-gray-400">
                  Hết hạn {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                </p>
              </div>
              {card.isDefault && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[0.7rem] font-bold text-blue-700">
                  Mặc định
                </span>
              )}
              {!card.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(card.id)}
                  disabled={!!settingDefaultId}
                  aria-label={`Đặt thẻ ${card.last4} làm mặc định`}
                  className="p-1.5 text-gray-400 hover:text-blue-700 disabled:opacity-50"
                  title="Đặt làm thẻ mặc định"
                >
                  {settingDefaultId === card.id ? (
                    <FaSpinner className="animate-spin text-sm" aria-hidden="true" />
                  ) : (
                    <MdStarOutline className="text-xl" aria-hidden="true" />
                  )}
                </button>
              )}
              {card.isDefault && (
                <span className="p-1.5 text-blue-600" title="Thẻ mặc định">
                  <MdStar className="text-xl" aria-hidden="true" />
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(card.id)}
                disabled={!!deletingId}
                aria-label={`Xóa thẻ ${card.last4}`}
                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
              >
                {deletingId === card.id ? (
                  <FaSpinner className="animate-spin text-sm" aria-hidden="true" />
                ) : (
                  <FaTrash className="text-sm" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
