import { ChevronDown, Home, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../contexts/AuthContext';
import NavGroup from './components/NavGroup';
import NavItem from './components/NavItem';
import { FALLBACK_TITLES, MENUS, PROFILE_PATHS, ROLE_CONFIG } from './dashboardLayout.helpers';

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
    () =>
      user?.name
        ?.split(' ')
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase() || 'U',
    [user?.name],
  );

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

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
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const handleProfile = () => {
    setUserDropdownOpen(false);
    navigate(PROFILE_PATHS[user?.role] || '/');
  };

  return (
    <div className="relative flex min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[9999] focus:rounded-lg focus:bg-[#00b14f] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Chuyển đến nội dung chính
      </a>

      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 md:flex"
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-pressed={collapsed}
          >
            {collapsed ? <span style={{ fontSize: 14 }}>›</span> : <span style={{ fontSize: 14 }}>‹</span>}
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 md:hidden"
            aria-label="Đóng menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3" aria-label="Menu điều hướng">
          {menus.map((item) => {
            if (item.items) {
              return <NavGroup key={item.label} item={item} location={location} collapsed={collapsed} />;
            }
            return <NavItem key={item.path} item={item} active={isActive(item.path)} collapsed={collapsed} />;
          })}
        </nav>

        <div className="shrink-0 border-t border-gray-100 px-3 py-3">
          <button
            type="button"
            onClick={handleProfile}
            className={`group mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 ${collapsed ? 'justify-center px-2.5' : ''}`}
            title={collapsed ? 'Hồ sơ cá nhân' : undefined}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
              style={{ background: roleCfg.color }}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-[0.82rem] font-semibold text-gray-900">{user?.name || 'Tài khoản'}</div>
                <div
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ color: roleCfg.color, background: roleCfg.bg }}
                >
                  {roleCfg.label}
                </div>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-all duration-150 hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center px-2.5' : ''}`}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <LogOut size={16} className="shrink-0 text-gray-400 group-hover:text-red-500" />
            {!collapsed && <span className="truncate">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <div
        className={`flex min-h-screen flex-1 flex-col transition-[margin] duration-[240ms] ease-in-out ${
          collapsed ? 'md:ml-[68px]' : 'md:ml-[260px]'
        }`}
      >
        <header className="sticky top-0 z-[120] border-b border-gray-200 bg-white/95 shadow-[0_1px_10px_rgba(15,23,42,0.04)] backdrop-blur">
          <div className="flex min-h-[64px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
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
              {user?.role === 'renter' && <NotificationBell />}
              {user?.role == 'renter' && (
                <Link
                  to="/"
                  className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 no-underline transition hover:border-[#00b14f]/40 hover:text-[#00b14f] lg:inline-flex"
                >
                  <Home size={15} className="text-[#00b14f]" />
                  Trang chủ
                </Link>
              )}

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
                    <div className="truncate text-[0.82rem] font-semibold text-gray-900">
                      {user?.name || 'Tài khoản'}
                    </div>
                    <div className="truncate text-[0.72rem] text-gray-500">{roleCfg.label}</div>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                    <div className="border-b border-gray-100 px-4 py-2.5">
                      <p className="truncate text-[0.82rem] font-semibold text-gray-900">{user?.name}</p>
                      <p className="truncate text-[0.72rem] text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleProfile}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[0.82rem] text-gray-700 transition hover:bg-gray-50"
                    >
                      Hồ sơ cá nhân
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[0.82rem] text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
