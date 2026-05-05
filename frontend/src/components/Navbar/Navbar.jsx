import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTimes, FaBars, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_DASHBOARD_PATHS = {
  admin: '/admin/dashboard',
  showroom: '/showroom/dashboard',
  owner: '/owner/dashboard',
  renter: '/renter/profile',
};

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); setMenuOpen(false); setUserDropdownOpen(false); navigate('/'); };

  const initials = user?.name?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || 'U';

  return (
    <nav className="sticky top-0 z-[1000] bg-white border-b border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between h-16 max-w-[1280px] mx-auto px-5">
        <Link to="/" className="flex items-center no-underline" aria-label="SmartRent Car Rental — Trang chủ">
          <img
            src="/logo_transparent.png"
            alt="SmartRent Car Rental"
            width={160}
            height={44}
            className="h-11 w-auto object-contain"
            style={{
              filter: 'brightness(0) saturate(100%) invert(27%) sepia(96%) saturate(1057%) hue-rotate(174deg) brightness(90%)',
            }}
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                aria-label={`${user.name} — mở menu tài khoản`}
                aria-expanded={userDropdownOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[0.875rem] font-semibold text-gray-800 cursor-pointer transition-[border-color,background-color] hover:border-primary hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setUserDropdownOpen(o => !o)}
              >
                <div aria-hidden="true" className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[0.75rem] font-extrabold">
                  {initials}
                </div>
                <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{user.name}</span>
                <span aria-hidden="true" className="text-[0.6rem] text-gray-500 transition-transform duration-200" style={{ display: 'inline-block', transform: userDropdownOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </button>
              {userDropdownOpen && (
                <div role="menu" className="absolute top-[calc(100%+6px)] right-0 z-[1001] min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] py-1.5 animate-[slideDown_0.15s_ease] motion-reduce:animate-none">
                  {user.role === 'renter' && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex items-center gap-2 w-full px-3.5 py-2.5 text-[0.85rem] text-gray-700 hover:bg-gray-100 text-left focus-visible:outline-none focus-visible:bg-gray-100"
                        onClick={() => { navigate('/renter/profile'); setUserDropdownOpen(false); }}
                      >
                        <FaUser aria-hidden="true" /> Quản lý tài khoản
                      </button>
                      <div role="separator" className="h-px bg-gray-200 my-1" />
                    </>
                  )}
                  {user.role !== 'renter' && (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-[0.85rem] text-gray-700 hover:bg-gray-100 text-left focus-visible:outline-none focus-visible:bg-gray-100"
                      onClick={() => { navigate(ROLE_DASHBOARD_PATHS[user.role] || '/'); setUserDropdownOpen(false); }}
                    >
                      Vào Dashboard
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="flex items-center gap-2 w-full px-3.5 py-2.5 text-[0.85rem] text-red-600 hover:bg-red-50 text-left focus-visible:outline-none focus-visible:bg-red-50"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt aria-hidden="true" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="px-5 py-[9px] rounded-lg text-[0.875rem] font-semibold border-2 border-primary text-primary bg-transparent transition-[background-color,color,box-shadow,transform] hover:bg-primary hover:text-white hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,177,79,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Đăng nhập
            </Link>
          )}
        </div>

        {/* Hamburger */}
        <button
          type="button"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="flex md:hidden text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FaTimes aria-hidden="true" size={20} /> : <FaBars aria-hidden="true" size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div id="mobile-menu" className="pt-3 pb-4 border-t border-gray-100 flex flex-col bg-white md:hidden">
          {user ? (
            <>
              {user.role === 'renter' && (
                <>
                  <button type="button" className="block w-full px-5 py-3 text-[0.9rem] font-medium text-gray-700 hover:bg-gray-100 text-left" onClick={() => { navigate('/renter/profile'); setMenuOpen(false); }}>Hồ sơ cá nhân</button>
                  <button type="button" className="block w-full px-5 py-3 text-[0.9rem] font-medium text-gray-700 hover:bg-gray-100 text-left" onClick={() => { navigate('/renter/bookings'); setMenuOpen(false); }}>Chuyến đi của tôi</button>
                  <button type="button" className="block w-full px-5 py-3 text-[0.9rem] font-medium text-gray-700 hover:bg-gray-100 text-left" onClick={() => { navigate('/renter/sos'); setMenuOpen(false); }}>Hỗ trợ khẩn cấp</button>
                </>
              )}
              {user.role !== 'renter' && (
                <button type="button" className="block w-full px-5 py-3 text-[0.9rem] font-medium text-gray-700 hover:bg-gray-100 text-left" onClick={() => { navigate(ROLE_DASHBOARD_PATHS[user.role] || '/'); setMenuOpen(false); }}>Vào Dashboard</button>
              )}
              <button type="button" className="block w-full px-5 py-3 text-[0.9rem] font-medium text-red-600 hover:bg-red-50 text-left" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <Link
              to="/login"
              className="mt-1 mx-5 px-5 py-[9px] rounded-lg text-[0.875rem] font-semibold border-2 border-primary text-primary bg-transparent transition-[background-color,color] text-center hover:bg-primary hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              Đăng nhập
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
