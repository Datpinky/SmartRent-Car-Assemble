import { FaCheckCircle, FaChevronDown, FaChevronUp, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import StatusBadge from '../../../../components/common/StatusBadge';
import {
  POSITIONS,
  SEVERITY_LABEL,
  bookingCodeShort,
  fmtDate,
  getVehicleName,
  severityToBadge,
} from '../aiInspection.helpers';

function InspectionHistory({ historyRows, loadingHistory, expandedRow, onToggleRow }) {
  if (loadingHistory) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500 justify-center py-10">
          <FaSpinner className="animate-spin" /> Dang tai lich su...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      <div className="font-bold text-base text-gray-900 mb-3.5">Lich su kiem tra</div>
      {historyRows.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-10">Chua co bao cao kiem tra nao duoc luu.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {historyRows.map((h) => {
            const vid = h.vehicle_id;
            const vname = h.vehicle_name || (vid ? getVehicleName(vid) : '') || '\u2014';
            const plate = h.vehicle_plate || vid?.vehicle_plate_number || '\u2014';
            const bCode = h.booking_code || (h.booking_id?._id ? bookingCodeShort(h.booking_id._id) : '\u2014');
            const dmg = h.damage_detected ?? !!h.ai_payload?.damage_detected;
            const sev = h.severity || h.ai_payload?.severity;
            const isExpand = expandedRow === h._id;

            return (
              <div
                key={h._id}
                className={`border rounded-xl overflow-hidden ${dmg ? 'border-amber-200' : 'border-gray-200'}`}
              >
                <button
                  type="button"
                  onClick={() => onToggleRow(h._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-none cursor-pointer text-left ${
                    isExpand ? 'bg-slate-50' : dmg ? 'bg-amber-50 hover:bg-amber-100' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
                    <span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{fmtDate(h.createdAt)}</span>
                    <div>
                      <div className="font-semibold text-[0.85rem] text-gray-900">{vname}</div>
                      <span className="code-badge text-[0.7rem]">{plate}</span>
                    </div>
                    {bCode !== '\u2014' && <span className="code-badge">{bCode}</span>}
                    <StatusBadge status={severityToBadge(sev)} customLabel={SEVERITY_LABEL[sev] || sev || '\u2014'} />
                    {dmg ? (
                      <span className="flex items-center gap-1 text-red-600 text-[0.8rem] font-semibold">
                        <FaExclamationTriangle /> Co hu hong
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 text-[0.8rem] font-semibold">
                        <FaCheckCircle /> Khong hu hong
                      </span>
                    )}
                    <span className="text-[0.75rem] text-gray-400">{h.positions_analyzed ?? 0} vi tri</span>
                  </div>
                  {isExpand ? (
                    <FaChevronUp className="text-gray-500 shrink-0" />
                  ) : (
                    <FaChevronDown className="text-gray-500 shrink-0" />
                  )}
                </button>

                {isExpand && (
                  <div className="border-t border-gray-100 bg-slate-50 px-4 py-3.5">
                    {Array.isArray(h.position_results) && h.position_results.length > 0 && (
                      <>
                        <div className="font-bold text-[0.82rem] text-gray-700 mb-2">Chi tiet vi tri</div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {h.position_results.map((pr, pi) => {
                            const posInfo = POSITIONS.find((p) => p.label === pr.position || p.key === pr.position_key);
                            return (
                              <div
                                key={pi}
                                className={`rounded-lg px-3 py-2 min-w-[140px] text-[0.78rem] border ${
                                  pr.damage_detected ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="font-bold mb-1.5 flex items-center gap-1.5">
                                  {posInfo && <span>{posInfo.icon}</span>}
                                  {pr.position}
                                </div>
                                <StatusBadge
                                  status={severityToBadge(pr.severity)}
                                  customLabel={SEVERITY_LABEL[pr.severity] || pr.severity || '\u2014'}
                                />
                                {pr.notes && <div className="mt-1.5 text-gray-500 leading-snug">{pr.notes}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {Array.isArray(h.positions) && h.positions.some((p) => p.before_url || p.after_url) && (
                      <>
                        <div className="font-bold text-[0.82rem] text-gray-700 mb-2">Anh da luu</div>
                        <div className="flex gap-3.5 flex-wrap mb-3">
                          {h.positions
                            .filter((p) => p.before_url || p.after_url)
                            .map((p, pi) => (
                              <div key={pi} className="text-center">
                                <div className="text-[0.7rem] text-gray-400 mb-1">{p.position_label}</div>
                                <div className="flex gap-1">
                                  {p.before_url && (
                                    <a href={p.before_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={p.before_url}
                                        alt="truoc"
                                        className="w-[72px] h-[52px] object-cover rounded-md border-2 border-blue-100"
                                      />
                                    </a>
                                  )}
                                  {p.after_url && (
                                    <a href={p.after_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={p.after_url}
                                        alt="sau"
                                        className="w-[72px] h-[52px] object-cover rounded-md border-2 border-green-100"
                                      />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </>
                    )}

                    {(h.ai_payload?.summary || h.ai_payload?.conclusion) && (
                      <div className="text-[0.8rem] text-slate-600 bg-white rounded-lg px-3 py-2.5 border border-gray-200">
                        {h.ai_payload.summary && (
                          <div>
                            <strong>Tom tat:</strong> {h.ai_payload.summary}
                          </div>
                        )}
                        {h.ai_payload.conclusion && (
                          <div className="mt-1">
                            <strong>Ket luan:</strong> {h.ai_payload.conclusion}
                          </div>
                        )}
                      </div>
                    )}
                    {h.inspected_by_name && (
                      <div className="text-[0.75rem] text-gray-400 mt-2">
                        Kiem tra boi: <strong>{h.inspected_by_name}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InspectionHistory;
