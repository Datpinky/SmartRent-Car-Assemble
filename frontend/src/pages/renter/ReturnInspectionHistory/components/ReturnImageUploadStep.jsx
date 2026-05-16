import { useEffect, useRef, useState } from 'react';
import { FaCarSide, FaCheckCircle, FaInfoCircle, FaPlus, FaRobot, FaSpinner, FaTimes } from 'react-icons/fa';
import { ACCEPTED_IMAGE_INPUT_ACCEPT, isAcceptedImageFile } from '../../../../utils/acceptedImageTypes';
import { getVehicleName, getVehicleThumb } from '../../../showroom/AIInspection/aiInspection.helpers';

const MAX_IMAGES = 6;

/**
 * Component upload ảnh trả xe cho renter
 * - Simple gallery for uploading return images (max 6)
 * - No position requirements
 * - Direct AI analysis
 */
function ReturnImageUploadStep({
  selectedBooking,
  pickupImagesUrls = [],
  initialImages = [],
  analyzing = false,
  analysisError = '',
  onBack = () => {},
  onAnalyze = () => {},
}) {
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const prevInitialImagesRef = useRef(null);

  // Load existing return images only. Pickup images are BEFORE evidence, not editable return uploads.
  useEffect(() => {
    // Only update if initialImages content actually changed (not just reference)
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
      alert(`Chỉ được upload tối đa ${MAX_IMAGES} ảnh`);
      return;
    }

    files.forEach((file) => {
      if (!isAcceptedImageFile(file)) {
        alert('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP. SVG không được hỗ trợ.');
        return;
      }

      setImages((prev) => [...prev, { type: 'file', data: file }]);

      // Create preview
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPreviews((prev) => [...prev, evt.target.result]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const canAddMore = images.length < MAX_IMAGES;
  const hasSomeImages = images.length > 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      {/* Vehicle info bar */}
      <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
        {getVehicleThumb(selectedBooking?.vehicle_id) ? (
          <img
            src={getVehicleThumb(selectedBooking?.vehicle_id)}
            alt=""
            className="w-16 h-12 object-cover rounded-lg border border-blue-200 shrink-0"
          />
        ) : (
          <div className="w-16 h-12 bg-blue-200 rounded-lg flex items-center justify-center shrink-0">
            <FaCarSide className="text-blue-500 text-xl" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-gray-900">
            {getVehicleName(selectedBooking?.vehicle_id) ||
              selectedBooking?.vehicleName ||
              selectedBooking?.vehicle_name ||
              'Xe'}
          </div>
          {(selectedBooking?.vehicle_id?.vehicle_plate || selectedBooking?.vehicle_plate || selectedBooking?.plate) && (
            <div className="text-xs text-gray-600 mt-1">
              {selectedBooking?.vehicle_id?.vehicle_plate || selectedBooking?.vehicle_plate || selectedBooking?.plate}
            </div>
          )}
        </div>
      </div>

      {/* Info message */}
      {pickupImagesUrls.filter(Boolean).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-blue-800 flex gap-2">
          <FaInfoCircle className="shrink-0 mt-0.5" />
          <span>Đã có {pickupImagesUrls.filter(Boolean).length} ảnh bàn giao để AI đối chiếu với ảnh trả xe.</span>
        </div>
      )}

      {pickupImagesUrls.filter(Boolean).length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Anh ban giao tu showroom</span>
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
                title={`Anh ban giao ${idx + 1}`}
              >
                <img src={url} alt={`Anh ban giao ${idx + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {hasSomeImages ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-emerald-800 flex gap-2">
          <FaCheckCircle className="shrink-0 mt-0.5" />
          <span>
            Đã có <strong>{images.length} ảnh</strong>.{' '}
            {canAddMore ? `Có thể thêm ${MAX_IMAGES - images.length} ảnh nữa.` : 'Đã đạt giới hạn!'}
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-amber-800 flex gap-2">
          <FaInfoCircle className="shrink-0 mt-0.5" />
          <span>
            <strong>Tải lên tối đa {MAX_IMAGES} ảnh</strong> của xe khi trả để phân tích bằng AI. Không cần quan tâm tới
            vị trí ảnh.
          </span>
        </div>
      )}

      {/* Image gallery */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">
            Hình ảnh ({images.length}/{MAX_IMAGES})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Image cards */}
          {previews.map((preview, idx) => (
            <div
              key={idx}
              className="relative group rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 aspect-square"
            >
              <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="Xóa ảnh"
              >
                <FaTimes className="text-white text-2xl" />
              </button>
            </div>
          ))}

          {/* Add button */}
          {canAddMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-green-400 rounded-lg flex items-center justify-center aspect-square bg-green-50 hover:bg-green-100 hover:border-green-500 transition-all cursor-pointer"
              title={`Thêm ảnh (${MAX_IMAGES - images.length} ảnh còn lại)`}
            >
              <div className="flex flex-col items-center gap-1">
                <FaPlus className="text-green-500 text-2xl" />
                <span className="text-xs text-green-600 font-semibold">Thêm</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {analysisError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-red-700 flex gap-2">
          <FaInfoCircle className="shrink-0 mt-0.5" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={analyzing}
          type="button"
          className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all"
        >
          ← Quay lại
        </button>

        <button
          onClick={() => onAnalyze(images)}
          disabled={!hasSomeImages || analyzing}
          type="button"
          className={`flex-1 px-5 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
            hasSomeImages && !analyzing
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {analyzing ? <FaSpinner className="animate-spin" /> : <FaRobot />}
          {analyzing ? 'Đang phân tích...' : `Phân tích ${images.length} ảnh`}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
        className="hidden"
        onChange={handleAddImage}
      />
    </div>
  );
}

export default ReturnImageUploadStep;
