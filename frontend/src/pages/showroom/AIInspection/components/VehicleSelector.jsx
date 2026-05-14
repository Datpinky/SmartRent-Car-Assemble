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
      <div className="font-bold text-base text-gray-900 mb-1">Chọn xe cần kiểm tra</div>
      <p className="text-[0.8rem] text-gray-500 mb-4">
        Chọn xe của showroom. Sau đó liên kết booking (tùy chọn) để tự động dùng ảnh bàn giao làm ảnh "trước".
      </p>

      {loadingVehicles ? (
        <div className="flex items-center gap-2 text-gray-500 py-6">
          <FaSpinner className="animate-spin" /> Đang tải danh sách xe...
        </div>
      ) : vehicles.length === 0 ? (
        <div className="py-6 text-gray-400 text-sm text-center">Chưa có xe nào trong showroom.</div>
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
            Liên kết booking <span className="font-normal text-gray-400 text-xs">— tùy chọn</span>
          </div>
          <p className="text-[0.75rem] text-gray-500 mb-2.5">
            Nếu chọn booking có ảnh bàn giao, bước 2 sẽ tự điền ảnh TRƯỚC — bạn chỉ cần chụp ảnh SAU.
          </p>

          {loadingBookings ? (
            <div className="text-[0.8rem] text-gray-500 flex gap-1.5 items-center">
              <FaSpinner className="animate-spin" /> Đang tải...
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-xs text-gray-400">Không có booking đang thuê / chờ trả / hoàn thành cho xe này.</div>
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
                <span className="text-[0.82rem] text-gray-700">Không liên kết — upload thủ công cả 2 ảnh</span>
              </label>
              {bookings.map((b) => {
                const bid = String(b._id || b.id);
                const code = bookingCodeShort(bid);
                const renter = b.user_id?.name || b.user_id?.email || '\u2014';
                const hasImg = Array.isArray(b.pickup_images) && b.pickup_images.length > 0;
                const isSel = selectedBookingId === bid;
                const isCompleted = b.status === 'completed';
                return (
                  <label
                    key={bid}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                      isSel
                        ? 'border-blue-500 bg-blue-50'
                        : isCompleted
                          ? 'border-gray-300 bg-gray-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
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
                        <span
                          className={`text-[0.82rem] font-semibold ${isCompleted ? 'text-gray-600' : 'text-gray-900'}`}
                        >
                          {renter}
                        </span>
                        <StatusBadge
                          status={b.status === 'completed' ? 'available' : 'pending'}
                          customLabel={BOOKING_STATUS_LABEL[b.status] || b.status}
                        />
                        {isCompleted && (
                          <span className="text-[0.65rem] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                            📋 Đã hoàn thành
                          </span>
                        )}
                      </div>
                      <div className={`text-[0.72rem] ${isCompleted ? 'text-gray-400' : 'text-gray-400'} mt-0.5`}>
                        {fmtDateShort(b.start_date)} &rarr; {fmtDateShort(b.end_date)}
                      </div>
                      <div className="text-[0.65rem] text-gray-500 mt-1 font-mono">ID: {bid}</div>
                    </div>
                    {hasImg && (
                      <span className="text-[0.65rem] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                        📦 {b.pickup_images.length} ảnh bàn giao
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
        Tiếp theo &rarr;
      </button>
    </div>
  );
}

export default VehicleSelector;
