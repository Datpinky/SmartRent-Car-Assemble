/** Chuẩn hiển thị tiền tệ toàn app: VNĐ (locale vi-VN). */

const LOCALE = 'vi-VN';

export function formatVndNumber(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(LOCALE);
}

/** Tổng tiền, thanh toán, doanh thu — không gắn “/ngày”. */
export function formatVnd(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString(LOCALE)} VNĐ`;
}

/** Giá thuê niêm yết theo ngày (card, chi tiết xe, bản đồ). */
export function formatVndPerDay(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString(LOCALE)} VNĐ/ngày`;
}
