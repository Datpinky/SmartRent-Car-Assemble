import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';

export const fmtVnd = (n) => (n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—');

export const fmtDate = (d) =>
  d
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(d))
    : '—';

export const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', color: '#d97706', bg: '#fffbeb', icon: FaClock },
  approved: { label: 'Đã duyệt', color: '#059669', bg: '#f0fdf4', icon: FaCheckCircle },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fef2f2', icon: FaTimesCircle },
};