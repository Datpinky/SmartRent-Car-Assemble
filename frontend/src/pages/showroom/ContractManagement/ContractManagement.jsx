import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import Modal from '../../../components/common/Modal';
import { FaEye, FaDownload, FaFileContract, FaFileSignature, FaSpinner } from 'react-icons/fa';
import contractService from '../../../services/contractService';
import { formatVnd } from '../../../utils/currencyFormat';

const fmt = (d) =>
  d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—';

function mapContractRow(c) {
  const bid = c.booking_id;
  const renterUser = bid?.user_id;
  const renter = c.renter_id?.name || renterUser?.name || renterUser?.email || '—';
  const vehicle = c.vehicle_id
    ? c.vehicle_id.vehicle_name ||
      [c.vehicle_id.vehicle_brand, c.vehicle_id.vehicle_model].filter(Boolean).join(' ') ||
      '—'
    : '—';
  return {
    raw: c,
    _id: c._id,
    id: `HD${String(c._id).slice(-6).toUpperCase()}`,
    type: c.type,
    renter,
    vehicle,
    from: bid?.start_date ? fmt(bid.start_date) : '—',
    to: bid?.end_date ? fmt(bid.end_date) : '—',
    total: bid?.total_price ?? 0,
    bookingId: bid?._id ? `BK${String(bid._id).slice(-6).toUpperCase()}` : '—',
    createdAt: fmt(c.createdAt),
    status: c.status,
    pdf_url: c.pdf_url || '',
  };
}

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
    if (filter === 'rental' || filter === 'service') return rows.filter((c) => c.type === filter);
    return rows.filter((c) => c.status === filter);
  }, [rows, filter]);

  const downloadPdf = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Quản lý Hợp đồng</h1>
          <p className="page-subtitle">Theo dõi hợp đồng thuê xe và hợp đồng dịch vụ (dữ liệu từ server)</p>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
          {loadError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', 'Tất cả'], ['rental', 'HĐ thuê xe'], ['service', 'HĐ dịch vụ'], ['signed', 'Đã ký'], ['draft', 'Nháp'], ['expired', 'Hết hạn'], ['cancelled', 'Đã hủy']].map(([k, label]) => (
          <button
            type="button"
            key={k}
            onClick={() => setFilter(k)}
            style={{
              padding: '5px 12px',
              borderRadius: 50,
              border: '1.5px solid',
              borderColor: filter === k ? '#00b14f' : '#e5e7eb',
              background: filter === k ? '#00b14f' : '#fff',
              color: filter === k ? '#fff' : '#374151',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FaSpinner aria-hidden="true" className="animate-spin text-primary text-xl" />
          <span>Đang tải…</span>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">Chưa có hợp đồng. Tạo hợp đồng từ API hoặc tích hợp sau khi booking hoàn tất.</div>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  <th>Loại</th>
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
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: c.type === 'rental' ? '#2563eb' : '#7c3aed',
                        }}
                      >
                        {c.type === 'rental' ? <FaFileContract /> : <FaFileSignature />}
                        {c.type === 'rental' ? 'Thuê xe' : 'Dịch vụ'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#111827' }}>{c.renter}</div>
                      {c.vehicle !== '—' && <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{c.vehicle}</div>}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#374151' }}>
                      {c.from} → {c.to}
                    </td>
                    <td style={{ fontWeight: 700, color: c.total > 0 ? '#00b14f' : '#9ca3af' }}>
                      {c.total > 0 ? formatVnd(c.total) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button type="button" className="btn-icon" onClick={() => setViewModal(c)} title="Xem hợp đồng">
                          <FaEye aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title={c.pdf_url ? 'Tải PDF' : 'Chưa có PDF'}
                          disabled={!c.pdf_url}
                          style={{ opacity: c.pdf_url ? 1 : 0.45, cursor: c.pdf_url ? 'pointer' : 'not-allowed' }}
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

      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Chi tiết hợp đồng" width={540}>
        {viewModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="code-badge" style={{ marginBottom: 6, display: 'inline-block' }}>
                  {viewModal.id}
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
                  {viewModal.type === 'rental' ? 'Hợp đồng thuê xe' : 'Hợp đồng dịch vụ'}
                </div>
              </div>
              <StatusBadge status={viewModal.status} />
            </div>
            {[
              ['Bên thuê/Khách hàng', viewModal.renter],
              ['Xe', viewModal.vehicle !== '—' ? viewModal.vehicle : '—'],
              ['Ngày bắt đầu', viewModal.from],
              ['Ngày kết thúc', viewModal.to],
              ['Tổng giá trị', viewModal.total > 0 ? formatVnd(viewModal.total) : '—'],
              ['Mã booking liên kết', viewModal.bookingId !== '—' ? viewModal.bookingId : '—'],
              ['Ngày tạo', viewModal.createdAt],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{k}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{v}</span>
              </div>
            ))}
            <div style={{ background: '#f3f4f6', borderRadius: 10, padding: 20, textAlign: 'center', border: '1px dashed #d1d5db' }}>
              <FaFileContract style={{ fontSize: '2rem', color: '#9ca3af', marginBottom: 8 }} />
              <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Tệp PDF hợp đồng (nếu đã tải lên)</div>
              <button
                type="button"
                className="btn-primary"
                disabled={!viewModal.pdf_url}
                style={{
                  marginTop: 10,
                  fontSize: '0.8rem',
                  padding: '7px 16px',
                  opacity: viewModal.pdf_url ? 1 : 0.5,
                  cursor: viewModal.pdf_url ? 'pointer' : 'not-allowed',
                }}
                onClick={() => downloadPdf(viewModal.pdf_url)}
              >
                <FaDownload aria-hidden="true" /> Tải xuống PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ContractManagement;
