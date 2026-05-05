import React, { useEffect, useState } from 'react';
import { MdDirectionsCar } from 'react-icons/md';
import CarCard from '../CarCard/CarCard';

const shimmerClass = "bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]";

const SkeletonCard = () => (
  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
    <div className={`w-full ${shimmerClass}`} style={{ aspectRatio: '16/10' }} />
    <div className="flex flex-col gap-2.5 p-3.5">
      <div className={`h-3 w-[70%] rounded-md ${shimmerClass}`} />
      <div className={`h-3 w-[45%] rounded-md ${shimmerClass}`} />
      <div className={`h-3 w-[55%] rounded-md ${shimmerClass}`} />
      <div className={`h-5 w-[80%] rounded-md ${shimmerClass}`} />
    </div>
  </div>
);

const CarGrid = ({ cars, loading = false, rentalSearch = null }) => {
  const [visibleCount, setVisibleCount] = useState(8);
  const [displayCars, setDisplayCars] = useState([]);

  useEffect(() => {
    setDisplayCars(cars || []);
    setVisibleCount(8);
  }, [cars]);

  const visible = displayCars.slice(0, visibleCount);
  const hasMore = displayCars.length > visibleCount;

  return (
    <section className="mx-auto max-w-[1280px] px-5 pb-[60px] pt-7">
      <div className="grid grid-cols-4 gap-5 max-[1100px]:grid-cols-3 max-[768px]:grid-cols-2 max-[768px]:gap-3.5 max-[480px]:grid-cols-1">
        {loading
          ? Array(8).fill(0).map((_, index) => <SkeletonCard key={index} />)
          : visible.length > 0
            ? visible.map((car) => <CarCard key={car.id} car={car} rentalSearch={rentalSearch} />)
            : (
              <div className="col-span-full px-5 py-[60px] text-center">
                <div className="mb-4 flex justify-center text-[4rem] opacity-40">
                  <MdDirectionsCar />
                </div>
                <h3 className="mb-2 text-[1.1rem] text-gray-600">Không tìm thấy xe phù hợp</h3>
                <p className="text-[0.85rem] text-gray-400">Hãy thử thay đổi bộ lọc hoặc địa điểm tìm kiếm</p>
              </div>
            )}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-transparent px-8 py-3 text-[0.9rem] font-semibold text-primary transition-all hover:-translate-y-px hover:bg-primary hover:text-white hover:shadow-[0_4px_16px_rgba(0,177,79,0.3)]"
            onClick={() => setVisibleCount((current) => current + 8)}
          >
            Xem thêm xe
            <span>↓</span>
          </button>
        </div>
      )}
    </section>
  );
};

export default CarGrid;
