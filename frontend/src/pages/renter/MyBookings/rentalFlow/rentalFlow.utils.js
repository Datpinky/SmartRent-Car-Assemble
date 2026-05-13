import { FLOW_STEPS } from './rentalFlow.constants';

export const getCurrentStepIndex = (status) => {
  const index = FLOW_STEPS.findIndex((step) => step.status === status);
  return index === -1 ? 0 : index;
};

export const countChecked = (values = {}) => Object.values(values).filter(Boolean).length;

export const formatFlowDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('vi-VN');
};

export const getDueDate = (booking) => {
  const rawValue = booking?.raw?.end_date || booking?.endDate || booking?.end_date;
  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getReturnStateMeta = (bookingStatus, returnDueDate, returnWindowOpened) => {
  if (bookingStatus === 'completed') {
    return {
      tone: 'success',
      eyebrow: 'Đã hoàn tất',
      title: 'Showroom đã xác nhận việc trả xe',
      description: 'Ảnh và biên bản trả xe đã được chốt. Bạn chỉ cần lưu lại thông tin đối chiếu khi cần.',
    };
  }

  if (bookingStatus === 'waiting_return_confirmation') {
    return {
      tone: 'info',
      eyebrow: 'Đang chờ đối chiếu',
      title: 'Showroom đã nhận yêu cầu trả xe (trên hệ thống)',
      description: 'Showroom đang kiểm tra ảnh và tình trạng xe. Bạn tạm thời không cần gửi thêm lần nữa.',
    };
  }

  if (!returnWindowOpened && returnDueDate) {
    return {
      tone: 'warning',
      eyebrow: 'Chưa đến hạn',
      title: 'Chưa đến mốc trả xe trên lịch thuê',
      description: `Bạn có thể chụp và chuẩn bị trước. Nên lưu đủ hồ sơ trả xe (cục bộ) sau ${formatFlowDateTime(returnDueDate)} và liên hệ showroom để đóng booking trên hệ thống.`,
    };
  }

  return {
    tone: 'warning',
    eyebrow: 'Lưu hồ sơ cục bộ',
    title: 'Bạn đang hoàn tất hồ sơ trả xe trên trình duyệt',
    description:
      'Hoàn tất checklist, tải ảnh rõ nét và lưu cục bộ. Đây không phải bước xác nhận trả xe trên server - vui lòng liên hệ showroom để đối chiếu và cập nhật trạng thái.',
  };
};
