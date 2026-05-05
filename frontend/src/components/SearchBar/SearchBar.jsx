import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCalendarAlt,
  FaCar,
  FaCheck,
  FaChevronRight,
  FaMapMarkerAlt,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import { lockPageScroll, unlockPageScroll } from '../../utils/scrollLock';
import {
  buildDefaultPickupDate,
  buildDefaultRentalWindow,
  buildDefaultReturnDate,
  isSameCalendarDate,
} from '../../utils/rentalWindow';

const CITIES = ['Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh'];

const CITY_DISTRICTS = {
  'Đà Nẵng': {
    Quan: ['Quận Hải Châu', 'Quận Thanh Khê', 'Quận Sơn Trà', 'Quận Ngũ Hành Sơn', 'Quận Liên Chiểu', 'Quận Cẩm Lệ'],
    Huyen: ['Huyện Hòa Vang'],
  },
  'TP. Hồ Chí Minh': {
    Quan: ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Thạnh', 'Gò Vấp', 'Tân Bình', 'Tân Phú', 'Phú Nhuận', 'Bình Tân'],
    Huyen: ['Bình Chánh', 'Củ Chi', 'Hóc Môn', 'Nhà Bè', 'Cần Giờ'],
  },
  'Hà Nội': {
    Quan: ['Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Cầu Giấy', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Tây Hồ', 'Hà Đông'],
    Huyen: ['Đông Anh', 'Gia Lâm', 'Sóc Sơn', 'Thanh Trì', 'Hoài Đức'],
  },
};

const parseDateTime = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTimeShort = (value) => {
  const date = parseDateTime(value);
  if (!date) return '';

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const SearchBar = ({ onSearch }) => {
  const initialRentalWindow = useMemo(() => buildDefaultRentalWindow(), []);
  const [showModal, setShowModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [carName, setCarName] = useState('');
  const [pickupDate, setPickupDate] = useState(initialRentalWindow.pickupDate);
  const [returnDate, setReturnDate] = useState(initialRentalWindow.returnDate);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    lockPageScroll();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setShowModal(false);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockPageScroll();
    };
  }, [showModal]);

  useEffect(() => {
    const pickup = parseDateTime(pickupDate);
    const ret = parseDateTime(returnDate);

    if (pickup && ret && (ret <= pickup || isSameCalendarDate(pickup, ret))) {
      setReturnDate(buildDefaultReturnDate(pickupDate));
    }
  }, [pickupDate, returnDate]);

  const districts = selectedCity ? CITY_DISTRICTS[selectedCity] : null;

  const locationLabel = useMemo(() => {
    if (selectedCity && selectedDistrict) {
      return `${selectedDistrict}, ${selectedCity}`;
    }

    return selectedCity || '';
  }, [selectedCity, selectedDistrict]);

  const rentalWindowLabel = useMemo(() => {
    const pickupLabel = formatDateTimeShort(pickupDate);
    const returnLabel = formatDateTimeShort(returnDate);

    if (!pickupLabel || !returnLabel) {
      return 'Chọn ngày nhận và trả xe';
    }

    return `${pickupLabel} - ${returnLabel}`;
  }, [pickupDate, returnDate]);

  const handleSearch = () => {
    const pickup = parseDateTime(pickupDate);
    const ret = parseDateTime(returnDate);

    if (!pickup || !ret) {
      setSearchError('Vui lòng chọn đầy đủ ngày nhận và trả xe.');
      return;
    }

    if (ret <= pickup) {
      setSearchError('Ngày trả xe phải sau ngày nhận xe.');
      return;
    }
    if (isSameCalendarDate(pickup, ret)) {
      setSearchError('Ngày trả xe không được trùng ngày nhận xe.');
      return;
    }

    setSearchError('');
    onSearch?.({
      location: locationLabel,
      carName,
      pickupDate,
      returnDate,
    });
    setShowModal(false);
  };

  const handleReset = () => {
    setSelectedCity(null);
    setSelectedDistrict('');
    setCarName('');
    setPickupDate('');
    setReturnDate('');
    setSearchError('');
    onSearch?.({
      location: '',
      carName: '',
      pickupDate: '',
      returnDate: '',
    });
  };

  return (
    <>
      <section className="bg-gradient-to-br from-[#f0fdf4] to-[#e8f8ef] px-5 py-10">

        <div
          role="button"
          tabIndex={0}
          className="mx-auto flex w-full max-w-[1040px] items-stretch overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-md transition-shadow hover:shadow-lg max-[860px]:flex-col max-[860px]:rounded-xl"
          onClick={() => setShowModal(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowModal(true);
            }
          }}
        >
          <div className="flex flex-1 items-center gap-3 border-r border-gray-100 px-5 py-3.5 max-[860px]:border-b max-[860px]:border-r-0">
            <FaMapMarkerAlt className="shrink-0 text-base text-primary" />
            <div className="min-w-0">
              <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-gray-400">Địa điểm</div>
              <div className={`truncate text-[0.92rem] font-medium ${locationLabel ? 'text-gray-800' : 'text-gray-400'}`}>
                {locationLabel || 'Chọn địa điểm tìm xe'}
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 border-r border-gray-100 px-5 py-3.5 max-[860px]:border-b max-[860px]:border-r-0">
            <FaCar className="shrink-0 text-base text-gray-400" />
            <div className="min-w-0">
              <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-gray-400">Tìm theo tên xe</div>
              <div className={`truncate text-[0.92rem] font-medium ${carName ? 'text-gray-800' : 'text-gray-400'}`}>
                {carName || 'Ferrari, Lamborghini, Bugatti...'}
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 px-5 py-3.5 max-[860px]:border-b max-[860px]:border-gray-100">
            <FaCalendarAlt className="shrink-0 text-base text-gray-400" />
            <div className="min-w-0">
              <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-gray-400">Thời gian thuê</div>
              <div className="truncate text-[0.92rem] font-medium text-gray-800">
                {rentalWindowLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="flex shrink-0 items-center justify-center gap-2 border-l border-gray-100 bg-white px-5 py-3.5 text-[0.78rem] font-bold uppercase tracking-wide text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 max-[860px]:border-b max-[860px]:border-l-0 max-[860px]:border-t max-[860px]:py-4"
            onClick={(event) => {
              event.stopPropagation();
              handleReset();
            }}
          >
            <FaTimes />
            Đặt lại
          </button>

          <div className="flex shrink-0 items-center justify-center gap-2 bg-primary px-7 py-3.5 text-[0.85rem] font-bold uppercase tracking-wide text-white max-[860px]:py-4">
            <FaSearch />
            Tìm kiếm
          </div>
        </div>
      </section>

      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:max-w-[560px] sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
              <span className="text-base font-bold text-gray-900">Tim xe</span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                onClick={() => setShowModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-wide text-gray-600">
                  Địa điểm
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                  <FaMapMarkerAlt className="shrink-0 text-primary" />
                  <span className={`text-[0.9rem] ${locationLabel ? 'font-medium text-gray-800' : 'text-gray-400'}`}>
                    {locationLabel || 'Chọn thành phố hoặc quận huyện'}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-wide text-gray-600">
                  Tên xe
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                  <FaCar className="shrink-0 text-gray-400" />
                  <input
                    type="text"
                    className="flex-1 border-none bg-transparent text-[0.88rem] text-gray-800 outline-none placeholder:text-gray-400"
                    placeholder="Tim theo ten xe..."
                    value={carName}
                    onChange={(event) => setCarName(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-wide text-gray-600">
                    Ngày nhận xe
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                    <input
                      type="datetime-local"
                      className="w-full border-none bg-transparent text-[0.88rem] text-gray-800 outline-none"
                      value={pickupDate}
                      min={buildDefaultPickupDate()}
                      onChange={(event) => setPickupDate(event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-wide text-gray-600">
                    Ngày trả xe
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                    <input
                      type="datetime-local"
                      className="w-full border-none bg-transparent text-[0.88rem] text-gray-800 outline-none"
                      value={returnDate}
                      min={pickupDate}
                      onChange={(event) => setReturnDate(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              {searchError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] text-red-700">
                  {searchError}
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[0.75rem] font-bold uppercase tracking-wide text-gray-600">Chon thanh pho</span>
                  {selectedCity && (
                    <button
                      type="button"
                      className="text-[0.72rem] font-semibold text-primary hover:underline"
                      onClick={() => {
                        setSelectedCity(null);
                        setSelectedDistrict('');
                      }}
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  {CITIES.map((city) => {
                    const isActive = selectedCity === city;
                    return (
                      <button
                        key={city}
                        type="button"
                        className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 ${isActive ? 'bg-primary-light' : 'bg-white hover:bg-gray-50'}`}
                        onClick={() => {
                          setSelectedCity(city);
                          setSelectedDistrict('');
                        }}
                      >
                        <FaMapMarkerAlt className={isActive ? 'text-primary' : 'text-gray-400'} />
                        <span className={`flex-1 text-[0.9rem] font-medium ${isActive ? 'text-primary' : 'text-gray-700'}`}>
                          {city}
                        </span>
                        {isActive ? <FaCheck className="text-[0.8rem] text-primary" /> : <FaChevronRight className="text-[0.75rem] text-gray-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {districts && (
                <div>
                  <div className="mb-2 text-[0.75rem] font-bold uppercase tracking-wide text-gray-600">
                    Quận / Huyện - {selectedCity}
                  </div>

                  <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-gray-100">
                    {Object.entries(districts).map(([group, items]) => (
                      <div key={group}>
                        <div className="border-b border-gray-100 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-gray-400">
                          {group}
                        </div>
                        {items.map((district) => {
                          const isActive = selectedDistrict === district;
                          return (
                            <button
                              key={district}
                              type="button"
                              className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left transition-colors last:border-b-0 ${isActive ? 'bg-primary-light' : 'bg-white hover:bg-gray-50'}`}
                              onClick={() => setSelectedDistrict((current) => (current === district ? '' : district))}
                            >
                              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${isActive ? 'border-primary' : 'border-gray-300'}`}>
                                {isActive && <span className="block h-2 w-2 rounded-full bg-primary" />}
                              </span>
                              <span className={`text-[0.88rem] ${isActive ? 'font-semibold text-primary' : 'text-gray-700'}`}>
                                {district}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 px-5 py-4">
              <div className="flex w-full items-center gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-[0.92rem] font-semibold text-gray-600 hover:border-gray-300"
                  onClick={handleReset}
                >
                  Đặt lại
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-primary py-3 text-[0.95rem] font-bold text-white transition-colors hover:bg-primary-dark"
                  onClick={handleSearch}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;
