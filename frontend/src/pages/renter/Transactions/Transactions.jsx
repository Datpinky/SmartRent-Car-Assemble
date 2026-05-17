import { useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt, FaCheckCircle, FaClock, FaCreditCard, FaEye, FaMoneyBillWave } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import paymentService from '../../../services/paymentService';

const FILTERS = [
  { key: 'paid_active', label: 'Thành công' },
  { key: 'refund_waiting', label: 'Chờ hoàn tiền' },
  { key: 'refunded', label: 'Đã hoàn tiền' },
  { key: 'failed', label: 'Thất bại / từ chối' },
];

const BOOKING_STATUS_VI = {
  pending: 'Chờ thanh toán',
  waiting_payment: 'Đang thanh toán',
  paid: 'Đã thanh toán',
  refund_requested: 'Chờ hoàn trả',
  waiting_handover: 'Chờ bàn giao',
  handed_over: 'Đã bàn giao',
  in_use: 'Đang thuê',
  waiting_return_confirmation: 'Chờ xác nhận trả',
  completed: 'Hoàn thành',
  cancel_pending: 'Đang xử lý hủy',
  cancel_failed: 'Hủy (lỗi xử lý)',
  cancelled: 'Đã hủy',
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('vi-VN');
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

const getTransactionDisplay = (transaction) => {
  if (transaction.refundStatus === 'refund_failed') {
    return { statusKey: 'refund_failed', label: 'Hoàn tiền lỗi' };
  }

  if (transaction.status === 'refunded' || transaction.refundStatus === 'refunded') {
    return { statusKey: 'refunded', label: 'Đã hoàn tiền' };
  }

  if (transaction.refundStatus === 'awaiting_showroom_refund') {
    return { statusKey: 'awaiting_showroom_refund', label: 'Chờ hoàn tiền' };
  }

  if (transaction.refundStatus === 'refund_pending') {
    return { statusKey: 'refund_pending', label: 'Đang hoàn tiền' };
  }

  if (transaction.status === 'declined') {
    return { statusKey: 'declined', label: 'Bị từ chối' };
  }

  if (transaction.status === 'failed') {
    return { statusKey: 'failed', label: 'Thất bại' };
  }

  if (transaction.status === 'successful') {
    return { statusKey: 'successful', label: 'Thành công' };
  }

  return { statusKey: 'pending', label: 'Đang cập nhật' };
};

const getTransactionBucket = (transaction) => {
  if (transaction.refundStatus === 'refund_failed' || ['failed', 'declined'].includes(transaction.status)) {
    return 'failed';
  }

  if (transaction.status === 'refunded' || transaction.refundStatus === 'refunded') {
    return 'refunded';
  }

  if (transaction.refundStatus === 'awaiting_showroom_refund' || transaction.refundStatus === 'refund_pending') {
    return 'refund_waiting';
  }

  if (transaction.status === 'successful') {
    return 'paid_active';
  }

  return 'failed';
};

const matchFilter = (transaction, activeFilter) => {
  return getTransactionBucket(transaction) === activeFilter;
};

const getAmountColor = (transaction) => {
  const bucket = getTransactionBucket(transaction);
  if (bucket === 'failed') return '#dc2626';
  if (bucket === 'refunded') return '#0369a1';
  if (bucket === 'refund_waiting') return '#d97706';
  return '#00b14f';
};

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('paid_active');
  const [detailModal, setDetailModal] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadTransactions = async () => {
      setLoading(true);
      try {
        const bookings = await bookingService.getMyBookingsDetailed();
        const transactionRows = await paymentService.getMyTransactions(bookings || []);
        if (!mounted) {
          return;
        }

        setTransactions(transactionRows);
        setError('');
      } catch (err) {
        if (!mounted) {
          return;
        }

        setTransactions([]);
        setError(err.message || 'Không thể tải lịch sử giao dịch.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTransactions();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => matchFilter(transaction, activeFilter)),
    [activeFilter, transactions],
  );

  const summary = useMemo(() => {
    const paidActive = transactions.filter((t) => getTransactionBucket(t) === 'paid_active');
    const refundWaiting = transactions.filter((t) => getTransactionBucket(t) === 'refund_waiting');
    const refunded = transactions.filter((t) => getTransactionBucket(t) === 'refunded');
    const failed = transactions.filter((t) => getTransactionBucket(t) === 'failed');

    return {
      total: transactions.length,
      paidActiveCount: paidActive.length,
      refundWaitingCount: refundWaiting.length,
      refundedCount: refunded.length,
      failedCount: failed.length,
      totalPaid: paidActive.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      totalRefunded: refunded.reduce((sum, t) => sum + Number(t.amount || 0), 0),
    };
  }, [transactions]);

  const formatBookingStatus = (raw) => BOOKING_STATUS_VI[raw] || raw || '—';

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Lịch sử giao dịch</h1>
          <p className="page-subtitle"></p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/renter/bookings')}>
          Xem booking
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: '0.84rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng giao dịch', value: summary.total, color: '#111827', isMoney: false },
          { label: 'Thành công (chưa hoàn)', value: summary.paidActiveCount, color: '#059669', isMoney: false },
          { label: 'Chờ hoàn tiền', value: summary.refundWaitingCount, color: '#d97706', isMoney: false },
          { label: 'Đã hoàn tiền', value: summary.refundedCount, color: '#0369a1', isMoney: false },
          { label: 'Thất bại / từ chối', value: summary.failedCount, color: '#dc2626', isMoney: false },
          { label: 'Đã chi (chưa hoàn)', value: formatMoney(summary.totalPaid), color: '#2563eb', isMoney: true },
          { label: 'Số tiền đã hoàn', value: formatMoney(summary.totalRefunded), color: '#0369a1', isMoney: true },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid #f0f0f0',
              padding: '12px 18px',
              minWidth: 140,
            }}
          >
            <div
              style={{
                fontSize: item.isMoney ? '1.05rem' : '1.35rem',
                fontWeight: 800,
                color: item.color,
              }}
            >
              {item.value}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#9ca3af', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div className="booking-tabs" style={{ marginBottom: 18 }}>
        {FILTERS.map((filter) => {
          const count = transactions.filter((transaction) => matchFilter(transaction, filter.key)).length;
          return (
            <button
              key={filter.key}
              className={`booking-tab ${activeFilter === filter.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
              {count > 0 && <span className="booking-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: '#6b7280' }}>Đang tải giao dịch...</div>
      ) : filteredTransactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: '#9ca3af', background: '#fff', borderRadius: 16 }}>
          <FaMoneyBillWave style={{ fontSize: '2.8rem', opacity: 0.25, marginBottom: 12 }} />
          <div>Chưa có giao dịch nào trong nhóm này</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredTransactions.map((transaction) => {
            const display = getTransactionDisplay(transaction);
            return (
              <div
                key={`${transaction.id}-${transaction.bookingId}`}
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  border: '1px solid #f0f0f0',
                  padding: 18,
                  display: 'grid',
                  gridTemplateColumns: '88px 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 88,
                    height: 68,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {transaction.image ? (
                    <img
                      src={transaction.image}
                      alt={transaction.vehicleName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <FaCarFallback />
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem' }}>{transaction.vehicleName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 3 }}>{transaction.showroomName}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.77rem',
                        color: '#6b7280',
                      }}
                    >
                      <FaCreditCard size={11} /> {transaction.method}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.77rem',
                        color: '#6b7280',
                      }}
                    >
                      <FaCalendarAlt size={11} /> {formatDateTime(transaction.createdAt)}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.77rem',
                        color: '#6b7280',
                      }}
                    >
                      <FaClock size={11} />{' '}
                      {transaction.paidAt ? formatDateTime(transaction.paidAt) : 'Chưa ghi nhận '}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: 8 }}>
                    <StatusBadge status={display.statusKey} customLabel={display.label} />
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: getAmountColor(transaction),
                      fontSize: '1rem',
                    }}
                  >
                    {formatMoney(transaction.amount)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4 }}>
                    Booking: {transaction.bookingId}
                  </div>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ marginLeft: 'auto', marginTop: 10 }}
                    onClick={() => setDetailModal(transaction)}
                    title="Chi tiết giao dịch"
                  >
                    <FaEye />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Chi tiết giao dịch" width={560}>
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 800, color: '#111827', fontSize: '1rem' }}>{detailModal.vehicleName}</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>{detailModal.showroomName}</div>
            </div>

            {[
              ['Mã đơn', detailModal.bookingId],
              ['Trạng thái đơn', formatBookingStatus(detailModal.bookingStatus)],
              ['Trạng thái giao dịch', getTransactionDisplay(detailModal).label],
              ['Phương thức', detailModal.method],
              ['Số tiền', formatMoney(detailModal.amount)],
              ['Tạo lúc', formatDateTime(detailModal.createdAt)],
              ['Thanh toán lúc', formatDateTime(detailModal.paidAt)],
              ['Mã giao dịch', detailModal.transactionCode || 'Chưa có'],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingBottom: 10,
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>{label}</span>
                <span style={{ color: '#111827', fontWeight: 600, fontSize: '0.82rem', textAlign: 'right' }}>
                  {value}
                </span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() =>
                  navigate(
                    `/renter/payment-result?bookingId=${detailModal.bookingId}&status=${
                      ['successful', 'refunded'].includes(detailModal.status) ? 'success' : 'error'
                    }`,
                  )
                }
              >
                <FaCheckCircle /> Xem kết quả thanh toán
              </button>
              {['pending', 'failed', 'declined'].includes(detailModal.status) && (
                <button
                  className="renter-btn-soft"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => navigate(`/renter/retry-payment/${detailModal.bookingId}`)}
                >
                  <FaMoneyBillWave /> Thanh toán lại
                </button>
              )}
              <button
                className="renter-btn-soft"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => navigate('/renter/bookings')}
              >
                Xem booking
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const FaCarFallback = () => (
  <div style={{ color: '#00b14f', fontSize: '1.8rem' }}>
    <FaMoneyBillWave />
  </div>
);

export default Transactions;
