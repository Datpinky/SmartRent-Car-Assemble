import { useEffect, useState } from 'react';
import {
  FaCheckCircle,
  FaFileSignature,
  FaHome,
  FaList,
  FaMoneyBillWave,
  FaSpinner,
  FaTimesCircle,
} from 'react-icons/fa';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ContractModal from '../../../components/common/ContractModal';
import bookingService from '../../../services/bookingService';
import paymentService from '../../../services/paymentService';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const deriveResultStatus = (booking, fallbackStatus) => {
  const paymentStatus = booking?.payment?.payment_status || booking?.paymentState?.paymentStatus || '';
  const bookingStatus = booking?.paymentState?.bookingStatus || booking?.status || '';

  if (paymentStatus === 'successful' || bookingStatus === 'paid') {
    return 'success';
  }

  if (paymentStatus === 'pending' || bookingStatus === 'waiting_payment') {
    return 'pending';
  }

  if (paymentStatus === 'failed' || paymentStatus === 'declined') {
    return 'error';
  }

  return fallbackStatus || 'pending';
};

const PaymentResult = () => {
  const [params] = useSearchParams();
  const routeParams = useParams();
  const navigate = useNavigate();

  const bookingId = params.get('bookingId') || params.get('booking_id') || routeParams.bookingId || '';
  const paymentIntentId = params.get('payment_intent') || '';
  const redirectStatus = params.get('redirect_status') || '';
  const fallbackStatus =
    params.get('status') ||
    (redirectStatus === 'succeeded'
      ? 'success'
      : redirectStatus === 'processing'
        ? 'pending'
        : redirectStatus === 'failed'
          ? 'error'
          : 'pending');
  const [status, setStatus] = useState('loading');
  const [booking, setBooking] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const canRetryPayment =
    ['pending', 'waiting_payment'].includes(booking?.paymentState?.bookingStatus || booking?.status || '') &&
    ['pending', 'failed', 'declined'].includes(
      booking?.payment?.payment_status || booking?.paymentState?.paymentStatus || 'pending',
    );

  const isSuccess = status === 'success';
  const isPending = status === 'pending';

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!bookingId) {
          if (mounted) {
            setStatus('error');
          }
          return;
        }

        let syncedStatus = null;

        if (paymentIntentId) {
          try {
            const syncResult = await paymentService.confirmPayment(paymentIntentId);
            if (syncResult?.paymentStatus === 'successful') syncedStatus = 'success';
            else if (syncResult?.paymentStatus === 'pending') syncedStatus = 'pending';
            else if (['failed', 'declined'].includes(syncResult?.paymentStatus)) syncedStatus = 'error';
          } catch {
            // Fall through to booking-based derivation.
          }
        }

        const data = await bookingService.getBookingById(bookingId);
        if (!mounted) {
          return;
        }

        setBooking(data || null);
        // Sync result (from Stripe) takes priority over stale booking state
        setStatus(syncedStatus || deriveResultStatus(data, fallbackStatus));
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error('Payment result load error:', err);
        setStatus('error');
      } finally {
        // no-op: status is set from booking/payment resolution paths above
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [bookingId, fallbackStatus, paymentIntentId]);

  const bookingCode = booking?._id
    ? `BK${String(booking._id).slice(-6).toUpperCase()}`
    : bookingId
      ? `BK${String(bookingId).slice(-6).toUpperCase()}`
      : 'N/A';
  const totalPrice = booking?.total_price != null ? `${Number(booking.total_price).toLocaleString('vi-VN')}d` : 'N/A';

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <FaSpinner className="animate-spin text-5xl text-[#00b14f]" />
        <p className="mt-4 text-gray-500">Đang tải thông tin giao dịch...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <div className="bg-white rounded-2xl px-10 py-12 max-w-[480px] w-full text-center shadow-lg border border-gray-100">
        {isSuccess ? (
          <>
            <div
              className="w-22 h-22 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5"
              style={{ width: 88, height: 88, animation: 'popIn 0.4s ease' }}
            >
              <FaCheckCircle className="text-5xl text-emerald-600" />
            </div>
            <h2 className="font-extrabold text-xl text-gray-900 mb-2">Thanh toán thành công</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-5">
              Booking của bạn đã được ghi nhận thanh toán thành công trên hệ thống.
            </p>

            {/* Step flow */}
            <div className="flex items-center justify-center gap-1 mb-5 text-xs">
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                  <FaCheckCircle className="text-white text-sm" />
                </div>
                <span className="text-emerald-600 font-semibold">Thanh toán</span>
              </div>
              <div className={`flex-1 h-0.5 mx-1 mb-3 ${contractSigned ? 'bg-emerald-400' : 'bg-blue-400'}`} />
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    contractSigned ? 'bg-emerald-500' : 'bg-blue-600 ring-4 ring-blue-100'
                  }`}
                >
                  {contractSigned ? (
                    <FaCheckCircle className="text-white text-sm" />
                  ) : (
                    <FaFileSignature className="text-white text-sm" />
                  )}
                </div>
                <span className={`font-bold ${contractSigned ? 'text-emerald-600' : 'text-blue-700'}`}>
                  Ký hợp đồng
                </span>
              </div>
              <div className={`flex-1 h-0.5 mx-1 mb-3 ${contractSigned ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    contractSigned ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-gray-200'
                  }`}
                >
                  {contractSigned ? (
                    <FaCheckCircle className="text-white text-sm" />
                  ) : (
                    <span className="text-gray-400 font-bold text-xs">3</span>
                  )}
                </div>
                <span className={`font-medium ${contractSigned ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                  Nhận xe
                </span>
              </div>
            </div>

            {contractSigned ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5 text-left">
                <p className="text-emerald-800 text-xs font-semibold mb-0.5">✅ Đã ký hợp đồng thành công</p>
                <p className="text-emerald-700 text-xs leading-relaxed">
                  Hợp đồng đã được ký. Showroom sẽ liên hệ và tiến hành bàn giao xe cho bạn.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-left">
                  <p className="text-blue-800 text-xs font-semibold mb-0.5">📋 Bước tiếp theo — bắt buộc</p>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Vui lòng ký xác nhận hợp đồng thuê xe để hoàn tất thủ tục. Showroom sẽ tiến hành bàn giao xe sau khi
                    hợp đồng được ký.
                  </p>
                </div>
                <button
                  onClick={() => setShowContractModal(true)}
                  className="flex items-center justify-center gap-2 w-full mb-4 px-6 py-3 bg-blue-700 border-none rounded-xl text-white font-bold cursor-pointer text-sm hover:bg-blue-800 transition-colors shadow-md"
                >
                  <FaFileSignature /> Ký xác nhận hợp đồng
                </button>
              </>
            )}
          </>
        ) : isPending ? (
          <>
            <div
              className="rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5"
              style={{ width: 88, height: 88 }}
            >
              <FaSpinner className="animate-spin text-4xl text-amber-600" />
            </div>
            <h2 className="font-extrabold text-xl text-gray-900 mb-2">Thanh toán đang chờ xử lý</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Giao dịch đang được xử lý, vui lòng chờ trong giây lát. Chúng tôi sẽ cập nhật ngay khi có kết quả.
            </p>
          </>
        ) : (
          <>
            <div
              className="rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5"
              style={{ width: 88, height: 88 }}
            >
              <FaTimesCircle className="text-5xl text-red-600" />
            </div>
            <h2 className="font-extrabold text-xl text-gray-900 mb-2">Thanh toán thất bại</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Giao dịch không thể thực hiện hoặc chưa được ghi nhận thành công.
            </p>
          </>
        )}

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          {[
            ['Mã đặt xe', bookingCode],
            ['Xe', booking?.vehicle?.name || booking?.vehicle_id?.vehicle_name || 'Đang tải...'],
            ['Thời gian thuê', booking ? `${formatDate(booking.start_date)} → ${formatDate(booking.end_date)}` : 'N/A'],
            ['Tổng tiền', totalPrice],
            ...(isSuccess && booking?.payment?.paid_at
              ? [['Thanh toán lúc', formatDate(booking.payment.paid_at)]]
              : []),
            ...(!isSuccess
              ? [
                  [
                    'Trạng thái',
                    booking?.payment?.payment_status === 'successful'
                      ? 'Thành công'
                      : booking?.payment?.payment_status === 'pending'
                        ? 'Đang chờ'
                        : booking?.payment?.payment_status === 'failed'
                          ? 'Thất bại'
                          : booking?.payment?.payment_status || 'Đang cập nhật',
                  ],
                ]
              : []),
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 mb-2 text-xs last:mb-0">
              <span className="text-gray-400">{label}</span>
              <span className="font-semibold text-gray-900 text-right">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold cursor-pointer text-sm hover:bg-gray-50 transition-colors"
          >
            <FaHome /> Trang chủ
          </button>

          {isSuccess ? (
            <button
              onClick={() => navigate('/renter/pending-pickups')}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#00b14f] border-none rounded-xl text-white font-bold cursor-pointer text-sm hover:bg-[#009f45] transition-colors"
            >
              <FaList /> Chờ nhận xe
            </button>
          ) : isPending ? (
            <button
              onClick={() =>
                navigate(canRetryPayment ? `/renter/retry-payment/${bookingId}` : '/renter/pending-pickups')
              }
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-amber-600 border-none rounded-xl text-white font-bold cursor-pointer text-sm hover:bg-amber-700 transition-colors"
            >
              <FaMoneyBillWave /> Thanh toán lại
            </button>
          ) : (
            <button
              onClick={() => navigate(canRetryPayment ? `/renter/retry-payment/${bookingId}` : '/renter/transactions')}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#00b14f] border-none rounded-xl text-white font-bold cursor-pointer text-sm hover:bg-[#009f45] transition-colors"
            >
              Thanh toán lại
            </button>
          )}
        </div>

        <button className="renter-btn-soft w-full mt-2.5" onClick={() => navigate('/renter/transactions')}>
          <FaMoneyBillWave /> Lịch sử giao dịch
        </button>
      </div>
      <style>{`@keyframes popIn { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>

      {bookingId && (
        <ContractModal
          bookingId={bookingId}
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          onSigned={() => {
            setShowContractModal(false);
            setContractSigned(true);
          }}
        />
      )}
    </div>
  );
};

export default PaymentResult;
