import { useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt, FaExchangeAlt, FaMoneyBillWave, FaReceipt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import VehicleTripReviewModal from '../../../components/common/VehicleTripReviewModal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import { formatDateTime, formatMoney } from '../../../utils/renterBookingView';
import {
  cardHint,
  cardValue,
  createRecentMonthBuckets,
  getMonthKey,
  getPaymentVisual,
  resolveFinanceItem,
  SUMMARY_CARD_CONFIG,
  timestampOf,
} from './renterDashboard.helpers';

const PaymentPill = ({ item }) => {
  const visual = getPaymentVisual(item);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        background: visual.bg,
        color: visual.color,
        whiteSpace: 'nowrap',
      }}
    >
      {visual.label}
    </span>
  );
};

const EmptyPanel = ({ title, description }) => (
  <div
    style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      border: '1px dashed #d1d5db',
      borderRadius: 18,
      padding: 24,
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#111827' }}>{title}</div>
    <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 6 }}>{description}</div>
  </div>
);

const RenterDashboard = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState({ tone: '', text: '' });
  const [reviewModalItem, setReviewModalItem] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const bookings = await bookingService.getCurrentRoleBookingsDetailed();
        if (!mounted) return;
        setItems((bookings || []).map(resolveFinanceItem));
        setError('');
      } catch (err) {
        if (!mounted) return;
        setItems([]);
        setError(err.message || 'Không thể tải dữ liệu tài chính.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const recordedItems = items.filter((item) => item.paymentRecorded);
    const refundItems = items.filter((item) => item.hasRefundActivity);
    const pendingItems = items.filter((item) => item.pendingPayment);
    return {
      recordedAmount: recordedItems.reduce((s, i) => s + Number(i.amount || 0), 0),
      refundTrackingAmount: refundItems.reduce((s, i) => s + Number(i.amount || 0), 0),
      refundTrackingCount: refundItems.length,
      pendingAmount: pendingItems.reduce((s, i) => s + Number(i.amount || 0), 0),
      recordedCount: recordedItems.length,
      refundPendingCount: items.filter((i) => i.refundPending).length,
      refundCompletedCount: items.filter((i) => i.refundCompleted).length,
      pendingCount: pendingItems.length,
    };
  }, [items]);

  const chartData = useMemo(() => {
    const monthBuckets = createRecentMonthBuckets(6);
    const bucketMap = new Map(
      monthBuckets.map((b) => [b.key, { name: b.label, bookedAmount: 0, refundAmount: 0, pendingAmount: 0 }]),
    );
    items.forEach((item) => {
      const d = item.timelineDate || item.createdAt;
      if (!d) return;
      const bucket = bucketMap.get(getMonthKey(d));
      if (!bucket) return;
      if (item.paymentRecorded) bucket.bookedAmount += Number(item.amount || 0);
      if (item.hasRefundActivity) bucket.refundAmount += Number(item.amount || 0);
      if (item.pendingPayment) bucket.pendingAmount += Number(item.amount || 0);
    });
    return monthBuckets.map((b) => bucketMap.get(b.key));
  }, [items]);

  const refundCases = useMemo(
    () =>
      [...items]
        .filter((i) => i.hasRefundActivity)
        .sort((a, b) => timestampOf(b.timelineDate) - timestampOf(a.timelineDate)),
    [items],
  );
  const recentItems = useMemo(
    () => [...items].sort((a, b) => timestampOf(b.timelineDate) - timestampOf(a.timelineDate)).slice(0, 6),
    [items],
  );

  const closeReviewModal = () => setReviewModalItem(null);

  const openReviewModal = (item) => {
    if (!item?.vehicleId || !item?.bookingId) return;
    setReviewModalItem(item);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 16,
            padding: '14px 16px',
            fontSize: '0.86rem',
          }}
        >
          {error}
        </div>
      )}
      {notice.text && (
        <div
          style={{
            background: notice.tone === 'warning' ? '#fff7ed' : '#f0fdf4',
            border: notice.tone === 'warning' ? '1px solid #fdba74' : '1px solid #86efac',
            color: notice.tone === 'warning' ? '#9a3412' : '#166534',
            borderRadius: 16,
            padding: '14px 16px',
            fontSize: '0.86rem',
            lineHeight: 1.6,
          }}
        >
          {notice.text}
        </div>
      )}

      {/* Summary cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {SUMMARY_CARD_CONFIG.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                border: '1px solid #edf2f7',
                padding: 20,
                boxShadow: '0 18px 45px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {card.label}
                  </div>
                  <div
                    style={{
                      fontSize: card.key === 'refundTrackingCount' ? '1.8rem' : '1.55rem',
                      fontWeight: 900,
                      color: '#111827',
                      marginTop: 10,
                    }}
                  >
                    {loading ? '...' : cardValue(card.key, summary)}
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: card.tint,
                    color: card.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}
                >
                  <Icon />
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 12, lineHeight: 1.55 }}>
                {loading ? 'Đang tổng hợp dữ liệu...' : cardHint(card.key, summary)}
              </div>
            </div>
          );
        })}
      </section>

      {/* Chart */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: 24,
          border: '1px solid #edf2f7',
          padding: 22,
          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#111827' }}>Dòng tiền 6 tháng gần đây</div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 999,
              background: '#f8fafc',
              color: '#475569',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <FaCalendarAlt /> Cập nhật booking / thanh toán hiện có
          </div>
        </div>
        <div style={{ width: '100%', height: 320, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartData} barGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Math.round(Number(v || 0) / 1000000)}tr`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                formatter={(v) => formatMoney(v)}
                labelStyle={{ fontWeight: 700, color: '#0f172a' }}
              />
              <Bar dataKey="bookedAmount" name="Đã ghi nhận" fill="#00b14f" radius={[8, 8, 0, 0]} />
              <Bar dataKey="refundAmount" name="Hoàn trả / đang xử lý" fill="#2563eb" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pendingAmount" name="Chờ thanh toán" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Refund + recent */}
      <section className="grid gap-[18px] xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f7',
            padding: 22,
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#111827' }}>Theo dõi hoàn trả</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>
                Booking đã hủy có payment ghi nhận — theo dõi để đối chiếu.
              </div>
            </div>
            <button type="button" className="renter-btn-soft" onClick={() => navigate('/renter/transactions')}>
              <FaExchangeAlt /> Xem payment
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '48px 0' }}>Đang tải dashboard...</div>
          ) : refundCases.length === 0 ? (
            <EmptyPanel
              title="Chưa có đơn nào cần theo dõi hoàn trả"
              description="Khi đơn đặt xe bị hủy sau khi đã có giao dịch ghi nhận, mục này sẽ hiện để theo dõi."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {refundCases.map((item) => (
                <div
                  key={`${item.bookingId}-refund`}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 18,
                    padding: 16,
                    display: 'grid',
                    gridTemplateColumns: '82px minmax(0, 1fr)',
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 82,
                      height: 70,
                      borderRadius: 14,
                      background: item.image ? '#e5e7eb' : 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563eb',
                      fontWeight: 800,
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.vehicleName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      'REF'
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#111827' }}>{item.vehicleName}</div>
                      <StatusBadge status={item.status} />
                      <PaymentPill item={item} />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>{item.showroomName}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.78rem',
                          color: '#64748b',
                        }}
                      >
                        <FaMoneyBillWave size={11} /> {formatMoney(item.amount)}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.78rem',
                          color: '#64748b',
                        }}
                      >
                        <FaCalendarAlt size={11} /> {formatDateTime(item.updatedAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: item.refundCompleted ? '#ecfdf5' : '#eff6ff',
                        color: item.refundCompleted ? '#166534' : '#1d4ed8',
                        fontSize: '0.8rem',
                        lineHeight: 1.55,
                      }}
                    >
                      {item.refundHint}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                      <button type="button" className="renter-btn-soft" onClick={() => navigate('/renter/bookings')}>
                        Chuyến đi của tôi
                      </button>
                      <button type="button" className="btn-primary" onClick={() => navigate('/renter/transactions')}>
                        Xem giao dịch
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f7',
            padding: 22,
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#111827' }}>Giao dịch gần đây</div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4, marginBottom: 16 }}>
            Các booking và payment mới nhất.
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '48px 0' }}>Đang tải lịch sử...</div>
          ) : recentItems.length === 0 ? (
            <EmptyPanel
              title="Chưa có giao dịch nào"
              description="Khi bạn tạo đơn đặt xe và thanh toán, dashboard sẽ hiện các mục tổng hợp tại đây."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentItems.map((item) => (
                <div
                  key={`${item.bookingId}-${item.id}`}
                  style={{
                    border: '1px solid #eef2f7',
                    borderRadius: 16,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827' }}>{item.vehicleName}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 4 }}>{item.showroomName}</div>
                    </div>
                    <PaymentPill item={item} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <StatusBadge status={item.status} />
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Booking: {item.bookingId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.77rem',
                          color: '#64748b',
                        }}
                      >
                        <FaReceipt size={11} /> {item.paymentMethod}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.77rem',
                          color: '#64748b',
                        }}
                      >
                        <FaCalendarAlt size={11} /> {formatDateTime(item.timelineDate)}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 900,
                          color: item.hasRefundActivity ? '#2563eb' : '#00b14f',
                        }}
                      >
                        {formatMoney(item.amount)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                        {item.transactionCode || 'Chưa có mã giao dịch'}
                      </div>
                    </div>
                  </div>
                  {item.canReviewVehicle && item.vehicleId && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" className="renter-btn-soft" onClick={() => openReviewModal(item)}>
                        Đánh giá đơn thuê này
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <VehicleTripReviewModal
        isOpen={Boolean(reviewModalItem)}
        onClose={closeReviewModal}
        bookingId={reviewModalItem?.bookingId || ''}
        vehicleId={reviewModalItem?.vehicleId || ''}
        vehicleName={reviewModalItem?.vehicleName || ''}
        onSuccess={({ message }) => setNotice({ tone: 'success', text: message })}
      />
    </div>
  );
};

export default RenterDashboard;
