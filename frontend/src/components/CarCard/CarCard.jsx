import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsLightningChargeFill } from 'react-icons/bs';
import { FaGasPump, FaMapMarkerAlt, FaStar, FaStore } from 'react-icons/fa';
import { MdDirectionsCar, MdPeople, MdSettings } from 'react-icons/md';
import { buildRentalWindowQuery } from '../../utils/rentalWindow';

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const sanitizeRentalWindow = (pickupDate, returnDate) => ({
  pickupDate: String(pickupDate || ''),
  returnDate: String(returnDate || ''),
});

const CarColorBg = ({ color, name }) => {
  const hue = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, hsl(${hue},30%,88%) 0%, hsl(${hue},20%,95%) 100%)` }}
    >
      <MdDirectionsCar
        style={{
          fontSize: '5rem',
          color: color || `hsl(${hue},40%,50%)`,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          transform: 'scaleX(-1)',
        }}
      />
    </div>
  );
};

const StarRating = ({ rating }) => (
  <div className="flex items-center gap-px text-[0.8rem]">
    {[1, 2, 3, 4, 5].map((index) => (
      <FaStar key={index} style={{ color: index <= Math.round(rating) ? '#f59e0b' : '#e5e7eb' }} />
    ))}
  </div>
);

const CarCard = ({ car, rentalSearch = null }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const carId = car.id || car._id;
  const imageUrl = useMemo(() => car.image || (Array.isArray(car.images) ? car.images[0] : ''), [car.image, car.images]);
  const locationText = car.address || car.pickupAddress || car.location || '';
  const displayAddress = locationText;
  const ratingValue = Number(car.rating || 0);
  const reviewCount = Number(car.reviewCount ?? car.trips ?? 0);
  const fuelIcon =
    normalizeText(car.fuel) === 'dien' ? (
      <BsLightningChargeFill style={{ color: '#2196f3' }} />
    ) : (
      <FaGasPump style={{ color: '#f59e0b' }} />
    );
  const rentalWindow = sanitizeRentalWindow(rentalSearch?.pickupDate, rentalSearch?.returnDate);

  useEffect(() => {
    setImgError(false);
  }, [carId, imageUrl]);

  return (
    <article
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-[250ms] hover:-translate-y-1 hover:border-gray-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.14)]"
      onClick={() =>
        navigate(`/xe/${carId}${buildRentalWindowQuery(rentalWindow.pickupDate, rentalWindow.returnDate)}`, {
          state: {
            rentalSearch: rentalWindow,
          },
        })
      }
    >
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '16/10' }}>
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={car.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <CarColorBg color={car.color} name={car.name} />
        )}

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-black/30 to-transparent" />

        {(car.category || car.type) && (
          <span className="absolute bottom-2.5 right-2.5 z-[2] flex items-center gap-1 rounded-full border border-white/15 bg-black/65 px-2.5 py-[5px] text-[0.7rem] font-medium text-white backdrop-blur-sm">
            <MdDirectionsCar size={12} />
            {car.category || car.type}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-4 py-3.5">
        <h3 className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold leading-snug text-gray-900">
          {car.name}
        </h3>

        {car.showroom && (
          <div className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] text-gray-500">
            <FaStore size={10} />
            {car.showroom}
          </div>
        )}

        {displayAddress && (
          <div className="flex items-center gap-1 text-[0.78rem] text-primary font-medium">
            <FaMapMarkerAlt aria-hidden="true" size={11} />
            {displayAddress}
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-0.5">
          <StarRating rating={ratingValue} />
          {reviewCount > 0 && (
            <span className="text-[0.8rem] font-bold text-gray-800">{ratingValue.toFixed(1)}</span>
          )}
          <span className={`text-[0.75rem] ${reviewCount > 0 ? 'text-gray-500' : 'text-gray-400'}`}>
            {reviewCount > 0 ? `(${reviewCount} đánh giá)` : 'Chưa có đánh giá'}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-[1.2rem] font-extrabold text-primary">{car.price.toLocaleString()}K</span>
          <span className="text-[0.8rem] font-medium text-gray-500">/ngày</span>
        </div>
        <div className="text-[0.75rem] text-gray-500 -mt-0.5">2 ngày 4 giờ</div>
        <div className="text-[0.68rem] text-primary italic -mt-0.5">Giá tạm tính chưa bao gồm VAT</div>

        <div className="flex items-center border-t border-gray-100 mt-2 pt-2.5">
          {[
            { icon: <MdPeople size={18} />, label: `${car.seats || 0} chỗ` },
            { icon: <MdSettings size={18} />, label: car.transmission || 'Đang cập nhật' },
            { icon: fuelIcon, label: car.fuel || 'Đang cập nhật' },
          ].map(({ icon, label }, index, all) => (
            <div
              key={`${label}-${index}`}
              className={`flex flex-1 flex-col items-center gap-[3px] text-center text-[0.72rem] font-medium text-gray-500 ${index < all.length - 1 ? 'border-r border-gray-100' : ''
                }`}
            >
              <span className="text-primary">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};

export default CarCard;
