import { useCallback, useEffect, useMemo, useState } from 'react';
import { BsLightningChargeFill } from 'react-icons/bs';
import {
  FaChevronLeft,
  FaChevronRight,
  FaGasPump,
  FaHeart,
  FaMapMarkerAlt,
  FaRegHeart,
  FaShareAlt,
  FaStar,
  FaStore,
} from 'react-icons/fa';
import { MdDirectionsCar, MdPeople, MdSettings, MdShield, MdVerified } from 'react-icons/md';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import favoriteService from '../../../services/favoriteService';
import reviewService from '../../../services/reviewService';
import vehicleLocationService from '../../../services/vehicleLocationService';
import vehicleService from '../../../services/vehicleService';
import { resolveRentalWindow } from '../../../utils/rentalWindow';
import CarLocationMap from '../../Map/CarLocationMap';
import Modal from '../../common/Modal';
import { isMongoId } from './carDetail.helpers';
import BookingCard from './components/BookingCard';
import CarReviews from './components/CarReviews';

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

const sectionTitle = 'text-[0.9rem] font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100';

const TERMS = [
  'Sử dụng xe đúng mục đích.',
  'Không sử dụng xe thuê vào mục đích phi pháp, trái pháp luật.',
  'Không sử dụng xe thuê để cầm cố, thế chấp.',
  'Không hút thuốc, nhả kẹo cao su, xả rác trong xe.',
  'Không chở hàng quốc cấm, dễ cháy nổ.',
  'Trân trọng cảm ơn, chúc quý khách hàng có những chuyến đi tuyệt vời!',
];

const CarDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initialRentalWindow = useMemo(
    () => resolveRentalWindow({ state: location.state, search: location.search }),
    [location.search, location.state],
  );

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsMeta, setReviewsMeta] = useState({ total: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [vehicleLocation, setVehicleLocation] = useState(null);
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

  const galleryImages = useMemo(() => {
    const images = Array.isArray(car?.images) ? car.images.filter(Boolean) : [];
    return images.length > 0 ? images : car?.image ? [car.image] : [];
  }, [car?.image, car?.images]);

  const visibleGalleryImages = useMemo(
    () => galleryImages.filter((imageUrl) => !brokenImages[imageUrl]),
    [brokenImages, galleryImages],
  );

  useEffect(() => {
    if (!visibleGalleryImages.length) {
      if (activeImageIndex !== 0) setActiveImageIndex(0);
      return;
    }
    if (activeImageIndex > visibleGalleryImages.length - 1) setActiveImageIndex(0);
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

  const carName = car?.name || '';
  const hue = Math.abs(carName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360;
  const avgRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : Number(car?.rating || 0).toFixed(1);
  const tripCount = reviewsMeta.total || car?.trips || 0;
  const vehicleAddress = vehicleLocation?.address?.trim() || '';
  const vehicleLat = Number(vehicleLocation?.latitude);
  const vehicleLng = Number(vehicleLocation?.longitude);
  const hasVehicleMapData = Boolean(vehicleAddress && Number.isFinite(vehicleLat) && Number.isFinite(vehicleLng));
  const displayAddress = vehicleAddress || car?.pickupAddress || car?.address || car?.location || '';
  const showroomUserId = typeof car?.addedBy === 'string' ? car.addedBy : car?.addedBy?._id || car?.addedBy?.id || '';
  const currentUserId = user?._id || user?.id || '';

  const nImg = visibleGalleryImages.length;
  const activeIdx = Math.min(activeImageIndex, Math.max(nImg - 1, 0));
  const activeImage = visibleGalleryImages[activeIdx] || '';

  const openShowroomProfile = (userId) => {
    if (isMongoId(userId)) navigate('/showrooms/' + userId);
  };

  const markImageBroken = (imageUrl) => {
    if (!imageUrl) return;
    setBrokenImages((current) => {
      if (current[imageUrl]) return current;
      return { ...current, [imageUrl]: true };
    });
  };

  const moveGallery = (direction) => {
    if (visibleGalleryImages.length <= 1) return;
    setActiveImageIndex((current) => {
      const nextIndex = current + direction;
      if (nextIndex < 0) return visibleGalleryImages.length - 1;
      if (nextIndex >= visibleGalleryImages.length) return 0;
      return nextIndex;
    });
  };

  const openGalleryAt = (index) => {
    if (!visibleGalleryImages.length) return;
    setActiveImageIndex(Math.min(Math.max(index, 0), visibleGalleryImages.length - 1));
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
          {/* Main image */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100" style={{ aspectRatio: '16/9' }}>
            {activeImage ? (
              <img
                src={activeImage}
                alt={car.name}
                className="h-full w-full cursor-zoom-in object-cover"
                onClick={() => openGalleryAt(Math.min(activeImageIndex, Math.max(visibleGalleryImages.length - 1, 0)))}
                onError={() => markImageBroken(activeImage)}
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

          {/* Thumbnails */}
          {visibleGalleryImages.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-3 max-[640px]:grid-cols-4 max-[480px]:grid-cols-3">
              {visibleGalleryImages.map((imageUrl, index) => (
                <button
                  key={imageUrl}
                  type="button"
                  className={`overflow-hidden rounded-xl border-2 transition-all ${
                    index === activeImageIndex
                      ? 'border-primary shadow-[0_8px_20px_rgba(0,177,79,0.18)]'
                      : 'border-gray-200 hover:border-primary/60'
                  }`}
                  style={{ aspectRatio: '4/3' }}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img
                    src={imageUrl}
                    alt={`${car.name} ${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={() => markImageBroken(imageUrl)}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Share / favorite */}
          <div className="mb-6 mt-3 flex gap-3">
            <button
              type="button"
              className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-[0.82rem] text-gray-600 transition-colors hover:border-primary hover:text-primary"
              onClick={() =>
                navigator.share?.({ title: document.title, url: window.location.href }) ||
                navigator.clipboard?.writeText(window.location.href)
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
              className={`cursor-pointer rounded-full border bg-white px-4 py-2 text-[0.82rem] transition-colors ${
                liked
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

          {/* Car info panel */}
          <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold text-gray-900">{car.name}</h1>

            <div className="flex flex-wrap gap-3">
              {displayAddress && (
                <span className="flex items-center gap-1 text-[0.85rem] font-medium text-primary">
                  <FaMapMarkerAlt size={12} aria-hidden="true" /> {displayAddress}
                </span>
              )}
              {car.showroom &&
                (showroomUserId ? (
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
                ))}
              <StarRow rating={avgRating} count={tripCount} />
              <span className="flex items-center gap-1 text-[0.85rem] font-semibold text-primary">
                <MdVerified size={15} aria-hidden="true" /> {car.type || car.category}
              </span>
            </div>

            {/* Specs */}
            <div>
              <div className={sectionTitle}>Thông số kỹ thuật</div>
              <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                <SpecItem icon={<MdPeople size={18} />} label="Số chỗ" value={`${car.seats || 5} chỗ`} />
                <SpecItem icon={<MdSettings size={18} />} label="Hộp số" value={car.transmission || 'Số tự động'} />
                <SpecItem
                  icon={
                    car.fuel === 'Điện' ? <BsLightningChargeFill size={16} color="#2196f3" /> : <FaGasPump size={16} />
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

            {/* Location map */}
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

            {/* Description */}
            {car.description && (
              <div>
                <div className={sectionTitle}>Mô tả xe</div>
                <p className="text-[0.875rem] leading-[1.8] text-gray-600">{car.description}</p>
              </div>
            )}

            {/* Amenities */}
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

            {/* Insurance notice */}
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

            {/* Reviews */}
            <CarReviews
              reviews={reviews}
              reviewsMeta={reviewsMeta}
              reviewsLoading={reviewsLoading}
              currentUserId={currentUserId}
            />

            {/* Terms */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 text-[0.88rem] font-bold text-gray-800">Điều khoản</div>
              <div className="flex flex-col gap-0.5 text-[0.8rem] leading-[1.8] text-gray-600">
                {TERMS.map((term, index) => (
                  <p key={index}>– {term}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <BookingCard
          car={car}
          id={id}
          navigate={navigate}
          user={user}
          initialRentalWindow={initialRentalWindow}
          onOpenShowroomProfile={openShowroomProfile}
        />
      </div>

      {/* Gallery modal */}
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
                    className={`overflow-hidden rounded-xl border-2 transition-all ${
                      index === activeImageIndex ? 'border-primary' : 'border-gray-200 hover:border-primary/60'
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