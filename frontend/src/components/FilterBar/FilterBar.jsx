import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MdClose, MdDirectionsCar, MdFilterList, MdPeople, MdSort } from 'react-icons/md';
import { FaCar, FaGasPump, FaMoneyBillWave } from 'react-icons/fa';
import { lockPageScroll, unlockPageScroll } from '../../utils/scrollLock';

const FILTERS = [
  { id: 'all', label: 'Tất cả', icon: <MdFilterList />, hasPopup: false },
  { id: 'seats', label: 'Số chỗ', icon: <MdPeople />, hasPopup: true },
  { id: 'brand', label: 'Hãng xe', icon: <FaCar />, hasPopup: true },
  { id: 'model', label: 'Mẫu xe', icon: <MdDirectionsCar />, hasPopup: true },
  { id: 'category', label: 'Loại xe', icon: <MdDirectionsCar />, hasPopup: true },
  { id: 'fuel', label: 'Nhiên liệu', icon: <FaGasPump />, hasPopup: true },
  { id: 'price', label: 'Giá', icon: <FaMoneyBillWave />, hasPopup: true },
];

const POPUP_OPTIONS = {
  seats: [
    { value: 'all', label: 'Tất cả' },
    { value: '4', label: '4 chỗ' },
    { value: '5', label: '5 chỗ' },
    { value: '7', label: '7 chỗ' },
  ],
  brand: [
    { value: 'all', label: 'Tất cả' },
    { value: 'Toyota', label: 'Toyota' },
    { value: 'Honda', label: 'Honda' },
    { value: 'Hyundai', label: 'Hyundai' },
    { value: 'Kia', label: 'Kia' },
    { value: 'Mazda', label: 'Mazda' },
    { value: 'VinFast', label: 'VinFast' },
    { value: 'Ford', label: 'Ford' },
    { value: 'MG', label: 'MG' },
  ],
  model: [
    { value: 'all', label: 'Tất cả' },
    { value: 'So tu dong', label: 'Số tự động' },
    { value: 'So san', label: 'Số sàn' },
  ],
  category: [
    { value: 'all', label: 'Tất cả' },
    { value: 'Sedan', label: 'Sedan' },
    { value: 'Hatchback', label: 'Hatchback' },
    { value: 'SUV', label: 'SUV' },
    { value: 'Crossover', label: 'Crossover' },
    { value: 'MPV', label: 'MPV' },
    { value: 'Coupe', label: 'Coupe' },
    { value: 'Convertible', label: 'Convertible' },
    { value: 'Limousine', label: 'Limousine' },
  ],
  fuel: [
    { value: 'all', label: 'Tất cả' },
    { value: 'Xang', label: 'Xăng' },
    { value: 'Dien', label: 'Điện' },
    { value: 'Dau', label: 'Dầu' },
  ],
  sort: [
    { value: 'all', label: 'Mặc định' },
    { value: 'price_asc', label: 'Giá từ thấp đến cao' },
    { value: 'price_desc', label: 'Giá từ cao đến thấp' },
  ],
};

const POPUP_TITLES = {
  seats: 'Số chỗ',
  brand: 'Hãng xe',
  model: 'Mẫu xe',
  category: 'Loại xe',
  fuel: 'Nhiên liệu',
  price: 'Khoảng giá',
  sort: 'Sắp xếp',
};

const DEFAULT_SELECTIONS = {
  seats: 'all',
  brand: 'all',
  model: 'all',
  category: 'all',
  fuel: 'all',
  sort: 'all',
  priceMin: '',
  priceMax: '',
};

const FilterBar = ({ onFilter, onSort }) => {
  const [openPopup, setOpenPopup] = useState(null);
  const popupRef = useRef(null);
  const [selections, setSelections] = useState(DEFAULT_SELECTIONS);
  const [tempSelection, setTempSelection] = useState('all');
  const [tempPrice, setTempPrice] = useState({ priceMin: '', priceMax: '' });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setOpenPopup(null);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpenPopup(null);
    };
    if (openPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openPopup]);

  useEffect(() => {
    if (!openPopup) {
      return undefined;
    }
    lockPageScroll();
    return () => unlockPageScroll();
  }, [openPopup]);

  useEffect(() => {
    if (!openPopup) {
      return undefined;
    }
    lockPageScroll();
    return () => unlockPageScroll();
  }, [openPopup]);

  const hasAnyFilter = useMemo(
    () => Object.entries(selections).some(([key, value]) => key !== 'sort' && value !== 'all' && value !== ''),
    [selections]
  );

  const openModal = (id) => {
    setOpenPopup(id);

    if (id === 'price') {
      setTempPrice({
        priceMin: selections.priceMin || '',
        priceMax: selections.priceMax || '',
      });
      return;
    }

    setTempSelection(selections[id] || 'all');
  };

  const handleChipClick = (filter) => {
    if (!filter.hasPopup) {
      setSelections(DEFAULT_SELECTIONS);
      setOpenPopup(null);
      onFilter?.('all');
      onSort?.('all');
      return;
    }

    openModal(filter.id);
  };

  const handleSortClick = () => {
    openModal('sort');
  };

  const handleApply = () => {
    if (!openPopup) {
      return;
    }

    if (openPopup === 'sort') {
      const next = { ...selections, sort: tempSelection };
      setSelections(next);
      setOpenPopup(null);
      onSort?.(tempSelection);
      return;
    }

    if (openPopup === 'price') {
      const next = {
        ...selections,
        priceMin: tempPrice.priceMin,
        priceMax: tempPrice.priceMax,
      };
      setSelections(next);
      setOpenPopup(null);
      onFilter?.(next);
      return;
    }

    const next = { ...selections, [openPopup]: tempSelection };
    setSelections(next);
    setOpenPopup(null);
    onFilter?.(next);
  };

  const handleClearCurrent = () => {
    if (!openPopup) {
      return;
    }

    if (openPopup === 'sort') {
      setSelections((current) => ({ ...current, sort: 'all' }));
      setTempSelection('all');
      onSort?.('all');
      setOpenPopup(null);
      return;
    }

    if (openPopup === 'price') {
      const next = { ...selections, priceMin: '', priceMax: '' };
      setSelections(next);
      setTempPrice({ priceMin: '', priceMax: '' });
      onFilter?.(next);
      setOpenPopup(null);
      return;
    }

    const next = { ...selections, [openPopup]: 'all' };
    setSelections(next);
    setTempSelection('all');
    onFilter?.(next);
    setOpenPopup(null);
  };

  const isChipSelected = (id) => {
    if (id === 'all') {
      return !hasAnyFilter && selections.sort === 'all';
    }

    if (id === 'price') {
      return Boolean(selections.priceMin || selections.priceMax);
    }

    return selections[id] && selections[id] !== 'all';
  };

  const chipBase = 'flex items-center gap-1.5 px-4 py-2 rounded-full border text-[0.82rem] font-medium cursor-pointer transition-all whitespace-nowrap';
  const chipActive = 'bg-primary text-white border-primary shadow-sm';
  const chipDefault = 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary';

  return (
    <div className="relative bg-white border-b border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] z-[50]">
      <div className="max-w-[1280px] mx-auto px-5 py-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            className={`${chipBase} ${isChipSelected(filter.id) ? chipActive : chipDefault}`}
            onClick={() => handleChipClick(filter)}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
        <button
          className={`${chipBase} ${selections.sort !== 'all' ? chipActive : chipDefault}`}
          onClick={handleSortClick}
        >
          <MdSort />
          Sắp xếp
        </button>
      </div>

      {openPopup && (
        <div className="fixed inset-0 z-[9998] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setOpenPopup(null)}>
          <div
            ref={popupRef}
            className="w-full max-w-[420px] bg-white rounded-[28px] shadow-[0_28px_90px_rgba(0,0,0,0.22)] border border-white/70 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-[1.05rem] font-bold text-gray-900">{POPUP_TITLES[openPopup]}</h3>
              <button
                className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-500 flex items-center justify-center hover:text-gray-900 hover:border-gray-300 transition-colors"
                onClick={() => setOpenPopup(null)}
              >
                <MdClose size={22} />
              </button>
            </div>

            {openPopup === 'price' ? (
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.75rem] font-semibold text-gray-500 uppercase tracking-wide mb-2">Gia tu</label>
                    <input
                      type="number"
                      min="0"
                      value={tempPrice.priceMin}
                      onChange={(event) => setTempPrice((current) => ({ ...current, priceMin: event.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary"
                      placeholder="Ví dụ: 500"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-semibold text-gray-500 uppercase tracking-wide mb-2">Gia den</label>
                    <input
                      type="number"
                      min="0"
                      value={tempPrice.priceMax}
                      onChange={(event) => setTempPrice((current) => ({ ...current, priceMax: event.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary"
                      placeholder="Ví dụ: 1500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 max-h-[320px] overflow-y-auto">
                <div className="flex flex-col gap-3">
                  {POPUP_OPTIONS[openPopup]?.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`w-full flex items-center gap-4 rounded-[18px] border px-4 py-4 text-left transition-all ${tempSelection === option.value
                        ? 'border-[#4fd1a5] bg-[#ecfbf5] text-gray-900 shadow-[0_8px_24px_rgba(0,177,79,0.10)]'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40'
                        }`}
                      onClick={() => setTempSelection(option.value)}
                    >
                      <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${tempSelection === option.value ? 'border-primary' : 'border-gray-300'
                        }`}>
                        {tempSelection === option.value && (
                          <span className="w-3 h-3 rounded-full bg-primary block" />
                        )}
                      </span>
                      <span className="text-[0.98rem] font-semibold">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-6 py-5 border-t border-gray-100 flex items-center gap-3">
              <button
                type="button"
                className="flex-1 rounded-2xl border border-gray-200 py-3 font-semibold text-gray-600 hover:border-gray-300"
                onClick={handleClearCurrent}
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                className="flex-1 rounded-2xl bg-primary py-3 font-bold text-white shadow-[0_12px_28px_rgba(0,177,79,0.25)]"
                onClick={handleApply}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
