export const POSITIONS = [
  { key: 'front', label: 'Đầu xe', hint: 'Chụp thẳng từ phía trước', icon: '⬆️' },
  { key: 'rear', label: 'Đuôi xe', hint: 'Chụp thẳng từ phía sau', icon: '⬇️' },
  { key: 'left', label: 'Bên trái', hint: 'Chụp dọc toàn bộ hông trái', icon: '⬅️' },
  { key: 'right', label: 'Bên phải', hint: 'Chụp dọc toàn bộ hông phải', icon: '➡️' },
  { key: 'interior', label: 'Nội thất', hint: 'Ghế, vô lăng, trần, tap-lô', icon: '🪑' },
  { key: 'odometer', label: 'Đồng hồ km', hint: 'Chụp rõ số km hiện tại', icon: '🔢' },
];

export const BOOKING_STATUS_LABEL = {
  waiting_handover: 'Chờ bàn giao',
  handed_over: 'Đã bàn giao',
  in_use: 'Đang thuê',
  waiting_return_confirmation: 'Chờ xác nhận trả xe',
  completed: 'Hoàn thành',
};

export const SEVERITY_LABEL = {
  none: 'Không đáng kể',
  minor: 'Nhẹ',
  moderate: 'Trung bình',
  severe: 'Nặng',
};

export const severityToBadge = (sev) => {
  if (sev === 'severe') return 'rejected';
  if (sev === 'moderate') return 'pending';
  if (sev === 'minor') return 'new';
  return 'available';
};

export const fmtDate = (d) =>
  d
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(d))
    : '\u2014';

export const fmtDateShort = (d) =>
  d
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
    : '\u2014';

export const bookingCodeShort = (id) => (id ? `BK${String(id).slice(-6).toUpperCase()}` : '\u2014');

export const getVehicleName = (v) =>
  v?.vehicle_name ||
  [v?.vehicle_brand || v?.brand, v?.vehicle_model || v?.model].filter(Boolean).join(' ') ||
  'Chua dat ten';

export const getVehicleThumb = (v) => v?.vehicle_images_paths?.[0] || v?.images?.[0] || null;

export const makeInitialPosFiles = () =>
  Object.fromEntries(POSITIONS.map((p) => [p.key, { before: null, after: null }]));
