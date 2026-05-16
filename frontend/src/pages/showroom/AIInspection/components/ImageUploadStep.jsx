import { useEffect, useRef, useState } from 'react';
import { FaCarSide, FaCheckCircle, FaInfoCircle, FaPlus, FaRobot, FaSpinner, FaTimes } from 'react-icons/fa';
import { getVehicleName, getVehicleThumb } from '../aiInspection.helpers';

const MAX_IMAGES = 6;

function ImageUploadStep({
  selectedVehicle,
  selectedBookingId,
  bookings,
  pickupImagesUrls = [],
  initialImages = [],
  analyzing = false,
  analysisError = '',
  isShowroom = false,
  onBack = () => {},
  onAnalyze = () => {},
}) {
  void bookings;
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const prevInitialImagesRef = useRef(null);

  // Load existing return images only. Pickup images stay as BEFORE evidence.
  useEffect(() => {
    const hasChanged =
      !prevInitialImagesRef.current ||
      (prevInitialImagesRef.current.length || 0) !== (initialImages?.length || 0) ||
      (initialImages?.length > 0 && initialImages.some((url, i) => prevInitialImagesRef.current?.[i] !== url));

    if (hasChanged) {
      prevInitialImagesRef.current = initialImages ? [...initialImages] : [];
      if (initialImages && initialImages.length > 0) {
        setImages(initialImages.map((url) => ({ type: 'url', data: url })));
        setPreviews([...initialImages]);
      } else {
        setImages([]);
        setPreviews([]);
      }
    }
  }, [initialImages]);

  const handleAddImage = (e) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > MAX_IMAGES) {
      alert(`Chá»‰ Ä‘Æ°á»£c upload tá»‘i Ä‘a ${MAX_IMAGES} áº£nh`);
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert('Chá»‰ cháº¥p nháº­n file áº£nh');
        return;
      }

      setImages((prev) => [...prev, { type: 'file', data: file }]);

      const reader = new FileReader();
      reader.onload = (evt) => {
        setPreviews((prev) => [...prev, evt.target.result]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    if (isShowroom && images[index]?.type === 'url') {
      return;
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      <div className="flex items-center gap-3 mb-4 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-gray-200">
        {getVehicleThumb(selectedVehicle) ? (
          <img
            src={getVehicleThumb(selectedVehicle)}
            alt=""
            className="w-[52px] h-[38px] object-cover rounded-md border border-gray-200 shrink-0"
          />
        ) : (
          <div className="w-[52px] h-[38px] bg-gray-100 rounded-md flex items-center justify-center shrink-0">
            <FaCarSide className="text-gray-300" />
          </div>
        )}
        <div className="flex-1">
          <div className="font-bold text-[0.9rem] text-gray-900">{getVehicleName(selectedVehicle)}</div>
          <div className="flex gap-2 flex-wrap mt-1">
            {selectedVehicle?.vehicle_plate_number && (
              <span className="code-badge text-[0.72rem]">{selectedVehicle.vehicle_plate_number}</span>
            )}
            {selectedBookingId && (
              <span className="text-[0.7rem] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded font-mono">
                ID: {selectedBookingId}
              </span>
            )}
          </div>
        </div>
      </div>

      {pickupImagesUrls.filter(Boolean).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-blue-800 flex gap-2">
          <FaInfoCircle className="shrink-0 mt-0.5" />
          <span>Đã có {pickupImagesUrls.filter(Boolean).length} ảnh bàn giao để AI đối chiếu với ảnh trả xe.</span>
        </div>
      )}

      {pickupImagesUrls.filter(Boolean).length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Ảnh bàn giao của showroom</span>
            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full">
              BEFORE ({pickupImagesUrls.filter(Boolean).length}/6)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pickupImagesUrls.filter(Boolean).map((url, idx) => (
              <a
                key={`${url}-${idx}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg overflow-hidden border-2 border-blue-200 bg-blue-50 aspect-square"
                title={`Ảnh bàn giao ${idx + 1}`}
              >
                <img src={url} alt={`Ảnh bàn giao ${idx + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>

          <div className="mt-2 text-[0.75rem] text-gray-500">
            Ảnh BEFORE của showroom chỉ để đối chiếu, không thể xóa tại màn hình này.
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-yellow-800 flex gap-2">
          <FaInfoCircle className="shrink-0 mt-0.5" />
          <span>
            Tải lên tối đa <strong>{MAX_IMAGES} ảnh</strong> của xe để phân tích bằng AI. Không cần quan tâm tới vị trí
            ảnh.
          </span>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-emerald-800 flex gap-2">
          <FaCheckCircle className="shrink-0 mt-0.5" />
          <span>
            Đã có <strong>{images.length} ảnh</strong>.{' '}
            {canAddMore ? `Có thể thêm ${MAX_IMAGES - images.length} ảnh nữa.` : 'Đã đạt giới hạn!'}
          </span>
        </div>
      )}

      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">
            Hình ảnh ({images.length}/{MAX_IMAGES})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previews.map((preview, idx) => {
            const lockedExistingImage = isShowroom && images[idx]?.type === 'url';
            return (
              <div
                key={idx}
                className={`relative rounded-lg overflow-hidden border-2 bg-gray-100 aspect-square ${
                  lockedExistingImage ? 'border-cyan-200' : 'group border-gray-200'
                }`}
              >
                <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                {lockedExistingImage ? (
                  <div className="absolute left-2 top-2 rounded-full bg-cyan-100 text-cyan-700 px-2 py-1 text-[0.65rem] font-semibold">
                    Ảnh renter
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Xóa ảnh"
                  >
                    <FaTimes className="text-white text-2xl" />
                  </button>
                )}
              </div>
            );
          })}

          {canAddMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center aspect-square bg-blue-50 hover:bg-blue-100 hover:border-blue-500 transition-all cursor-pointer"
              title={`Thêm ảnh (${MAX_IMAGES - images.length} ảnh còn lại)`}
            >
              <div className="flex flex-col items-center gap-1">
                <FaPlus className="text-blue-500 text-2xl" />
                <span className="text-xs text-blue-600 font-semibold">Thêm</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {analysisError && (
        <div
          role="alert"
          className="mb-3.5 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[0.82rem]"
        >
          {analysisError}
        </div>
      )}

      <div className="flex gap-2.5">
        <button type="button" className="btn-outline" onClick={onBack}>
          &larr; Quay lại
        </button>
        <button
          type="button"
          className="btn-primary disabled:opacity-50"
          onClick={() => onAnalyze(images)}
          disabled={analyzing || images.length === 0}
        >
          {analyzing ? (
            <>
              <FaSpinner className="animate-spin inline mr-1.5" aria-hidden /> Đang phân tích AI...
            </>
          ) : (
            <>
              <FaRobot className="inline mr-1.5" aria-hidden /> Phân tích {images.length} ảnh
            </>
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
        className="hidden"
        onChange={handleAddImage}
      />
    </div>
  );
}

export default ImageUploadStep;
