import { useEffect, useRef, useState } from 'react';
import { FaCarSide, FaCheckCircle, FaCloudUploadAlt, FaInfoCircle, FaRobot, FaSpinner } from 'react-icons/fa';
import { POSITIONS, getVehicleName, getVehicleThumb } from '../../../showroom/AIInspection/aiInspection.helpers';

/**
 * Component upload ảnh trả xe cho renter
 * - Hiển thị ảnh trước từ showroom (nếu có)
 * - Cho phép renter upload ảnh sau
 * - Chỉ cho dùng AI nếu showroom có ảnh trước
 */
function ReturnImageUploadStep({
  selectedBooking,
  pickupImagesUrls = [], // ảnh trước từ showroom (6 vị trí)
  posFiles = {},
  onSetPosFile = () => {},
  validPositions = [],
  readyToAnalyze = false,
  analyzing = false,
  analysisError = '',
  onBack = () => {},
  onAnalyze = () => {},
}) {
  const canUseAI = pickupImagesUrls.length > 0;
  const hasSomeShowroomImages = pickupImagesUrls.some((url) => !!url);

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
      {hasSomeShowroomImages ? (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg px-4 py-3 mb-4 text-sm text-blue-900 flex gap-3">
          <FaInfoCircle className="shrink-0 mt-0.5 text-blue-500" />
          <span>
            <strong>✓ Đã có ảnh trước.</strong> Bạn chỉ cần upload ảnh sau để có thể dùng AI phân tích.
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg px-4 py-3 mb-4 text-sm text-amber-900 flex gap-3">
          <FaInfoCircle className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>⚠️ Chưa có ảnh trước.</strong> Bạn có thể upload ảnh để lưu bằng chứng, nhưng không thể dùng AI phân
            tích.
          </span>
        </div>
      )}

      {/* Position grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {POSITIONS.map((pos, posIdx) => {
          const files = posFiles[pos.key] || { after: null };
          const pickupUrl = pickupImagesUrls[posIdx];
          const hasBeforeUrl = !!pickupUrl;
          const hasAfterFile = !!files.after;
          const complete = hasBeforeUrl && hasAfterFile;

          return (
            <div
              key={pos.key}
              className={`rounded-xl p-4 border-2 transition-all ${complete ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{pos.icon}</span>
                  <span className="font-bold text-sm text-gray-900">{pos.label}</span>
                </div>
                {complete ? (
                  <span className="text-xs font-semibold text-white bg-green-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <FaCheckCircle /> OK
                  </span>
                ) : (
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hasBeforeUrl || hasAfterFile ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {hasBeforeUrl && hasAfterFile ? '✓' : hasBeforeUrl || hasAfterFile ? '◐' : '○'}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {/* Before image from showroom */}
                <div className="flex-1 min-w-0">
                  <div className="text-center mb-2">
                    <span className="inline-block font-bold text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                      Trước
                    </span>
                  </div>
                  {hasBeforeUrl ? (
                    <a href={pickupUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={pickupUrl}
                        alt="before"
                        className="w-full h-32 object-cover rounded-lg border-2 border-blue-300 hover:border-blue-500 transition-all cursor-pointer"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-center">
                      <span className="text-xs text-gray-400">Chưa có</span>
                    </div>
                  )}
                </div>

                {/* After image upload from renter */}
                <div className="flex-1 min-w-0">
                  <div className="text-center mb-2">
                    <span className="inline-block font-bold text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      Sau
                    </span>
                  </div>
                  <UploadSlot
                    label="Sau khi trả xe"
                    hint={pos.hint}
                    file={files.after}
                    onFile={(f) => onSetPosFile(pos.key, 'after', f)}
                    type="after"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress summary */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg px-4 py-3 mb-4 border border-emerald-200">
        <span className="text-sm font-semibold text-gray-700">Tiến độ:</span>
        <span className={`font-bold text-lg ${readyToAnalyze ? 'text-emerald-600' : 'text-orange-500'}`}>
          {validPositions.length} / {POSITIONS.length}
        </span>
      </div>
      {analysisError && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg px-4 py-3 mb-4 text-sm text-red-900 flex gap-3">
          <FaInfoCircle className="shrink-0 mt-0.5 text-red-500" />
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

        {canUseAI ? (
          <button
            onClick={onAnalyze}
            disabled={!readyToAnalyze || analyzing}
            type="button"
            className={`flex-1 px-5 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              readyToAnalyze && !analyzing
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {analyzing ? <FaSpinner className="animate-spin" /> : <FaRobot />}
            {analyzing ? 'Đang phân tích...' : 'Kiểm tra AI'}
          </button>
        ) : (
          <button
            onClick={() => {
              if (validPositions.length > 0) {
                onAnalyze();
              }
            }}
            disabled={validPositions.length === 0 || analyzing}
            type="button"
            className={`flex-1 px-5 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              validPositions.length > 0 && !analyzing
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {analyzing ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
            {analyzing ? 'Đang lưu...' : 'Lưu bằng chứng'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Component upload slot cho ảnh sau (renter upload)
 */
function UploadSlot({ label, hint, file, onFile, type }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const isAfter = type === 'after';

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = file.type?.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPreview(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="flex-1 min-w-0">
      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt={label}
            className="w-full h-32 object-cover rounded-lg border-2 border-green-300 shadow-md"
          />
          <button
            type="button"
            onClick={() => {
              inputRef.current?.click();
            }}
            className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg flex items-center justify-center transition-opacity"
            title="Thay ảnh"
          >
            <div className="flex flex-col items-center gap-2">
              <FaCloudUploadAlt className="text-white text-2xl" />
              <span className="text-white text-xs font-semibold">Thay ảnh</span>
            </div>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            inputRef.current?.click();
          }}
          title={`Tải ảnh ${label}`}
          className={`w-full h-32 border-2 border-dashed rounded-lg cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${
            isAfter
              ? 'border-green-400 bg-green-50 hover:bg-green-100 hover:border-green-500'
              : 'border-blue-400 bg-blue-50 hover:bg-blue-100 hover:border-blue-500'
          }`}
        >
          <FaCloudUploadAlt className={`text-3xl ${isAfter ? 'text-green-500' : 'text-blue-500'}`} />
          <span className="text-xs text-gray-600 text-center px-2 font-medium">{hint}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

export default ReturnImageUploadStep;
