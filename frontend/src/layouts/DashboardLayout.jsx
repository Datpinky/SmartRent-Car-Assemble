import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  Bot,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Store,
  User,
  Users,
  X,
} from 'lucide-react';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../contexts/AuthContext';

// ─── Navigation config ────────────────────────────────────────────────────────

const MENUS = {
  admin: [
    { label: 'Tổng quan', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Người dùng', path: '/admin/users', icon: Users },
    { label: 'Xác minh Showroom', path: '/admin/showrooms', icon: Store },
    { label: 'Giao dịch', path: '/admin/transactions', icon: ArrowLeftRight },
  ],

  showroom: [
    { label: 'Tổng quan', path: '/showroom/dashboard', icon: LayoutDashboard },
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
    { label: 'Kiểm tra AI', path: '/showroom/ai-inspection', icon: Bot },
  ],

  renter: [
    { label: 'Tổng quan tài chính', path: '/renter/dashboard', icon: LayoutDashboard },
    {
      label: 'Chuyến đi',
      icon: Car,
      items: [
        { label: 'Đặt xe đang chờ', path: '/renter/pending', icon: Clock },
        { label: 'Chuyến đi của tôi', path: '/renter/bookings', icon: CalendarDays },
      ],
    },
    { label: 'Hồ sơ cá nhân', path: '/renter/profile', icon: User },
    { label: 'Kiểm tra xe', path: '/renter/ai-reports', icon: Bot },
    { label: 'Lịch sử giao dịch', path: '/renter/transactions', icon: ArrowLeftRight },
    { label: 'Hỗ trợ khẩn cấp', path: '/renter/sos', icon: AlertTriangle },
  ],
};

const ROLE_CONFIG = {
  admin:    { label: 'Quản trị viên', color: '#6d28d9', bg: '#f5f3ff' },
  showroom: { label: 'Showroom',       color: '#00b14f', bg: '#f0fdf4' },
  renter:   { label: 'Khách thuê',     color: '#d97706', bg: '#fffbeb' },
};

const PROFILE_PATHS = {
  admin:    '/admin/profile',
  showroom: '/showroom/profile',
  renter:   '/renter/profile',
};

const FALLBACK_TITLES = [
  { prefix: '/renter/retry-payment', label: 'Thanh toán lại' },
  { prefix: '/renter/checkout',      label: 'Thanh toán đặt xe' },
  { prefix: '/renter/transactions',  label: 'Lịch sử giao dịch' },
  { prefix: '/renter/payment-result', label: 'Kết quả thanh toán' },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

const NavItem = ({ item, active, collapsed }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={`
        group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-all duration-150
        ${active
          ? 'bg-[#ecfdf5] text-[#00b14f]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
        ${collapsed ? 'justify-center px-2.5' : ''}
      `}
    >
      <Icon
        size={18}
        className={`shrink-0 transition-colors ${
          active ? 'text-[#00b14f]' : 'text-gray-400 group-hover:text-gray-600'
        }`}
      />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge != null && (
        <span className="ml-auto rounded-full bg-[#00b14f]/10 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-[#00b14f]">
          {item.badge}
        </span>
      )}
    </Link>
  );
};

// ─── NavGroup (collapsible) ───────────────────────────────────────────────────

const NavGroup = ({ item, location, collapsed }) => {
  const hasActiveChild = (item.items || []).some(
    (sub) => location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`),
  );
  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const Icon = item.icon;

  if (collapsed) {
    return (
      <div
        title={item.label}
        className={`
          flex items-center justify-center rounded-lg p-2.5 transition-all duration-150
          ${hasActiveChild ? 'bg-[#ecfdf5] text-[#00b14f]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
        `}
      >
        <Icon
          size={18}
          className={`shrink-0 ${hasActiveChild ? 'text-[#00b14f]' : 'text-gray-400'}`}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
          ${hasActiveChild ? 'text-[#00b14f]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
        `}
      >
        <Icon
          size={18}
          className={`shrink-0 transition-colors ${
            hasActiveChild ? 'text-[#00b14f]' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {item.badge != null && (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">
            {item.badge}
          </span>
        )}
        {open
          ? <ChevronDown size={14} className="shrink-0 text-gray-400" />
          : <ChevronRight size={14} className="shrink-0 text-gray-400" />
        }
      </button>

      {open && (
        <div className="ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l-2 border-gray-100 pl-3">
          {(item.items || []).map((sub) => {
            const SubIcon = sub.icon;
            const subActive = location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`);
            return (
              <Link
                key={sub.path}
                to={sub.path}
                className={`
                  group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.82rem] font-medium no-underline transition-all duration-150
                  ${subActive
                    ? 'bg-[#ecfdf5] text-[#00b14f]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <SubIcon
                  size={15}
                  className={`shrink-0 ${subActive ? 'text-[#00b14f]' : 'text-gray-400 group-hover:text-gray-600'}`}
                />
                <span className="flex-1 truncate">{sub.label}</span>
                {sub.badge != null && (
                  <span className="ml-auto rounded-full bg-[#00b14f]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#00b14f]">
                    {sub.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── DashboardLayout ──────────────────────────────────────────────────────────

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const menus = MENUS[user?.role] || MENUS.renter;
  const roleCfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.renter;

  const initials = useMemo(
    () => user?.name?.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase() || 'U',
    [user?.name],
  );

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  // Resolve page title from menu items (flat + nested)
  const headerTitle = (() => {
    for (const item of menus) {
      if (item.path && isActive(item.path)) return item.label;
      if (item.items) {
        const matched = item.items.find((sub) => isActive(sub.path));
        if (matched) return matched.label;
      }
    }
    return FALLBACK_TITLES.find((t) => location.pathname.startsWith(t.prefix))?.label || 'Dashboard';
  })();

  useEffect(() => {
    const onOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') { setSidebarOpen(false); setUserDropdownOpen(false); }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleProfile = () => {
    setUserDropdownOpen(false);
    navigate(PROFILE_PATHS[user?.role] || '/');
  };

  return (
    <div className="relative flex min-h-screen bg-gray-50">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[9999] focus:rounded-lg focus:bg-[#00b14f] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Chuyển đến nội dung chính
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        aria-label="Điều hướng chính"
        className={`
          fixed bottom-0 left-0 top-0 z-[200] flex flex-col border-r border-gray-200 bg-white
          transition-[width] duration-[240ms] ease-in-out
          max-md:!w-[260px] max-md:shadow-[4px_0_24px_rgba(0,0,0,0.10)] max-md:transition-transform
          ${collapsed ? 'w-[68px]' : 'w-[260px]'}
          ${sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        `}
      >
        {/* Logo + collapse toggle */}
        <div className="flex min-h-[64px] shrink-0 items-center justify-between border-b border-gray-100 px-3.5">
          {!collapsed ? (
            <Link to="/" className="min-w-0 flex-1 no-underline" aria-label="SmartRent - Trang chủ">
              <img
                src="/logo_transparent.png"
                alt="SmartRent Car Rental"
                width={136}
                height={36}
                className="h-8 w-auto object-contain"
              />
            </Link>
          ) : (
            <Link to="/" className="mx-auto block" aria-label="SmartRent - Trang chủ">
              <img
                src="/logo_transparent.png"
                alt="SmartRent"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </Link>
          )}

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 md:flex"
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-pressed={collapsed}
          >
            {collapsed
              ? <ChevronRight size={14} />
              : <ChevronLeft size={14} />
            }
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 md:hidden"
            aria-label="Đóng menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav items */}
        <nav
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3"
          aria-label="Menu điều hướng"
        >
          {menus.map((item, index) => {
            if (item.items) {
              return (
                <NavGroup
                  key={item.label}
                  item={item}
                  location={location}
                  collapsed={collapsed}
                />
              );
            }
            return (
              <NavItem
                key={item.path}
                item={item}
                active={isActive(item.path)}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        {/* Footer: user + logout */}
        <div className="shrink-0 border-t border-gray-100 px-3 py-3">
          {/* Profile row */}
          <button
            type="button"
            onClick={handleProfile}
            className={`
              group mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900
              ${collapsed ? 'justify-center px-2.5' : ''}
            `}
            title={collapsed ? 'Hồ sơ cá nhân' : undefined}
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
              style={{ background: roleCfg.color }}>
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-[0.82rem] font-semibold text-gray-900">
                  {user?.name || 'Tài khoản'}
                </div>
                <div
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ color: roleCfg.color, background: roleCfg.bg }}
                >
                  {roleCfg.label}
                </div>
              </div>
            )}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className={`
              group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-all duration-150 hover:bg-red-50 hover:text-red-600
              ${collapsed ? 'justify-center px-2.5' : ''}
            `}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <LogOut size={16} className="shrink-0 text-gray-400 group-hover:text-red-500" />
            {!collapsed && <span className="truncate">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div
        className={`flex min-h-screen flex-1 flex-col transition-[margin] duration-[240ms] ease-in-out ${
          collapsed ? 'md:ml-[68px]' : 'md:ml-[260px]'
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-[120] border-b border-gray-200 bg-white/95 shadow-[0_1px_10px_rgba(15,23,42,0.04)] backdrop-blur">
          <div className="flex min-h-[64px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 md:hidden"
                aria-label="Mở menu"
              >
                <Menu size={18} />
              </button>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  SmartRent workspace
                </p>
                <h1 className="text-[1.05rem] font-semibold text-gray-900">{headerTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification bell for renters */}
              {user?.role === 'renter' && <NotificationBell />}

              {/* Home link */}
              <Link
                to="/"
                className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 no-underline transition hover:border-[#00b14f]/40 hover:text-[#00b14f] lg:inline-flex"
              >
                <Home size={15} className="text-[#00b14f]" />
                Trang chủ
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                  aria-haspopup="menu"
                  aria-expanded={userDropdownOpen}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
                    style={{ background: roleCfg.color }}
                  >
                    {initials}
                  </div>
                  <div className="hidden min-w-0 text-left sm:block">
                    <div className="truncate text-[0.82rem] font-semibold text-gray-900">{user?.name || 'Tài khoản'}</div>
                    <div className="truncate text-[0.72rem] text-gray-500">{roleCfg.label}</div>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                    <button
                      type="button"
                      onClick={handleProfile}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      <User size={15} className="text-gray-400" />
                      Trang cá nhân
                    </button>
                    <Link
                      to="/"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 no-underline transition hover:bg-gray-50 lg:hidden"
                    >
                      <Home size={15} className="text-gray-400" />
                      Trang chủ
                    </Link>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={15} />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
