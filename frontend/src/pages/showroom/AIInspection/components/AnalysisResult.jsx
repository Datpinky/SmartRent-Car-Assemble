import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { MdWarning } from 'react-icons/md';
import StatusBadge from '../../../../components/common/StatusBadge';
import { POSITIONS, SEVERITY_LABEL, severityToBadge } from '../aiInspection.helpers';

function AnalysisResult({ analysisResult, saveNote, onReset }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      {/* Summary banner */}
      <div
        className={`flex items-center gap-3.5 mb-5 rounded-xl px-4 py-3.5 border ${
          analysisResult.damage_detected ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-300'
        }`}
      >
        {analysisResult.damage_detected ? (
          <MdWarning className="text-amber-500 text-3xl shrink-0" />
        ) : (
          <FaCheckCircle className="text-emerald-600 text-2xl shrink-0" />
        )}
        <div>
          <div className="font-bold text-base text-gray-900">
            {analysisResult.damage_detected
              ? 'AI ghi nhan kha nang co hu hong moi'
              : 'AI khong ghi nhan hu hong moi ro ret'}
          </div>
          <div className="text-[0.8rem] text-gray-500 mt-1.5 flex items-center gap-2">
            Muc do tong the:
            <StatusBadge
              status={severityToBadge(analysisResult.severity)}
              customLabel={SEVERITY_LABEL[analysisResult.severity] || analysisResult.severity}
            />
          </div>
        </div>
      </div>

      {analysisResult.summary && (
        <div className="mb-4 text-[0.88rem] text-gray-700 leading-relaxed px-3.5 py-2.5 bg-slate-50 rounded-lg">
          <strong>Tom tat:</strong> {analysisResult.summary}
        </div>
      )}

      {Array.isArray(analysisResult.positions) && analysisResult.positions.length > 0 && (
        <div className="mb-4">
          <div className="font-bold text-[0.88rem] text-gray-700 mb-2.5">Chi tiet theo vi tri</div>
          <div className="flex flex-col gap-2">
            {analysisResult.positions.map((pos, i) => {
              const posInfo = POSITIONS.find((p) => p.label === pos.position || p.key === pos.position_key);
              return (
                <div
                  key={i}
                  className={`rounded-xl px-3.5 py-3 border ${
                    pos.damage_detected ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-bold text-[0.85rem] text-gray-900 flex items-center gap-1.5">
                      {posInfo && <span>{posInfo.icon}</span>}
                      {pos.position}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {pos.damage_detected ? (
                        <FaExclamationTriangle className="text-amber-500 text-[0.85rem]" />
                      ) : (
                        <FaCheckCircle className="text-emerald-600 text-[0.85rem]" />
                      )}
                      <StatusBadge
                        status={severityToBadge(pos.severity)}
                        customLabel={SEVERITY_LABEL[pos.severity] || pos.severity || 'N/A'}
                      />
                    </div>
                  </div>
                  {pos.notes && <div className="text-[0.8rem] text-gray-500 mb-1.5">{pos.notes}</div>}
                  {Array.isArray(pos.differences) &&
                    pos.differences.map((d, j) => (
                      <div
                        key={j}
                        className={`text-[0.8rem] text-gray-700 border-l-[3px] pl-2.5 mb-1 ${
                          d.likely_new_damage ? 'border-amber-400' : 'border-gray-300'
                        }`}
                      >
                        <strong>{d.area}</strong>: {d.description}
                        {d.likely_new_damage && (
                          <span className="ml-1.5 text-amber-700 font-semibold"> Co the hu hong moi</span>
                        )}
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analysisResult.conclusion && (
        <div className="mb-3.5 px-3.5 py-2.5 bg-slate-50 rounded-xl text-[0.85rem] text-slate-700">
          <strong>Ket luan:</strong> {analysisResult.conclusion}
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

      <button type="button" className="btn-outline mt-2" onClick={onReset}>
        &larr; Kiem tra moi
      </button>
    </div>
  );
}

export default AnalysisResult;
