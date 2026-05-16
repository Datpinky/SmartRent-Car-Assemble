import { FaCheckCircle, FaChevronDown, FaChevronUp, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import StatusBadge from '../../../../components/common/StatusBadge';
import {
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

            const mergedPickupImages = [];
            const mergedReturnImages = [];
            group.inspections.forEach((h) => {
              if (Array.isArray(h.pickup_images)) mergedPickupImages.push(...h.pickup_images);
              if (Array.isArray(h.return_images)) mergedReturnImages.push(...h.return_images);
              if (Array.isArray(h.gallery_images) && h.inspection_type === 'return') mergedReturnImages.push(...h.gallery_images);
            });
            const pickupImages = [...new Set(mergedPickupImages.filter(Boolean))].slice(0, 6);
            const returnImages = [...new Set(mergedReturnImages.filter(Boolean))].slice(0, 6);

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

                        {Array.isArray(h.observations) && h.observations.length > 0 && (
                          <div className="mb-2">
                            <div className="font-bold text-[0.75rem] text-gray-700 mb-1">Ket qua chi tiet</div>
                            <div className="flex flex-wrap gap-1">
                              {h.observations.slice(0, 3).map((obs, pi) => (
                                <div
                                  key={pi}
                                  className={
                                    'rounded px-2 py-1 text-[0.7rem] border ' +
                                    (obs.likely_new_damage
                                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                                      : 'bg-white border-gray-200 text-gray-600')
                                  }
                                >
                                  {obs.area || 'Khu vuc'}
                                </div>
                              ))}
                              {h.observations.length > 3 && (
                                <span className="text-[0.7rem] text-gray-500 px-2 py-1">+{h.observations.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {h.ai_payload?.summary && (
                          <div className="text-[0.75rem] text-slate-600 bg-white rounded px-2 py-1.5 mb-2 border border-gray-200">
                            <strong>Tom tat:</strong> {h.ai_payload.summary}
                          </div>
                        )}
                      </div>
                    ))}

                    {(pickupImages.length > 0 || returnImages.length > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="font-bold text-[0.82rem] text-gray-700 mb-2">Anh so sanh</div>
                        <div className="flex gap-5 flex-wrap">
                          {pickupImages.length > 0 && (
                            <div>
                              <div className="text-[0.72rem] text-blue-700 font-semibold mb-1">BEFORE</div>
                              <div className="flex gap-2 flex-wrap">
                                {pickupImages.map((url, pi) => (
                                  <a key={url || pi} href={url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={url}
                                      alt="before"
                                      className="w-[72px] h-[52px] object-cover rounded-md border-2 border-blue-200 cursor-pointer hover:border-blue-400 transition"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {returnImages.length > 0 && (
                            <div>
                              <div className="text-[0.72rem] text-green-700 font-semibold mb-1">AFTER</div>
                              <div className="flex gap-2 flex-wrap">
                                {returnImages.map((url, pi) => (
                                  <a key={url || pi} href={url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={url}
                                      alt="after"
                                      className="w-[72px] h-[52px] object-cover rounded-md border-2 border-green-200 cursor-pointer hover:border-green-400 transition"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
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
