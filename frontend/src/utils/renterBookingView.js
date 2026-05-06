import { sanitizeImageList } from './media';
import { canReviewBooking, resolveBookingVehicleId } from './bookingReviewEligibility';
import {
  CANCELLABLE_STATUSES,
  getBookingFlowState,
  getBookingPaymentStatus,
} from './bookingFlowState';
import { getRentalWorkflow } from './rentalWorkflowStorage';
import { getAiReportBadgeLabel, getAiFlowHeadline } from './renterAiReportStatus';

export const PAYMENT_LABELS = {
  pending: 'Chờ thanh toán',
  successful: 'Thành công',
  refunded: 'Đã hoàn trả',
  declined: 'Bị từ chối',
  failed: 'Thất bại',
};

/**
 * Hai badge (booking + payment) đôi khi lặp cùng ý: vd. «Chờ thanh toán» × 2,
 * hoặc «Đã thanh toán» + «Thành công». Ẩn badge payment khi không thêm thông tin.
 */
export const isPaymentStatusBadgeRedundant = (bookingStatus, paymentStatus) => {
  const ps = paymentStatus || '';
  const bs = bookingStatus || '';

  if (!ps) return true;
  if (ps === 'refunded') return false;
  if (['failed', 'declined'].includes(ps)) return false;

  if (ps === 'pending') {
    return bs === 'waiting_payment';
  }

  if (ps === 'successful') {
    return [
      'confirmed',
      'paid',
      'waiting_handover',
      'handed_over',
      'in_use',
      'waiting_return_confirmation',
      'completed',
    ].includes(bs);
  }

  return false;
};

const RETRY_PAYMENT_BOOKING_STATUSES = ['pending', 'waiting_payment'];

export const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('vi-VN');
};

export const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}d`;

const getDurationDays = (start, end) => {
  const diff = new Date(end) - new Date(start);
  return Math.max(1, Math.ceil(diff / 86400000));
};

const getLocationLabel = (note) => {
  const rawNote = String(note || '').trim();
  if (!rawNote) return 'Tu den lay';
  return rawNote;
};

const getCoordinationMeta = (booking, flowState, paymentStatus) => {
  const startLabel = flowState.hasStarted ? 'Đã đến giờ nhận xe' : 'Chưa đến giờ nhận xe';

  if (flowState.isAwaitingPayment) {
    const needsRetry = ['failed', 'declined'].includes(paymentStatus);
    return {
      headline: needsRetry ? 'Chờ bạn thanh toán lại' : 'Chờ bạn thanh toán',
      waitingFor: needsRetry
        ? 'Hệ thống đang chờ bạn tạo lại và hoàn tất phiên thanh toán.'
        : 'Hệ thống đang chờ bạn hoàn tất thanh toán cho booking này.',
      owner: 'Bên cần xử lý: Bạn thuê xe',
      nextStep: 'Sau khi thanh toán thành công, booking sẽ chuyển sang Chờ showroom xử lý.',
      renterAction: needsRetry ? 'Thanh toán lại để tiếp tục quy trình đặt xe.' : 'Hoàn tất thanh toán để showroom tiếp tục xử lý.',
      menuKey: 'pending-payments',
    };
  }

  if (flowState.isAwaitingShowroomProcessing) {
    const isConfirmed = booking.status === 'confirmed';
    return {
      headline: isConfirmed ? 'Cho showroom chuẩn bị bàn giao' : 'Chờ showroom xác nhận',
      waitingFor: isConfirmed
        ? 'Đang chờ showroom chuẩn bị xe và chuyển booking sang bước Chờ giao xe.'
        : 'Đang chờ showroom tiếp nhận booking đã thanh toán và xác nhận xử lý.',
      owner: 'Bên cần xử lý: Showroom',
      nextStep: 'Khi showroom cập nhật đã bàn giao, booking sẽ rời khỏi menu này và chuyển vào Chuyến đi của tôi.',
      renterAction: 'Theo dõi cập nhật từ showroom hoặc liên hệ nếu cần.',
      menuKey: 'pending-showroom-processing',
    };
  }

  if (flowState.isAwaitingPickup) {
    return {
      headline: 'Chờ showroom hoàn tất bàn giao',
      waitingFor: `Booking đã ở mức Chờ giao xe. ${startLabel}. Showroom cần hoàn tất bước bàn giao trên hệ thống trước khi booking được chuyển vào Chuyến đi của tôi.`,
      owner: 'Bên cần xử lý: Showroom',
      nextStep: 'Khi showroom cập nhật đã bàn giao, booking sẽ rời khỏi menu này và chuyển vào Chuyến đi của tôi.',
      renterAction: 'Đến điểm giao nhận đúng hẹn, kiểm tra xe và liên hệ showroom nếu cần bổ sung thông tin bàn giao.',
      menuKey: 'pending-pickups',
    };
  }

  if (booking.status === 'waiting_return_confirmation') {
    return {
      headline: 'Chờ showroom xác nhận đã trả xe',
      waitingFor: 'Bạn đã gửi yêu cầu trả xe. Đang chờ showroom xác nhận',
      owner: 'Bên cần xử lý: Showroom',
      nextStep: 'Sau khi showroom xác nhận, booking sẽ chuyển sang Hoàn thành.',
      renterAction: 'Theo dõi cập nhật hoàn tất hoặc liên hệ showroom nếu cần.',
      menuKey: 'bookings',
    };
  }

  if (flowState.isActive) {
    return {
      headline: flowState.hasEnded ? 'Đến hạn trả xe' : 'Đang trong thời gian thuê',
      waitingFor: flowState.hasEnded
        ? 'Hệ thống đang chờ bạn mở quy trình trả xe và lưu bộ hồ sơ đối chiếu.'
        : 'Booking đang ở giai đoạn thuê xe. Bạn chủ động sử dụng xe và báo sự cố nếu cần.',
      owner: 'Bên cần xử lý: Bạn thuê xe',
      nextStep: flowState.hasEnded
        ? 'Mở [Yêu cầu trả xe] xe để upload ảnh trả xe và lưu bộ hồ sơ đối chiếu cho showroom.'
        : 'Khi đến hạn, bạn sẽ mở yêu cầu trả xe để thực hiện bước trả xe.',
      renterAction: flowState.hasEnded ? 'Lưu biên bản và bộ ảnh trả xe, sau đó liên hệ showroom xác nhận.' : 'Theo dõi hạn thuê và giữ xe đúng hiện trạng.',
      menuKey: 'bookings',
    };
  }

  if (flowState.isCompleted) {
    return {
      headline: 'Đã hoàn thành',
      waitingFor: 'Booking này đã khớp quy trình trả xe và không còn bước nào đang chờ xử lý.',
      owner: 'Trạng thái: Hoàn tất',
      nextStep: 'Bạn có thể xem biên bản, kết quả kiểm tra và đánh giá xe nếu đủ điều kiện.',
      renterAction: 'Kiểm tra lại lịch sử hoặc để lại đánh giá.',
      menuKey: 'bookings',
    };
  }

  if (flowState.isCancelled) {
    return {
      headline: 'Đã hủy Booking',
      waitingFor: 'Booking này không còn tiếp tục trong quy trình đặt xe hiện tại.',
      owner: 'Trạng thái: Đã hủy',
      nextStep: paymentStatus === 'refunded'
        ? 'Khoản hoàn trả đã được ghi nhận trong lịch sử giao dịch.'
        : 'Nếu cần đặt lại xe, bạn có thể tạo booking mới.',
      renterAction: 'Kiểm tra lịch sử giao dịch nếu cần đối chiếu thanh toán.',
      menuKey: 'bookings',
    };
  }

  return {
    headline: 'Đang xử lý Booking',
    waitingFor: 'Booking đang được hệ thống theo dõi theo trạng thái hiện tại.',
    owner: 'Bên cần xử lý: Đang cập nhật',
    nextStep: 'Theo dõi tiếp cập nhật trên từng menu của renter.',
    renterAction: 'Kiểm tra chi tiết booking nếu cần.',
    menuKey: 'bookings',
  };
};

export const mapRenterBooking = (booking) => {
  const images = sanitizeImageList([
    ...(booking.vehicle?.images || []),
    ...(booking.vehicle_id?.vehicle_images_paths || []),
    ...(booking.vehicle_id?.images || []),
  ]);

  const paymentStatus = getBookingPaymentStatus(booking);
  const flowState = getBookingFlowState(booking, paymentStatus);
  const workflow = getRentalWorkflow(booking._id);
  const coordination = getCoordinationMeta(booking, flowState, paymentStatus);
  const aiInv = booking.ai_inspection || null;

  return {
    id: booking._id,
    vehicleId: resolveBookingVehicleId(booking),
    vehicleName: booking.vehicle?.name || booking.vehicle_id?.vehicle_name || 'Xe không tên',
    showroomName: booking.showroom?.name || booking.showroom_id?.name || 'SmartRent',
    showroomEmail: booking.showroom?.email || booking.showroom_id?.email || '',
    startDate: booking.start_date,
    endDate: booking.end_date,
    durationDays: getDurationDays(booking.start_date, booking.end_date),
    locationLabel: getLocationLabel(booking.note),
    status: booking.status,
    totalPrice: booking.total_price,
    note: booking.note || '',
    image: images[0] || '',
    paymentStatus,
    paymentMethod: booking.payment?.payment_method || 'Chưa có',
    paymentRecord: booking.payment || null,
    canRetryPayment:
      RETRY_PAYMENT_BOOKING_STATUSES.includes(booking.status)
      && ['pending', 'failed', 'declined'].includes(paymentStatus),
    canCancel: CANCELLABLE_STATUSES.includes(booking.status),
    canReviewVehicle: canReviewBooking(booking),
    canConfirmPickup: flowState.canConfirmPickup,
    canOpenRentalFlow: flowState.canOpenRentalFlow,
    canReportIssue: flowState.isActive,
    hasRentalEnded: flowState.hasEnded,
    hasRentalStarted: flowState.hasStarted,
    isActive: flowState.isActive,
    isAwaitingPayment: flowState.isAwaitingPayment,
    isAwaitingShowroomProcessing: flowState.isAwaitingShowroomProcessing,
    isAwaitingPickup: flowState.isAwaitingPickup,
    isCancelled: flowState.isCancelled,
    isCompleted: flowState.isCompleted,
    isUpcoming: flowState.isUpcoming,
    ai_inspection: aiInv,
    hasAiInspectionReport: Boolean(aiInv?.status === 'ready' && aiInv?.result),
    aiReportBadge: getAiReportBadgeLabel(aiInv),
    aiFlowHeadline: getAiFlowHeadline(aiInv),
    pickupConfirmationHint: flowState.pickupConfirmationHint,
    rentalAccessHint: flowState.rentalAccessHint,
    rentalActionLabel: flowState.rentalActionLabel || 'Yêu cầu trả xe',
    statusHeadline: coordination.headline,
    waitingForLabel: coordination.waitingFor,
    waitingOwnerLabel: coordination.owner,
    nextStepLabel: coordination.nextStep,
    renterActionHint: coordination.renterAction,
    menuKey: coordination.menuKey,
    workflow,
    raw: booking,
  };
};
