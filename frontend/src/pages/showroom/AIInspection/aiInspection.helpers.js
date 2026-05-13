export const POSITIONS = [
  { key: 'front', label: 'Dau xe', hint: 'Chup thang tu phia truoc', icon: '⬆️' },
  { key: 'rear', label: 'Duoi xe', hint: 'Chup thang tu phia sau', icon: '⬇️' },
  { key: 'left', label: 'Hong trai', hint: 'Chup doc toan bo hong trai', icon: '⬅️' },
  { key: 'right', label: 'Hong phai', hint: 'Chup doc toan bo hong phai', icon: '➡️' },
  { key: 'interior', label: 'Noi that', hint: 'Ghe, vo lang, tran, tap-lo', icon: '🪑' },
  { key: 'odometer', label: 'Dong ho km', hint: 'Chup ro so km hien tai', icon: '🔢' },
];

export const BOOKING_STATUS_LABEL = {
  in_use: 'Dang thue',
  waiting_return_confirmation: 'Cho xac nhan tra',
  completed: 'Hoan thanh',
};

export const SEVERITY_LABEL = {
  none: 'Khong dang ke',
  minor: 'Nhe',
  moderate: 'Trung binh',
  severe: 'Nang',
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
