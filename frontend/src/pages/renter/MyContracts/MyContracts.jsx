import { useCallback, useEffect, useState } from 'react';
import { FaFilePdf, FaFileSignature } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import ContractSigningModal from '../../../components/common/ContractSigningModal';
import SkeletonCard from '../../../components/common/SkeletonCard';
import StatusBadge from '../../../components/common/StatusBadge';
import contractService from '../../../services/contractService';

const fmt = (d) =>
  d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—';

const fmtVnd = (n) => (n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—');

const STATUS_LABELS = {
  pending_signature: 'Chờ ký',
  signed: 'Đã ký',
  voided: 'Đã hủy',
};

const MyContracts = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingBookingId, setSigningBookingId] = useState(null);
  const [viewContract, setViewContract] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { items } = await contractService.listMyContracts({ limit: 50 });
      setContracts(items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách hợp đồng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div>
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Hợp đồng của tôi</h1>
          <p className="page-subtitle">Danh sách hợp đồng thuê xe đã ký hoặc đang chờ ký</p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-600 text-sm mb-4"
        >
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonCard count={3} compact />
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <FaFileSignature className="text-4xl text-gray-300" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-gray-700 text-base mb-1.5">Chưa có hợp đồng nào</p>
            <p className="text-[0.82rem] text-gray-400 leading-relaxed max-w-sm">
              Hợp đồng sẽ xuất hiện tại đây sau khi showroom duyệt và tạo hợp đồng cho chuyến đi của bạn.
            </p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Khám phá xe ngay
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {contracts.map((c) => (
            <div key={c._id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
              <div className="flex justify-between items-start flex-wrap gap-2.5">
                <div>
                  <div className="font-bold text-blue-800 text-sm mb-1">{c.contract_number}</div>
                  <div className="font-semibold text-gray-900">{c.vehicle_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Bên A: {c.party_a_name} &nbsp;|&nbsp; {fmt(c.start_date)} → {fmt(c.end_date)} ({c.duration_days}{' '}
                    ngày)
                  </div>
                  <div className="text-xs text-gray-700 font-semibold mt-0.5">{fmtVnd(c.total_price)}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={c.status} />
                  {c.status === 'pending_signature' && (
                    <button
                      onClick={() => setSigningBookingId(c.booking_id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-800 border-none rounded-lg text-white font-bold cursor-pointer text-xs hover:bg-blue-900 transition-colors"
                    >
                      <FaFileSignature /> Ký hợp đồng
                    </button>
                  )}
                  {c.pdf_url && (
                    <a
                      href={c.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-800 font-semibold text-xs no-underline hover:bg-green-100 transition-colors"
                    >
                      <FaFilePdf /> Tải PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {signingBookingId && (
        <ContractSigningModal
          bookingId={signingBookingId}
          open={!!signingBookingId}
          onClose={() => setSigningBookingId(null)}
          onSigned={() => {
            setSigningBookingId(null);
            fetch();
          }}
        />
      )}
    </div>
  );
};

export default MyContracts;
