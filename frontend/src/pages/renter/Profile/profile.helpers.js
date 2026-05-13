// Pure helpers and constants for Profile page

export const LICENSE_CLASS_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F'];

export const LICENSE_STATUS_BADGE = {
  approved: { background: '#dcfce7', color: '#166534', label: 'Đã xác thực ✓' },
  pending: { background: '#fef9c3', color: '#854d0e', label: 'Chờ duyệt' },
  rejected: { background: '#fee2e2', color: '#991b1b', label: 'Bị từ chối' },
  none: { background: '#f3f4f6', color: '#6b7280', label: 'Chưa có' },
};

export const ROLE_LABELS = {
  renter: 'Khách thuê',
  showroom: 'Showroom',
  admin: 'Quản trị',
};

export const noticeStyles = {
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
  warning: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' },
};

export const FIELD_INPUT_STYLE = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  width: '100%',
};

export const formatDateInput = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

export const formatCoordinates = (lat, lng) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

export const parseCoordinateAddress = (value) => {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

export const hasValidCoordinates = (location) =>
  Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));

export const buildInitialForm = (user) => ({
  name: user?.name || '',
  phone: user?.phone || '',
  address: user?.address || '',
});
