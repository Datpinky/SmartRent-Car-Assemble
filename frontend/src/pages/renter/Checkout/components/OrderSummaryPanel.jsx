import { FaCar, FaTag } from 'react-icons/fa';
import { formatVnd, formatVndPerDay } from '../../../../utils/currencyFormat';
import { DELIVERY_FEE_VND, formatDateTimeVi } from '../checkout.helpers';

const OrderSummaryPanel = ({ vehicle, pickupDate, returnDate, days, subtotal, serviceFee, deliveryFee, total }) => (
  <aside className="lg:sticky lg:top-24 h-fit">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-[0.95rem]">Tóm tắt đơn hàng</h3>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-gray-100/90 px-3 py-3 border border-gray-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <FaCar aria-hidden="true" className="text-lg" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-[0.88rem] leading-snug line-clamp-2">{vehicle.name}</p>
            <p className="text-[0.72rem] text-gray-500 mt-0.5">SmartRent</p>
          </div>
        </div>

        <dl className="space-y-2 text-[0.82rem] text-gray-600">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500 shrink-0">Nhận xe</dt>
            <dd className="tabular-nums text-right text-gray-800 font-medium">{formatDateTimeVi(pickupDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500 shrink-0">Trả xe</dt>
            <dd className="tabular-nums text-right text-gray-800 font-medium">{formatDateTimeVi(returnDate)}</dd>
          </div>
        </dl>

        <div className="h-px bg-gray-100" />

        <div className="space-y-2.5 text-[0.82rem]">
          <div className="flex justify-between gap-3 text-gray-600">
            <span>
              {formatVndPerDay(vehicle.price)} x {days} ngày
            </span>
            <span className="tabular-nums font-medium text-gray-800">{formatVnd(subtotal)}</span>
          </div>
          <div className="flex justify-between gap-3 text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <FaTag aria-hidden="true" className="opacity-70 text-[0.7rem]" />
              Phí dịch vụ (5%)
            </span>
            <span className="tabular-nums font-medium text-gray-800">{formatVnd(serviceFee)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between gap-3 text-gray-600">
              <span>Giao tại nội thành</span>
              <span className="tabular-nums font-medium text-gray-800">+{formatVnd(deliveryFee)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-gray-200">
          <span className="font-bold text-gray-900 text-[0.95rem]">Tổng cộng</span>
          <span className="tabular-nums text-xl font-bold text-primary">{formatVnd(total)}</span>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary-light/50 px-3.5 py-3 text-[0.72rem] text-gray-600 leading-relaxed">
          <ul className="list-disc pl-4 space-y-1.5 marker:text-primary">
            <li>Miễn phí hủy trước 1 giờ so với giờ nhận xe (theo chính sách đơn cụ thể).</li>
            <li>Thanh toán qua Stripe, thông tin thẻ được mã hóa.</li>
            <li>
              Điều kiện bảo hiểm và trách nhiệm theo hợp đồng thuê - SmartRent không cam kết mức bảo hiểm cụ thể trong
              chuyến đi.
            </li>
          </ul>
        </div>

        <p className="text-[0.7rem] text-gray-400 leading-relaxed">
          Bằng cách đặt xe, bạn đồng ý với <span className="underline text-primary">Điều khoản sử dụng</span> và{' '}
          <span className="underline text-primary">Chính sách bảo mật</span>.
        </p>
      </div>
    </div>
  </aside>
);

export { DELIVERY_FEE_VND };
export default OrderSummaryPanel;
