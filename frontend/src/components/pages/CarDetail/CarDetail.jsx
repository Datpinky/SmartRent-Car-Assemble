import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FaStar,
  FaMapMarkerAlt,
  FaGasPump,
  FaHeart,
  FaRegHeart,
  FaShareAlt,
  FaChevronLeft,
  FaChevronRight,
  FaStore,
} from 'react-icons/fa';
import { MdPeople, MdSettings, MdDirectionsCar, MdVerified, MdShield } from 'react-icons/md';
import { BsLightningChargeFill } from 'react-icons/bs';
import CarLocationMap from '../../Map/CarLocationMap';
import Modal from '../../common/Modal';
import vehicleService from '../../../services/vehicleService';
import vehicleLocationService from '../../../services/vehicleLocationService';
import reviewService from '../../../services/reviewService';
import favoriteService from '../../../services/favoriteService';
import bookingService from '../../../services/bookingService';
import { useAuth } from '../../../contexts/AuthContext';
import {
  buildDefaultPickupDate,
  buildDefaultRentalWindow,
  buildRentalWindowQuery,
  isSameCalendarDate,
  resolveRentalWindow,
} from '../../../utils/rentalWindow';

const ROLE_DEFAULT_PATHS = {
  admin: '/admin/dashboard',
  showroom: '/showroom/dashboard',
  owner: '/owner/dashboard',
  renter: '/renter/profile',
};

const SpecItem = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary"
      aria-hidden="true"
    >
      {icon}
    </div>
    <div>
      <div className="text-[0.72rem] font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-[0.9rem] font-semibold text-gray-800">{value}</div>
    </div>
  </div>
);

const sectionTitle = 'text-[0.9rem] font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100';

const StarRow = ({ rating, count }) => (
  <span className="flex items-center gap-1 text-[0.85rem]">
    {[1, 2, 3, 4, 5].map((index) => (
      <FaStar
        key={index}
        size={13}
        color={index <= Math.round(Number(rating || 0)) ? '#f59e0b' : '#e5e7eb'}
        aria-hidden="true"
      />
    ))}
    <strong className="ml-1 tabular-nums">{rating}</strong>
    {count !== undefined && <span className="tabular-nums text-gray-400">({count} đánh giá)</span>}
  </span>
);

const isMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));

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

function formatDateTimeRange(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CALENDAR_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const CALENDAR_MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

function DateTimeField({ id, label, value, minValue, onChange, isDayDisabled, dayClassName }) {
  const rootRef = React.useRef(null);
  const [open, setOpen] = useState(false);
  const selectedDate = parseLocalDateTime(value) || new Date();
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const minDate = parseLocalDateTime(minValue);
  const [viewMonth, setViewMonth] = useState(new Date(selectedYear, selectedMonth, 1));

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

  const onAmPmChange = (nextAmpm) => {
    const next = new Date(selectedDate);
    const base = next.getHours() % 12;
    next.setHours(nextAmpm === 'CH' ? base + 12 : base);
    applyDate(next);
  };

  const labelText = () => {
    const d = parseLocalDateTime(value);
    if (!d) return 'Chọn ngày giờ';
    const hour12Text = d.getHours() % 12 || 12;
    const ampmText = d.getHours() >= 12 ? 'CH' : 'SA';
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(hour12Text)}:${pad2(d.getMinutes())} ${ampmText}`;
  };

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <button
        id={id}
        type="button"
        className="flex w-full items-center justify-between rounded-lg border-[1.5px] border-gray-200 px-3 py-2.5 text-left text-[0.85rem] text-gray-800 outline-none transition-colors focus:border-primary"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{labelText()}</span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-gray-200 hover:bg-gray-50"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            >
              {'<'}
            </button>
            <select
              className="h-8 flex-1 rounded-md border border-gray-200 px-2 text-sm"
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
              className="h-8 w-24 rounded-md border border-gray-200 px-2 text-sm"
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

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.72rem] text-gray-500">
            {CALENDAR_DAYS.map((d) => (
              <div key={d} className="py-1 font-semibold">
                {d}
              </div>
            ))}
          </div>
          <div className="mb-3 grid grid-cols-7 gap-1">
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
              const disabledByBooked = typeof isDayDisabled === 'function' ? isDayDisabled(cur) : false;
              const disabled = disabledByMin || disabledByBooked;
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
              Hôm nay
            </button>
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={() => setOpen(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const BookingCard = ({ car, id, avgRating, navigate, user, initialRentalWindow, onOpenShowroomProfile }) => {
  const defaultRentalWindow = useMemo(() => buildDefaultRentalWindow(), []);
  const initialPickup = initialRentalWindow?.pickupDate || defaultRentalWindow.pickupDate;
  const initialReturn = initialRentalWindow?.returnDate || defaultRentalWindow.returnDate;
  const [pickupDate, setPickupDate] = useState(initialPickup);
  const [returnDate, setReturnDate] = useState(initialReturn);
  const [bookedIntervals, setBookedIntervals] = useState([]);
  const [loadingBookedDates, setLoadingBookedDates] = useState(false);
  const [bookedDateError, setBookedDateError] = useState('');
  const vehicleId = car._id || car.id || id;

  useEffect(() => {
    setPickupDate(initialPickup);
    setReturnDate(initialReturn);
  }, [initialPickup, initialReturn]);

  const days = useMemo(
    () =>
      Math.max(
        1,
        Math.round((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / 86_400_000)
      ),
    [pickupDate, returnDate]
  );

  const hasSameDaySelection = useMemo(
    () => isSameCalendarDate(pickupDate, returnDate),
    [pickupDate, returnDate]
  );

  useEffect(() => {
    const pickup = parseLocalDateTime(pickupDate);
    const ret = parseLocalDateTime(returnDate);

    if (!pickup || !ret) {
      return;
    }

    if (ret <= pickup || isSameCalendarDate(pickup, ret)) {
      const nextReturn = new Date(pickup);
      nextReturn.setDate(nextReturn.getDate() + 1);
      setReturnDate(toLocalInputValue(nextReturn));
    }
  }, [pickupDate, returnDate]);

  useEffect(() => {
    let cancelled = false;

    if (!vehicleId || !user) {
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
  }, [user, vehicleId]);

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

  const unitPrice = Number(car.price || 0);
  const subtotal = unitPrice * days;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;
  const currency = car.currency === 'VND' ? 'đ' : car.currency || '';
  const isRenter = user?.role === 'renter';
  const roleRedirect = ROLE_DEFAULT_PATHS[user?.role] || '/';
  const addedBy = car?.addedBy;
  const showroomUserId = typeof addedBy === 'string' ? addedBy : addedBy?._id || addedBy?.id || '';
  const canOpenShowroomProfile = isMongoId(showroomUserId);
  const showroomLabel = car.showroom || 'Chủ xe SmartRent';

  const handleOpenShowroomProfile = () => {
    if (!canOpenShowroomProfile) {
      return;
    }

    if (typeof onOpenShowroomProfile === 'function') {
      onOpenShowroomProfile(showroomUserId);
      return;
    }

    navigate('/showrooms/' + showroomUserId);
  };

  const handleBook = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isRenter) {
      navigate(roleRedirect, { replace: true });
      return;
    }

    const pick = parseLocalDateTime(pickupDate);
    const ret = parseLocalDateTime(returnDate);
    if (!pick || !ret) {
      alert('Vui lòng chọn đầy đủ thời gian nhận xe và trả xe.');
      return;
    }
    if (ret <= pick) {
      alert('Thời gian trả xe phải sau thời gian nhận xe.');
      return;
    }
    if (isSameCalendarDate(pick, ret)) {
      alert('Ngày trả xe không được trùng với ngày nhận xe.');
      return;
    }

    try {
      if (hasBookedDateSelection) {
        alert('Xe da co booking trong ngay ban chon. Vui long chon ngay khac.');
        return;
      }

      const availability = await bookingService.checkAvailability({
        vehicleId,
        pickupDate: pick.toISOString(),
        returnDate: ret.toISOString(),
      });

      if (availability?.isAvailable === false) {
        alert(availability?.message || 'Khoảng thời gian bạn chọn đang trùng lịch thuê của xe này.');
        return;
      }
    } catch (error) {
      alert(error?.response?.data?.message || error?.message || 'Khong the kiem tra lich thue luc nay. Vui long thu lai.');
      return;
    }

    navigate(`/renter/checkout/${id}${buildRentalWindowQuery(pickupDate, returnDate)}`, {
      state: {
        car: {
          ...car,
          id: vehicleId,
          _id: vehicleId,
        },
        pickupDate,
        returnDate,
        rentalSearch: {
          pickupDate,
          returnDate,
        },
      },
    });
  };

  return (
    <div className="sticky top-[76px]">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-[1.8rem] font-extrabold text-primary">
            {unitPrice ? unitPrice.toLocaleString('vi-VN') : '—'}
            {currency}
          </span>
          <span className="text-[0.9rem] text-gray-500">/ngày</span>
        </div>
        <div className="mb-3 text-[0.72rem] italic text-gray-400">Giá tạm tính chưa bao gồm VAT</div>
        <div className="mb-4 h-px bg-gray-100" />

        <div className="mb-3">
          <DateTimeField
            id="pickupDate"
            label="Thời gian nhận xe"
            value={pickupDate}
            minValue={buildDefaultPickupDate()}
            onChange={setPickupDate}
            isDayDisabled={isBookedDay}
            dayClassName={(date) =>
              isBookedDay(date)
                ? 'bg-red-100 text-red-700 font-extrabold opacity-100 border border-red-200 line-through'
                : ''
            }
          />
        </div>
        <div className="mb-3">
          <DateTimeField
            id="returnDate"
            label="Thời gian trả xe"
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
        <div className="mt-2 text-[0.75rem] text-gray-500">
          Ngày <span className="font-bold text-red-600">đỏ</span> là ngày xe đã có booking và không thể đặt.
          Ngày <span className="font-bold text-orange-600">cam</span> trong lịch trả xe là ngày trùng ngày nhận và không được chọn.
        </div>
        {loadingBookedDates && (
          <div className="mt-2 text-[0.75rem] text-gray-400">Đang tải lịch đã đặt...</div>
        )}
        {bookedDateError && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-700">
            {bookedDateError}
          </div>
        )}
        {hasSameDaySelection && (
          <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[0.78rem] text-orange-700">
            Ngày trả xe không được trùng với ngày nhận xe. Vui lòng chọn sang một ngày khác.
          </div>
        )}
        {hasBookedDateSelection && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] text-red-700">
            Khoảng thời gian này trùng lịch đã đặt của xe. Vui lòng chọn ngày không bị đánh dấu đỏ.
          </div>
        )}

        <div className="my-3 h-px bg-gray-100" />

        <div className="mb-4 flex flex-col gap-2">
          {[
            [
              `${unitPrice.toLocaleString('vi-VN')}${currency} × ${days} ngày`,
              `${subtotal.toLocaleString('vi-VN')}${currency}`,
            ],
            ['Phí dịch vụ (5%)', `${serviceFee.toLocaleString('vi-VN')}${currency}`],
            ['Bảo hiểm', 'Miễn phí'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-[0.83rem] text-gray-600">
              <span>{label}</span>
              <span className="font-semibold text-gray-800">{value}</span>
            </div>
          ))}
          <div className="my-1 h-px bg-gray-100" />
          <div className="flex justify-between text-[0.95rem] font-extrabold text-gray-900">
            <span>Tổng cộng</span>
            <span className="text-primary">
              {total.toLocaleString('vi-VN')}
              {currency}
            </span>
          </div>
        </div>

        <button
          id="btn-book-car"
          type="button"
          onClick={handleBook}
          disabled={hasSameDaySelection || hasBookedDateSelection}
          className={`w-full rounded-xl py-3.5 text-[0.95rem] font-bold tracking-wide text-white transition-all ${hasSameDaySelection || hasBookedDateSelection
            ? 'cursor-not-allowed bg-gray-300'
            : 'bg-gradient-to-br from-primary to-primary-dark hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,177,79,0.35)] active:scale-[0.98]'
            }`}
        >
          {hasSameDaySelection
            ? 'Ngày nhận và trả đang bị trùng'
            : hasBookedDateSelection
              ? 'Ngày đã có booking'
            : isRenter || !user
              ? 'Đặt xe ngay'
              : 'Đi đến trang quản lý'}
        </button>
        <div className="mt-3 text-center text-[0.75rem] text-gray-400">
          {user && !isRenter
            ? 'Tài khoản hiện tại không thể tạo booking theo luồng khách thuê.'
            : 'Miễn phí hủy trước 1 giờ · Thanh toán an toàn'}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          {canOpenShowroomProfile ? (
            <button
              type="button"
              onClick={handleOpenShowroomProfile}
              className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
                {showroomLabel ? showroomLabel[0] : 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[0.85rem] font-semibold text-gray-800">{showroomLabel}</div>
                <div className="text-[0.75rem] text-gray-400">Xem hồ sơ showroom</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
                {showroomLabel ? showroomLabel[0] : 'C'}
              </div>
              <div>
                <div className="text-[0.85rem] font-semibold text-gray-800">{showroomLabel}</div>
                <div className="text-[0.75rem] text-gray-400">Showroom đợi phản hồi trong 5 phút</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CarDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initialRentalWindow = useMemo(
    () => resolveRentalWindow({ state: location.state, search: location.search }),
    [location.search, location.state]
  );

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsMeta, setReviewsMeta] = useState({ total: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [vehicleLocation, setVehicleLocation] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState('');
  const [reviewAccessLoading, setReviewAccessLoading] = useState(false);
  const [reviewAccess, setReviewAccess] = useState({ canReview: false, eligibleBookings: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [brokenImages, setBrokenImages] = useState({});

  const loadCar = useCallback(async () => {
    setLoading(true);
    try {
      const apiCar = await vehicleService.getById(id);
      setCar(apiCar || null);
    } catch (error) {
      console.error('Error loading car:', error.message);
      setCar(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    if (!isMongoId(id)) {
      setReviews([]);
      setReviewsMeta({ total: 0 });
      return;
    }

    setReviewsLoading(true);
    try {
      const response = await reviewService.getByVehicleId(id);
      setReviews(response.data || []);
      setReviewsMeta(response.pagination || { total: 0 });
    } catch {
      setReviews([]);
      setReviewsMeta({ total: 0 });
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const loadVehicleLocation = useCallback(async () => {
    if (!isMongoId(id) || !localStorage.getItem('smartrent_token')) {
      setVehicleLocation(null);
      return;
    }

    try {
      const locationData = await vehicleLocationService.getByVehicleId(id);
      setVehicleLocation(locationData || null);
    } catch {
      setVehicleLocation(null);
    }
  }, [id]);

  useEffect(() => {
    loadCar();
    loadReviews();
    loadVehicleLocation();
  }, [loadCar, loadReviews, loadVehicleLocation]);

  useEffect(() => {
    setActiveImageIndex(0);
    setGalleryOpen(false);
    setBrokenImages({});
  }, [car?._id, car?.id]);

  const handleToggleFavorite = async (event) => {
    event.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isMongoId(id)) {
      setLiked((current) => !current);
      return;
    }

    setLikeLoading(true);
    try {
      const response = await favoriteService.toggle(id);
      setLiked(response.favorited);
    } catch {
      setLiked((current) => !current);
    } finally {
      setLikeLoading(false);
    }
  };

  const carName = car?.name || '';
  const hue = Math.abs(carName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360;
  const avgRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : Number(car?.rating || 0).toFixed(1);
  const tripCount = reviewsMeta.total || car?.trips || 0;
  const vehicleAddress = vehicleLocation?.address?.trim() || '';
  const vehicleLat = Number(vehicleLocation?.latitude);
  const vehicleLng = Number(vehicleLocation?.longitude);
  const hasVehicleMapData = Boolean(
    vehicleAddress && Number.isFinite(vehicleLat) && Number.isFinite(vehicleLng)
  );
  const displayAddress =
    vehicleAddress || car?.pickupAddress || car?.address || car?.location || '';

  const galleryImages = useMemo(() => {
    const images = Array.isArray(car?.images) ? car.images.filter(Boolean) : [];
    return images.length > 0 ? images : car?.image ? [car.image] : [];
  }, [car?.image, car?.images]);

  const visibleGalleryImages = useMemo(
    () => galleryImages.filter((imageUrl) => !brokenImages[imageUrl]),
    [brokenImages, galleryImages]
  );

  const nImg = visibleGalleryImages.length;
  const activeIdx = Math.min(activeImageIndex, Math.max(nImg - 1, 0));
  const activeImage = visibleGalleryImages[activeIdx] || '';

  const currentUserId = user?._id || user?.id || '';
  const showroomUserId =
    typeof car?.addedBy === 'string' ? car.addedBy : car?.addedBy?._id || car?.addedBy?.id || '';
  const openShowroomProfile = useCallback(
    (userId) => {
      if (isMongoId(userId)) {
        navigate('/showrooms/' + userId);
      }
    },
    [navigate]
  );

  const canManageReviews = user?.role === 'renter' && isMongoId(id);
  const canReviewThisVehicle = canManageReviews && reviewAccess.canReview;
  const hasReviews = reviews.length > 0;
  const isEditingReview = Boolean(editingReviewId);

  const getReviewUserId = useCallback((review) => {
    const reviewUser = review?.user;
    if (!reviewUser) {
      return '';
    }

    if (typeof reviewUser === 'string') {
      return reviewUser;
    }

    return reviewUser._id || reviewUser.id || '';
  }, []);

  const isOwnReview = useCallback(
    (review) => Boolean(currentUserId) && getReviewUserId(review) === currentUserId,
    [currentUserId, getReviewUserId]
  );

  const formatReviewDate = useCallback((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('vi-VN');
  }, []);

  useEffect(() => {
    if (!visibleGalleryImages.length) {
      if (activeImageIndex !== 0) {
        setActiveImageIndex(0);
      }
      return;
    }

    if (activeImageIndex > visibleGalleryImages.length - 1) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, visibleGalleryImages.length]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-5 py-20 text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-gray-500">Đang tải thông tin xe...</p>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="px-5 py-20 text-center">
        <div className="mb-4 flex justify-center text-primary">
          <MdDirectionsCar style={{ fontSize: '4rem' }} />
        </div>
        <h2 className="mb-5 text-xl font-bold text-gray-800">Không tìm thấy xe</h2>
        <button
          type="button"
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
          onClick={() => navigate('/')}
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const markImageBroken = (imageUrl) => {
    if (!imageUrl) {
      return;
    }

    setBrokenImages((current) => {
      if (current[imageUrl]) {
        return current;
      }
      return { ...current, [imageUrl]: true };
    });
  };

  const moveGallery = (direction) => {
    if (visibleGalleryImages.length <= 1) {
      return;
    }

    setActiveImageIndex((current) => {
      const nextIndex = current + direction;
      if (nextIndex < 0) {
        return visibleGalleryImages.length - 1;
      }
      if (nextIndex >= visibleGalleryImages.length) {
        return 0;
      }
      return nextIndex;
    });
  };

  const openGalleryAt = (index) => {
    if (!visibleGalleryImages.length) {
      return;
    }

    const boundedIndex = Math.min(Math.max(index, 0), visibleGalleryImages.length - 1);
    setActiveImageIndex(boundedIndex);
    setGalleryOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6">
      <button
        type="button"
        className="mb-5 flex items-center gap-2 text-[0.82rem] font-medium text-gray-500 transition-colors hover:text-primary"
        onClick={() => navigate(-1)}
      >
        <FaChevronLeft size={12} aria-hidden="true" /> Quay lại danh sách xe
      </button>

      <div className="grid grid-cols-[1fr_360px] items-start gap-8 max-[900px]:grid-cols-1">
        <div>
          <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100" style={{ aspectRatio: '16/9' }}>
            {activeImage ? (
              <img
                src={activeImage}
                alt={car.name}
                className="h-full w-full cursor-zoom-in object-cover"
                onClick={() =>
                  openGalleryAt(Math.min(activeImageIndex, Math.max(visibleGalleryImages.length - 1, 0)))
                }
                onError={() => {
                  markImageBroken(activeImage);
                }}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue},30%,88%) 0%, hsl(${hue},20%,95%) 100%)`,
                }}
              >
                <MdDirectionsCar
                  style={{
                    fontSize: '8rem',
                    color: car.color || `hsl(${hue},40%,50%)`,
                    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.15))',
                    transform: 'scaleX(-1)',
                  }}
                />
              </div>
            )}

            {visibleGalleryImages.length > 1 && (
              <div className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1.5 text-[0.78rem] font-semibold text-white backdrop-blur-sm">
                {Math.min(activeImageIndex + 1, visibleGalleryImages.length)}/{visibleGalleryImages.length} ảnh
              </div>
            )}
          </div>

          {visibleGalleryImages.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-3 max-[640px]:grid-cols-4 max-[480px]:grid-cols-3">
              {visibleGalleryImages.map((imageUrl, index) => {
                const isActiveImage = index === activeImageIndex;
                return (
                  <button
                    key={imageUrl}
                    type="button"
                    className={`overflow-hidden rounded-xl border-2 transition-all ${isActiveImage
                      ? 'border-primary shadow-[0_8px_20px_rgba(0,177,79,0.18)]'
                      : 'border-gray-200 hover:border-primary/60'
                      }`}
                    style={{ aspectRatio: '4/3' }}
                    onClick={() => {
                      setActiveImageIndex(index);
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={`${car.name} ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={() => markImageBroken(imageUrl)}
                    />
                  </button>
                );
              })}
            </div>
          )}

          <div className="mb-6 mt-3 flex gap-3">
            <button
              type="button"
              className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-[0.82rem] text-gray-600 transition-colors hover:border-primary hover:text-primary"
              onClick={() =>
                navigator.share?.({ title: document.title, url: window.location.href })
                || navigator.clipboard?.writeText(window.location.href)
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <FaShareAlt size={13} aria-hidden="true" /> Chia sẻ
              </span>
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={likeLoading}
              className={`cursor-pointer rounded-full border bg-white px-4 py-2 text-[0.82rem] transition-colors ${liked
                ? 'border-red-400 text-red-500 hover:border-red-500'
                : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {liked ? <FaHeart size={13} aria-hidden="true" /> : <FaRegHeart size={13} aria-hidden="true" />}
                {liked ? 'Đã yêu thích' : 'Yêu thích'}
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold text-gray-900">{car.name}</h1>

            <div className="flex flex-wrap gap-3">
              {displayAddress && (
                <span className="flex items-center gap-1 text-[0.85rem] font-medium text-primary">
                  <FaMapMarkerAlt size={12} aria-hidden="true" /> {displayAddress}
                </span>
              )}
              {car.showroom && (
                showroomUserId ? (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[0.82rem] text-gray-500 transition-colors hover:text-primary"
                    onClick={() => openShowroomProfile(showroomUserId)}
                  >
                    <FaStore size={12} className="text-gray-400" aria-hidden="true" /> {car.showroom}
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[0.82rem] text-gray-500">
                    <FaStore size={12} className="text-gray-400" aria-hidden="true" /> {car.showroom}
                  </span>
                )
              )}
              <StarRow rating={avgRating} count={tripCount} />
              <span className="flex items-center gap-1 text-[0.85rem] font-semibold text-primary">
                <MdVerified size={15} aria-hidden="true" /> {car.type || car.category}
              </span>
            </div>

            <div>
              <div className={sectionTitle}>Thông số kỹ thuật</div>
              <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                <SpecItem icon={<MdPeople size={18} />} label="Số chỗ" value={`${car.seats || 5} chỗ`} />
                <SpecItem icon={<MdSettings size={18} />} label="Hộp số" value={car.transmission || 'Số tự động'} />
                <SpecItem
                  icon={
                    car.fuel === 'Điện'
                      ? <BsLightningChargeFill size={16} color="#2196f3" />
                      : <FaGasPump size={16} />
                  }
                  label="Nhiên liệu"
                  value={car.fuel || 'Xăng'}
                />
                <SpecItem
                  icon={<MdDirectionsCar size={18} />}
                  label="Loại xe"
                  value={car.category || car.type || 'Sedan'}
                />
              </div>
            </div>

            {(hasVehicleMapData || displayAddress) && (
              <div>
                <div className={sectionTitle}>Vị trí nhận xe</div>
                {hasVehicleMapData ? (
                  <CarLocationMap
                    locationText={vehicleAddress}
                    lat={vehicleLat}
                    lng={vehicleLng}
                    plusCode={vehicleLocation?.plusCode}
                    city=""
                  />
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-[0.82rem] text-gray-600">
                    Địa chỉ nhận xe: {displayAddress}
                  </div>
                )}
              </div>
            )}

            {car.description && (
              <div>
                <div className={sectionTitle}>Mô tả xe</div>
                <p className="text-[0.875rem] leading-[1.8] text-gray-600">{car.description}</p>
              </div>
            )}

            {Array.isArray(car.amenities) && car.amenities.length > 0 && (
              <div>
                <div className={sectionTitle}>Tiện nghi</div>
                <div className="flex flex-wrap gap-2">
                  {car.amenities.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full bg-primary-light px-3 py-1 text-[0.78rem] font-medium text-primary"
                    >
                      ✓ {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <MdShield size={20} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
              <div>
                <div className="mb-1 text-[0.85rem] font-bold text-gray-800">Bảo hiểm & trách nhiệm</div>
                <div className="text-[0.78rem] leading-relaxed text-gray-500">
                  Điều kiện bảo hiểm và mức khấu trừ theo hợp đồng thuê tại thời điểm đặt xe. Vui lòng đọc kỹ hợp đồng
                  và trao đổi với chủ xe nếu cần xác nhận thêm quyền lợi áp dụng cho chuyến đi.
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-[0.9rem] font-bold text-gray-800">
                  Đánh giá {reviewsMeta.total > 0 && <span className="tabular-nums">({reviewsMeta.total})</span>}
                </span>
              </div>

              {reviewsLoading && <p className="py-2 text-[0.82rem] text-gray-400">Đang tải đánh giá...</p>}

              {!reviewsLoading && reviews.length === 0 && (
                <p className="py-2 text-[0.82rem] text-gray-400">Chưa có đánh giá nào.</p>
              )}

              {reviews.map((review) => (
                <div key={review._id} className="border-b border-gray-100 py-3 last:border-0">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[0.75rem] font-bold text-white">
                        {(review.user?.name || 'U')[0]}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[0.85rem] font-semibold text-gray-800">
                            {review.user?.name || 'Ẩn danh'}
                          </span>
                          {isOwnReview(review) && (
                            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[0.68rem] font-semibold text-primary">
                              Đánh giá của bạn
                            </span>
                          )}
                          <StarRow rating={review.rating} />
                        </div>
                        {review.createdAt && (
                          <div className="mt-1 text-[0.72rem] text-gray-400">
                            {formatReviewDate(review.createdAt)}
                            {review.updatedAt && review.updatedAt !== review.createdAt ? ' · Đã chỉnh sửa' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  <div className="ml-9">
                    {review.comment ? (
                      <p className="text-[0.82rem] text-gray-600">{review.comment}</p>
                    ) : (
                      <p className="text-[0.8rem] italic text-gray-400">
                        Người dùng chưa để lại nhận xét chi tiết.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 text-[0.88rem] font-bold text-gray-800">Điều khoản</div>
              <div className="flex flex-col gap-0.5 text-[0.8rem] leading-[1.8] text-gray-600">
                {[
                  'Sử dụng xe đúng mục đích.',
                  'Không sử dụng xe thuê vào mục đích phi pháp, trái pháp luật.',
                  'Không sử dụng xe thuê để cầm cố, thế chấp.',
                  'Không hút thuốc, nhả kẹo cao su, xả rác trong xe.',
                  'Không chở hàng quốc cấm, dễ cháy nổ.',
                  'Trân trọng cảm ơn, chúc quý khách hàng có những chuyến đi tuyệt vời!',
                ].map((term, index) => (
                  <p key={index}>– {term}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <BookingCard
          car={car}
          id={id}
          avgRating={avgRating}
          navigate={navigate}
          user={user}
          initialRentalWindow={initialRentalWindow}
          onOpenShowroomProfile={openShowroomProfile}
        />
      </div>

      <Modal
        isOpen={galleryOpen && visibleGalleryImages.length > 0}
        onClose={() => setGalleryOpen(false)}
        title={`${car.name} - Thư viện ảnh`}
        width={980}
      >
        {visibleGalleryImages.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-2xl bg-gray-100" style={{ aspectRatio: '16/9' }}>
              <img
                src={visibleGalleryImages[activeImageIndex] || visibleGalleryImages[0]}
                alt={`${car.name} ${activeImageIndex + 1}`}
                className="h-full w-full bg-black/95 object-contain"
                onError={() => markImageBroken(visibleGalleryImages[activeImageIndex])}
              />

              {visibleGalleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md transition-colors hover:bg-white"
                    onClick={() => moveGallery(-1)}
                  >
                    <FaChevronLeft aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md transition-colors hover:bg-white"
                    onClick={() => moveGallery(1)}
                  >
                    <FaChevronRight aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            {visibleGalleryImages.length > 1 && (
              <div className="grid grid-cols-6 gap-3 max-[900px]:grid-cols-4 max-[560px]:grid-cols-3">
                {visibleGalleryImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    className={`overflow-hidden rounded-xl border-2 transition-all ${index === activeImageIndex ? 'border-primary' : 'border-gray-200 hover:border-primary/60'
                      }`}
                    style={{ aspectRatio: '4/3' }}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <img
                      src={imageUrl}
                      alt={`${car.name} thumb ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={() => markImageBroken(imageUrl)}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CarDetail;
