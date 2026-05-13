export const DELIVERY_FEE_VND = 50000;

export const CALENDAR_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const CALENDAR_MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Thang 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export const pad2 = (n) => String(n).padStart(2, '0');

export function toLocalInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseLocalDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatDateTimeVi(isoLocal) {
  try {
    const d = new Date(isoLocal);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

export function formatDateTimeInputLabel(isoLocal) {
  const d = parseLocalDateTime(isoLocal);
  if (!d) return 'Chọn ngày giờ';
  const hour12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? 'CH' : 'SA';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(hour12)}:${pad2(d.getMinutes())} ${ampm}`;
}

export function normalizeIncomingRentalWindow(pickupValue, returnValue, minPickupValue, isSameCalendarDate) {
  const minPickup = parseLocalDateTime(minPickupValue);
  const incomingPickup = parseLocalDateTime(pickupValue);
  const incomingReturn = parseLocalDateTime(returnValue);

  if (!incomingPickup || !incomingReturn || !minPickup) return null;

  const safePickup = incomingPickup < minPickup ? new Date(minPickup) : new Date(incomingPickup);
  const safeReturn =
    incomingReturn <= safePickup || isSameCalendarDate(incomingReturn, safePickup)
      ? new Date(safePickup.getTime() + 24 * 60 * 60 * 1000)
      : new Date(incomingReturn);

  return {
    pickupDate: toLocalInputValue(safePickup),
    returnDate: toLocalInputValue(safeReturn),
  };
}

export const formatCoordinates = (latitude, longitude) => `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

export function parseCoordinateInput(value) {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export const hasCoordinates = (location) =>
  Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));
