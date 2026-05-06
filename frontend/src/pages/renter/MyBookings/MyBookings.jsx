import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaCamera,
  FaClock,
  FaMapMarkerAlt,
  FaSearch,
} from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import {
  mapRenterBooking,
  PAYMENT_LABELS,
  formatDateTime,
  formatMoney,
  isPaymentStatusBadgeRedundant,
} from '../../../utils/renterBookingView';
import RentalFlowModal from './RentalFlowModal';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import RentalContractViewerModal from '../components/RentalContractViewerModal';
import { canRenterViewOfficialRentalContract } from '../../../utils/rentalContractEligibility';

const MyBookings = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlightedBookingId = params.get('bookingId') || '';
  const fromNotification = params.get('fromNotification') === '1';
  const handledHighlightRef = useRef('');
  const handledScrollRef = useRef('');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState({ tone: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [rentalModalBooking, setRentalModalBooking] = useState(null);
  const [contractBookingId, setContractBookingId] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
      setBookings((data || []).map(mapRenterBooking));
      setError('');
    } catch (err) {
      setBookings([]);
      setError(err.message || 'Không thể tải danh sách xe đang thuê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const activeBookings = useMemo(
    () => bookings.filter((booking) => booking.isActive),
    [bookings]
  );

  const displayedBookings = useMemo(() => {
    const normalized = String(searchTerm || '').trim().toLowerCase();
    if (!normalized) {
      return activeBookings;
    }

    return activeBookings.filter((booking) => (
      [booking.id, booking.vehicleName, booking.showroomName, booking.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    ));
  }, [activeBookings, searchTerm]);

  useEffect(() => {
    if (!fromNotification || !highlightedBookingId || loading) {
      return;
    }
    if (!displayedBookings.some((b) => String(b.id) === String(highlightedBookingId))) {
      return;
    }
    const key = `${highlightedBookingId}:scroll`;
    if (handledScrollRef.current === key) {
      return;
    }
    handledScrollRef.current = key;
    requestAnimationFrame(() => {
      document.getElementById(`renter-booking-card-${highlightedBookingId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [displayedBookings, fromNotification, highlightedBookingId, loading]);

  const summary = useMemo(
    () => ({
      active: activeBookings.length,
      dueReturn: activeBookings.filter((booking) => booking.hasRentalEnded).length,
      waitingReturnConfirmation: activeBookings.filter((booking) => booking.status === 'waiting_return_confirmation').length,
    }),
    [activeBookings]
  );

  useEffect(() => {
    if (!highlightedBookingId || loading || bookings.length === 0) {
      return;
    }

    const handledKey = `${window.location.pathname}:${highlightedBookingId}`;
    if (handledHighlightRef.current === handledKey) {
      return;
    }

    const targetBooking = bookings.find((booking) => String(booking.id) === String(highlightedBookingId));
    if (!targetBooking) {
      return;
    }

    handledHighlightRef.current = handledKey;

    if (targetBooking.isAwaitingPayment) {
      navigate(`/renter/pending?tab=payment&bookingId=${targetBooking.id}&fromNotification=${fromNotification ? '1' : '0'}`, { replace: true });
      return;
    }

    if (targetBooking.isAwaitingShowroomProcessing) {
      navigate(`/renter/pending?tab=showroom&bookingId=${targetBooking.id}&fromNotification=${fromNotification ? '1' : '0'}`, { replace: true });
      return;
    }

    if (targetBooking.isAwaitingPickup) {
      navigate(`/renter/pending?tab=pickup&bookingId=${targetBooking.id}&fromNotification=${fromNotification ? '1' : '0'}`, { replace: true });
      return;
    }

    if (targetBooking.isActive) {
      setDetailModal(targetBooking);
    }
  }, [bookings, fromNotification, highlightedBookingId, loading, navigate]);

  const applyBookingUpdate = (booking, nextStatus, nextWorkflow, nextAiInspection) => {
    if (!booking) {
      return booking;
    }

    const updatedStatus = nextStatus || booking.status;
    const nextAi = nextAiInspection !== undefined ? nextAiInspection : booking.raw?.ai_inspection;
    const updatedRaw = booking.raw
      ? {
        ...booking.raw,
        _id: booking.raw._id || booking.id,
        status: updatedStatus,
        payment: booking.paymentRecord || booking.raw.payment || null,
        ai_inspection: nextAi,
      }
      : {
        _id: booking.id,
        start_date: booking.startDate,
        end_date: booking.endDate,
        total_price: booking.totalPrice,
        note: booking.note,
        status: updatedStatus,
        payment: booking.paymentRecord || null,
        ai_inspection: nextAi,
        vehicle: booking.raw?.vehicle || null,
        vehicle_id: booking.raw?.vehicle_id || null,
        showroom: booking.raw?.showroom || null,
        showroom_id: booking.raw?.showroom_id || null,
      };

    const remapped = mapRenterBooking(updatedRaw);
    return {
      ...remapped,
      workflow: nextWorkflow || remapped.workflow,
    };
  };

  const handleWorkflowSaved = (payload) => {
    const targetId = rentalModalBooking?.id;
    if (!targetId) {
      return;
    }

    const nextWorkflow = payload?.workflow || payload;
    const nextStatus = payload?.status || '';

    const applyByTarget = (booking) => (
      booking && booking.id === targetId
        ? applyBookingUpdate(booking, nextStatus, nextWorkflow, payload?.ai_inspection)
        : booking
    );

    setBookings((current) => current.map((booking) => applyByTarget(booking)));
    setDetailModal((current) => (current ? applyByTarget(current) : current));
    setRentalModalBooking((current) => (current ? applyByTarget(current) : current));

    if (payload?.notice?.text) {
      setNotice(payload.notice);
      return;
    }

    if (nextStatus === 'waiting_return_confirmation') {
      setNotice({
        tone: 'success',
        text: 'Trạng thái booking trên hệ thống: chờ showroom xác nhận trả xe (nếu bạn vừa chỉ lưu hồ sơ cục bộ, hãy vẫn liên hệ showroom để đóng booking).',
      });
    }
  };

  const renderEmptyState = () => (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 20px',
        color: '#9ca3af',
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #f1f5f9',
      }}
    >
      <MdDirectionsCar style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.3 }} />
      <div style={{ fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>
        Bạn chưa có xe nào đang thuê hoặc đang trong bước trả xe.
      </div>
      <div style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.6, marginBottom: 16 }}>
        Các booking chờ thanh toán, chờ showroom, chờ nhận xe và các trạng thái khác: dùng «Đặt xe đang chờ» hoặc «Chuyến đi của tôi».
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button className="renter-btn-soft" onClick={() => navigate('/renter/pending?tab=showroom')}>
          Mở chờ showroom
        </button>
        <button className="renter-btn-soft" onClick={() => navigate('/renter/pending?tab=pickup')}>
          Mở chờ nhận xe
        </button>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Đặt xe mới
        </button>
      </div>
    </div>
  );

  return (
    <div className="my-bookings">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Chuyến đi của tôi</h1>
          <p className="page-subtitle">
            Xem danh sách thuê xe và quản lý quy trình trả xe khi đến hạn.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/')}>Hành trình mới</button>
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

      {notice.text && (
        <div
          style={{
            marginBottom: 16,
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: '0.84rem',
            lineHeight: 1.6,
            background: notice.tone === 'warning' ? '#fff7ed' : '#f0fdf4',
            border: notice.tone === 'warning' ? '1px solid #fdba74' : '1px solid #86efac',
            color: notice.tone === 'warning' ? '#9a3412' : '#166534',
          }}
        >
          {notice.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Đang thuê', val: summary.active, color: '#2563eb' },
          { label: 'Cần trả xe', val: summary.dueReturn, color: '#d97706' },
          { label: 'Chờ showroom xác nhận', val: summary.waitingReturnConfirmation, color: '#7c3aed' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: '10px 18px',
              border: '1px solid #f0f0f0',
              textAlign: 'center',
              minWidth: 150,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: item.color }}>{item.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <label
          style={{
            minWidth: 260,
            flex: '1 1 320px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#fff',
            borderRadius: 14,
            padding: '0 14px',
            minHeight: 44,
          }}
        >
          <FaSearch style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo mã đặt xe, tên xe hoặc showroom"
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.84rem',
              color: '#111827',
              background: 'transparent',
            }}
          />
        </label>
      </div>

      <div className="booking-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>Đang tải danh sách xe...</div>
        ) : displayedBookings.length === 0 ? (
          renderEmptyState()
        ) : (
          displayedBookings.map((booking) => (
            <div
              key={booking.id}
              id={`renter-booking-card-${booking.id}`}
              className="booking-card-item"
              onClick={() => setDetailModal(booking)}
              style={String(booking.id) === String(highlightedBookingId)
                ? {
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 12px 30px rgba(37, 99, 235, 0.12)',
                  background: '#f8fbff',
                  cursor: 'pointer',
                }
                : { cursor: 'pointer' }}
            >
              <div className="booking-card-left">
                <div className="booking-card-img" style={{ overflow: 'hidden', background: '#f3f4f6' }}>
                  {booking.image ? (
                    <img
                      src={booking.image}
                      alt={booking.vehicleName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <MdDirectionsCar style={{ fontSize: '2.5rem', color: '#00b14f' }} />
                  )}
                </div>
                <div className="booking-card-info">
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>{booking.vehicleName}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 3 }}>{booking.showroomName}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <FaCalendarAlt size={11} /> {formatDateTime(booking.startDate)} - {formatDateTime(booking.endDate)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <FaClock size={11} /> {booking.durationDays} ngày
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <FaMapMarkerAlt size={11} /> {booking.locationLabel}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>{booking.statusHeadline}</div>
                  <div style={{ marginTop: 4, fontSize: '0.76rem', color: '#6b7280', lineHeight: 1.6 }}>{booking.waitingForLabel}</div>
                  {(booking.canOpenRentalFlow || booking.isActive) && (
                    <div
                      style={{
                        marginTop: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      AI: {booking.aiReportBadge}
                    </div>
                  )}
                </div>
              </div>

              <div className="booking-card-right">
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={booking.status} />
                  {!isPaymentStatusBadgeRedundant(booking.status, booking.paymentStatus) && (
                    <div style={{ marginTop: 6 }}>
                      <StatusBadge
                        status={booking.paymentStatus}
                        customLabel={PAYMENT_LABELS[booking.paymentStatus] || booking.paymentStatus}
                      />
                    </div>
                  )}
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#00b14f', marginTop: 8 }}>
                    {formatMoney(booking.totalPrice)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>Ma: {booking.id}</div>
                  {booking.hasAiInspectionReport && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 8,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: '#ecfeff',
                        color: '#0f766e',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {booking.aiReportBadge}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {canRenterViewOfficialRentalContract(booking) && (
                    <button
                      type="button"
                      className="renter-btn-soft"
                      style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setContractBookingId(booking.id);
                      }}
                    >
                      {RENTAL_CONTRACT_UI.officialButton}
                    </button>
                  )}
                  {booking.canOpenRentalFlow && (
                    <button
                      style={{
                        background: '#00b14f',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setRentalModalBooking(booking);
                      }}
                    >
                      {booking.rentalActionLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Chi tiết xe đang thuê" width={520}>
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{detailModal.vehicleName}</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>{detailModal.showroomName}</div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              <div style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>{detailModal.statusHeadline}</div>
              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.65, marginBottom: 8 }}>
                {detailModal.waitingForLabel}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, marginBottom: 6 }}>
                {detailModal.waitingOwnerLabel}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
                Bước tiếp theo: {detailModal.nextStepLabel}
              </div>
              <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#0f766e', lineHeight: 1.6 }}>
                Việc bạn nên làm: {detailModal.renterActionHint}
              </div>
            </div>

            {(detailModal.canOpenRentalFlow || detailModal.isActive) && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#334155',
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Trạng thái AI</div>
                <div>{detailModal.aiFlowHeadline}</div>
                <div style={{ marginTop: 6, fontSize: '0.76rem', color: '#64748b' }}>{detailModal.aiReportBadge}</div>
              </div>
            )}

            {detailModal.hasAiInspectionReport && (
              <div
                style={{
                  background: '#ecfeff',
                  border: '1px solid #a5f3fc',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#0f766e',
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                }}
              >
                Báo cáo AI đã được lưu trên server theo booking. Bạn có thể mở trang Báo cáo AI hoặc xuất chi tiết từ đó.
              </div>
            )}

            {[
              ['Mã booking', detailModal.id],
              ['Ngày nhận xe', formatDateTime(detailModal.startDate)],
              ['Ngày trả xe', formatDateTime(detailModal.endDate)],
              ['Số ngày thuê', `${detailModal.durationDays} ngày`],
              ['Tổng tiền', formatMoney(detailModal.totalPrice)],
              ['Trạng thái booking', detailModal.status],
              ['Trạng thái thanh toán', PAYMENT_LABELS[detailModal.paymentStatus] || detailModal.paymentStatus],
              ['Địa điểm giao nhận', detailModal.locationLabel],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderBottom: '1px solid #f3f4f6',
                  paddingBottom: 10,
                }}
              >
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</span>
              </div>
            ))}

            {canRenterViewOfficialRentalContract(detailModal) && (
              <button
                type="button"
                className="renter-btn-soft"
                style={{ justifyContent: 'center' }}
                onClick={() => setContractBookingId(detailModal.id)}
              >
                {RENTAL_CONTRACT_UI.officialButton}
              </button>
            )}

            <button
              className="renter-btn-soft-success"
              style={{ justifyContent: 'center' }}
              onClick={() => setRentalModalBooking(detailModal)}
            >
              <FaCamera /> {detailModal.rentalActionLabel}
            </button>
          </div>
        )}
      </Modal>

      <RentalFlowModal
        isOpen={!!rentalModalBooking}
        onClose={() => setRentalModalBooking(null)}
        booking={rentalModalBooking}
        onSaved={handleWorkflowSaved}
      />

      <RentalContractViewerModal
        isOpen={!!contractBookingId}
        bookingId={contractBookingId || ''}
        onClose={() => setContractBookingId(null)}
      />
    </div>
  );
};

export default MyBookings;
