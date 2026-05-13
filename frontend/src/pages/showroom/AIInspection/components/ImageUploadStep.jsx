import { FaCarSide, FaCheckCircle, FaInfoCircle, FaRobot, FaSpinner } from 'react-icons/fa';
import { POSITIONS, getVehicleName, getVehicleThumb } from '../aiInspection.helpers';
import FileSlot from './FileSlot';
import UrlSlot from './UrlSlot';

function ImageUploadStep({
  selectedVehicle,
  pickupImagesUrls,
  posFiles,
  onSetPosFile,
  validPositions,
  readyToAnalyze,
  analyzing,
  analysisError,
  onBack,
  onAnalyze,
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      {/* Vehicle info bar */}
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
        <div>
          <div className="font-bold text-[0.9rem] text-gray-900">{getVehicleName(selectedVehicle)}</div>
          {selectedVehicle?.vehicle_plate_number && (
            <span className="code-badge text-[0.72rem]">{selectedVehicle.vehicle_plate_number}</span>
          )}
        </div>
      </div>

      {/* Notice banner */}
      {pickupImagesUrls.length > 0 ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-emerald-800 flex gap-2">
          <FaCheckCircle className="shrink-0 mt-0.5" />
          <span>
            <strong>Co {pickupImagesUrls.length} anh ban giao tu luc cho muon xe.</strong> Anh TRUOC da duoc tu dong
            dien — chi can tai anh SAU cho tung vi tri.
          </span>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3.5 py-2.5 mb-4 text-sm text-yellow-800 flex gap-2">
          <FaInfoCircle className="shrink-0 mt-0.5" />
          <span>
            Chup anh cung goc cho moi vi tri. Can <strong>it nhat 1 vi tri</strong> co du hai anh (TRUOC + SAU) de phan
            tich.
          </span>
        </div>
      )}

      {/* Position grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 mb-5">
        {POSITIONS.map((pos, posIdx) => {
          const files = posFiles[pos.key];
          const pickupUrl = pickupImagesUrls[posIdx];
          const hasBefore = !!(pickupUrl || files.before);
          const complete = hasBefore && !!files.after;
          return (
            <div
              key={pos.key}
              className={`rounded-xl p-3 border-[1.5px] ${complete ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{pos.icon}</span>
                  <span className="font-bold text-[0.88rem] text-gray-900">{pos.label}</span>
                </div>
                {complete ? (
                  <span className="text-[0.7rem] text-green-600 font-semibold flex items-center gap-1">
                    <FaCheckCircle /> Du 2 anh
                  </span>
                ) : (
                  <span
                    className={`text-[0.7rem] ${hasBefore || files.after ? 'text-amber-500' : 'text-gray-300'}`}
                  >
                    {hasBefore || files.after ? '1/2 anh' : 'Chua tai'}
                  </span>
                )}
              </div>
              <div className="flex gap-2.5">
                {pickupUrl ? (
                  <UrlSlot label="khi giao xe" url={pickupUrl} />
                ) : (
                  <FileSlot
                    label="khi giao xe"
                    hint={pos.hint}
                    file={files.before}
                    onFile={(f) => onSetPosFile(pos.key, 'before', f)}
                    type="before"
                  />
                )}
                <FileSlot
                  label="khi nhan lai"
                  hint={pos.hint}
                  file={files.after}
                  onFile={(f) => onSetPosFile(pos.key, 'after', f)}
                  type="after"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress summary */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3.5 py-2 mb-3.5">
        <span className="text-[0.82rem] text-gray-700">Vi tri du anh:</span>
        <span className={`font-bold text-[0.85rem] ${readyToAnalyze ? 'text-emerald-600' : 'text-red-600'}`}>
          {validPositions.length} / {POSITIONS.length}
        </span>
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
          &larr; Quay lai
        </button>
        <button
          type="button"
          className="btn-primary disabled:opacity-50 min-w-[200px]"
          onClick={onAnalyze}
          disabled={analyzing || !readyToAnalyze}
        >
          {analyzing ? (
            <>
              <FaSpinner className="animate-spin inline mr-1.5" aria-hidden /> Dang phan tich AI...
            </>
          ) : (
            <>
              <FaRobot className="inline mr-1.5" aria-hidden /> Phan tich {validPositions.length} vi tri
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ImageUploadStep;
