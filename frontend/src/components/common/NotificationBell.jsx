import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { FaBell, FaCheckDouble, FaSpinner, FaTimes } from 'react-icons/fa';
import { MdDirectionsCar, MdPayment, MdVerified, MdWarning } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import notificationService from '../../services/notificationService';

const TYPE_ICONS = {
  booking: { icon: <MdDirectionsCar aria-hidden="true" />, color: '#2563eb' },
  payment: { icon: <MdPayment aria-hidden="true" />, color: '#059669' },
  ai: { icon: <MdWarning aria-hidden="true" />, color: '#d97706' },
  verify: { icon: <MdVerified aria-hidden="true" />, color: '#7c3aed' },
  system: { icon: <MdWarning aria-hidden="true" />, color: '#6b7280' },
};

const POLL_INTERVAL_MS = 30_000;

const normalizeNotificationLink = (link) => {
  if (!link) {
    return '';
  }

  try {
    const url = new URL(link, window.location.origin);

    if (url.pathname.startsWith('/renter/') && url.searchParams.get('bookingId')) {
      url.searchParams.set('fromNotification', '1');
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return link;
  }
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const panelId = useId();
  const ref = useRef(null);
  const notificationsSupported = notificationService.isSupported();
  const notificationsEnabled = notificationsSupported && user?.role === 'renter';

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLoggedIn = Boolean(user?._id);

  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn || !notificationsEnabled) {
      return;
    }

    try {
      const count = await notificationService.countUnread();
      setUnreadCount(count);
    } catch {
      // Keep the badge quiet if polling fails.
    }
  }, [notificationsEnabled, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !notificationsEnabled) {
      setUnreadCount(0);
      return undefined;
    }

    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchUnreadCount, notificationsEnabled, isLoggedIn]);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn || !notificationsEnabled) {
      setNotifications([]);
      setUnreadCount(0);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, unread } = await notificationService.list({ limit: 50 });
      setNotifications(data);
      setUnreadCount(unread);
    } catch {
      setError('Không thể tải thông báo. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [notificationsEnabled, isLoggedIn]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [fetchNotifications, open]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const markRead = async (id) => {
    setNotifications((previous) =>
      previous.map((item) => (String(item.id) === String(id) ? { ...item, read: true } : item)),
    );
    setUnreadCount((previous) => Math.max(0, previous - 1));

    try {
      await notificationService.markRead(id);
    } catch {
      fetchNotifications();
    }
  };

  const markAllRead = async () => {
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllRead();
    } catch {
      fetchNotifications();
    }
  };

  const remove = async (id) => {
    const previousItems = notifications;
    const removed = previousItems.find((item) => String(item.id) === String(id));

    setNotifications((previous) => previous.filter((item) => String(item.id) !== String(id)));
    if (removed && !removed.read) {
      setUnreadCount((previous) => Math.max(0, previous - 1));
    }

    try {
      await notificationService.deleteOne(id);
    } catch {
      setNotifications(previousItems);
    }
  };

  const handleNotificationClick = (notification) => {
    markRead(notification.id);
    if (notification.link) {
      navigate(normalizeNotificationLink(notification.link));
      setOpen(false);
    }
  };

  const unreadList = notifications.filter((item) => !item.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo'}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-[38px] h-[38px] rounded-[10px] border-[1.5px] border-gray-200 bg-white flex items-center justify-center text-base text-gray-500 relative transition-[border-color,color,background-color] hover:border-primary hover:text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setOpen((current) => !current)}
      >
        <FaBell aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-[5px] -right-[5px] bg-red-600 text-white text-[0.6rem] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-[3px] border-2 border-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Danh sách thông báo"
          aria-live="polite"
          className="absolute right-0 top-[calc(100%+8px)] w-[min(100vw-24px,380px)] bg-white rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-gray-200 z-[8000] overflow-hidden animate-[notifIn_0.15s_ease] motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#f0f0f0]">
            <span className="text-[0.9rem] font-bold text-gray-900">
              Thông báo {unreadList > 0 && <span className="text-primary">({unreadList})</span>}
            </span>
            <div className="flex items-center gap-2">
              {unreadList > 0 && (
                <button
                  type="button"
                  className="text-[0.75rem] text-primary flex items-center gap-1 font-semibold hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                  onClick={markAllRead}
                >
                  <FaCheckDouble aria-hidden="true" /> Đọc tất cả
                </button>
              )}
              <button
                type="button"
                className="text-[0.72rem] text-gray-400 hover:text-red-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded px-1"
                onClick={() => setOpen(false)}
                aria-label="Đóng thông báo"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-[0.85rem]">
                <FaSpinner aria-hidden="true" className="animate-spin" /> Đang tải...
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-8 text-[0.82rem] text-red-500">
                {error}
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="ml-2 text-primary underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                >
                  Thử lại
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="text-center text-gray-400 py-10 text-[0.85rem]">Không có thông báo nào</div>
            )}

            {!loading && !error && notifications.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1">
                  <div className="text-[0.72rem] font-bold uppercase tracking-wide text-gray-500 mb-1 px-0.5">
                    Hoạt động gần đây
                  </div>
                </div>
                {notifications.map((notification) => {
                  const iconConfig = TYPE_ICONS[notification.type] || TYPE_ICONS.system;
                  return (
                    <button
                      key={String(notification.id)}
                      type="button"
                      aria-label={`${notification.title}: ${notification.message}${!notification.read ? ' (chưa đọc)' : ''}`}
                      className={`w-full text-left flex items-start gap-2.5 px-3.5 py-3 border-b border-gray-50 transition-colors relative hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${!notification.read ? 'bg-primary-light' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {!notification.read && (
                        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                      )}
                      <div
                        aria-hidden="true"
                        className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-[0.95rem] shrink-0"
                        style={{
                          background: `${iconConfig.color}20`,
                          color: iconConfig.color,
                        }}
                      >
                        {iconConfig.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.8rem] font-semibold text-gray-900">{notification.title}</div>
                        <div className="text-[0.75rem] text-gray-500 mt-0.5 leading-snug">{notification.message}</div>
                        <div className="text-[0.7rem] text-gray-400 mt-0.5">{notification.time}</div>
                      </div>
                      <span
                        role="button"
                        aria-label={`Xóa thông báo: ${notification.title}`}
                        tabIndex={0}
                        className="text-gray-300 p-0.5 flex items-center text-[0.75rem] shrink-0 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
                        onClick={(event) => {
                          event.stopPropagation();
                          remove(notification.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            remove(notification.id);
                          }
                        }}
                      >
                        <FaTimes aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {!loading && !error && notifications.some((item) => item.read) && (
            <div className="border-t border-gray-100 px-4 py-2.5 flex justify-end">
              <button
                type="button"
                className="text-[0.72rem] text-gray-400 hover:text-red-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
                onClick={async () => {
                  setNotifications((previous) => previous.filter((item) => !item.read));
                  try {
                    await notificationService.deleteAllRead();
                  } catch {
                    fetchNotifications();
                  }
                }}
              >
                Xóa thông báo đã đọc
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
