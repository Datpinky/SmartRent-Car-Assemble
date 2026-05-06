import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  FaCheckCircle,
  FaCalendarAlt,
  FaSpinner,
  FaExclamationCircle,
  FaTag,
  FaStar,
  FaCar,
  FaArrowRight,
  FaLocationArrow,
} from 'react-icons/fa';
import { MdLocationOn } from 'react-icons/md';
import CarLocationMap from '../../../components/Map/CarLocationMap';
import vehicleService from '../../../services/vehicleService';
import bookingService from '../../../services/bookingService';
import paymentService from '../../../services/paymentService';
import mapService from '../../../services/mapService';
import { formatVnd, formatVndPerDay } from '../../../utils/currencyFormat';
import {
  buildDefaultPickupDate,
  buildDefaultRentalWindow,
  buildRentalWindowQuery,
  isSameCalendarDate,
  resolveRentalWindow,
} from '../../../utils/rentalWindow';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import RentalContractPreviewModal from './RentalContractPreviewModal';

const DELIVERY_FEE_VND = 50000;
const formatCoordinates = (latitude, longitude) => `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

const parseCoordinateInput = (value) => {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const hasCoordinates = (location) =>
  Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));

/**
 * Tắt Stripe.js Testing Assistant (UI nhãn "stripe" / sandbox assistant trên trang thanh toán).
 * Bật lại khi debug: REACT_APP_STRIPE_TESTING_ASSISTANT=true trong .env
 * @see https://docs.stripe.com/js/initializing#stripe_js_initialize-options-developerTools-assistant-enabled
 */
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY, {
  developerTools: {
    assistant: {
      enabled: process.env.REACT_APP_STRIPE_TESTING_ASSISTANT === 'true',
    },
  },
});

const buildStripeSessionError = (message = '') => {
  const normalized = String(message || '').toLowerCase();
  const looksLikeSessionError =
    normalized.includes('client secret')
    || normalized.includes('payment intent')
    || normalized.includes('elements session')
    || normalized.includes('invalid')
    || normalized.includes('expired')
    || normalized.includes('loaderror');

  return looksLikeSessionError
    ? 'Phien thanh toan hien tai khong con hop le tren Stripe. Vui long tao lai phien thanh toan moi.'
    : 'Cong thanh toan Stripe khong tai duoc day du. Vui long tao lai phien thanh toan va thu lai.';
};

//  Helpers 
function formatDateTimeVi(isoLocal) {
  try {
    const d = new Date(isoLocal);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

const pad2 = (n) => String(n).padStart(2, '0');

function toLocalInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function parseLocalDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function normalizeIncomingRentalWindow(pickupValue, returnValue, minPickupValue) {
  const minPickup = parseLocalDateTime(minPickupValue);
  const incomingPickup = parseLocalDateTime(pickupValue);
  const incomingReturn = parseLocalDateTime(returnValue);

  if (!incomingPickup || !incomingReturn || !minPickup) {
    return null;
  }

  const durationMs = incomingReturn.getTime() - incomingPickup.getTime();
  const minDuration = 24 * 60 * 60 * 1000;

  let safePickup = new Date(incomingPickup);
  let safeReturn = new Date(incomingReturn);

  if (safePickup < minPickup) {
    safePickup = new Date(minPickup);
    safeReturn = new Date(safePickup.getTime() + Math.max(durationMs, minDuration));
  }

  if (safeReturn <= safePickup || isSameCalendarDate(safeReturn, safePickup)) {
    safeReturn = new Date(safePickup.getTime() + Math.max(durationMs, minDuration));
  }

  return {
    pickupDate: toLocalInputValue(safePickup),
    returnDate: toLocalInputValue(safeReturn),
  };
}

function formatDateTimeInputLabel(isoLocal) {
  const d = parseLocalDateTime(isoLocal);
  if (!d) return 'Chọn ngày giờ';
  const hour12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? 'CH' : 'SA';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(hour12)}:${pad2(d.getMinutes())} ${ampm}`;
}

const CALENDAR_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const CALENDAR_MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Thang 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

function DateTimeField({
  id,
  label,
  value,
  minValue,
  onChange,
  isDayDisabled,
  dayClassName,
  readOnly = false,
  readOnlyHint,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedDate = parseLocalDateTime(value) || new Date();
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const minDate = parseLocalDateTime(minValue);
  const [viewMonth, setViewMonth] = useState(
    new Date(selectedYear, selectedMonth, 1)
  );

  useEffect(() => {
    setViewMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = (first.getDay() + 6) % 7;

  const applyDate = (nextDate) => {
    if (!nextDate || Number.isNaN(nextDate.getTime())) return;
    const safeDate = minDate && nextDate < minDate ? new Date(minDate) : nextDate;
    if (typeof isDayDisabled === 'function' && isDayDisabled(safeDate)) {
      return;
    }
    onChange(toLocalInputValue(safeDate));
  };

  const onSelectDay = (day) => {
    const next = new Date(selectedDate);
    next.setFullYear(year, month, day);
    applyDate(next);
  };

  const hour12 = selectedDate.getHours() % 12 || 12;
  const minute = selectedDate.getMinutes();
  const ampm = selectedDate.getHours() >= 12 ? 'CH' : 'SA';

  const onHourChange = (nextHour12) => {
    const next = new Date(selectedDate);
    const h = Number(nextHour12) % 12;
    next.setHours(ampm === 'CH' ? h + 12 : h);
    applyDate(next);
  };

  const onMinuteChange = (nextMinute) => {
    const next = new Date(selectedDate);
    next.setMinutes(Number(nextMinute));
    applyDate(next);
  };

  const onAmPmChange = (nextAmPm) => {
    const next = new Date(selectedDate);
    const h12 = next.getHours() % 12;
    next.setHours(nextAmPm === 'CH' ? h12 + 12 : h12);
    applyDate(next);
  };

  if (readOnly) {
    return (
      <div className="relative">
        <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
          <FaCalendarAlt aria-hidden="true" className="text-primary/80" />
          {label}
        </label>
        <div
          id={id}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-900 font-medium"
        >
          {formatDateTimeInputLabel(value)}
        </div>
        {readOnlyHint ? (
          <p className="mt-1.5 text-[0.7rem] text-gray-500 leading-snug m-0">{readOnlyHint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
        <FaCalendarAlt aria-hidden="true" className="text-primary/80" />
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-left hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
        onClick={() => setOpen((v) => !v)}
      >
        {formatDateTimeInputLabel(value)}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute z-30 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-lg p-3"
        >
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-gray-200 hover:bg-gray-50"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            >
              {'<'}
            </button>
            <select
              className="h-8 rounded-md border border-gray-200 px-2 text-sm"
              value={month}
              onChange={(e) => setViewMonth(new Date(year, Number(e.target.value), 1))}
            >
              {CALENDAR_MONTHS.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-md border border-gray-200 px-2 text-sm"
              value={year}
              onChange={(e) => setViewMonth(new Date(Number(e.target.value), month, 1))}
            >
              {Array.from({ length: 11 }).map((_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              className="ml-auto h-8 w-8 rounded-md border border-gray-200 hover:bg-gray-50"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            >
              {'>'}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[0.72rem] text-gray-500 mb-1">
            {CALENDAR_DAYS.map((d) => (
              <div key={d} className="font-semibold py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {Array.from({ length: leadingEmpty }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const cur = new Date(year, month, day, selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
              const isSelected =
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;
              const disabledByMin = !!(minDate && cur < minDate);
              const disabledByRule = typeof isDayDisabled === 'function' ? isDayDisabled(cur) : false;
              const disabled = disabledByMin || disabledByRule;
              const extraClass = typeof dayClassName === 'function' ? dayClassName(cur) : '';
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  className={`h-9 rounded-md text-sm transition ${isSelected
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-primary-light'
                    } ${disabled ? 'opacity-35 cursor-not-allowed hover:bg-transparent' : ''} ${extraClass}`}
                  onClick={() => onSelectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
            <select
              className="h-9 rounded-md border border-gray-200 px-2 text-sm"
              value={hour12}
              onChange={(e) => onHourChange(e.target.value)}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const v = i + 1;
                return (
                  <option key={v} value={v}>
                    {pad2(v)}
                  </option>
                );
              })}
            </select>
            <select
              className="h-9 rounded-md border border-gray-200 px-2 text-sm"
              value={minute}
              onChange={(e) => onMinuteChange(e.target.value)}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const v = i * 5;
                return (
                  <option key={v} value={v}>
                    {pad2(v)}
                  </option>
                );
              })}
            </select>
            <select
              className="h-9 rounded-md border border-gray-200 px-2 text-sm"
              value={ampm}
              onChange={(e) => onAmPmChange(e.target.value)}
            >
              <option value="SA">SA</option>
              <option value="CH">CH</option>
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => applyDate(new Date())}
            >
              Hom nay
            </button>
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={() => setOpen(false)}
            >
              Dong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const StripeCardForm = ({ onError, onSessionBroken, bookingId, processing, setProcessing }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || processing) return;

    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement || !paymentElementReady) {
      onError('Cong thanh toan chua san sang. Vui long doi trong giay lat roi thu lai.');
      return;
    }

    setProcessing(true);
    onError('');

    try {
      const returnUrl = `${window.location.origin}/renter/payment-result?bookingId=${bookingId}`;
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });

      if (error) {
        onError(error.message || 'Thanh toan that bai. Vui long thu lai.');
        setProcessing(false);
      }
    } catch (error) {
      onError(error?.message || 'Thanh toan that bai. Vui long thu lai.');
      setProcessing(false);
    }
  };

  const handleLoadError = (event) => {
    setPaymentElementReady(false);
    const message = buildStripeSessionError(event?.error?.message || event?.message || '');
    onError(message);
    if (typeof onSessionBroken === 'function') {
      onSessionBroken(message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Thông tin thẻ Stripe
        </label>
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
      <button
        type="submit"
        disabled={!stripe || processing || !paymentElementReady}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {processing ? (
          <>
            <FaSpinner aria-hidden="true" className="animate-spin" /> Đang xử lý...
          </>
        ) : (
          paymentElementReady ? 'Thanh toan ngay' : 'Dang tai cong thanh toan...'
        )}
      </button>
    </form>
  );
};

function StarRow({ rating }) {
  const r = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`Danh gia ${r} tren 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar
          key={n}
          className={`text-[0.85rem] ${n <= r ? 'text-amber-400' : 'text-gray-200'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function OrderSummaryPanel({
  vehicle,
  pickupDate,
  returnDate,
  days,
  subtotal,
  serviceFee,
  deliveryFee,
  total,
}) {
  const primaryImage = (vehicle?.image || vehicle?.images?.[0] || '').trim();
  const subtitle =
    (vehicle?.listingSubtitle && String(vehicle.listingSubtitle).trim())
    || (vehicle?.showroom && String(vehicle.showroom).trim())
    || (vehicle?.listerProfile?.displayName && String(vehicle.listerProfile.displayName).trim())
    || 'SmartRent';

  const [imgFailed, setImgFailed] = useState(false);
  const showPhoto = Boolean(primaryImage) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [primaryImage, vehicle?._id, vehicle?.id]);

  return (
    <aside className="lg:sticky lg:top-24 h-fit">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-[0.95rem]">Tóm tắt đơn hàng</h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-gray-100/90 px-3 py-3 border border-gray-100">
            <div
              className={`h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center ${
                showPhoto ? 'bg-white' : 'bg-primary-light text-primary'
              }`}
            >
              {showPhoto ? (
                <img
                  src={primaryImage}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <FaCar aria-hidden="true" className="text-lg" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-[0.88rem] leading-snug line-clamp-2">
                {vehicle.name}
              </p>
              <p className="text-[0.72rem] text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
            </div>
          </div>

          <dl className="space-y-2 text-[0.82rem] text-gray-600">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500 shrink-0">Nhận xe</dt>
              <dd className="tabular-nums text-right text-gray-800 font-medium">
                {formatDateTimeVi(pickupDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500 shrink-0">Trả xe</dt>
              <dd className="tabular-nums text-right text-gray-800 font-medium">
                {formatDateTimeVi(returnDate)}
              </dd>
            </div>
          </dl>

          <div className="h-px bg-gray-100" />

          <div className="space-y-2.5 text-[0.82rem]">
            <div className="flex justify-between gap-3 text-gray-600">
              <span>
                {formatVndPerDay(vehicle.price)} x {days} ngày
              </span>
              <span className="tabular-nums font-medium text-gray-800">
                {formatVnd(subtotal)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <FaTag aria-hidden="true" className="opacity-70 text-[0.7rem]" />
                Phí dịch vụ (5%)
              </span>
              <span className="tabular-nums font-medium text-gray-800">
                {formatVnd(serviceFee)}
              </span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between gap-3 text-gray-600">
                <span>Giao tại nội thành</span>
                <span className="tabular-nums font-medium text-gray-800">
                  +{formatVnd(deliveryFee)}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-gray-200">
            <span className="font-bold text-gray-900 text-[0.95rem]">Tổng cộng</span>
            <span className="tabular-nums text-xl font-bold text-primary">
              {formatVnd(total)}
            </span>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary-light/50 px-3.5 py-3 text-[0.72rem] text-gray-600 leading-relaxed">
            <ul className="list-disc pl-4 space-y-1.5 marker:text-primary">
              <li>Miễn phí hủy trước 1 giờ so với giờ nhận xe (theo chính sách đơn cụ thể).</li>
              <li>Thanh toán qua Stripe, thông tin thẻ được mã hóa.</li>
              <li>
                Điều kiện bảo hiểm và trách nhiệm theo hợp đồng thuê - SmartRent không cam kết mức bảo hiểm cụ thể trong chuyến đi.
              </li>
            </ul>
          </div>

          <p className="text-[0.7rem] text-gray-400 leading-relaxed">
            Bằng cách đặt xe, bạn đồng ý với{' '}
            <span className="underline text-primary">
              Điều khoản sử dụng
            </span>{' '}
            và{' '}
            <span className="underline text-primary">
              Chính sách bảo mật
            </span>
            .
          </p>
        </div>
      </div>
    </aside>
  );
}

//  Main Checkout page 
const Checkout = () => {
  const { carId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState(null);
  const [loadingVehicle, setLoadVeh] = useState(true);
  const [vehicleError, setVehError] = useState('');
  const [bookedIntervals, setBookedIntervals] = useState([]);
  const [loadingBookedDates, setLoadingBookedDates] = useState(false);
  const [bookedDateError, setBookedDateError] = useState('');

  const defaultRentalWindow = useMemo(() => buildDefaultRentalWindow(), []);
  const [pickupDate, setPickupDate] = useState(defaultRentalWindow.pickupDate);
  const [returnDate, setReturnDate] = useState(defaultRentalWindow.returnDate);
  const [pickupMethod, setPickupMethod] = useState('self');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [deliverySuggestions, setDeliverySuggestions] = useState([]);
  const [loadingDeliverySuggestions, setLoadingDeliverySuggestions] = useState(false);
  const [loadingDeliveryLocation, setLoadingDeliveryLocation] = useState(false);
  const deliveryAddressRef = useRef('');
  deliveryAddressRef.current = deliveryAddress;
  const minPickupDateTime = useMemo(() => buildDefaultPickupDate(), []);
  const incomingRentalWindow = useMemo(
    () => resolveRentalWindow({ state: location.state, search: location.search }),
    [location.search, location.state]
  );

  /** Có pickup+return từ CarDetail (state/query) → giữ khớp trang xe, không cho sửa trên checkout. */
  const isRentalWindowLocked = Boolean(
    incomingRentalWindow.pickupDate && incomingRentalWindow.returnDate
  );

  const [clientSecret, setClientSecret] = useState('');
  const [brokenClientSecret, setBrokenClientSecret] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [preparingPay, setPreparingPay] = useState(false);
  const [prepError, setPrepError] = useState('');

  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState('');
  const [stripeSessionError, setStripeSessionError] = useState('');
  const [repairingSession, setRepairingSession] = useState(false);

  const [isContractPreviewOpen, setIsContractPreviewOpen] = useState(false);
  const [hasAcceptedContract, setHasAcceptedContract] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const fetchVehicle = useCallback(async () => {
    if (!carId) {
      setVehError('Không tìm thấy thông tin xe.');
      setLoadVeh(false);
      return;
    }
    setLoadVeh(true);
    try {
      const v = await vehicleService.getById(carId);
      if (!v) throw new Error('Xe không tồn tại');
      setVehicle(v);
    } catch {
      setVehError('Không thể tải thông tin xe. Vui lòng thử lại.');
    } finally {
      setLoadVeh(false);
    }
  }, [carId]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  useEffect(() => {
    let cancelled = false;
    const vehicleId = vehicle?._id || vehicle?.id || carId;

    if (!vehicleId) {
      setBookedIntervals([]);
      setBookedDateError('');
      setLoadingBookedDates(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingBookedDates(true);
    setBookedDateError('');

    bookingService.getUnavailableDateIntervals(vehicleId)
      .then(({ intervals }) => {
        if (!cancelled) {
          setBookedIntervals(Array.isArray(intervals) ? intervals : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBookedIntervals([]);
          setBookedDateError('Chua the tai lich da dat cua xe nay.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBookedDates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [carId, vehicle?._id, vehicle?.id]);

  useLayoutEffect(() => {
    if (!incomingRentalWindow.pickupDate || !incomingRentalWindow.returnDate) {
      return;
    }

    const sanitizedWindow = normalizeIncomingRentalWindow(
      incomingRentalWindow.pickupDate,
      incomingRentalWindow.returnDate,
      minPickupDateTime
    );

    if (!sanitizedWindow) {
      return;
    }

    setPickupDate(sanitizedWindow.pickupDate);
    setReturnDate(sanitizedWindow.returnDate);
  }, [incomingRentalWindow.pickupDate, incomingRentalWindow.returnDate, minPickupDateTime]);

  useEffect(() => {
    if (isRentalWindowLocked) {
      return;
    }
    const pick = parseLocalDateTime(pickupDate);
    const ret = parseLocalDateTime(returnDate);
    if (pick && ret && (ret <= pick || isSameCalendarDate(pick, ret))) {
      const nextReturn = new Date(pick);
      nextReturn.setDate(nextReturn.getDate() + 1);
      setReturnDate(toLocalInputValue(nextReturn));
    }
  }, [pickupDate, returnDate, isRentalWindowLocked]);

  const isBookedDay = useCallback(
    (date) => bookingService.isDateBooked(date, bookedIntervals),
    [bookedIntervals]
  );

  const selectedBookedConflicts = useMemo(
    () =>
      bookingService.getBookingConflicts({
        pickupDate,
        returnDate,
        intervals: bookedIntervals,
      }),
    [bookedIntervals, pickupDate, returnDate]
  );

  const hasBookedDateSelection = selectedBookedConflicts.length > 0;

  useEffect(() => {
    if (prepError) {
      setPrepError('');
    }
  }, [deliveryAddress, pickupDate, prepError, pickupMethod, returnDate]);

  useEffect(() => {
    if (pickupMethod !== 'delivery') {
      setDeliverySuggestions([]);
      setLoadingDeliverySuggestions(false);
      return undefined;
    }

    const normalizedAddress = String(deliveryAddress || '').trim();
    if (!normalizedAddress || normalizedAddress.length < 3 || normalizedAddress === deliveryLocation?.address) {
      setDeliverySuggestions([]);
      setLoadingDeliverySuggestions(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingDeliverySuggestions(true);

    const timeoutId = window.setTimeout(() => {
      mapService.directAutocomplete(normalizedAddress, { limit: 5 })
        .then((items) => {
          if (!cancelled) {
            setDeliverySuggestions(items || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDeliverySuggestions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingDeliverySuggestions(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [deliveryAddress, deliveryLocation?.address, pickupMethod]);

  /** Gõ địa chỉ đầy đủ (không bắt buộc chọn gợi ý): geocode cả câu để có pin bản đồ; chuỗi gửi booking vẫn là đúng nội dung ô nhập. */
  useEffect(() => {
    if (pickupMethod !== 'delivery') {
      return undefined;
    }
    const trimmed = String(deliveryAddress || '').trim();
    if (parseCoordinateInput(trimmed)) {
      return undefined;
    }
    if (trimmed.length < 8) {
      setDeliveryLocation(null);
      return undefined;
    }

    const snapshot = trimmed;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (String(deliveryAddressRef.current || '').trim() !== snapshot) return;
      mapService
        .directForwardGeocode(snapshot, { limit: 1 })
        .then((results) => {
          if (cancelled) return;
          if (String(deliveryAddressRef.current || '').trim() !== snapshot) return;
          const best = results[0];
          if (!best) return;
          setDeliveryLocation({
            address: snapshot,
            latitude: best.lat,
            longitude: best.lng,
            plusCode: best.plusCode || '',
          });
        })
        .catch(() => {});
    }, 550);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deliveryAddress, pickupMethod]);

  const days = Math.max(
    1,
    Math.round((new Date(returnDate) - new Date(pickupDate)) / 86400000)
  );
  const subtotal = (vehicle?.price || 0) * days;
  const serviceFee = Math.round(subtotal * 0.05);
  const deliveryFee = pickupMethod === 'delivery' ? DELIVERY_FEE_VND : 0;
  const total = subtotal + serviceFee + deliveryFee;

  useEffect(() => {
    setHasAcceptedContract(false);
  }, [pickupDate, returnDate, pickupMethod, vehicle?._id, total]);

  const priceLine = useMemo(() => {
    if (!vehicle?.price) return '--';
    return formatVndPerDay(vehicle.price);
  }, [vehicle]);

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
      setProcessing(false);
      setStep(2);
      setStripeSessionError('Phiên thanh toán cũ đã bị hủy trên Stripe. Vui lòng tạo lại phiên thanh toán mới.');
      return true;
    }

    return false;
  }, [inspectStripeIntentStatus, navigate]);

  const handleSelectDeliverySuggestion = (suggestion) => {
    if (!suggestion?.address) {
      return;
    }

    setDeliveryAddress(suggestion.address);
    setDeliverySuggestions([]);
    setDeliveryLocation({
      address: suggestion.address,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      plusCode: suggestion.plusCode || '',
    });
  };

  const handleUseCurrentDeliveryLocation = () => {
    if (!navigator.geolocation) {
      setPrepError('Trình duyệt không hỗ trợ lấy vị trí hiện tại.');
      return;
    }

    setLoadingDeliveryLocation(true);
    setPrepError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const address = formatCoordinates(latitude, longitude);

        setDeliveryAddress(address);
        setDeliverySuggestions([]);
        setDeliveryLocation({
          address,
          latitude,
          longitude,
          plusCode: '',
        });
        setLoadingDeliveryLocation(false);
      },
      () => {
        setLoadingDeliveryLocation(false);
        setPrepError('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập vị trí.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleContinue = async () => {
    if (!vehicle) return;
    if (!hasAcceptedContract) {
      setPrepError('Vui lòng đọc và tick đồng ý với hợp đồng thuê xe trước khi tiếp tục thanh toán.');
      return;
    }
    setPreparingPay(true);
    setPrepError('');
    try {
      const minPickup = parseLocalDateTime(minPickupDateTime);
      const pickup = parseLocalDateTime(pickupDate);
      const ret = parseLocalDateTime(returnDate);

      if (!pickup || !ret) {
        throw new Error('Vui lòng chọn đầy đủ thời gian nhận xe và trả xe.');
      }

      if (minPickup && pickup < minPickup) {
        throw new Error('Thời gian nhận xe không hợp lệ. Vui lòng chọn một mốc thời gian ở hiện tại hoặc trong tương lai.');
      }

      if (ret <= pickup) {
        throw new Error('Thời gian trả xe phải sau thời gian nhận xe.');
      }

      if (isSameCalendarDate(pickup, ret)) {
        throw new Error('Ngày trả xe không được trùng với ngày nhận xe.');
      }

      if (hasBookedDateSelection) {
        throw new Error('Xe da co booking trong ngay ban chon. Vui long chon ngay khac.');
      }

      const trimmedDeliveryAddress = String(deliveryAddress || '').trim();
      if (pickupMethod === 'delivery' && trimmedDeliveryAddress.length < 6) {
        throw new Error('Vui long nhap dia chi giao xe hop le.');
      }

      const availability = await bookingService.checkAvailability({
        vehicleId: vehicle._id || vehicle.id,
        pickupDate: pickup.toISOString(),
        returnDate: ret.toISOString(),
      });

      if (!availability?.isAvailable) {
        throw new Error(
          availability?.message
          || 'Xe đã có lịch thuê trùng trong khung thời gian bạn chọn. Vui lòng đợi sang mốc thời gian khác.'
        );
      }

      const { booking, bookingId: nextBookingId, clientSecret: secret } =
        await bookingService.createBookingAndPaymentSession({
          vehicle_id: vehicle._id || vehicle.id,
          showroom_id: vehicle.addedBy,
          start_date: pickup.toISOString(),
          end_date: ret.toISOString(),
          total_price: total,
          delivery_type: pickupMethod === 'delivery' ? 'delivery' : 'self',
          delivery_address: trimmedDeliveryAddress,
          note: pickupMethod === 'delivery' ? 'Giao tận nơi' : 'Tự đến lấy',
        });
      const bId = nextBookingId || booking?._id || booking?.id || booking;
      setBookingId(bId);






      if (!secret) throw new Error('Không nhận được thông tin thanh toán từ server.');
      setPayError('');
      setStripeSessionError('');
      setBrokenClientSecret('');
      setProcessing(false);
      if (await handleTerminalClientSecret(secret, bId)) {
        return;
      }
      setClientSecret(secret);
      setStep(2);
    } catch (err) {
      setPrepError(err?.response?.data?.message || err?.message || 'Đã có lỗi xảy ra.');
    } finally {
      setPreparingPay(false);
    }
  };

  const handleRecreatePaymentSession = async () => {
    if (!bookingId) {
      setStripeSessionError('Khong tim thay booking đ tao lai phien thanh toan.');
      return;
    }

    setRepairingSession(true);
    setPayError('');
    setStripeSessionError('');

    try {
      const previousClientSecret = clientSecret || brokenClientSecret;
      setProcessing(false);
      setClientSecret('');

      const paymentData = await paymentService.recreatePaymentSession(
        bookingId,
        total,
        previousClientSecret
      );

      if (paymentData?.alreadyPaid) {
        navigate(`/renter/payment-result?bookingId=${bookingId}&status=success`);
        return;
      }

      const nextSecret = paymentData?.client_secret || paymentData?.clientSecret || '';
      if (!nextSecret) {
        throw new Error('Không nhận được client secret mới từ server.');
      }

      if (await handleTerminalClientSecret(nextSecret, bookingId)) {
        return;
      }

      setClientSecret(nextSecret);
      setBrokenClientSecret('');
    } catch (error) {
      setStripeSessionError(
        error?.response?.data?.message
        || error?.message
        || 'Không thể tạo lại phiên thanh toán Stripe. Vui lòng thử lại.'
      );
    } finally {
      setRepairingSession(false);
    }
  };

  const handleStripeSessionBroken = (message) => {
    const previousClientSecret = clientSecret || brokenClientSecret;
    if (previousClientSecret) {
      setBrokenClientSecret(previousClientSecret);
    }
    setProcessing(false);
    setClientSecret('');
    setPayError('');
    setStripeSessionError(message);
  };

  if (loadingVehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3 text-gray-500">
        <FaSpinner aria-hidden="true" className="animate-spin text-primary text-xl" />
        <span>Đang tải thông tin xe...</span>
      </div>
    );
  }

  if (vehicleError || !vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-gray-500 px-5">
        <FaExclamationCircle aria-hidden="true" className="text-red-500 text-4xl" />
        <p className="text-center text-red-600">{vehicleError || 'Không tìm thấy xe.'}</p>
        <button type="button" className="btn-primary" onClick={() => navigate('/')}>
          Về trang chủ
        </button>
      </div>
    );
  }

  const stripeOptions = clientSecret
    ? { clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#0077b6' } } }
    : undefined;

  const summaryProps = {
    vehicle,
    pickupDate,
    returnDate,
    days,
    subtotal,
    serviceFee,
    deliveryFee,
    total,
  };

  const readStoredRenter = () => {
    try {
      return JSON.parse(localStorage.getItem('smartrent_user') || 'null') || {};
    } catch {
      return {};
    }
  };

  const renterPreview = readStoredRenter();
  const addedBy = vehicle?.addedBy && typeof vehicle.addedBy === 'object' ? vehicle.addedBy : null;
  const showroomPreview = {
    name: addedBy?.business_name || addedBy?.name || vehicle?.showroom || vehicle?.listerProfile?.displayName || '',
    email: addedBy?.email || '',
    phone: addedBy?.phone || '',
    address: addedBy?.address || '',
  };
  const pickupMethodLabel = pickupMethod === 'delivery' ? 'Giao tận nơi' : 'Tới điểm nhận';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-5">
      <div className="max-w-[1100px] mx-auto">
        {/* Step indicator — gọn, không lấn layout mockup */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2">
            {[1, 2].map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                >
                  {step > s ? <FaCheckCircle aria-hidden="true" /> : s}
                </div>
                {i < 1 && (
                  <div
                    className={`h-1 rounded ${step > s ? 'bg-primary' : 'bg-gray-200'}`}
                    style={{ width: 72 }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-[0.75rem] text-gray-500">
            {step === 1 ? 'Thông tin đặt xe' : 'Thanh toán'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div className="min-w-0">
            {step === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <div className="flex items-center gap-2.5 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <FaCar aria-hidden="true" className="text-xl" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                    Thông tin đặt xe
                  </h2>
                </div>

                {/* Vehicle - vien nhat theo theme */}
                <div className="rounded-xl border-2 border-primary/25 bg-primary-light/35 p-4 sm:p-5 mb-8">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                    <div className="shrink-0 mx-auto sm:mx-0">
                      <img
                        src={vehicle.image || null}
                        alt={vehicle.name}
                        width={160}
                        height={112}
                        className="w-full max-w-[200px] sm:w-40 h-28 object-cover rounded-xl bg-gray-200 border border-white shadow-sm"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col gap-2">
                      <h3 className="font-bold text-gray-900 text-[0.95rem] sm:text-base leading-snug">
                        {vehicle.name}
                      </h3>
                      <StarRow rating={vehicle.rating} />
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-flex items-center rounded-full border border-white/80 bg-white/90 px-2.5 py-0.5 text-[0.72rem] font-medium text-gray-700 shadow-sm">
                          {vehicle.seats} cho
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/80 bg-white/90 px-2.5 py-0.5 text-[0.72rem] font-medium text-gray-700 shadow-sm">
                          {vehicle.transmission}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/80 bg-white/90 px-2.5 py-0.5 text-[0.72rem] font-medium text-gray-700 shadow-sm">
                          {vehicle.fuel}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/80 bg-white/90 px-2.5 py-0.5 text-[0.72rem] font-medium text-gray-700 shadow-sm">
                          {vehicle.type || vehicle.category}
                        </span>
                      </div>
                      {vehicle.location && (
                        <p className="text-[0.72rem] text-gray-500 flex items-start gap-1 mt-1">
                          <MdLocationOn aria-hidden="true" className="shrink-0 mt-0.5" size={14} />
                          <span className="line-clamp-2">{vehicle.location}</span>
                        </p>
                      )}
                      <p className="text-primary font-extrabold text-lg sm:text-xl tabular-nums mt-auto pt-2">
                        {priceLine}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[0.8rem] font-semibold text-gray-800 mb-3">Thời gian thuê</p>
                {isRentalWindowLocked && carId ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.78rem]">
                    <span className="text-gray-600">
                      Thời gian cố định theo lựa chọn tại trang chi tiết xe.
                    </span>
                    <Link
                      to={`/xe/${carId}${buildRentalWindowQuery(pickupDate, returnDate)}`}
                      className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
                    >
                      Đổi lịch trên trang xe
                    </Link>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                  <DateTimeField
                    id="pickup-date"
                    label="Thời gian nhận xe"
                    value={pickupDate}
                    minValue={minPickupDateTime}
                    onChange={setPickupDate}
                    readOnly={isRentalWindowLocked}
                    readOnlyHint={
                      isRentalWindowLocked ? 'Khớp với bước Đặt xe ở trang chi tiết.' : undefined
                    }
                    isDayDisabled={isBookedDay}
                    dayClassName={(date) =>
                      isBookedDay(date)
                        ? 'bg-red-100 text-red-700 font-extrabold opacity-100 border border-red-200 line-through'
                        : ''
                    }
                  />
                  <DateTimeField
                    id="return-date"
                    label="Thời gian trả xe"
                    value={returnDate}
                    minValue={pickupDate}
                    onChange={setReturnDate}
                    readOnly={isRentalWindowLocked}
                    readOnlyHint={
                      isRentalWindowLocked ? 'Khớp với bước Đặt xe ở trang chi tiết.' : undefined
                    }
                    isDayDisabled={(date) => isSameCalendarDate(date, pickupDate) || isBookedDay(date)}
                    dayClassName={(date) =>
                      isSameCalendarDate(date, pickupDate)
                        ? 'bg-orange-50 text-orange-600 font-extrabold'
                        : isBookedDay(date)
                          ? 'bg-red-100 text-red-700 font-extrabold opacity-100 border border-red-200 line-through'
                          : ''
                    }
                  />
                </div>
                {!isRentalWindowLocked ? (
                  <div className="mb-4 text-[0.75rem] text-gray-500">
                    Ngày được tô <span className="font-bold text-orange-600">màu cam</span> trong lịch trả xe là
                    ngày trùng với ngày nhận xe (không được chọn làm ngày trả).
                  </div>
                ) : null}
                {loadingBookedDates && (
                  <div className="mb-3 text-[0.75rem] text-gray-400">Dang tai lich da dat...</div>
                )}
                {bookedDateError && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-700">
                    {bookedDateError}
                  </div>
                )}
                {hasBookedDateSelection && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] text-red-700">
                    Khoang thoi gian nay trung lich da dat cua xe. Vui long chon ngay khong bi danh dau do.
                  </div>
                )}
                <div className="mb-8">
                  <span className="inline-flex items-center rounded-full bg-primary-light px-3 py-1 text-[0.75rem] font-semibold text-primary border border-primary/20">
                    Tổng thuê: {days} ngày
                  </span>
                </div>

                <p className="text-[0.8rem] font-semibold text-gray-800 mb-3">Hình thức nhận xe</p>
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8"
                  role="radiogroup"
                  aria-label="Hình thức nhận xe"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={pickupMethod === 'self'}
                    onClick={() => setPickupMethod('self')}
                    className={`text-left rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${pickupMethod === 'self'
                      ? 'border-primary bg-primary-light/40 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                  >
                    <p className="font-bold text-gray-900 text-[0.9rem]">Tới điểm nhận</p>
                    <p className="text-primary font-semibold text-[0.85rem] mt-1">Miễn phí</p>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={pickupMethod === 'delivery'}
                    onClick={() => setPickupMethod('delivery')}
                    className={`text-left rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${pickupMethod === 'delivery'
                      ? 'border-primary bg-primary-light/40 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                  >
                    <p className="font-bold text-gray-900 text-[0.9rem]">Giao tận nơi</p>
                    <p className="text-gray-600 font-semibold text-[0.85rem] mt-1">
                      + {formatVnd(DELIVERY_FEE_VND)}
                    </p>
                  </button>
                </div>

                {pickupMethod === 'delivery' && (
                  <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                    <label className="mb-2 block text-[0.8rem] font-semibold text-gray-800" htmlFor="delivery-address">
                      Địa chỉ giao xe
                    </label>
                    <p className="mb-2 text-[0.72rem] leading-snug text-gray-500">
                      Gõ đủ địa chỉ (số nhà, đường, phường/quận, tỉnh/thành). Không bắt buộc chọn từ danh sách — có thể chỉnh tiếp sau khi chọn gợi ý gần đúng. Bản đồ cập nhật theo câu bạn nhập.
                    </p>
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5">
                        <MdLocationOn aria-hidden="true" className="shrink-0 text-primary" />
                        <input
                          id="delivery-address"
                          type="text"
                          autoComplete="street-address"
                          value={deliveryAddress}
                          onChange={(event) => {
                            const nextAddress = event.target.value;
                            const parsedCoordinates = parseCoordinateInput(nextAddress);
                            setDeliveryAddress(nextAddress);
                            if (parsedCoordinates) {
                              setDeliveryLocation({
                                address: nextAddress,
                                latitude: parsedCoordinates.latitude,
                                longitude: parsedCoordinates.longitude,
                                plusCode: '',
                              });
                              setDeliverySuggestions([]);
                              return;
                            }
                            setDeliveryLocation((prev) => {
                              if (prev && String(nextAddress).trim() === String(prev.address || '').trim()) {
                                return prev;
                              }
                              return null;
                            });
                          }}
                          placeholder="Ví dụ: 140 Nguyễn Đình Chiểu, Quận 1, TP.Hồ Chí Minh"
                          className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Lay vi tri hien tai"
                          title="Lay vi tri hien tai"
                          onClick={handleUseCurrentDeliveryLocation}
                          disabled={loadingDeliveryLocation}
                          className="rounded-md p-1.5 text-primary hover:bg-primary-light disabled:opacity-50"
                        >
                          {loadingDeliveryLocation ? <FaSpinner className="animate-spin" /> : <FaLocationArrow />}
                        </button>
                      </div>
                      {(loadingDeliverySuggestions || deliverySuggestions.length > 0) && (
                        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                          {loadingDeliverySuggestions && (
                            <div className="flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-500">
                              <FaSpinner className="animate-spin" /> Dang tim goi y dia chi...
                            </div>
                          )}
                          {!loadingDeliverySuggestions && deliverySuggestions.map((suggestion) => (
                            <button
                              key={`${suggestion.lat}-${suggestion.lng}-${suggestion.address}`}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-[0.8rem] text-gray-700 hover:bg-primary-light focus:bg-primary-light focus:outline-none"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectDeliverySuggestion(suggestion)}
                            >
                              {suggestion.address}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {hasCoordinates(deliveryLocation) && (
                      <p className="mt-2 text-[0.75rem] text-primary">
                        Đã căn vị trí trên bản đồ theo địa chỉ bạn nhập (có thể là điểm gần đúng nếu số nhà chưa có trên bản đồ).
                      </p>
                    )}
                    {!hasCoordinates(deliveryLocation) && String(deliveryAddress || '').trim().length >= 6 && (
                      <p className="mt-2 text-[0.75rem] text-amber-700">
                        Đang xác định vị trí… hoặc tiếp tục gõ đủ địa chỉ; showroom vẫn nhận đúng nội dung ô nhập khi bạn thanh toán.
                      </p>
                    )}
                    {hasCoordinates(deliveryLocation) && (
                      <div className="mt-3 overflow-hidden rounded-xl">
                        <CarLocationMap
                          locationText={deliveryLocation.address || deliveryAddress}
                          lat={deliveryLocation.latitude}
                          lng={deliveryLocation.longitude}
                          openMapLabel="Mo trong map"
                          mapHeight={220}
                        />
                      </div>
                    )}
                  </div>
                )}

                {prepError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"
                  >
                    <FaExclamationCircle aria-hidden="true" className="shrink-0" /> {prepError}
                  </div>
                )}

                <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-slate-50/60 p-4">
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/90"
                    onClick={() => setIsContractPreviewOpen(true)}
                  >
                    {RENTAL_CONTRACT_UI.previewButton}
                  </button>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={hasAcceptedContract}
                      onChange={(e) => setHasAcceptedContract(e.target.checked)}
                    />
                    <span className="text-[0.82rem] text-gray-800 leading-relaxed">{RENTAL_CONTRACT_UI.acceptCheckbox}</span>
                  </label>
                </div>

                <button
                  type="button"
                  className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-3 text-[0.95rem] rounded-xl"
                  onClick={handleContinue}
                  disabled={!pickupDate || !returnDate || preparingPay || !hasAcceptedContract || hasBookedDateSelection}
                >
                  {preparingPay ? (
                    <>
                      <FaSpinner aria-hidden="true" className="animate-spin" /> Đang chuẩn bị...
                    </>
                  ) : (
                    <>
                      Tiếp tục
                      <FaArrowRight aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Thanh toán qua Stripe</h2>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  Thông tin thẻ được bảo mật bởi Stripe - chúng tôi không lưu dữ liệu thẻ của bạn.
                </p>

                {payError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"
                  >
                    <FaExclamationCircle aria-hidden="true" className="shrink-0" /> {payError}
                  </div>
                )}

                {stripeSessionError && (
                  <div
                    role="alert"
                    className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                  >
                    <div className="flex items-start gap-2">
                      <FaExclamationCircle aria-hidden="true" className="mt-0.5 shrink-0" />
                      <span>{stripeSessionError}</span>
                    </div>
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                      onClick={handleRecreatePaymentSession}
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

                {clientSecret ? (
                  <Elements stripe={stripePromise} options={stripeOptions} key={clientSecret}>
                    <StripeCardForm
                      bookingId={bookingId}
                      processing={processing}
                      setProcessing={setProcessing}
                      onError={setPayError}
                      onSessionBroken={handleStripeSessionBroken}
                    />
                  </Elements>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="mb-3">
                      Chua co phien thanh toan Stripe hop le cho booking nay.
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                      onClick={handleRecreatePaymentSession}
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
                  onClick={() => {
                    setStep(1);
                    setClientSecret('');
                    setBrokenClientSecret('');
                    setPayError('');
                    setStripeSessionError('');
                  }}
                >
                  Quay lại chỉnh thông tin
                </button>
              </div>
            )}
          </div>

          <OrderSummaryPanel {...summaryProps} />
        </div>
      </div>

      <RentalContractPreviewModal
        isOpen={isContractPreviewOpen}
        onClose={() => setIsContractPreviewOpen(false)}
        hasAcceptedContract={hasAcceptedContract}
        onHasAcceptedContractChange={setHasAcceptedContract}
        renter={{
          name: renterPreview.name,
          email: renterPreview.email,
          phone: renterPreview.phone,
          address: renterPreview.address,
        }}
        showroom={showroomPreview}
        vehicle={{
          name: vehicle.name,
          brand: vehicle.brand,
          model: vehicle.model,
          plateNumber: vehicle.plateNumber,
          seats: vehicle.seats,
          transmission: vehicle.transmission,
          fuel: vehicle.fuel,
        }}
        pickupLabel={formatDateTimeVi(pickupDate)}
        returnLabel={formatDateTimeVi(returnDate)}
        days={days}
        totalLabel={formatVnd(total)}
        pickupMethodLabel={pickupMethodLabel}
      />
    </div>
  );
};

export default Checkout;
