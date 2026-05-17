import { loadStripe } from '@stripe/stripe-js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import profileService from '../../../services/profileService';
import vehicleLocationService from '../../../services/vehicleLocationService';
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
  hasNonZeroCoordinates,
  normalizeIncomingRentalWindow,
  parseCoordinateInput,
  parseLocalDateTime,
  toFiniteCoordinate,
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
  const [vehicleLocationData, setVehicleLocationData] = useState(null);
  const [resolvedVehicleLocation, setResolvedVehicleLocation] = useState(null);
  const [loadingVehicleLocation, setLoadingVehicleLocation] = useState(false);
  const [resolvingVehicleLocation, setResolvingVehicleLocation] = useState(false);
  const [vehicleLocationError, setVehicleLocationError] = useState('');
  const [resolvedShowroomLocation, setResolvedShowroomLocation] = useState(null);
  const [resolvingShowroomLocation, setResolvingShowroomLocation] = useState(false);
  const [showroomLocationError, setShowroomLocationError] = useState('');
  const showroomProfileCacheRef = useRef(new Map());
  const showroomProfileInFlightRef = useRef(new Map());
  const showroomGeocodeKeyRef = useRef('');
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
    let cancelled = false;
    const vehicleId = vehicle?._id || vehicle?.id || carId;

    if (!vehicleId || pickupMethod !== 'self') {
      setVehicleLocationData(null);
      setVehicleLocationError('');
      setLoadingVehicleLocation(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingVehicleLocation(true);
    setVehicleLocationError('');
    vehicleLocationService
      .getByVehicleId(vehicleId)
      .then((loc) => {
        if (!cancelled) setVehicleLocationData(loc || null);
      })
      .catch(() => {
        if (!cancelled) setVehicleLocationData(null);
        if (!cancelled) setVehicleLocationError('Không thể tải vị trí xe.');
      })
      .finally(() => {
        if (!cancelled) setLoadingVehicleLocation(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickupMethod, vehicle?._id, vehicle?.id, carId]);

  // Resolve showroom location (use showroom/addedBy address or geocode fallback) when self pickup selected
  useEffect(() => {
    let cancelled = false;

    if (pickupMethod !== 'self') {
      setResolvingShowroomLocation(false);
      setShowroomLocationError('');
      return () => {
        cancelled = true;
      };
    }

    const addedByRaw = vehicle?.addedBy;
    const addedByObject = addedByRaw && typeof addedByRaw === 'object' ? addedByRaw : null;
    const showroomId = typeof addedByRaw === 'string' ? addedByRaw : addedByObject?._id || addedByObject?.id || '';
    const showroomPickupText = (u) =>
      String(u?.public_address || u?.address || u?.pickupAddress || '').trim();
    const baseAddress = String(
      (addedByObject && showroomPickupText(addedByObject)) ||
        vehicle?.pickupAddress ||
        vehicle?.address ||
        vehicle?.location ||
        '',
    ).trim();

    const applyResolvedLocation = (source, fallbackAddress = '') => {
      const latitude = toFiniteCoordinate(source?.latitude ?? source?.lat);
      const longitude = toFiniteCoordinate(source?.longitude ?? source?.lng);
      const address = String(
        fallbackAddress || source?.address || source?.location || source?.pickupAddress || '',
      ).trim();
      const resolved =
        address && hasNonZeroCoordinates(latitude, longitude)
          ? {
              address,
              latitude,
              longitude,
              plusCode: source?.plusCode || source?.plus_code || '',
            }
          : null;
      if (!resolved) return false;
      setResolvedShowroomLocation(resolved);
      setShowroomLocationError('');
      return true;
    };

    if (applyResolvedLocation(addedByObject, baseAddress) || applyResolvedLocation(vehicle, baseAddress)) {
      return () => {
        cancelled = true;
      };
    }

    const resolveLocation = async () => {
      setResolvingShowroomLocation(true);
      setShowroomLocationError('');

      try {
        let fallbackAddress = baseAddress;

        if (!fallbackAddress && showroomId) {
          const profile = await resolveShowroomProfile(showroomId);
          if (cancelled) return;
          fallbackAddress = String(
            profile?.public_address ||
              profile?.address ||
              profile?.userLocation?.address ||
              fallbackAddress ||
              vehicle?.showroom ||
              '',
          ).trim();

          if (
            applyResolvedLocation(profile, fallbackAddress) ||
            applyResolvedLocation(profile?.userLocation, fallbackAddress)
          ) {
            return;
          }
        }

        const finalAddress = String(fallbackAddress || vehicle?.showroom || '').trim();
        if (!finalAddress) {
          setResolvedShowroomLocation(null);
          return;
        }

        const geocodeKey = `${showroomId || 'vehicle'}:${finalAddress.toLowerCase()}`;
        if (showroomGeocodeKeyRef.current === geocodeKey && resolvedShowroomLocation) {
          return;
        }
        const results = await mapService.directForwardGeocode(finalAddress, { limit: 1 });
        if (cancelled) return;
        showroomGeocodeKeyRef.current = geocodeKey;
        const best = results?.[0];

        if (best) {
          setResolvedShowroomLocation({
            address: finalAddress,
            latitude: best.lat,
            longitude: best.lng,
            plusCode: best.plusCode || '',
          });
          setShowroomLocationError('');
          return;
        }

        setResolvedShowroomLocation({
          address: finalAddress,
          latitude: null,
          longitude: null,
          plusCode: '',
        });
        setShowroomLocationError('Không tìm thấy tọa độ showroom. Đang hiển thị địa chỉ văn bản.');
      } catch {
        if (!cancelled) {
          const fallbackAddress = String(baseAddress || vehicle?.showroom || '').trim();
          setResolvedShowroomLocation(
            fallbackAddress
              ? {
                  address: fallbackAddress,
                  latitude: null,
                  longitude: null,
                  plusCode: '',
                }
              : null,
          );
          setShowroomLocationError('Không thể tải vị trí showroom. Đang hiển thị địa chỉ văn bản.');
        }
      } finally {
        if (!cancelled) setResolvingShowroomLocation(false);
      }
    };

    resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [pickupMethod, vehicle]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const resolveAddressFromCoordinates = useCallback(async (latitude, longitude) => {
    try {
      const result = await mapService.reverseGeocode(latitude, longitude);
      return result?.address || formatCoordinates(latitude, longitude);
    } catch {
      return formatCoordinates(latitude, longitude);
    }
  }, []);

  const normalizeVehicleLocation = useCallback((source, fallbackAddress = '') => {
    if (!source) return null;

    const latitude = toFiniteCoordinate(source.latitude ?? source.lat);
    const longitude = toFiniteCoordinate(source.longitude ?? source.lng);
    const address = String(source.address || source.location || source.pickupAddress || fallbackAddress || '').trim();

    if (!address || !hasNonZeroCoordinates(latitude, longitude)) {
      return null;
    }

    return {
      address,
      latitude,
      longitude,
      plusCode: source.plusCode || source.plus_code || '',
    };
  }, []);

  const resolveShowroomProfile = useCallback(async (showroomId) => {
    if (!showroomId) return null;

    if (showroomProfileCacheRef.current.has(showroomId)) {
      return showroomProfileCacheRef.current.get(showroomId);
    }

    if (showroomProfileInFlightRef.current.has(showroomId)) {
      return showroomProfileInFlightRef.current.get(showroomId);
    }

    const request = profileService
      .getProfileById(showroomId, { fetchUserLocation: false })
      .then((profile) => {
        const normalized = profile || null;
        showroomProfileCacheRef.current.set(showroomId, normalized);
        showroomProfileInFlightRef.current.delete(showroomId);
        return normalized;
      })
      .catch((error) => {
        showroomProfileInFlightRef.current.delete(showroomId);
        throw error;
      });

    showroomProfileInFlightRef.current.set(showroomId, request);
    return request;
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (pickupMethod !== 'self') {
      setResolvedVehicleLocation(null);
      setResolvingVehicleLocation(false);
      return () => {
        cancelled = true;
      };
    }

    const directLocation = normalizeVehicleLocation(vehicleLocationData, vehicle?.location || vehicle?.address || '');
    if (directLocation) {
      setResolvedVehicleLocation(directLocation);
      return () => {
        cancelled = true;
      };
    }

    const vehicleNativeLocation = normalizeVehicleLocation(
      vehicle,
      vehicle?.location || vehicle?.address || vehicle?.pickupAddress || '',
    );
    if (vehicleNativeLocation) {
      setResolvedVehicleLocation(vehicleNativeLocation);
      return () => {
        cancelled = true;
      };
    }

    const fallbackAddress = String(vehicle?.pickupAddress || vehicle?.address || vehicle?.location || '').trim();
    if (!fallbackAddress) {
      setResolvedVehicleLocation(null);
      setResolvingVehicleLocation(false);
      return () => {
        cancelled = true;
      };
    }

    setResolvingVehicleLocation(true);
    mapService
      .directForwardGeocode(fallbackAddress, { limit: 1 })
      .then((results) => {
        if (cancelled) return;
        const bestMatch = results?.[0];
        if (!bestMatch) {
          setResolvedVehicleLocation(null);
          return;
        }
        setResolvedVehicleLocation({
          address: fallbackAddress,
          latitude: bestMatch.lat,
          longitude: bestMatch.lng,
          plusCode: bestMatch.plusCode || '',
        });
      })
      .catch(() => {
        if (!cancelled) setResolvedVehicleLocation(null);
      })
      .finally(() => {
        if (!cancelled) setResolvingVehicleLocation(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickupMethod, vehicle, vehicleLocationData, normalizeVehicleLocation]);

  const fetchVehicle = useCallback(async () => {
    if (!carId) {
      setVehError('Không tìm thấy thông tin xe.');
      setLoadVeh(false);
      return;
    }
    setLoadVeh(true);
    try {
      const v = await vehicleService.getById(carId);
      if (!v) throw new Error('Xe không tồn tại.');
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

    bookingService
      .getUnavailableDateIntervals(vehicleId)
      .then(({ intervals }) => {
        if (!cancelled) setBookedIntervals(Array.isArray(intervals) ? intervals : []);
      })
      .catch(() => {
        if (!cancelled) {
          setBookedIntervals([]);
          setBookedDateError('Không thể tải lịch đã đặt của xe này.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBookedDates(false);
      });

    return () => {
      cancelled = true;
    };
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

  const isBookedDay = useCallback((date) => bookingService.isDateBooked(date, bookedIntervals), [bookedIntervals]);

  const doesReturnDateConflict = useCallback(
    (date) =>
      bookingService.getBookingConflicts({
        pickupDate,
        returnDate: date,
        intervals: bookedIntervals,
      }).length > 0,
    [bookedIntervals, pickupDate],
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
        .then((items) => {
          if (!cancelled) setDeliverySuggestions(items || []);
        })
        .catch(() => {
          if (!cancelled) setDeliverySuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingDeliverySuggestions(false);
        });
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
        setStripeSessionError('Phiên thanh toán cũ đã bị hủy trên Stripe. Vui lòng tạo lại phiên thanh toán mới.');
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
      setPrepError('Trình duyệt không hỗ trợ lấy vị trí hiện tại.');
      return;
    }
    setLoadingDeliveryLocation(true);
    setPrepError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const address = await resolveAddressFromCoordinates(latitude, longitude);
        setDeliveryAddress(address);
        setDeliverySuggestions([]);
        setDeliveryLocation({ address, latitude, longitude, plusCode: '' });
        setLoadingDeliveryLocation(false);
      },
      () => {
        setLoadingDeliveryLocation(false);
        setPrepError('Không thể lấy vị trí hiện tại. Hãy kiểm tra quyền truy cập vị trí.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
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
        throw new Error('Vui lòng chọn đầy đủ thời gian nhận và trả xe.');
      }
      if (minPickup && pickup < minPickup) {
        throw new Error('Thời gian nhận xe phải sau thời điểm hiện tại.');
      }
      if (ret <= pickup) {
        throw new Error('Thời gian trả xe phải sau thời gian nhận xe.');
      }
      if (isSameCalendarDate(pickup, ret)) {
        throw new Error('Ngày trả xe không được trùng với ngày nhận xe.');
      }
      if (hasBookedDateSelection) {
        throw new Error('Xe đã có đơn đặt trong ngày bạn chọn. Vui lòng chọn ngày khác.');
      }

      const trimmedDeliveryAddress = String(deliveryAddress || '').trim();
      if (pickupMethod === 'delivery' && trimmedDeliveryAddress.length < 6) {
        throw new Error('Vui lòng nhập địa chỉ giao xe hợp lệ.');
      }

      const availability = await bookingService.checkAvailability({
        vehicleId: vehicle._id || vehicle.id,
        pickupDate: pickup.toISOString(),
        returnDate: ret.toISOString(),
      });
      if (!availability?.isAvailable) {
        throw new Error(availability?.message || 'Xe đã có lịch thuê trùng trong khung thời gian này.');
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
        delivery_latitude: deliveryLocation?.latitude ?? null,
        delivery_longitude: deliveryLocation?.longitude ?? null,
        delivery_plus_code: deliveryLocation?.plusCode ?? '',
        note: pickupMethod === 'delivery' ? 'Giao tận nơi' : 'Tự đến lấy',
      });
      const bId = nextBookingId || booking?._id || booking?.id || booking;
      setBookingId(bId);

      if (!secret) throw new Error('Không nhận được thông tin thanh toán từ server.');
      setPayError('');
      setStripeSessionError('');
      setBrokenClientSecret('');
      setProcessing(false);
      if (await handleTerminalClientSecret(secret, bId)) return;
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
      setStripeSessionError('Không tìm thấy đơn đặt xe để tạo lại phiên thanh toán.');
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
      if (!nextSecret) throw new Error('Không nhận được client secret mới từ server.');
      if (await handleTerminalClientSecret(nextSecret, bookingId)) return;
      setClientSecret(nextSecret);
      setBrokenClientSecret('');
    } catch (error) {
      setStripeSessionError(
        error?.response?.data?.message ||
          error?.message ||
          'Không thể tạo lại phiên thanh toán Stripe. Vui lòng thử lại.',
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

  const readStoredRenter = () => {
    try {
      return JSON.parse(localStorage.getItem('smartrent_user') || 'null') || {};
    } catch {
      return {};
    }
  };
  const renterPreview = readStoredRenter();
  const addedBy = vehicle?.addedBy && typeof vehicle.addedBy === 'object' ? vehicle.addedBy : null;
  const showroomAddressFallback = String(
    addedBy?.public_address || addedBy?.address || addedBy?.pickupAddress || '',
  ).trim();
  const showroomPreview = {
    name: addedBy?.business_name || addedBy?.name || vehicle?.showroom || vehicle?.listerProfile?.displayName || '',
    email: addedBy?.email || '',
    phone: addedBy?.phone || '',
    address:
      resolvedShowroomLocation?.address ||
      showroomAddressFallback ||
      vehicle?.pickupAddress ||
      vehicle?.address ||
      vehicle?.location ||
      '',
  };
  const pickupMethodLabel = pickupMethod === 'delivery' ? 'Giao tận nơi' : 'Tới điểm nhận xe';

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
          <p className="text-[0.75rem] text-gray-500">{step === 1 ? 'Thông tin đặt xe' : 'Thanh toán'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <div className="min-w-0">
            {step === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <div className="flex items-center gap-2.5 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <FaCar aria-hidden="true" className="text-xl" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Thông tin đặt xe</h2>
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

                <p className="text-[0.8rem] font-semibold text-gray-800 mb-3">Thời gian thuê xe</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                  <DateTimeField
                    id="pickup-date"
                    label="Nhận xe"
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
                    label="Trả xe"
                    value={returnDate}
                    minValue={pickupDate}
                    onChange={setReturnDate}
                    isDayDisabled={(date) =>
                      isSameCalendarDate(date, pickupDate) || isBookedDay(date) || doesReturnDateConflict(date)
                    }
                    dayClassName={(date) =>
                      isSameCalendarDate(date, pickupDate)
                        ? 'bg-orange-50 text-orange-600 font-extrabold'
                        : isBookedDay(date) || doesReturnDateConflict(date)
                          ? 'bg-red-100 text-red-700 font-extrabold opacity-100 border border-red-200 line-through'
                          : ''
                    }
                  />
                </div>
                <div className="mb-4 text-[0.75rem] text-gray-500">
                  Ngày <span className="font-bold text-orange-600">cấm</span> trong lịch trả xe là ngày trùng với ngày
                  nhận xe và không được chọn.
                </div>
                {loadingBookedDates && <div className="mb-3 text-[0.75rem] text-gray-400">Đang tải lịch đã đặt...</div>}
                {bookedDateError && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-700">
                    {bookedDateError}
                  </div>
                )}
                {hasBookedDateSelection && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] text-red-700">
                    Khoảng thời gian này đi qua ngày đã có lịch đặt của xe. Vui lòng chọn ngày trả trước ngày bị đánh
                    dấu đỏ hoặc chọn lại ngày nhận xe.
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
                    className={`text-left rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      pickupMethod === 'self'
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
                    className={`text-left rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      pickupMethod === 'delivery'
                        ? 'border-primary bg-primary-light/40 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-gray-900 text-[0.9rem]">Giao tận nơi</p>
                    <p className="text-gray-600 font-semibold text-[0.85rem] mt-1">+ {formatVnd(DELIVERY_FEE_VND)}</p>
                  </button>
                </div>

                {pickupMethod === 'self' && (
                  <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                    <label className="mb-2 block text-[0.8rem] font-semibold text-gray-800">Vị trí nhận xe</label>
                    {resolvingShowroomLocation || loadingVehicleLocation ? (
                      <div className="text-[0.8rem] text-gray-500 flex items-center gap-2">
                        <FaSpinner className="animate-spin" /> Đang tải vị trí showroom...
                      </div>
                    ) : resolvedShowroomLocation ? (
                      <div className="space-y-2">
                        <div className="mt-1 overflow-hidden rounded-xl">
                          <CarLocationMap
                            locationText={resolvedShowroomLocation.address}
                            lat={resolvedShowroomLocation.latitude}
                            lng={resolvedShowroomLocation.longitude}
                            openMapLabel="Mở trong Maps"
                            mapHeight={220}
                          />
                        </div>
                        {showroomLocationError ? (
                          <p className="text-[0.75rem] text-amber-700">{showroomLocationError}</p>
                        ) : null}
                      </div>
                    ) : showroomLocationError ? (
                      resolvedVehicleLocation ? (
                        <div className="mt-3 overflow-hidden rounded-xl">
                          <CarLocationMap
                            locationText={resolvedVehicleLocation.address}
                            lat={resolvedVehicleLocation.latitude}
                            lng={resolvedVehicleLocation.longitude}
                            openMapLabel="Mở trong Maps"
                            mapHeight={220}
                          />
                        </div>
                      ) : (
                        <p className="text-[0.8rem] text-red-600">{showroomLocationError}</p>
                      )
                    ) : (
                      <p className="text-[0.8rem] text-gray-500">Không có vị trí showroom.</p>
                    )}
                  </div>
                )}

                {pickupMethod === 'delivery' && (
                  <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                    <label className="mb-2 block text-[0.8rem] font-semibold text-gray-800" htmlFor="delivery-address">
                      Địa chỉ giao xe
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
                          placeholder="Nhập địa chỉ nhận xe"
                          className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Lấy vị trí hiện tại của tôi"
                          title="Lấy vị trí hiện tại của tôi"
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
                              <FaSpinner className="animate-spin" /> Đang tìm gợi ý địa chỉ...
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
                      <p className="mt-2 text-[0.75rem] text-primary">Đã xác định tọa độ giao xe.</p>
                    )}
                    {hasCoordinates(deliveryLocation) && (
                      <div className="mt-3 overflow-hidden rounded-xl">
                        <CarLocationMap
                          locationText={deliveryLocation.address || deliveryAddress}
                          lat={deliveryLocation.latitude}
                          lng={deliveryLocation.longitude}
                          openMapLabel="Mở trong Maps"
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
                  disabled={
                    !pickupDate || !returnDate || preparingPay || !hasAcceptedContract || hasBookedDateSelection
                  }
                >
                  {preparingPay ? (
                    <>
                      <FaSpinner aria-hidden="true" className="animate-spin" /> Đang chuẩn bị thanh toán...
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
