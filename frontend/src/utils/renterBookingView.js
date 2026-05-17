import { CANCELLABLE_STATUSES, getBookingFlowState, getBookingPaymentStatus } from './bookingFlowState';
import { canReviewBooking, resolveBookingVehicleId } from './bookingReviewEligibility';
import { sanitizeImageList } from './media';
import { getRentalWorkflow } from './rentalWorkflowStorage';
import { getAiFlowHeadline, getAiReportBadgeLabel } from './renterAiReportStatus';

export const PAYMENT_LABELS = {
  pending: 'Chờ thanh toán',
  successful: 'Thành công',
  refunded: 'Đã hoàn trả',
  declined: 'Bị từ chối',
  failed: 'Thất bại',
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
        : 'Hệ thống đang chờ bạn hoàn tất thanh toán cho đơn đặt xe này.',
      owner: 'Bên cần xử lý: Bạn',
      nextStep: 'Sau khi thanh toán thành công, showroom sẽ xác nhận và chốt thời gian bàn giao xe.',
      renterAction: needsRetry
        ? 'Thanh toán lại để tiếp tục quy trình đặt xe.'
        : 'Hoàn tất thanh toán để showroom tiếp tục xử lý.',
      menuKey: 'bookings',
    };
  }

  if (flowState.isAwaitingShowroomProcessing) {
    return {
      headline: 'Showroom đang chuẩn bị bàn giao',
      waitingFor: 'Bạn đã thanh toán thành công. Showroom sẽ xác nhận và chốt thời gian bàn giao xe.',
      owner: 'Bên cần xử lý: Showroom',
      nextStep:
        'Showroom sẽ chuyển đơn đặt xe sang trạng thái Chờ bàn giao. Bạn sẽ nhận được thông báo khi có cập nhật.',
      renterAction: 'Chờ showroom xác nhận. Liên hệ showroom nếu cần hỗ trợ.',
      menuKey: 'pending-showroom-processing',
    };
  }

  if (flowState.isAwaitingPickup) {
    const isHandedOver = booking.status === 'handed_over';
    return {
      headline: isHandedOver ? 'Xác nhận đã nhận xe' : 'Chờ showroom hoàn tất bàn giao',
      waitingFor: isHandedOver
        ? 'Showroom đã đánh dấu đã bàn giao xe. Hãy kiểm tra xe và xác nhận đã nhận để bắt đầu chuyển đi.'
        : `Đơn đặt xe đã ở mức Chờ giao xe. ${startLabel}. Showroom cần hoàn tất bước bàn giao trên hệ thống.`,
      owner: isHandedOver ? 'Bên cần xử lý: Bạn' : 'Bên cần xử lý: Showroom',
      nextStep: isHandedOver
        ? 'Sau khi xác nhận, đơn đặt xe chuyển sang Đang thuê và chuyển đi bắt đầu được tính.'
        : 'Khi showroom cập nhật đã bàn giao, bạn sẽ nhận được thông báo và cần xác nhận nhận xe.',
      renterAction: isHandedOver
        ? 'Kiểm tra xe kỹ rồi bấm "Xác nhận đã nhận xe". Khi đó thời gian thuê bắt đầu được tính.'
        : 'Đến điểm giao nhận đúng giờ, kiểm tra xe và liên hệ showroom nếu cần.',
      menuKey: 'pending-pickups',
    };
  }

  if (booking.status === 'waiting_return_confirmation') {
    return {
      headline: 'Chờ showroom xác nhận đã trả xe',
      waitingFor: 'Bạn đã gửi yêu cầu trả xe. Đang chờ showroom xác nhận',
      owner: 'Bên cần xử lý: Showroom',
      nextStep: 'Sau khi showroom xác nhận, đơn đặt xe sẽ chuyển sang Hoàn thành.',
      renterAction: 'Theo dõi cập nhật hoàn tất hoặc liên hệ showroom nếu cần.',
      menuKey: 'bookings',
    };
  }

  if (flowState.isActive) {
    return {
      headline: flowState.hasEnded ? 'Đến hạn trả xe' : 'Đang trong thời gian thuê',
      waitingFor: flowState.hasEnded
        ? 'Hệ thống đang chờ bạn mở quy trình trả xe và lưu bộ hồ sơ đối chiếu.'
        : 'Đơn đặt xe đang ở giai đoạn thuê xe. Bạn chủ động sử dụng xe và báo sự cố nếu cần.',
      owner: 'Bên cần xử lý: Bạn',
      nextStep: flowState.hasEnded
        ? 'Mở [Yêu cầu trả xe] xe để upload ảnh trả xe và lưu bộ hồ sơ đối chiếu cho showroom.'
        : 'Khi đến hạn, bạn sẽ mở yêu cầu trả xe để thực hiện bước trả xe.',
      renterAction: flowState.hasEnded
        ? 'Lưu biên bản và bộ ảnh trả xe, sau đó liên hệ showroom xác nhận.'
        : 'Theo dõi hạn thuê và giữ xe đúng hiện trạng.',
      menuKey: 'bookings',
    };
  }

  if (flowState.isCompleted) {
    return {
      headline: 'Đã hoàn thành',
      waitingFor: 'Đơn đặt xe này đã khớp quy trình trả xe và không còn bước nào đang chờ xử lý.',
      owner: 'Trạng thái: Hoàn tất',
      nextStep: 'Bạn có thể xem biên bản, kết quả kiểm tra và đánh giá xe nếu đủ điều kiện.',
      renterAction: 'Kiểm tra lại lịch sử hoặc để lại đánh giá.',
      menuKey: 'bookings',
    };
  }

  if (booking.status === 'refund_requested') {
    return {
      headline: 'Chờ showroom xác nhận hoàn trả',
      waitingFor:
        'Bạn đã gửi yêu cầu hoàn trả và giao dịch vẫn được ghi nhận thành công. Showroom sẽ xem lý do và xác nhận hoàn tiền.',
      owner: 'Bên cần xử lý: Showroom',
      nextStep: 'Sau khi showroom xác nhận, tiền sẽ được hoàn và đơn chuyển sang đã hủy.',
      renterAction: 'Xem Lịch sử giao dịch (nhóm Chờ hoàn tiền) hoặc liên hệ showroom nếu cần.',
      menuKey: 'bookings',
    };
  }

  if (flowState.isCancelled) {
    const isRefundPending =
      booking.status === 'cancel_pending' || (booking.status === 'cancelled' && paymentStatus === 'successful');
    const isRefundFailed = booking.status === 'cancel_failed';
    return {
      headline: isRefundFailed
        ? 'Hủy đơn thành công, hoàn tiền gặp lỗi'
        : isRefundPending
          ? 'Đang xử lý hoàn tiền'
          : 'Đã hủy đơn đặt xe',
      waitingFor: isRefundFailed
        ? 'Đơn đặt xe đã hủy nhưng hệ thống chưa hoàn tất hoàn tiền tự động.'
        : isRefundPending
          ? 'Đơn đặt xe đã hủy. Hệ thống đang xử lý hoặc chờ ghi nhận hoàn tiền.'
          : 'Đơn đặt xe này không còn tiếp tục trong quy trình thuê xe hiện tại.',
      owner: isRefundFailed
        ? 'Trạng thái: Hủy/hoàn tiền lỗi'
        : isRefundPending
          ? 'Trạng thái: Đang hoàn tiền'
          : 'Trạng thái: Đã hủy',
      nextStep:
        paymentStatus === 'refunded'
          ? 'Khoản hoàn trả đã được ghi nhận trong lịch sử giao dịch.'
          : isRefundFailed
            ? 'Liên hệ showroom hoặc admin để kiểm tra lỗi hoàn tiền và xử lý thủ công nếu cần.'
            : isRefundPending
              ? 'Theo dõi lịch sử giao dịch để xem khi khoản hoàn tiền được ghi nhận.'
              : 'Nếu cần đặt lại xe, bạn có thể tạo đơn đặt xe mới.',
      renterAction: 'Kiểm tra lịch sử giao dịch nếu cần đối chiếu thanh toán.',
      menuKey: 'bookings',
    };
  }
  return {
    headline: 'Đang xử lý đơn đặt xe',
    waitingFor: 'Đơn đặt xe đang được hệ thống theo dõi theo trạng thái hiện tại.',
    owner: 'Bên cần xử lý: Đang cập nhật',
    nextStep: 'Theo dõi tiếp cập nhật trên từng menu của renter.',
    renterAction: 'Kiểm tra chi tiết đơn đặt xe nếu cần.',
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
      RETRY_PAYMENT_BOOKING_STATUSES.includes(booking.status) &&
      ['pending', 'failed', 'declined'].includes(paymentStatus),
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

