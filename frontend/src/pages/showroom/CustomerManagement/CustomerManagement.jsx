import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaRoute, FaSpinner } from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';

const fmt = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—';

const CustomerManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await bookingService.getCurrentRoleBookings();
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
      // ignore cancelled bookings to avoid inflating metrics
      const bstatus = String(booking?.status || booking?.booking_status || '').toLowerCase();
      if (bstatus.includes('cancel')) continue;

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
        };
      }

      customerMap[id].bookings += 1;
      customerMap[id].totalSpent += Number(booking.total_price || 0);

      const bookingDate = booking.start_date || booking.createdAt || booking.created_at;
      if (!customerMap[id].lastBooking || new Date(bookingDate) > new Date(customerMap[id].lastBooking)) {
        customerMap[id].lastBooking = bookingDate;
      }
    }

    return Object.values(customerMap);
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
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Quản lý Khách hàng</h1>
          <p className="page-subtitle">Danh sách khách hàng đã và đang thuê xe tại showroom.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng khách hàng', value: customers.length, color: '#2563eb' },
          { label: 'Tổng doanh thu từ khách', value: `${totalRevenue.toLocaleString('vi-VN')}đ`, color: '#00b14f' },
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
    </div>
  );
};

export default CustomerManagement;
