import { mapRenterBooking } from '../utils/renterBookingView';
import bookingService from './bookingService';

const CACHE_TTL_MS = 20_000;
const RECENT_DONE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

let bookingNotificationCache = {
  userId: '',
  at: 0,
  items: [],
};

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('smartrent_user') || 'null') || null;
  } catch {
    return null;
  }
};

const resolveId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const getCurrentUserId = () => resolveId(readStoredUser()) || 'guest';

const storageKey = (bucket) => `smartrent_${bucket}_notifications_${getCurrentUserId()}`;

const readIdSet = (bucket) => {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(bucket)) || '[]');
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
};

const writeIdSet = (bucket, ids) => {
  localStorage.setItem(storageKey(bucket), JSON.stringify(Array.from(ids)));
};

const addIds = (bucket, ids = []) => {
  const next = readIdSet(bucket);
  ids
    .filter(Boolean)
    .map(String)
    .forEach((id) => next.add(id));
  writeIdSet(bucket, next);
};

const parseDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getBookingEventDate = (booking) =>
  parseDate(booking?.updatedAt) || parseDate(booking?.createdAt) || parseDate(booking?.start_date) || new Date();

const formatRelativeTime = (value) => {
  const date = parseDate(value);
  if (!date) return 'Gan day';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) return 'Vua xong';
  if (diffMinutes < 60) return `${diffMinutes} phut truoc`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} gio truoc`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngay truoc`;

  return date.toLocaleDateString('vi-VN');
};

const buildNotificationLink = (view) => {
  if (view.canRetryPayment) {
    return `/renter/retry-payment/${view.id}`;
  }

  if (view.isAwaitingPayment) {
    return `/renter/payment-result?bookingId=${view.id}&status=pending`;
  }

  if (view.menuKey === 'pending-showroom-processing') return '/renter/pending-showroom-processing';
  if (view.menuKey === 'pending-pickups') return '/renter/pending-pickups';
  if (view.menuKey === 'ai-reports') return '/renter/ai-reports';

  return `/renter/bookings?bookingId=${view.id}`;
};

const getNotificationCopy = (view) => {
  if (view.isAwaitingPayment) {
    const needsRetry = ['failed', 'declined'].includes(view.paymentStatus);
    return {
      type: 'payment',
      title: needsRetry ? 'Cần thanh toán lại' : 'Chờ thanh toán',
      message: needsRetry
        ? `${view.vehicleName} cần tạo lại phiên thanh toán.`
        : `${view.vehicleName} đang chờ bạn hoàn tất thanh toán.`,
    };
  }

  if (view.isAwaitingShowroomProcessing) {
    return {
      type: 'booking',
      title: 'Showroom đang xử lý đơn đặt xe',
      message: `${view.vehicleName} đang chờ showroom xác nhận hoặc chuẩn bị bàn giao.`,
    };
  }

  if (view.isAwaitingPickup) {
    return {
      type: 'booking',
      title: 'Chờ giao nhận xe',
      message: `${view.vehicleName} đang ở bước giao nhận. Hãy theo dõi cập nhật từ showroom.`,
    };
  }

  if (view.isActive) {
    return {
      type: 'booking',
      title: view.hasRentalEnded ? 'Đến hạn trả xe' : 'Chuyến thuê đang diễn ra',
      message: view.hasRentalEnded
        ? `${view.vehicleName} đã đến hạn trả xe.`
        : `${view.vehicleName} đang trong thời gian thuê.`,
    };
  }

  if (view.isCompleted) {
    return {
      type: 'verify',
      title: 'Chuyến đã hoàn thành',
      message: `${view.vehicleName} đã hoàn tất quy trình thuê xe.`,
    };
  }

  if (view.isCancelled) {
    return {
      type: 'system',
      title: 'Đã hủy đơn đặt xe',
      message: `${view.vehicleName} không còn tiếp tục trong quy trình đặt xe.`,
    };
  }

  return {
    type: 'system',
    title: view.statusHeadline || 'Cập nhật đơn đặt xe',
    message: view.renterActionHint || `${view.vehicleName} có cập nhật mới.`,
  };
};

const shouldIncludeNotification = (view, eventDate) => {
  if (view.isAwaitingPayment || view.isAwaitingShowroomProcessing || view.isAwaitingPickup || view.isActive) {
    return true;
  }

  const recentEnough = Date.now() - eventDate.getTime() <= RECENT_DONE_WINDOW_MS;
  return recentEnough && (view.isCompleted || view.isCancelled);
};

const buildBookingNotification = (booking) => {
  const view = mapRenterBooking(booking);
  const bookingId = view.id || resolveId(booking);

  if (!bookingId) {
    return null;
  }

  const eventDate = getBookingEventDate(booking);
  if (!shouldIncludeNotification(view, eventDate)) {
    return null;
  }

  const copy = getNotificationCopy(view);
  const statusKey = [
    view.status || 'unknown',
    view.paymentStatus || 'unknown',
    booking?.paymentState?.intentStatus || '',
    booking?.updatedAt || booking?.createdAt || '',
  ].join(':');

  return {
    id: `booking:${bookingId}:${statusKey}`,
    type: copy.type,
    title: copy.title,
    message: copy.message,
    time: formatRelativeTime(eventDate),
    timestamp: eventDate.getTime(),
    link: buildNotificationLink(view),
    read: false,
    raw: {
      bookingId,
      status: view.status,
      paymentStatus: view.paymentStatus,
    },
  };
};

const applyLocalState = (items) => {
  const readIds = readIdSet('read');
  const deletedIds = readIdSet('deleted');

  return items
    .filter((item) => !deletedIds.has(String(item.id)))
    .map((item) => ({
      ...item,
      read: readIds.has(String(item.id)),
    }));
};

const loadGeneratedNotifications = async ({ force = false } = {}) => {
  const userId = getCurrentUserId();
  const now = Date.now();

  if (
    !force &&
    bookingNotificationCache.userId === userId &&
    bookingNotificationCache.at > 0 &&
    now - bookingNotificationCache.at < CACHE_TTL_MS
  ) {
    return bookingNotificationCache.items;
  }

  const bookings = await bookingService.getCurrentRoleBookingsDetailed();
  const items = (bookings || [])
    .map(buildBookingNotification)
    .filter(Boolean)
    .sort((left, right) => right.timestamp - left.timestamp);

  bookingNotificationCache = {
    userId,
    at: now,
    items,
  };

  return items;
};

const notificationService = {
  isSupported() {
    return true;
  },

  async list({ limit = 50, skip = 0, force = false } = {}) {
    const generated = await loadGeneratedNotifications({ force });
    const data = applyLocalState(generated).slice(skip, skip + limit);
    const unread = applyLocalState(generated).filter((item) => !item.read).length;

    return { data, unread };
  },

  async countUnread() {
    const generated = await loadGeneratedNotifications();
    return applyLocalState(generated).filter((item) => !item.read).length;
  },

  async markRead(id) {
    addIds('read', [id]);
  },

  async markAllRead() {
    const generated = await loadGeneratedNotifications();
    addIds(
      'read',
      generated.map((item) => item.id),
    );
  },

  async deleteOne(id) {
    addIds('deleted', [id]);
  },

  async deleteAllRead() {
    const { data } = await this.list({ limit: 100, force: true });
    addIds(
      'deleted',
      data.filter((item) => item.read).map((item) => item.id),
    );
  },
};

export default notificationService;
