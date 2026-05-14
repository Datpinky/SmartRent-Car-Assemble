import { ChevronDown, Download, LayoutGrid, LayoutTemplate, List } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import bookingService from '../../../services/bookingService';
import vehicleService from '../../../services/vehicleService';
import {
  buildShowroomAlertsFromBookings,
  buildShowroomMonthlyFromBookings,
  buildVehicleStatusPieFromVehicles,
  mapBookingToShowroomTableRow,
} from '../../../utils/dashboardFromApi';
import Variant1Layout from './components/Variant1Layout';
import Variant2Layout from './components/Variant2Layout';
import Variant3Layout from './components/Variant3Layout';
import { PERIODS, SummaryBar } from './showroomDashboard.helpers';

const ShowroomDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeVariant, setActiveVariant] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState('Tháng 3');
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      setLoadError('');
      try {
        const vFilters = user?._id ? { added_by: user._id, limit: 100 } : {};
        const [{ data: vData }, { items: bItems }] = await Promise.all([
          vehicleService.getList(vFilters),
          bookingService.getListBookings({ limit: 100 }),
        ]);
        if (!cancelled) {
          setVehicles(vData || []);
          setBookings(bItems || []);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.response?.data?.message || e.message || 'Không tải được dữ liệu.');
          setVehicles([]);
          setBookings([]);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  const monthlySeries = useMemo(() => buildShowroomMonthlyFromBookings(bookings, 12), [bookings]);
  const bookingRows = useMemo(() => (bookings || []).map(mapBookingToShowroomTableRow), [bookings]);
  const vehicleStatusPie = useMemo(() => buildVehicleStatusPieFromVehicles(vehicles), [vehicles]);
  const initialAlerts = useMemo(() => buildShowroomAlertsFromBookings(bookings, 8), [bookings]);
  const bookingsTodayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return (bookings || []).filter((b) => {
      const t = new Date(b.createdAt || b.created_at || b.start_date);
      return t >= start && t <= end;
    }).length;
  }, [bookings]);

  const VARIANTS = [
    { id: 1, icon: <LayoutGrid size={15} aria-hidden="true" />, label: 'Tổng quan' },
    { id: 2, icon: <List size={15} aria-hidden="true" />, label: 'Phân tích' },
    { id: 3, icon: <LayoutTemplate size={15} aria-hidden="true" />, label: 'Điều hành' },
  ];

  const showroomTitle = user?.business_name || user?.name || 'Showroom';

  return (
    <div className="flex flex-col gap-5 bg-slate-50 min-h-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Tổng quan Showroom</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {showroomTitle}
            {dataLoading ? ' · Đang tải…' : ''}
            {loadError ? ` · ${loadError}` : ''}&nbsp;·&nbsp;{selectedPeriod}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-full px-3 py-1.5">
            <ChevronDown size={13} className="text-gray-400" aria-hidden="true" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              aria-label="Chọn kỳ"
              className="bg-transparent border-none text-sm text-gray-700 font-medium cursor-pointer pr-1 focus:outline-none focus-visible:ring-primary"
            >
              {PERIODS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            title="Tải JSON danh sách đơn đặt xe"
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 border border-gray-200 bg-white rounded-full px-4 py-1.5 cursor-pointer hover:border-primary hover:text-primary"
            onClick={() => {
              const blob = new Blob([JSON.stringify((bookings || []).slice(0, 80), null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'showroom-don-dat-xe-export.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={14} aria-hidden="true" /> Xuất báo cáo
          </button>
          <div className="flex items-center border border-gray-200 bg-white rounded-full p-1 gap-0.5">
            {VARIANTS.map((v) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setActiveVariant(v.id)}
                title={v.label}
                aria-label={v.label}
                aria-pressed={activeVariant === v.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeVariant === v.id ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <SummaryBar period={selectedPeriod} monthlySeries={monthlySeries} bookingRows={bookingRows} bookings={bookings} />

      {activeVariant === 1 && (
        <Variant1Layout
          period={selectedPeriod}
          navigate={navigate}
          monthlySeries={monthlySeries}
          vehicles={vehicles}
          bookingRows={bookingRows}
        />
      )}
      {activeVariant === 2 && (
        <Variant2Layout
          period={selectedPeriod}
          monthlySeries={monthlySeries}
          vehicles={vehicles}
          bookingRows={bookingRows}
          vehicleStatusPie={vehicleStatusPie}
        />
      )}
      {activeVariant === 3 && (
        <Variant3Layout
          period={selectedPeriod}
          setPeriod={setSelectedPeriod}
          user={user}
          monthlySeries={monthlySeries}
          vehicles={vehicles}
          vehicleStatusPie={vehicleStatusPie}
          bookingRows={bookingRows}
          initialAlerts={initialAlerts}
          bookingsTodayCount={bookingsTodayCount}
        />
      )}
    </div>
  );
};

export default ShowroomDashboard;
