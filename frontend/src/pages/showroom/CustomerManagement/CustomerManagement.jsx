import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt, FaRoute, FaSpinner } from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import { getVehicleName, STATUS_LABELS } from '../BookingManagement/bookingManagement.helpers';

const fmt = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—';

const fmtDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

/** Tiền xe đã thực thu — chỉ đơn hoàn thành (completed). */
const isCompletedBooking = (booking) =>
  String(booking?.status || booking?.booking_status || '').toLowerCase() === 'completed';

const bookingVehicleDisplayName = (booking) => {
  const v = getVehicleName(booking?.vehicle);
  if (v && v !== '—') return v;
  const vid = booking?.vehicle_id;
  if (vid && typeof vid === 'object') {
    const fromPopulated = getVehicleName(vid);
    if (fromPopulated && fromPopulated !== '—') return fromPopulated;
  }
  return '—';
};

const CustomerManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detailCustomer, setDetailCustomer] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await bookingService.getCurrentRoleBookingsDetailed();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu khách hàng.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customers = useMemo(() => {
    const customerMap = {};

    for (const booking of bookings) {
      const bstatus = String(booking?.status || booking?.booking_status || '').toLowerCase();
      const isCancelled = bstatus.includes('cancel');

      const renter = booking.user_id;
      if (!renter) continue;

      const id = renter._id || renter.id || '';
      if (!id) continue;

      if (!customerMap[id]) {
        customerMap[id] = {
          _id: id,
          name: renter.name || renter.full_name || '—',
          email: renter.email || '—',
          phone: renter.phone || '—',
          bookings: 0,
          totalSpent: 0,
          lastBooking: null,
          status: renter.is_active === false ? 'locked' : 'verified',
          bookingHistory: [],
        };
      }

      const vehicleName = bookingVehicleDisplayName(booking);
      const orderedAt = booking.createdAt || booking.created_at || booking.start_date;
      const completed = isCompletedBooking(booking);
      customerMap[id].bookingHistory.push({
        bookingId: booking._id || booking.id || '',
        orderedAt,
        pickupDate: booking.start_date || booking.startDate,
        returnDate: booking.end_date || booking.endDate,
        status: String(booking.status || booking.booking_status || ''),
        totalPrice: Number(booking.total_price || 0),
        vehicleName,
        spendNote: isCancelled ? 'cancelled' : !completed ? 'not_completed' : null,
      });

      if (isCancelled) continue;

      customerMap[id].bookings += 1;

      if (completed) {
        customerMap[id].totalSpent += Number(booking.total_price || 0);
        const bookingDate = booking.end_date || booking.start_date || booking.createdAt || booking.created_at;
        if (!customerMap[id].lastBooking || new Date(bookingDate) > new Date(customerMap[id].lastBooking)) {
          customerMap[id].lastBooking = bookingDate;
        }
      }
    }

    const list = Object.values(customerMap);
    for (const row of list) {
      row.bookingHistory.sort((a, b) => {
        const ta = a.orderedAt ? new Date(a.orderedAt).getTime() : 0;
        const tb = b.orderedAt ? new Date(b.orderedAt).getTime() : 0;
        return tb - ta;
      });
    }
    return list;
  }, [bookings]);

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const avgBookings = customers.length
    ? (customers.reduce((sum, customer) => sum + customer.bookings, 0) / customers.length).toFixed(1)
    : '0';

  const columns = [
    {
      key: 'name',
      label: 'Khách hàng',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#dbeafe',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            {(row.name || '?').split(' ').at(-1)?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#111827' }}>{row.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'Điện thoại', accessor: 'phone' },
    {
      key: 'bookings',
      label: 'Chuyến',
      render: (row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <FaRoute aria-hidden="true" size={12} color="#9ca3af" />
          <span className="tabular-nums">{row.bookings}</span>
        </span>
      ),
      sortable: true,
      accessor: 'bookings',
      align: 'center',
    },
    {
      key: 'totalSpent',
      label: 'Tổng chi tiêu',
      render: (row) => (
        <span className="tabular-nums" style={{ fontWeight: 700, color: '#00b14f' }}>
          {Number(row.totalSpent).toLocaleString('vi-VN')}đ
        </span>
      ),
      sortable: true,
      accessor: 'totalSpent',
    },
    { key: 'lastBooking', label: 'Lần cuối thuê', render: (row) => fmt(row.lastBooking) },
    {
      key: 'status',
      label: 'TK',
      render: (row) => (
        <StatusBadge status={row.status} customLabel={row.status === 'locked' ? 'Bị khóa' : 'Hoạt động'} />
      ),
    },
    {
      key: 'detail',
      label: 'Chi tiết',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          className="text-[0.8rem] font-semibold text-primary border border-primary/40 bg-primary/5 rounded-lg px-3 py-1.5 cursor-pointer transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setDetailCustomer(row)}
        >
          Xem lịch sử
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Quản lý Khách hàng</h1>
          <p className="page-subtitle">
            Danh sách khách hàng đã và đang thuê xe tại showroom.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng khách hàng', value: customers.length, color: '#2563eb' },
          { label: 'Doanh thu', value: `${totalRevenue.toLocaleString('vi-VN')}đ`, color: '#00b14f' },
          { label: 'Trung bình chuyến/người', value: avgBookings, color: '#7c3aed' },
        ].map((summary) => (
          <div
            key={summary.label}
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: '10px 18px',
              border: '1px solid #f0f0f0',
              flex: 1,
              minWidth: 160,
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 4,
              }}
            >
              {summary.label}
            </div>
            <div className="tabular-nums" style={{ fontWeight: 800, fontSize: '1.1rem', color: summary.color }}>
              {summary.value}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FaSpinner aria-hidden="true" className="animate-spin text-primary text-xl" />
          <span>Đang tải dữ liệu…</span>
        </div>
      ) : loadError ? (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
          {loadError}
        </div>
      ) : (
        <DataTable columns={columns} data={customers} searchPlaceholder="Tìm khách hàng..." />
      )}

      <Modal
        isOpen={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        title={detailCustomer ? `Lịch sử đặt xe — ${detailCustomer.name}` : ''}
        width={620}
      >
        {detailCustomer && (
          <div className="flex flex-col gap-3">
            {detailCustomer.bookingHistory?.length ? (
              <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                {detailCustomer.bookingHistory.map((line) => (
                  <li
                    key={line.bookingId || `${line.orderedAt}-${line.vehicleName}`}
                    className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] px-4 py-3 text-[0.83rem]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="font-semibold text-gray-900">{line.vehicleName}</div>
                      <StatusBadge
                        status={String(line.status || '').toLowerCase()}
                        customLabel={
                          STATUS_LABELS[String(line.status || '').toLowerCase()] || line.status || '—'
                        }
                      />
                    </div>
                    <div className="grid gap-1 text-gray-600">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt aria-hidden="true" className="text-gray-400 shrink-0" size={12} />
                        <span>
                          <span className="text-gray-400">Đặt / tạo đơn:</span>{' '}
                          <span className="font-medium text-gray-800">{fmtDateTime(line.orderedAt)}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaRoute aria-hidden="true" className="text-gray-400 shrink-0" size={12} />
                        <span>
                          Thuê từ <strong className="tabular-nums">{fmt(line.pickupDate)}</strong> đến{' '}
                          <strong className="tabular-nums">{fmt(line.returnDate)}</strong>
                        </span>
                      </div>
                      <div className="tabular-nums">
                        Giá trị:{' '}
                        <span className="font-bold text-primary">{Number(line.totalPrice).toLocaleString('vi-VN')}đ</span>
                        {line.spendNote === 'cancelled' ? (
                          <span className="text-gray-400 font-normal text-[0.78rem] ml-1">(đã hủy — không tính)</span>
                        ) : line.spendNote === 'not_completed' ? (
                          <span className="text-amber-700/90 font-normal text-[0.78rem] ml-1">
                            (chưa hoàn thành — không tính vào tổng chi tiêu)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm m-0">Chưa có lịch sử đặt xe.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerManagement;
