import { useCallback, useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaFileSignature, FaSpinner, FaTimes } from 'react-icons/fa';
import contractService from '../../services/contractService';
import { getRentalContractByBookingId } from '../../services/rentalContractService';
import ContractBody from './components/ContractBody';
import SignatureSection from './components/SignatureSection';

/**
 * ContractModal — hiển thị toàn bộ nội dung hợp đồng + chữ ký điện tử.
 * Props: isOpen, bookingId, onClose, onSigned?(contract)
 */
export default function ContractModal({ isOpen, bookingId, onClose, onSigned }) {
  const [bodyData, setBodyData] = useState(null);
  const [signContract, setSignContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    let id = '';
    if (bookingId != null && bookingId !== '') {
      if (typeof bookingId === 'string') id = bookingId.trim();
      else if (typeof bookingId === 'object') {
        id = String(bookingId._id || bookingId.$oid || bookingId.id || '');
      } else id = String(bookingId);
    }
    if (!id) return;
    setLoading(true); setError(''); setBodyData(null); setSignContract(null);
    try {
      const [body, sign] = await Promise.allSettled([
        getRentalContractByBookingId(id),
        contractService.getByBookingId(id),
      ]);
      if (body.status === 'fulfilled') setBodyData(body.value);
      if (sign.status === 'fulfilled') setSignContract(sign.value);
      if (body.status === 'rejected' && sign.status === 'rejected') {
        setError(body.reason?.response?.data?.message || body.reason?.message || 'Không thể tải hợp đồng. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    const id =
      typeof bookingId === 'string'
        ? bookingId.trim()
        : bookingId && typeof bookingId === 'object'
          ? String(bookingId._id || bookingId.$oid || bookingId.id || '')
          : bookingId != null
            ? String(bookingId)
            : '';
    if (isOpen && id) { load(); }
    else if (!isOpen) { setBodyData(null); setSignContract(null); setError(''); }
  }, [isOpen, bookingId, load]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[calc(100vh-2rem)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-blue-900 to-blue-600 rounded-t-2xl px-6 py-5 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <FaFileSignature className="text-2xl shrink-0" />
            <div>
              <h2 className="font-extrabold text-base leading-tight">Hợp đồng thuê xe</h2>
              {signContract?.contract_number && <p className="text-xs opacity-80 mt-0.5">Số HĐ: {signContract.contract_number}</p>}
              {signContract?.status === 'signed' && (
                <span className="inline-flex items-center gap-1 mt-1 text-[0.7rem] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold">
                  <FaCheckCircle /> Đã ký
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="bg-white/20 border-none rounded-lg px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/30 transition-colors" aria-label="Đóng">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
              <FaSpinner className="animate-spin text-3xl text-blue-600" /><span className="text-sm">Đang tải hợp đồng...</span>
            </div>
          )}
          {!loading && error && (
            <div role="alert" className="flex gap-3 items-start rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
              <FaExclamationCircle className="shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          {!loading && !error && (
            <>
              {bodyData ? (
                <>
                  <ContractBody data={bodyData} />
                  <SignatureSection contract={signContract} bodyData={bodyData} onSigned={onSigned} />
                </>
              ) : signContract ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-blue-800 mb-3 text-sm">HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {[
                      ['Số HĐ', signContract.contract_number],
                      ['Bên A (Cho thuê)', signContract.party_a_name],
                      ['Bên B (Thuê xe)', signContract.party_b_name],
                      ['Xe', [signContract.vehicle_brand, signContract.vehicle_model].filter(Boolean).join(' ') || '—'],
                      ['Biển số', signContract.vehicle_plate || '—'],
                      ['Từ ngày', signContract.start_date ? new Date(signContract.start_date).toLocaleDateString('vi-VN') : '—'],
                      ['Đến ngày', signContract.end_date ? new Date(signContract.end_date).toLocaleDateString('vi-VN') : '—'],
                    ].map(([k, v]) => (
                      <div key={k}><span className="text-gray-500">{k}:</span> <span className="font-semibold text-gray-900">{v}</span></div>
                    ))}
                  </div>
                  <SignatureSection contract={signContract} bodyData={null} onSigned={onSigned} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">Không có dữ liệu hợp đồng.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}