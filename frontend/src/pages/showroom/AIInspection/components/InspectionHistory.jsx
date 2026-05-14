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

  // Group inspections by booking_id to show related inspections together
  const groupedByBooking = {};
  historyRows.forEach((h) => {
    const bookingId = h.booking_id?._id || h.booking_id || 'no-booking';
    if (!groupedByBooking[bookingId]) {
      groupedByBooking[bookingId] = [];
    }
    groupedByBooking[bookingId].push(h);
  });

  // Convert to array of groups, sorted by most recent
  const bookingGroups = Object.values(groupedByBooking)
    .map((group) => ({
      inspections: group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      latestInspection: group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0],
    }))
    .sort((a, b) => new Date(b.latestInspection.createdAt) - new Date(a.latestInspection.createdAt));

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      <div className="font-bold text-base text-gray-900 mb-3.5">Lich su kiem tra</div>
      {historyRows.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-10">Chua co bao cao kiem tra nao duoc luu.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {bookingGroups.map((group) => {
            const latestH = group.latestInspection;
            const vid = latestH.vehicle_id;
            const vname = latestH.vehicle_name || (vid ? getVehicleName(vid) : '') || '—';
            const plate = latestH.vehicle_plate || vid?.vehicle_plate_number || '—';
            const bCode =
              latestH.booking_code || (latestH.booking_id?._id ? bookingCodeShort(latestH.booking_id._id) : '—');

            // Check damage from all related inspections
            const hasAnyDamage = group.inspections.some((h) => h.damage_detected ?? !!h.ai_payload?.damage_detected);
            // Get most severe severity from all related inspections
            const severities = group.inspections.map((h) => h.severity || h.ai_payload?.severity).filter(Boolean);
            const sev = severities[0] || 'none';

            const isExpand = expandedRow === latestH._id;

            // Merge positions from all related inspections
            const mergedPositions = {};
            group.inspections.forEach((h) => {
              if (Array.isArray(h.positions)) {
                h.positions.forEach((pos) => {
                  const key = pos.position_key || pos.position_label;
                  if (!mergedPositions[key]) {
                    mergedPositions[key] = { position_label: pos.position_label, position_key: key };
                  }
                  // Merge URLs
                  if (pos.before_url) mergedPositions[key].before_url = pos.before_url;
                  if (pos.after_url) mergedPositions[key].after_url = pos.after_url;
                });
              }
            });

            return (
              <div
                key={latestH._id}
                className={`border rounded-xl overflow-hidden ${hasAnyDamage ? 'border-amber-200' : 'border-gray-200'}`}
              >
                <button
                  type="button"
                  onClick={() => onToggleRow(latestH._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-none cursor-pointer text-left ${
                    isExpand
                      ? 'bg-slate-50'
                      : hasAnyDamage
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
                    <span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{fmtDate(latestH.createdAt)}</span>
                    <div>
                      <div className="font-semibold text-[0.85rem] text-gray-900">{vname}</div>
                      <span className="code-badge text-[0.7rem]">{plate}</span>
                    </div>
                    {bCode !== '—' && <span className="code-badge">{bCode}</span>}
                    <StatusBadge status={severityToBadge(sev)} customLabel={SEVERITY_LABEL[sev] || sev || '—'} />
                    {hasAnyDamage ? (
                      <span className="flex items-center gap-1 text-red-600 text-[0.8rem] font-semibold">
                        <FaExclamationTriangle /> Co hu hong
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 text-[0.8rem] font-semibold">
                        <FaCheckCircle /> Khong hu hong
                      </span>
                    )}
                    {/* Show inspection types included */}
                    <span className="text-[0.7rem] text-gray-500 flex gap-1">
                      {group.inspections.some((h) => h.inspection_type === 'pickup') && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Bàn giao</span>
                      )}
                      {group.inspections.some((h) => h.inspection_type === 'return') && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Trả về</span>
                      )}
                    </span>
                  </div>
                  {isExpand ? (
                    <FaChevronUp className="text-gray-500 shrink-0" />
                  ) : (
                    <FaChevronDown className="text-gray-500 shrink-0" />
                  )}
                </button>

                {isExpand && (
                  <div className="border-t border-gray-100 bg-slate-50 px-4 py-3.5">
                    {/* Show inspection details for each type */}
                    {group.inspections.map((h, idx) => (
                      <div key={h._id} className={idx > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}>
                        {group.inspections.length > 1 && (
                          <div className="text-[0.75rem] font-semibold text-gray-600 mb-2 flex items-center gap-2">
                            {h.inspection_type === 'pickup' ? (
                              <>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[0.65rem]">
                                  Kiểm tra bàn giao (Showroom)
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[0.65rem]">
                                  Kiểm tra trả về (Renter)
                                </span>
                              </>
                            )}
                            <span className="text-gray-400">{fmtDate(h.createdAt)}</span>
                          </div>
                        )}

                        {Array.isArray(h.position_results) && h.position_results.length > 0 && (
                          <div className="mb-2">
                            <div className="font-bold text-[0.75rem] text-gray-700 mb-1">Kết quả chi tiết</div>
                            <div className="flex flex-wrap gap-1">
                              {h.position_results.slice(0, 3).map((pr, pi) => {
                                const posInfo = POSITIONS.find(
                                  (p) => p.label === pr.position || p.key === pr.position_key,
                                );
                                return (
                                  <div
                                    key={pi}
                                    className={`rounded px-2 py-1 text-[0.7rem] border ${
                                      pr.damage_detected
                                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                                        : 'bg-white border-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {posInfo && <span>{posInfo.icon}</span>} {pr.position}
                                  </div>
                                );
                              })}
                              {h.position_results.length > 3 && (
                                <span className="text-[0.7rem] text-gray-500 px-2 py-1">
                                  +{h.position_results.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {h.ai_payload?.summary && (
                          <div className="text-[0.75rem] text-slate-600 bg-white rounded px-2 py-1.5 mb-2 border border-gray-200">
                            <strong>Tóm tắt:</strong> {h.ai_payload.summary}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Merged images section */}
                    {Object.values(mergedPositions).some((p) => p.before_url || p.after_url) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="font-bold text-[0.82rem] text-gray-700 mb-2">Ảnh so sánh (Minh bạch)</div>
                        <div className="flex gap-3 flex-wrap">
                          {Object.values(mergedPositions)
                            .filter((p) => p.before_url || p.after_url)
                            .map((p, pi) => (
                              <div key={pi} className="text-center">
                                <div className="text-[0.7rem] text-gray-500 mb-1 font-semibold">{p.position_label}</div>
                                <div className="flex gap-1.5">
                                  {p.before_url && (
                                    <a
                                      href={p.before_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Ảnh bàn giao (Showroom)"
                                    >
                                      <img
                                        src={p.before_url}
                                        alt="trước"
                                        className="w-[72px] h-[52px] object-cover rounded-md border-2 border-blue-200 cursor-pointer hover:border-blue-400 transition"
                                      />
                                    </a>
                                  )}
                                  {p.after_url && (
                                    <a
                                      href={p.after_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Ảnh trả về (Renter)"
                                    >
                                      <img
                                        src={p.after_url}
                                        alt="sau"
                                        className="w-[72px] h-[52px] object-cover rounded-md border-2 border-green-200 cursor-pointer hover:border-green-400 transition"
                                      />
                                    </a>
                                  )}
                                </div>
                                <div className="text-[0.65rem] text-gray-400 mt-0.5 flex gap-1 justify-center">
                                  {p.before_url && <span>🔵 Trước</span>}
                                  {p.after_url && <span>🟢 Sau</span>}
                                </div>
                              </div>
                            ))}
                        </div>
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
