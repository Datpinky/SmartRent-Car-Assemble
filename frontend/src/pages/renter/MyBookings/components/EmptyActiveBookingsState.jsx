import { MdDirectionsCar } from 'react-icons/md';

const EmptyActiveBookingsState = ({ onOpenPendingShowroom, onOpenPendingPickups, onCreateBooking }) => (
  <div
    role="region"
    aria-label="Không có chuyến đi"
    className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm"
  >
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
      <MdDirectionsCar style={{ fontSize: '2.8rem', color: '#cbd5e1' }} aria-hidden="true" />
    </div>
    <div>
      <p className="font-bold text-gray-700 text-base mb-1.5">Bạn chưa có chuyến đi nào đang hoạt động</p>
      <p className="text-[0.82rem] text-gray-400 leading-relaxed max-w-sm">
        Booking chờ thanh toán, chờ showroom xử lý và chờ nhận xe được quản lý riêng. Khi xe được bàn giao, chuyến đi sẽ
        hiện ở đây.
      </p>
    </div>
    <div className="flex gap-2.5 justify-center flex-wrap mt-1">
      <button className="renter-btn-soft" onClick={onOpenPendingShowroom}>
        Chờ showroom xử lý
      </button>
      <button className="renter-btn-soft" onClick={onOpenPendingPickups}>
        Chờ nhận xe
      </button>
      <button className="btn-primary" onClick={onCreateBooking}>
        Đặt xe mới
      </button>
    </div>
  </div>
);

export default EmptyActiveBookingsState;
