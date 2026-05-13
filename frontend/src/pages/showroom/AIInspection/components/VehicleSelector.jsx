import { FaCarSide, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import StatusBadge from '../../../../components/common/StatusBadge';
import {
  BOOKING_STATUS_LABEL,
  bookingCodeShort,
  fmtDateShort,
  getVehicleName,
  getVehicleThumb,
} from '../aiInspection.helpers';

function VehicleSelector({
  vehicles,
  loadingVehicles,
  selectedVehicle,
  onSelectVehicle,
  bookings,
  loadingBookings,
  selectedBookingId,
  onSelectBooking,
  onNext,
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      <div className="font-bold text-base text-gray-900 mb-1">Chon xe can kiem tra</div>
      <p className="text-[0.8rem] text-gray-500 mb-4">
        Chon xe cua showroom. Sau do lien ket booking (tuy chon) de tu dong dung anh ban giao lam anh "truoc".
      </p>

      {loadingVehicles ? (
        <div className="flex items-center gap-2 text-gray-500 py-6">
          <FaSpinner className="animate-spin" /> Dang tai danh sach xe...
        </div>
      ) : vehicles.length === 0 ? (
        <div className="py-6 text-gray-400 text-sm text-center">Chua co xe nao trong showroom.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 mb-6">
          {vehicles.map((v) => {
            const id = String(v._id || v.id);
            const name = getVehicleName(v);
            const plate = v.vehicle_plate_number || '';
            const thumb = getVehicleThumb(v);
            const seats = v.number_of_seats;
            const selected = selectedVehicle && String(selectedVehicle._id || selectedVehicle.id) === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectVehicle(v)}
                className={`rounded-xl border-2 cursor-pointer text-left p-0 overflow-hidden transition-colors ${
                  selected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="w-full h-[90px] bg-gray-100 overflow-hidden relative">
                  {thumb ? (
                    <img src={thumb} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaCarSide className="text-4xl text-gray-300" />
                    </div>
                  )}
                  {selected && (
                    <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center">
                      <FaCheckCircle className="text-white text-xs" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className="font-bold text-[0.83rem] text-gray-900 mb-1">{name}</div>
                  {plate && <span className="code-badge text-[0.7rem]">{plate}</span>}
                  {seats && <div className="text-[0.72rem] text-gray-400 mt-1">{seats} cho</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedVehicle && (
        <div className="bg-slate-50 rounded-xl p-3.5 border border-gray-200 mb-5">
          <div className="font-bold text-[0.88rem] text-gray-700 mb-1">
            Lien ket booking <span className="font-normal text-gray-400 text-xs">— tuy chon</span>
          </div>
          <p className="text-[0.75rem] text-gray-500 mb-2.5">
            Neu chon booking co anh ban giao, buoc 2 se tu dien anh TRUOC — ban chi can chup anh SAU.
          </p>

          {loadingBookings ? (
            <div className="text-[0.8rem] text-gray-500 flex gap-1.5 items-center">
              <FaSpinner className="animate-spin" /> Dang tai...
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-xs text-gray-400">Khong co booking dang thue / cho tra / hoan thanh cho xe nay.</div>
          ) : (
            <div className="flex flex-col gap-2">
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                  !selectedBookingId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="booking"
                  value=""
                  checked={!selectedBookingId}
                  onChange={() => onSelectBooking('')}
                  className="accent-blue-600"
                />
                <span className="text-[0.82rem] text-gray-700">Khong lien ket — upload thu cong ca 2 anh</span>
              </label>
              {bookings.map((b) => {
                const bid = String(b._id || b.id);
                const code = bookingCodeShort(bid);
                const renter = b.user_id?.name || b.user_id?.email || '\u2014';
                const hasImg = Array.isArray(b.pickup_images) && b.pickup_images.length > 0;
                const isSel = selectedBookingId === bid;
                return (
                  <label
                    key={bid}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                      isSel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="booking"
                      value={bid}
                      checked={isSel}
                      onChange={() => onSelectBooking(bid)}
                      className="accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="code-badge">{code}</span>
                        <span className="text-[0.82rem] font-semibold text-gray-900">{renter}</span>
                        <StatusBadge
                          status={b.status === 'completed' ? 'available' : 'pending'}
                          customLabel={BOOKING_STATUS_LABEL[b.status] || b.status}
                        />
                      </div>
                      <div className="text-[0.72rem] text-gray-400 mt-0.5">
                        {fmtDateShort(b.start_date)} &rarr; {fmtDateShort(b.end_date)}
                      </div>
                    </div>
                    {hasImg && (
                      <span className="text-[0.65rem] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                        📦 {b.pickup_images.length} anh ban giao
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn-primary disabled:opacity-50"
        disabled={!selectedVehicle || loadingVehicles}
        onClick={onNext}
      >
        Tiep theo &rarr;
      </button>
    </div>
  );
}

export default VehicleSelector;
