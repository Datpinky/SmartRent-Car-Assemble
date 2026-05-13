import { loadStripe } from '@stripe/stripe-js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight,
  FaCar,
  FaCheckCircle,
  FaExclamationCircle,
  FaLocationArrow,
  FaSpinner,
  FaStar,
} from 'react-icons/fa';
import { MdLocationOn } from 'react-icons/md';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CarLocationMap from '../../../components/Map/CarLocationMap';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import bookingService from '../../../services/bookingService';
import mapService from '../../../services/mapService';
import paymentService from '../../../services/paymentService';
import vehicleService from '../../../services/vehicleService';
import { formatVnd, formatVndPerDay } from '../../../utils/currencyFormat';
import {
  buildDefaultPickupDate,
  buildDefaultRentalWindow,
  isSameCalendarDate,
  resolveRentalWindow,
} from '../../../utils/rentalWindow';
import {
  DELIVERY_FEE_VND,
  formatCoordinates,
  formatDateTimeVi,
  hasCoordinates,
  normalizeIncomingRentalWindow,
  parseCoordinateInput,
  parseLocalDateTime,
  toLocalInputValue,
} from './checkout.helpers';
import DateTimeField from './components/DateTimeField';
import OrderSummaryPanel from './components/OrderSummaryPanel';
import PaymentStep from './components/PaymentStep';
import RentalContractPreviewModal from './RentalContractPreviewModal';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY, {
  developerTools: {
    assistant: {
      enabled: process.env.REACT_APP_STRIPE_TESTING_ASSISTANT === 'true',
    },
  },
});

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
  const minPickupDateTime = useMemo(() => buildDefaultPickupDate(), []);
  const incomingRentalWindow = useMemo(
    () => resolveRentalWindow({ state: location.state, search: location.search }),
    [location.search, location.state],
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
      setVehError('Khong tim thay thong tin xe.');
      setLoadVeh(false);
      return;
    }
    setLoadVeh(true);
    try {
      const v = await vehicleService.getById(carId);
      if (!v) throw new Error('Xe khong ton tai');
      setVehicle(v);
    } catch {
      setVehError('Khong the tai thong tin xe. Vui long thu lai.');
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
      return () => { cancelled = true; };
    }

    setLoadingBookedDates(true);
    setBookedDateError('');

    bookingService
      .getUnavailableDateIntervals(vehicleId)
      .then(({ intervals }) => {
        if (!cancelled) setBookedIntervals(Array.isArray(intervals) ? intervals : []);
      })
      .catch(() => {
        if (!cancelled) {
          setBookedIntervals([]);
          setBookedDateError('Chua the tai lich da dat cua xe nay.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBookedDates(false);
      });

    return () => { cancelled = true; };
  }, [carId, vehicle?._id, vehicle?.id]);

  useEffect(() => {
    if (!incomingRentalWindow.pickupDate || !incomingRentalWindow.returnDate) return;
    const sanitizedWindow = normalizeIncomingRentalWindow(
      incomingRentalWindow.pickupDate,
      incomingRentalWindow.returnDate,
      minPickupDateTime,
      isSameCalendarDate,
    );
    if (!sanitizedWindow) return;
    setPickupDate(sanitizedWindow.pickupDate);
    setReturnDate(sanitizedWindow.returnDate);
  }, [incomingRentalWindow.pickupDate, incomingRentalWindow.returnDate, minPickupDateTime]);

  useEffect(() => {
    const pick = parseLocalDateTime(pickupDate);
    const ret = parseLocalDateTime(returnDate);
    if (pick && ret && (ret <= pick || isSameCalendarDate(pick, ret))) {
      const nextReturn = new Date(pick);
      nextReturn.setDate(nextReturn.getDate() + 1);
      setReturnDate(toLocalInputValue(nextReturn));
    }
  }, [pickupDate, returnDate]);

  const isBookedDay = useCallback(
    (date) => bookingService.isDateBooked(date, bookedIntervals),
    [bookedIntervals],
  );

  const selectedBookedConflicts = useMemo(
    () => bookingService.getBookingConflicts({ pickupDate, returnDate, intervals: bookedIntervals }),
    [bookedIntervals, pickupDate, returnDate],
  );
  const hasBookedDateSelection = selectedBookedConflicts.length > 0;

  useEffect(() => {
    if (prepError) setPrepError('');
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
      mapService
        .directAutocomplete(normalizedAddress, { limit: 5 })
        .then((items) => { if (!cancelled) setDeliverySuggestions(items || []); })
        .catch(() => { if (!cancelled) setDeliverySuggestions([]); })
        .finally(() => { if (!cancelled) setLoadingDeliverySuggestions(false); });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [deliveryAddress, deliveryLocation?.address, pickupMethod]);

  const days = Math.max(1, Math.round((new Date(returnDate) - new Date(pickupDate)) / 86400000));
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
      if (!stripe || typeof stripe.retrievePaymentIntent !== 'function') return '';
      const { paymentIntent } = await stripe.retrievePaymentIntent(secret);
      return paymentIntent?.status || '';
    } catch {
      return '';
    }
  }, []);

  const handleTerminalClientSecret = useCallback(
    async (secret, targetBookingId) => {
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
        setStripeSessionError('Phien thanh toan cu da bi huy tren Stripe. Vui long tao lai phien thanh toan moi.');
        return true;
      }
      return false;
    },
    [inspectStripeIntentStatus, navigate],
  );

  const handleSelectDeliverySuggestion = (suggestion) => {
    if (!suggestion?.address) return;
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
      setPrepError('Trinh duyet khong ho tro lay vi tri hien tai.');
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
        setDeliveryLocation({ address, latitude, longitude, plusCode: '' });
        setLoadingDeliveryLocation(false);
      },
      () => {
        setLoadingDeliveryLocation(false);
        setPrepError('Khong the lay vi tri hien tai. Hay kiem tra quyen truy cap vi tri.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleContinue = async () => {
    if (!vehicle) return;
    if (!hasAcceptedContract) {
      setPrepError('Vui long doc va tick dong y voi hop dong thue xe truoc khi tiep tuc thanh toan.');
      return;
    }
    setPreparingPay(true);
    setPrepError('');
    try {
      const minPickup = parseLocalDateTime(minPickupDateTime);
      const pickup = parseLocalDateTime(pickupDate);
      const ret = parseLocalDateTime(returnDate);

      if (!pickup || !ret) {
        throw new Error('Vui long chon day du thoi gian nhan va tra xe.');
      }
      if (minPickup && pickup < minPickup) {
        throw new Error('Thoi gian nhan xe phai sau thoi diem hien tai.');
      }
      if (ret <= pickup) {
        throw new Error('Thoi gian tra xe phai sau thoi gian nhan xe.');
      }
      if (isSameCalendarDate(pickup, ret)) {
        throw new Error('Ngay tra xe khong duoc trung voi ngay nhan xe.');
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
        throw new Error(availability?.message || 'Xe da co lich thue trung trong khung thoi gian nay.');
      }

      const {
        booking,
        bookingId: nextBookingId,
        clientSecret: secret,
      } = await bookingService.createBookingAndPaymentSession({
        vehicle_id: vehicle._id || vehicle.id,
        showroom_id: vehicle.addedBy,
        start_date: pickup.toISOString(),
        end_date: ret.toISOString(),
        total_price: total,
        delivery_type: pickupMethod === 'delivery' ? 'delivery' : 'self',
        delivery_address: trimmedDeliveryAddress,
        note: pickupMethod === 'delivery' ? 'Giao tan noi' : 'Tu den lay',
      });
      const bId = nextBookingId || booking?._id || booking?.id || booking;
      setBookingId(bId);

      if (!secret) throw new Error('Khong nhan duoc thong tin thanh toan tu server.');
      setPayError('');
      setStripeSessionError('');
      setBrokenClientSecret('');
      setProcessing(false);
      if (await handleTerminalClientSecret(secret, bId)) return;
      setClientSecret(secret);
      setStep(2);
    } catch (err) {
      setPrepError(err?.response?.data?.message || err?.message || 'Da co loi xay ra.');
    } finally {
      setPreparingPay(false);
    }
  };

  const handleRecreatePaymentSession = async () => {
    if (!bookingId) {
      setStripeSessionError('Khong tim thay booking de tao lai phien thanh toan.');
      return;
    }
    setRepairingSession(true);
    setPayError('');
    setStripeSessionError('');
    try {
      const previousClientSecret = clientSecret || brokenClientSecret;
      setProcessing(false);
      setClientSecret('');
      const paymentData = await paymentService.recreatePaymentSession(bookingId, total, previousClientSecret);
      if (paymentData?.alreadyPaid) {
        navigate(`/renter/payment-result?bookingId=${bookingId}&status=success`);
        return;
      }
      const nextSecret = paymentData?.client_secret || paymentData?.clientSecret || '';
      if (!nextSecret) throw new Error('Khong nhan duoc client secret moi tu server.');
      if (await handleTerminalClientSecret(nextSecret, bookingId)) return;
      setClientSecret(nextSecret);
      setBrokenClientSecret('');
    } catch (error) {
      setStripeSessionError(
        error?.response?.data?.message ||
          error?.message ||
          'Khong the tao lai phien thanh toan Stripe. Vui long thu lai.',
      );
    } finally {
      setRepairingSession(false);
    }
  };

  const handleStripeSessionBroken = (message) => {
    const previousClientSecret = clientSecret || brokenClientSecret;
    if (previousClientSecret) setBrokenClientSecret(previousClientSecret);
    setProcessing(false);
    setClientSecret('');
    setPayError('');
    setStripeSessionError(message);
  };

  if (loadingVehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3 text-gray-500">
        <FaSpinner aria-hidden="true" className="animate-spin text-primary text-xl" />
        <span>Dang tai thong tin xe...</span>
      </div>
    );
  }

  if (vehicleError || !vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-gray-500 px-5">
        <FaExclamationCircle aria-hidden="true" className="text-red-500 text-4xl" />
        <p className="text-center text-red-600">{vehicleError || 'Khong tim thay xe.'}</p>
        <button type="button" className="btn-primary" onClick={() => navigate('/')}>
          Ve trang chu
        </button>
      </div>
    );
  }

  const stripeOptions = clientSecret
    ? { clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#0077b6' } } }
    : undefined;

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
  const pickupMethodLabel = pickupMethod === 'delivery' ? 'Giao tan noi' : 'Toi diem nhan';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-5">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2">
            {[1, 2].map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s ? <FaCheckCircle aria-hidden="true" /> : s}
                </div>
                {i < 1 && (
                  <div className={`h-1 rounded ${step > s ? 'bg-primary' : 'bg-gray-200'}`} style={{ width: 72 }} />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-[0.75rem] text-gray-500">{step === 1 ? 'Thong tin dat xe' : 'Thanh toan'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div className="min-w-0">
            {step === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <div className="flex items-center gap-2.5 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <FaCar aria-hidden="true" className="text-xl" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Thong tin dat xe</h2>
                </div>

                <div className="rounded-xl border-2 border-primary/25 bg-primary-light/35 p-4 sm:p-5 mb-8">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                    <div className="shrink-0 mx-auto sm:mx-0">
                      <img
                        src={vehicle.image || null}
                        alt={vehicle.name}
                        width={160}
                        height={112}
                        className="w-full max-w-[200px] sm:w-40 h-28 object-cover rounded-xl bg-gray-200 border border-white shadow-sm"
                        onError={(e) => { e.target.style.display = 'none'; }}
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

                <p className="text-[0.8rem] font-semibold text-gray-800 mb-3">Thoi gian thue xe</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                  <DateTimeField
                    id="pickup-date"
                    label="Nhan xe"
                    value={pickupDate}
                    minValue={minPickupDateTime}
                    onChange={setPickupDate}
                    isDayDisabled={isBookedDay}
                    dayClassName={(date) =>
                      isBookedDay(date)
                        ? 'bg-red-100 text-red-700 font-extrabold opacity-100 border border-red-200 line-through'
                        : ''
                    }
                  />
                  <DateTimeField
                    id="return-date"
                    label="Tra xe"
                    value={returnDate}
                    minValue={pickupDate}
                    onChange={setReturnDate}
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
                <div className="mb-4 text-[0.75rem] text-gray-500">
                  Ngay <span className="font-bold text-orange-600">cam</span> trong lich tra xe la ngay trung voi ngay
                  nhan xe va khong duoc chon.
                </div>
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
                    Tong thue: {days} ngay
                  </span>
                </div>

                <p className="text-[0.8rem] font-semibold text-gray-800 mb-3">Hinh thuc nhan xe</p>
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8"
                  role="radiogroup"
                  aria-label="Hinh thuc nhan xe"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={pickupMethod === 'self'}
                    onClick={() => setPickupMethod('self')}
                    className={`text-left rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      pickupMethod === 'self'
                        ? 'border-primary bg-primary-light/40 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-gray-900 text-[0.9rem]">Toi diem nhan</p>
                    <p className="text-primary font-semibold text-[0.85rem] mt-1">Mien phi</p>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={pickupMethod === 'delivery'}
                    onClick={() => setPickupMethod('delivery')}
                    className={`text-left rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      pickupMethod === 'delivery'
                        ? 'border-primary bg-primary-light/40 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-gray-900 text-[0.9rem]">Giao tan noi</p>
                    <p className="text-gray-600 font-semibold text-[0.85rem] mt-1">+ {formatVnd(DELIVERY_FEE_VND)}</p>
                  </button>
                </div>

                {pickupMethod === 'delivery' && (
                  <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                    <label className="mb-2 block text-[0.8rem] font-semibold text-gray-800" htmlFor="delivery-address">
                      Dia chi giao xe
                    </label>
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5">
                        <MdLocationOn aria-hidden="true" className="shrink-0 text-primary" />
                        <input
                          id="delivery-address"
                          type="text"
                          value={deliveryAddress}
                          onChange={(event) => {
                            const nextAddress = event.target.value;
                            const parsedCoordinates = parseCoordinateInput(nextAddress);
                            setDeliveryAddress(nextAddress);
                            setDeliveryLocation(
                              parsedCoordinates
                                ? {
                                    address: nextAddress,
                                    latitude: parsedCoordinates.latitude,
                                    longitude: parsedCoordinates.longitude,
                                    plusCode: '',
                                  }
                                : null,
                            );
                            if (parsedCoordinates) setDeliverySuggestions([]);
                          }}
                          placeholder="Nhap dia chi nhan xe"
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
                          {loadingDeliveryLocation ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaLocationArrow />
                          )}
                        </button>
                      </div>
                      {(loadingDeliverySuggestions || deliverySuggestions.length > 0) && (
                        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                          {loadingDeliverySuggestions && (
                            <div className="flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-500">
                              <FaSpinner className="animate-spin" /> Dang tim goi y dia chi...
                            </div>
                          )}
                          {!loadingDeliverySuggestions &&
                            deliverySuggestions.map((suggestion) => (
                              <button
                                key={`${suggestion.lat}-${suggestion.lng}-${suggestion.address}`}
                                type="button"
                                className="block w-full px-3 py-2 text-left text-[0.8rem] text-gray-700 hover:bg-primary-light focus:bg-primary-light focus:outline-none"
                                onClick={() => handleSelectDeliverySuggestion(suggestion)}
                              >
                                {suggestion.address}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    {deliveryLocation?.address && (
                      <p className="mt-2 text-[0.75rem] text-primary">Da xac dinh toa do giao xe.</p>
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
                    <span className="text-[0.82rem] text-gray-800 leading-relaxed">
                      {RENTAL_CONTRACT_UI.acceptCheckbox}
                    </span>
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
                      <FaSpinner aria-hidden="true" className="animate-spin" /> Dang xu ly...
                    </>
                  ) : (
                    <>
                      Tiep tuc
                      <FaArrowRight aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 2 && (
              <PaymentStep
                clientSecret={clientSecret}
                stripePromise={stripePromise}
                stripeOptions={stripeOptions}
                bookingId={bookingId}
                processing={processing}
                setProcessing={setProcessing}
                payError={payError}
                stripeSessionError={stripeSessionError}
                repairingSession={repairingSession}
                onRecreateSession={handleRecreatePaymentSession}
                onError={setPayError}
                onSessionBroken={handleStripeSessionBroken}
                onBack={() => {
                  setStep(1);
                  setClientSecret('');
                  setBrokenClientSecret('');
                  setPayError('');
                  setStripeSessionError('');
                }}
              />
            )}
          </div>

          <OrderSummaryPanel
            vehicle={vehicle}
            pickupDate={pickupDate}
            returnDate={returnDate}
            days={days}
            subtotal={subtotal}
            serviceFee={serviceFee}
            deliveryFee={deliveryFee}
            total={total}
          />
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