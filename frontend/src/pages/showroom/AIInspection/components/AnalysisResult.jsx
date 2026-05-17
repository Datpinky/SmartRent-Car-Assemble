import { FaCheckCircle, FaExclamationTriangle, FaImage } from 'react-icons/fa';
import { MdWarning } from 'react-icons/md';
import StatusBadge from '../../../../components/common/StatusBadge';
import { SEVERITY_LABEL, severityToBadge } from '../aiInspection.helpers';

function ImageWithRegions({ imageUrl, title, regions = [] }) {
  if (!imageUrl) return null;
  return (
    <div className="space-y-2">
      <div className="text-[0.72rem] font-semibold text-gray-600">{title}</div>
      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 max-w-md">
        <img src={imageUrl} alt="" className="w-full h-auto object-contain block max-h-64" />
        {regions.map((reg, idx) => (
          <div
            key={idx}
            className="absolute border-2 border-amber-500 bg-amber-500/15 pointer-events-none"
            style={{
              left: `${reg.x * 100}%`,
              top: `${reg.y * 100}%`,
              width: `${reg.width * 100}%`,
              height: `${reg.height * 100}%`,
            }}
            title={`Vùng ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function AnalysisResult({
  analysisResult,
  saveNote,
  onReset,
  mode = 'default',
  pickupImageUrls = [],
  afterImageUrls = [],
  onConfirm,
  analyzing = false,
  confirming = false,
}) {
  const isShowroomReturn = mode === 'showroom-return';

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      <div
        className={`flex items-center gap-3.5 mb-5 rounded-xl px-4 py-3.5 border ${
          analysisResult.damage_detected ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-300'
        }`}
      >
        {analysisResult.damage_detected ? (
          <MdWarning className="text-amber-500 text-3xl shrink-0" />
        ) : (
          <FaCheckCircle className="text-emerald-600 text-3xl shrink-0" />
        )}
        <div>
          <div className="font-bold text-base text-gray-900">
            {analysisResult.damage_detected
              ? 'AI ghi nhận có dấu hiệu hư hỏng mới trên xe'
              : 'AI không ghi nhận hư hỏng mới rõ rệt'}
          </div>
          <div className="text-[0.8rem] text-gray-500 mt-1.5 flex items-center gap-2 flex-wrap">
            Mức độ tổng thể của các hư hỏng mới được AI phát hiện:
            <StatusBadge
              status={severityToBadge(analysisResult.severity)}
              customLabel={SEVERITY_LABEL[analysisResult.severity] || analysisResult.severity}
            />
          </div>
        </div>
      </div>

      {analysisResult.summary && (
        <div className="mb-4 text-[0.88rem] text-gray-700 leading-relaxed px-3.5 py-2.5 bg-slate-50 rounded-lg">
          <strong>Tóm tắt:</strong> {analysisResult.summary}
        </div>
      )}

      {Array.isArray(analysisResult.observations) && analysisResult.observations.length > 0 && (
        <div className="mb-4">
          <div className="font-bold text-[0.88rem] text-gray-700 mb-2.5">Chi tiết AI</div>
          <div className="flex flex-col gap-3">
            {analysisResult.observations.map((obs, i) => {
              const regs = Array.isArray(obs.regions) ? obs.regions : [];
              return (
                <div
                  key={i}
                  className={`rounded-xl px-3.5 py-3 border ${
                    obs.likely_new_damage ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <div className="font-bold text-[0.85rem] text-gray-900 flex items-center gap-1.5">
                      {obs.area || 'Khu vực chưa xác định'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {obs.likely_new_damage ? (
                        <FaExclamationTriangle className="text-amber-500 text-[0.85rem]" />
                      ) : (
                        <FaCheckCircle className="text-emerald-600 text-[0.85rem]" />
                      )}
                      <StatusBadge
                        status={severityToBadge(obs.severity_level)}
                        customLabel={SEVERITY_LABEL[obs.severity_level] || obs.severity_level || 'N/A'}
                      />
                    </div>
                  </div>
                  <div className="text-[0.8rem] text-gray-700">{obs.description}</div>
                  {obs.evidence && <div className="text-[0.75rem] text-gray-500 mt-1">{obs.evidence}</div>}

                  {regs.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-4">
                      {regs.map((r, ri) => {
                        const url =
                          r.image_group === 'before'
                            ? pickupImageUrls[r.image_index]
                            : afterImageUrls[r.image_index];
                        if (!url) return null;
                        return (
                          <ImageWithRegions
                            key={`${i}-${ri}`}
                            imageUrl={url}
                            title={`${r.image_group === 'before' ? 'BEFORE' : 'AFTER'} ảnh #${r.image_index + 1}`}
                            regions={[r]}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[0.72rem] text-gray-500 mt-2 flex items-center gap-1">
                      <FaImage className="shrink-0 opacity-60" />
                      Không có tọa độ vùng từ AI — chỉ hiển thị mô tả.
                    </div>
                  )}

                  {obs.needs_manual_review && (
                    <div className="text-[0.75rem] text-amber-700 font-semibold mt-1">Cần kiểm tra thủ công</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analysisResult.conclusion && (
        <div className="mb-3.5 px-3.5 py-2.5 bg-slate-50 rounded-xl text-[0.85rem] text-slate-700">
          <strong>Kết luận:</strong> {analysisResult.conclusion}
        </div>
      )}

      {analysisResult.disclaimer && (
        <div className="mb-4 text-[0.73rem] text-slate-500 italic leading-relaxed">{analysisResult.disclaimer}</div>
      )}

      {saveNote && (
        <div
          className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3"
          role="status"
        >
          {saveNote}
        </div>
      )}

      {isShowroomReturn && (
        <div className="mt-4">
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={onConfirm} disabled={analyzing || confirming || !onConfirm}>
            {confirming ? 'Đang xác nhận...' : 'Xác nhận kết quả & hoàn tất trả xe'}
          </button>
        </div>
      )}

      {!isShowroomReturn && (
        <button type="button" className="btn-outline mt-2" onClick={onReset}>
          &larr; Kiểm tra mới
        </button>
      )}
      {isShowroomReturn && onReset && (
        <button type="button" className="btn-outline mt-3" onClick={onReset} disabled={analyzing || confirming}>
          &larr; Về bước ảnh
        </button>
      )}
    </div>
  );
}

export default AnalysisResult;
