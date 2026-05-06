import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FaCheckCircle,
  FaHome,
  FaList,
  FaMoneyBillWave,
  FaSpinner,
  FaTimesCircle,
} from 'react-icons/fa';
import bookingService from '../../../services/bookingService';
import paymentService from '../../../services/paymentService';

const formatDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('vi-VN');
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
  const fallbackStatus = params.get('status')
    || (redirectStatus === 'succeeded'
      ? 'success'
      : (redirectStatus === 'processing'
        ? 'pending'
        : (redirectStatus === 'failed' ? 'error' : 'pending')));
  const [status, setStatus] = useState('loading');
  const [booking, setBooking] = useState(null);
  const canRetryPayment =
    ['pending', 'waiting_payment'].includes(booking?.paymentState?.bookingStatus || booking?.status || '')
    && ['pending', 'failed', 'declined'].includes(
      booking?.payment?.payment_status || booking?.paymentState?.paymentStatus || 'pending'
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

        if (paymentIntentId) {
          try {
            const syncResult = await paymentService.confirmPayment(paymentIntentId);
            if (mounted && syncResult?.paymentStatus) {
              if (syncResult.paymentStatus === 'successful') {
                setStatus('success');
              } else if (syncResult.paymentStatus === 'pending') {
                setStatus('pending');
              } else if (['failed', 'declined'].includes(syncResult.paymentStatus)) {
                setStatus('error');
              }
            }
          } catch {
            // Keep loading booking/payment state below as the main source of truth.
          }
        }

        const data = await bookingService.getBookingById(bookingId);
        if (!mounted) {
          return;
        }

        setBooking(data || null);
        setStatus(deriveResultStatus(data, fallbackStatus));
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
  const totalPrice = booking?.total_price != null
    ? `${Number(booking.total_price).toLocaleString('vi-VN')}d`
    : 'N/A';

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <FaSpinner className="animate-spin" style={{ fontSize: '3rem', color: '#00b14f' }} />
        <p style={{ marginTop: 16, color: '#6b7280' }}>Đang tải thông tin giao dịch...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.10)', border: '1px solid #f0f0f0' }}>
        {isSuccess ? (
          <>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'popIn 0.4s ease' }}>
              <FaCheckCircle style={{ fontSize: '3rem', color: '#059669' }} />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#111827', marginBottom: 8 }}>Thanh toán thành công</h2>
          </>
        ) : isPending ? (
          <>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <FaSpinner className="animate-spin" style={{ fontSize: '2.4rem', color: '#d97706' }} />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#111827', marginBottom: 8 }}>Thanh toán đang chờ xử lý</h2>
            <p style={{ color: '#6b7280', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 24 }}>
              Backend đã tạo booking và payment record, nhưng giao dịch chưa ở trạng thái thành công.
            </p>
          </>
        ) : (
          <>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <FaTimesCircle style={{ fontSize: '3rem', color: '#dc2626' }} />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#111827', marginBottom: 8 }}>Thanh toán thất bại</h2>
            <p style={{ color: '#6b7280', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 24 }}>
              Giao dịch không thể thực hiện hoặc chưa được ghi nhận thành công.
            </p>
          </>
        )}

        <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
          {[
            ['Mã booking', bookingCode],
            ['Xe', booking?.vehicle?.name || booking?.vehicle_id?.vehicle_name || 'Đang tải...'],
            ['Thời gian thuê', booking ? `${formatDate(booking.start_date)} -> ${formatDate(booking.end_date)}` : 'N/A'],
            ['Tổng tiền', totalPrice],
            ['Paid at', formatDate(booking?.payment?.paid_at)],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: '0.82rem' }}>
              <span style={{ color: '#9ca3af' }}>{label}</span>
              <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/')}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <FaHome /> Trang chủ
          </button>

          {isSuccess ? (
            <button
              onClick={() => navigate('/renter/pending?tab=showroom')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', background: '#00b14f', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <FaList /> Theo dõi đặt xe
            </button>
          ) : isPending ? (
            <button
              onClick={() => navigate(canRetryPayment ? `/renter/retry-payment/${bookingId}` : '/renter/pending?tab=payment')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', background: '#d97706', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <FaMoneyBillWave /> Thanh toán lại
            </button>
          ) : (
            <button
              onClick={() => navigate(canRetryPayment ? `/renter/retry-payment/${bookingId}` : '/renter/transactions')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', background: '#00b14f', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Thanh toán lại
            </button>
          )}
        </div>

        <button
          className="renter-btn-soft"
          onClick={() => navigate('/renter/transactions')}
          style={{ width: '100%', marginTop: 10 }}
        >
          <FaMoneyBillWave /> Lịch sử giao dịch
        </button>
      </div>
      <style>{`@keyframes popIn { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
    </div>
  );
};

export default PaymentResult;
