import { useEffect, useState } from 'react';
import { FaCheckCircle, FaFilePdf, FaFileSignature, FaSpinner, FaTimes } from 'react-icons/fa';
import contractService from '../../services/contractService';
import SignaturePad from '../common/SignaturePad';

const fmt = (d) =>
  d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—';

const fmtVnd = (n) => (n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—');

/**
 * ContractSigningModal
 *
 * Props:
 *  - bookingId: string
 *  - open: boolean
 *  - onClose(): void
 *  - onSigned(contract): void
 */
const ContractSigningModal = ({ bookingId, open, onClose, onSigned }) => {
  const [contract, setContract] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [signature, setSignature] = useState(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open || !bookingId) return;
    setContract(null);
    setLoadError('');
    setSignature(null);
    setSignError('');
    setDone(false);

    contractService
      .getByBookingId(bookingId)
      .then((c) => {
        setContract(c);
        if (c?.status === 'signed') setDone(true);
      })
      .catch((err) => setLoadError(err?.response?.data?.message || 'Không thể tải hợp đồng.'));
  }, [open, bookingId]);

  if (!open) return null;

  const handleSign = async () => {
    if (!signature) {
      setSignError('Vui lòng vẽ chữ ký trước khi xác nhận.');
      return;
    }
    setSignError('');
    setSigning(true);
    try {
      const updated = await contractService.signContract(contract._id, signature);
      setContract(updated);
      setDone(true);
      if (onSigned) onSigned(updated);
    } catch (err) {
      setSignError(err?.response?.data?.message || 'Ký hợp đồng thất bại. Vui lòng thử lại.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !signing) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-t-2xl px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FaFileSignature className="text-2xl" />
            <div>
              <h2 className="font-extrabold text-base leading-tight">Ký xác nhận hợp đồng thuê xe</h2>
              {contract && <p className="text-xs opacity-85 mt-0.5">Số HĐ: {contract.contract_number}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 border-none rounded-lg px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/30 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          {/* Loading / error */}
          {!contract && !loadError && (
            <div className="text-center py-10">
              <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
              <p className="text-gray-500 mt-3">Đang tải hợp đồng...</p>
            </div>
          )}

          {loadError && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-center">
              <p className="text-red-600 font-semibold">{loadError}</p>
              <button
                onClick={onClose}
                className="mt-3 flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-semibold text-sm cursor-pointer mx-auto"
              >
                Đóng
              </button>
            </div>
          )}

          {/* ── Done / đã ký ── */}
          {contract && done && (
            <div className="text-center py-3">
              <div
                className="w-18 h-18 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4"
                style={{ width: 72, height: 72 }}
              >
                <FaCheckCircle className="text-4xl text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-gray-900 mb-2">Hợp đồng đã được ký!</h3>
              <p className="text-gray-500 text-sm mb-5">Hợp đồng của bạn đã được ký và lưu thành công.</p>
              {contract.pdf_url && (
                <a
                  href={contract.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 rounded-lg text-white font-bold text-sm no-underline hover:bg-blue-700 transition-colors mb-3"
                >
                  <FaFilePdf /> Tải hợp đồng PDF
                </a>
              )}
              <br />
              <button
                onClick={onClose}
                className="min-w-[140px] mt-2 px-5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-semibold text-sm cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          )}

          {/* ── Contract info + signing form ── */}
          {contract && !done && (
            <>
              {/* Contract summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <h4 className="font-bold text-blue-800 mb-3 text-sm">HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {[
                    ['Số HĐ', contract.contract_number],
                    ['Bên A (Cho thuê)', contract.party_a_name],
                    ['Bên B (Người thuê)', contract.party_b_name],
                    ['Xe', contract.vehicle_name],
                    ['Biển số', contract.vehicle_plate || '—'],
                    ['Thời gian thuê', `${fmt(contract.start_date)} → ${fmt(contract.end_date)}`],
                    ['Số ngày', `${contract.duration_days} ngày`],
                    ['Giá/ngày', fmtVnd(contract.daily_rate)],
                    ['Tổng thanh toán', fmtVnd(contract.total_price)],
                    ['Phương thức TT', contract.payment_method],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="text-gray-500">{k}: </span>
                      <span className="font-semibold text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clauses summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 mb-5 text-xs text-amber-900">
                <strong>Điều khoản quan trọng:</strong> Bên B có trách nhiệm bảo quản xe, sử dụng đúng mục đích, trả xe
                đúng hạn và chịu mọi chi phí phát sinh do lỗi của mình. Hợp đồng có hiệu lực kể từ khi ký.
              </div>

              {/* Signature */}
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Chữ ký Bên B (Người thuê)</h4>
              <p className="text-xs text-gray-500 mb-3">
                Bằng chữ ký này, bạn xác nhận đã đọc, hiểu và đồng ý toàn bộ nội dung hợp đồng.
              </p>
              <div className="flex justify-center mb-4">
                <SignaturePad
                  width={480}
                  height={140}
                  label="Vẽ chữ ký của bạn (Bên B)"
                  onSign={setSignature}
                  onClear={() => setSignature(null)}
                />
              </div>

              {signError && <p className="text-red-600 text-xs mb-3 text-center">{signError}</p>}

              <div className="flex gap-2.5">
                <button
                  onClick={onClose}
                  disabled={signing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-semibold text-sm cursor-pointer hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Để sau
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing || !signature}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 border-none rounded-lg text-white font-bold text-sm cursor-pointer hover:bg-blue-700 transition-colors ${signing || !signature ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {signing ? (
                    <>
                      <FaSpinner className="animate-spin" /> Đang ký...
                    </>
                  ) : (
                    <>
                      <FaFileSignature /> Ký xác nhận hợp đồng
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractSigningModal;
