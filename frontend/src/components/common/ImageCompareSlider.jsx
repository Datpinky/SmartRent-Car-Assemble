import React, { useState, useRef, useCallback } from 'react';
import { FaArrowsAltH } from 'react-icons/fa';
import { MdWarning } from 'react-icons/md';

const ImageCompareSlider = ({ beforeSrc, afterSrc, damages = [], onDamageClick }) => {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState(null);
  const containerRef = useRef();

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPosition(x);
  }, []);

  const onMouseDown = (e) => { setDragging(true); e.preventDefault(); };
  const onMouseMove = useCallback((e) => { if (dragging) updatePosition(e.clientX); }, [dragging, updatePosition]);
  const onMouseUp = useCallback(() => setDragging(false), []);
  const onTouchMove = useCallback((e) => { if (dragging) updatePosition(e.touches[0].clientX); }, [dragging, updatePosition]);

  const handleDamageClick = (dmg, e) => {
    e.stopPropagation();
    setSelectedDamage(selectedDamage?.id === dmg.id ? null : dmg);
    if (onDamageClick) onDamageClick(dmg);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden bg-[#111] cursor-col-resize select-none"
        style={{ aspectRatio: '16/9' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
      >
        {/* Before image */}
        <div className="absolute inset-0">
          {beforeSrc
            ? <img src={beforeSrc} alt="Trước" className="w-full h-full object-cover block" />
            : <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-[0.9rem]">Ảnh trước thuê</div>
          }
          <div className="absolute top-3 left-3 py-1 px-2.5 rounded-full text-[0.72rem] font-bold tracking-widest bg-black/60 text-white">TRƯỚC</div>
        </div>

        {/* After image (clipped) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
          {afterSrc
            ? <img src={afterSrc} alt="Sau" className="w-full h-full object-cover block" />
            : <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-[0.9rem]">Ảnh sau thuê</div>
          }
          <div className="absolute top-3 right-3 py-1 px-2.5 rounded-full text-[0.72rem] font-bold tracking-widest bg-primary/85 text-white">SAU</div>
          {damages.map(dmg => (
            <div
              key={dmg.id}
              className={`absolute border-[2.5px] border-red-500 rounded-md flex items-center justify-center cursor-pointer transition-all animate-[damagePulse_1.5s_ease-in-out_infinite]
                ${selectedDamage?.id === dmg.id ? 'bg-red-500/30 border-red-600' : 'bg-red-500/15 hover:bg-red-500/30'}`}
              style={{ left: `${dmg.x}%`, top: `${dmg.y}%`, width: `${dmg.w || 8}%`, height: `${dmg.h || 8}%` }}
              onClick={(e) => handleDamageClick(dmg, e)}
            >
              <MdWarning className="text-red-500 text-base" />
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10 -translate-x-1/2"
          style={{ left: `${position}%` }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-col-resize shadow-[0_2px_8px_rgba(0,0,0,0.3)] text-gray-700 text-[0.9rem] transition-colors hover:bg-primary hover:text-white"
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
          >
            <FaArrowsAltH />
          </div>
        </div>
      </div>

      {selectedDamage && (
        <div className="bg-white border-[1.5px] border-yellow-200 rounded-xl p-3.5 text-[0.82rem]">
          <div className="flex items-center gap-1.5 font-semibold text-gray-900 mb-2.5">
            <MdWarning style={{ color: '#d97706' }} />
            <span>{selectedDamage.label || 'Hư hỏng được phát hiện'}</span>
            <button className="ml-auto text-gray-400 px-1 hover:text-gray-600" onClick={() => setSelectedDamage(null)}>×</button>
          </div>
          <div className="flex flex-col gap-1.5 text-gray-700">
            <div><b>Vị trí:</b> {selectedDamage.location || 'Xem trên ảnh'}</div>
            <div>
              <b>Mức độ:</b>{' '}
              <span style={{ color: selectedDamage.severity === 'high' ? '#dc2626' : selectedDamage.severity === 'medium' ? '#d97706' : '#059669' }}>
                {selectedDamage.severityLabel || selectedDamage.severity || 'Nhẹ'}
              </span>
            </div>
            {selectedDamage.description && <div><b>Mô tả:</b> {selectedDamage.description}</div>}
            {selectedDamage.cost && <div><b>Chi phí dự kiến:</b> {selectedDamage.cost}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCompareSlider;
