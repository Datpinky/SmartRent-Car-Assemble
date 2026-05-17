import {
  ArrowLeftRight,
  Bot,
  CalendarDays,
  Car,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';

export const MENUS = {
  admin: [
    { label: 'Tổng quan', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Người dùng', path: '/admin/users', icon: Users },
    { label: 'Xác minh Showroom', path: '/admin/showrooms', icon: Store },
    { label: 'Xác minh GPLX', path: '/admin/driver-licenses', icon: CreditCard },
    { label: 'Giao dịch', path: '/admin/transactions', icon: ArrowLeftRight },
    { label: 'Yêu cầu rút tiền', path: '/admin/withdrawals', icon: CreditCard },
  ],
  showroom: [
    {
      label: 'Quản lý',
      icon: Car,
      items: [
        { label: 'Quản lý xe', path: '/showroom/vehicles', icon: Car },
        { label: 'Đặt xe', path: '/showroom/bookings', icon: CalendarDays },
        { label: 'Hợp đồng', path: '/showroom/contracts', icon: FileText },
        { label: 'Khách hàng', path: '/showroom/customers', icon: Users },
      ],
    },
    { label: 'Doanh thu', path: '/showroom/revenue', icon: TrendingUp },
    { label: 'Kiểm tra AI trả xe', path: '/showroom/ai-inspection', icon: Bot },
  ],
  renter: [
    { label: 'Tổng quan tài chính', path: '/renter/dashboard', icon: LayoutDashboard },
    {
      label: 'Chuyến đi',
      icon: Car,
      items: [
        { label: 'Chờ showroom xử lý', path: '/renter/pending-showroom-processing', icon: Store },
        { label: 'Chờ nhận xe', path: '/renter/pending-pickups', icon: Clock },
        { label: 'Chuyến đi của tôi', path: '/renter/bookings', icon: CalendarDays },
      ],
    },
    { label: 'Kết quả AI trả xe', path: '/renter/return-inspections', icon: Bot },
    { label: 'Hợp đồng của tôi', path: '/renter/contracts', icon: FileText },
    { label: 'Lịch sử giao dịch', path: '/renter/transactions', icon: ArrowLeftRight },
  ],
};

export const ROLE_CONFIG = {
  admin: { label: 'Quản trị viên', color: '#6d28d9', bg: '#f5f3ff' },
  showroom: { label: 'Showroom', color: '#00b14f', bg: '#f0fdf4' },
  renter: { label: 'Khách thuê', color: '#d97706', bg: '#fffbeb' },
};

export const PROFILE_PATHS = {
  admin: '/admin/profile',
  showroom: '/showroom/profile',
  renter: '/renter/profile',
};

export const FALLBACK_TITLES = [
  { prefix: '/renter/profile', label: 'Hồ sơ cá nhân' },
  { prefix: '/renter/retry-payment', label: 'Thanh toán lại' },
  { prefix: '/renter/checkout', label: 'Thanh toán đặt xe' },
  { prefix: '/renter/transactions', label: 'Lịch sử giao dịch' },
  { prefix: '/renter/payment-result', label: 'Kết quả thanh toán' },
];
