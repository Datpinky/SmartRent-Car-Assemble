import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaDownload, FaEye, FaFileSignature, FaSpinner } from 'react-icons/fa';
import ContractModal from '../../../components/common/ContractModal';
import StatusBadge from '../../../components/common/StatusBadge';
import contractService from '../../../services/contractService';
import { formatVnd } from '../../../utils/currencyFormat';

const fmt = (d) =>
  d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—';

/** Chuẩn hóa booking_id (string / ObjectId / object từ API) cho URL và validate backend. */
function toBookingIdString(ref) {
  if (ref == null || ref === '') return '';
  if (typeof ref === 'string') return ref.trim();
  if (typeof ref === 'object') {
    if (ref.$oid != null) return String(ref.$oid);
    return String(ref._id || ref.id || '');
  }
  return String(ref);
}

function mapContractRow(c) {
  return {
    raw: c,
    _id: c._id,
    id: c.contract_number || `HD${String(c._id).slice(-6).toUpperCase()}`,
    renter: c.party_b_name || '—',
    vehicle: c.vehicle_name || '—',
    from: c.start_date ? fmt(c.start_date) : '—',
    to: c.end_date ? fmt(c.end_date) : '—',
    total: c.total_price ?? 0,
    bookingId: c.booking_id ? `BK${String(c.booking_id).slice(-6).toUpperCase()}` : '—',
    createdAt: fmt(c.createdAt),
    status: c.status,
    pdf_url: c.pdf_url || '',
    signed_at: c.renter_signed_at ? fmt(c.renter_signed_at) : null,
    party_a: c.party_a_name || '—',
    daily_rate: c.daily_rate,
    duration_days: c.duration_days,
  };
}

const FILTERS = [
  ['all', 'Tất cả'],
  ['pending_signature', 'Chờ ký'],
  ['signed', 'Đã ký'],
  ['voided', 'Đã hủy'],
];

const ContractManagement = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewModal, setViewModal] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { items } = await contractService.list({ limit: 100, page: 1 });
      setRows((items || []).map(mapContractRow));
    } catch (err) {
      setLoadError(err?.message || 'Không thể tải danh sách hợp đồng.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((c) => c.status === filter);
  }, [rows, filter]);

  const downloadPdf = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Quản lý Hợp đồng</h1>
          <p className="page-subtitle">Theo dõi hợp đồng thuê xe (dữ liệu từ server)</p>
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
          {loadError}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(([k, label]) => (
          <button
            type="button"
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
              filter === k
                ? 'bg-[#00b14f] border-[#00b14f] text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:border-[#00b14f] hover:text-[#00b14f]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FaSpinner aria-hidden="true" className="animate-spin text-primary text-xl" />
          <span>Đang tải…</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400 text-sm">
              <FaFileSignature className="text-4xl text-gray-300 mb-2" />
              <span>Chưa có hợp đồng nào.</span>
            </div>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Số hợp đồng</th>
                  <th>Bên thuê / Xe</th>
                  <th>Thời hạn</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <span className="code-badge">{c.id}</span>
                    </td>
                    <td>
                      <div className="font-semibold text-sm text-gray-900">{c.renter}</div>
                      {c.vehicle !== '—' && <div className="text-xs text-gray-400 mt-0.5">{c.vehicle}</div>}
                    </td>
                    <td className="text-sm text-gray-700">
                      {c.from} → {c.to}
                    </td>
                    <td className={`font-bold ${c.total > 0 ? 'text-[#00b14f]' : 'text-gray-400'}`}>
                      {c.total > 0 ? formatVnd(c.total) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button type="button" className="btn-icon" onClick={() => setViewModal(c)} title="Xem hợp đồng">
                          <FaEye aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={`btn-icon ${!c.pdf_url ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title={c.pdf_url ? 'Tải PDF' : 'Chưa có PDF'}
                          disabled={!c.pdf_url}
                          aria-label="Tải PDF"
                          onClick={() => downloadPdf(c.pdf_url)}
                        >
                          <FaDownload aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Detail modal — full contract body + signature */}
      <ContractModal
        isOpen={!!viewModal}
        bookingId={viewModal ? toBookingIdString(viewModal.raw?.booking_id) : ''}
        onClose={() => setViewModal(null)}
      />
    </div>
  );
};

export default ContractManagement;
