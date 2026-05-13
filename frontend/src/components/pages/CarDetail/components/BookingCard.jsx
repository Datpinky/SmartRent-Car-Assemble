import { useCallback, useEffect, useMemo, useState } from 'react';
import bookingService from '../../../../services/bookingService';
import {
  buildDefaultPickupDate,
  buildDefaultRentalWindow,
  buildRentalWindowQuery,
  isSameCalendarDate,
} from '../../../../utils/rentalWindow';
import Modal from '../../../common/Modal';
import { isMongoId, parseLocalDateTime, toLocalInputValue } from '../carDetail.helpers';
import DateTimeField from './DateTimeField';
import DriverLicenseRequiredModal from './DriverLicenseRequiredModal';
import GplxRequirementBanner from './GplxRequirementBanner';

const ROLE_DEFAULT_PATHS = {
  admin: '/admin/dashboard',
  showroom: '/showroom/dashboard',
  renter: '/renter/profile',
};

const BookingCard = ({ car, id, navigate, user, initialRentalWindow, onOpenShowroomProfile }) => {
  const defaultRentalWindow = useMemo(() => buildDefaultRentalWindow(), []);
  const initialPickup = initialRentalWindow?.pickupDate || defaultRentalWindow.pickupDate;
  const initialReturn = initialRentalWindow?.returnDate || defaultRentalWindow.returnDate;
  const [pickupDate, setPickupDate] = useState(initialPickup);
  const [returnDate, setReturnDate] = useState(initialReturn);
  const [bookedIntervals, setBookedIntervals] = useState([]);
  const [loadingBookedDates, setLoadingBookedDates] = useState(false);
  const [bookedDateError, setBookedDateError] = useState('');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [bookError, setBookError] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const vehicleId = car._id || car.id || id;

  useEffect(() => {
    setBookError('');
  }, [pickupDate, returnDate]);

  useEffect(() => {
    setPickupDate(initialPickup);
    setReturnDate(initialReturn);
  }, [initialPickup, initialReturn]);

  const days = useMemo(
    () => Math.max(1, Math.round((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / 86_400_000)),
    [pickupDate, returnDate],
  );

  const hasSameDaySelection = useMemo(() => isSameCalendarDate(pickupDate, returnDate), [pickupDate, returnDate]);

  useEffect(() => {
    const pickup = parseLocalDateTime(pickupDate);
    const ret = parseLocalDateTime(returnDate);
    if (!pickup || !ret) return;
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
    return () => {
      cancelled = true;
    };
  }, [Boolean(user?._id), vehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBookedDay = useCallback((date) => bookingService.isDateBooked(date, bookedIntervals), [bookedIntervals]);

  const selectedBookedConflicts = useMemo(
    () => bookingService.getBookingConflicts({ pickupDate, returnDate, intervals: bookedIntervals }),
    [bookedIntervals, pickupDate, returnDate],
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
    if (!canOpenShowroomProfile) return;
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
    if (!user.driver_license_number || user.driver_license_status !== 'approved') {
      setShowLicenseModal(true);
      return;
    }
    setBookError('');
    const pick = parseLocalDateTime(pickupDate);
    const ret = parseLocalDateTime(returnDate);
    if (!pick || !ret) {
      setBookError('Vui lòng chọn đầy đủ thời gian nhận xe và trả xe.');
      return;
    }
    if (ret <= pick) {
      setBookError('Thời gian trả xe phải sau thời gian nhận xe.');
      return;
    }
    if (isSameCalendarDate(pick, ret)) {
      setBookError('Ngày trả xe không được trùng với ngày nhận xe.');
      return;
    }
    try {
      setBookLoading(true);
      if (hasBookedDateSelection) {
        setBookError('Xe đã có booking trong ngày bạn chọn. Vui lòng chọn ngày khác.');
        setBookLoading(false);
        return;
      }
      const availability = await bookingService.checkAvailability({
        vehicleId,
        pickupDate: pick.toISOString(),
        returnDate: ret.toISOString(),
      });
      if (availability?.isAvailable === false) {
        setBookError(availability?.message || 'Khoảng thời gian bạn chọn đang trùng lịch thuê của xe này.');
        setBookLoading(false);
        return;
      }
    } catch (error) {
      setBookError(
        error?.response?.data?.message || error?.message || 'Không thể kiểm tra lịch thuê lúc này. Vui lòng thử lại.',
      );
      setBookLoading(false);
      return;
    }
    setBookLoading(false);
    navigate(`/renter/checkout/${id}${buildRentalWindowQuery(pickupDate, returnDate)}`, {
      state: {
        car: { ...car, id: vehicleId, _id: vehicleId },
        pickupDate,
        returnDate,
        rentalSearch: { pickupDate, returnDate },
      },
    });
  };

  return (
    <>
      {showLicenseModal && (
        <Modal
          isOpen={showLicenseModal}
          onClose={() => setShowLicenseModal(false)}
          title="Yêu cầu Giấy phép lái xe"
          width={420}
        >
          <DriverLicenseRequiredModal
            status={user?.driver_license_status || 'none'}
            rejectReason={user?.driver_license_reject_reason || ''}
            onClose={() => setShowLicenseModal(false)}
            onGoProfile={() => navigate('/renter/profile')}
          />
        </Modal>
      )}
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
            Ngày <span className="font-bold text-red-600">đỏ</span> là ngày xe đã có booking và không thể đặt. Ngày{' '}
            <span className="font-bold text-orange-600">cam</span> trong lịch trả xe là ngày trùng ngày nhận và không
            được chọn.
          </div>
          {loadingBookedDates && <div className="mt-2 text-[0.75rem] text-gray-400">Đang tải lịch đã đặt...</div>}
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

          {isRenter && user && (!user.driver_license_number || user.driver_license_status !== 'approved') && (
            <GplxRequirementBanner
              status={user.driver_license_status || 'none'}
              rejectReason={user.driver_license_reject_reason || ''}
              onGoProfile={() => navigate('/renter/profile')}
            />
          )}

          <button
            id="btn-book-car"
            type="button"
            onClick={handleBook}
            disabled={hasSameDaySelection || hasBookedDateSelection || bookLoading}
            className={`w-full rounded-xl py-3.5 text-[0.95rem] font-bold tracking-wide text-white transition-all ${
              hasSameDaySelection || hasBookedDateSelection || bookLoading
                ? 'cursor-not-allowed bg-gray-300'
                : 'bg-gradient-to-br from-primary to-primary-dark hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,177,79,0.35)] active:scale-[0.98]'
            }`}
          >
            {hasSameDaySelection
              ? 'Ngày nhận và trả đang bị trùng'
              : hasBookedDateSelection
                ? 'Ngày đã có booking'
                : bookLoading
                  ? 'Đang kiểm tra...'
                  : isRenter || !user
                    ? 'Đặt xe ngay'
                    : 'Đi đến trang quản lý'}
          </button>
          {bookError && (
            <div
              role="alert"
              className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] text-red-700 flex items-start gap-1.5"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{bookError}</span>
            </div>
          )}
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
    </>
  );
};

export default BookingCard;
