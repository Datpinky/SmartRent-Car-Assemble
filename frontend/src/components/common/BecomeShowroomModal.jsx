import { useState } from 'react';
import { FaCheckCircle, FaInfoCircle, FaSpinner, FaStore } from 'react-icons/fa';
import profileService from '../../services/profileService';
import SignaturePad from '../common/SignaturePad';

const TERMS = [
  'Tôi cam kết sở hữu hoặc được ủy quyền hợp pháp sử dụng xe cho thuê được đăng ký trên nền tảng.',
  'Tôi chịu trách nhiệm đảm bảo xe luôn trong tình trạng an toàn, đủ điều kiện lưu thông trước mỗi chuyến thuê.',
  'Tôi đồng ý tuân thủ các chính sách của SmartRent về giá thuê, thông tin xe, và quản lý hợp đồng.',
  'Tôi hiểu rằng mọi tranh chấp với người thuê sẽ được xử lý theo quy trình của nền tảng và pháp luật hiện hành.',
  'Chữ ký điện tử bên dưới có giá trị pháp lý tương đương chữ ký viết tay trên hợp đồng.',
];

/**
 * BecomeShowroomModal
 *
 * Props:
 *  - open: boolean
 *  - onClose(): void
 *  - onSuccess(updatedUser): void  — được gọi sau khi upgrade thành công
 */
const BecomeShowroomModal = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1 = đọc điều khoản, 2 = ký tên, 3 = thành công
  const [agreed, setAgreed] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!signature) {
      setError('Vui lòng vẽ chữ ký của bạn.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const updated = await profileService.becomeShowroom({
        signature,
        business_name: businessName.trim(),
        tax_code: taxCode.trim(),
      });
      setStep(3);
      if (onSuccess) onSuccess(updated);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep(1);
    setAgreed(false);
    setBusinessName('');
    setTaxCode('');
    setSignature(null);
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/55 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#00b14f] to-[#009f45] rounded-t-2xl px-7 py-6 text-white">
          <div className="flex items-center gap-3">
            <FaStore className="text-2xl" />
            <div>
              <h2 className="font-extrabold text-lg leading-tight">Đăng ký trở thành Showroom</h2>
              <p className="text-xs opacity-85 mt-1">Bước {step} / 3</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6">
          {/* ── Step 1: Điều khoản ── */}
          {step === 1 && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
                <div className="flex gap-2 items-start">
                  <FaInfoCircle className="text-green-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-800 leading-relaxed m-0">
                    Sau khi hoàn tất đăng ký, tài khoản của bạn sẽ được nâng cấp ngay lập tức thành{' '}
                    <strong>Showroom</strong>. Bạn có thể đăng xe cho thuê và quản lý hợp đồng thông qua bảng điều khiển
                    Showroom.
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-sm text-gray-900 mb-3">Điều khoản và cam kết</h3>
              <ul className="list-none p-0 m-0 mb-5 space-y-2.5">
                {TERMS.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-gray-700 leading-relaxed">
                    <span className="text-[#00b14f] font-bold shrink-0 mt-0.5">✓</span>
                    {t}
                  </li>
                ))}
              </ul>

              <label className="flex gap-2.5 items-start cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 cursor-pointer accent-[#00b14f]"
                />
                <span className="text-sm text-gray-900 font-semibold">
                  Tôi đã đọc, hiểu và đồng ý với tất cả các điều khoản trên.
                </span>
              </label>

              <div className="flex gap-2.5">
                <button
                  onClick={handleClose}
                  className="flex-1 px-5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-semibold text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!agreed}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#00b14f] border-none rounded-lg text-white font-bold text-sm cursor-pointer hover:bg-[#009f45] transition-colors ${!agreed ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Tiếp theo →
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Thông tin & Chữ ký ── */}
          {step === 2 && (
            <>
              <h3 className="font-bold text-sm text-gray-900 mb-4">Thông tin showroom (tuỳ chọn)</h3>
              <div className="mb-3.5">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên showroom / doanh nghiệp</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="VD: Cho thuê xe Minh Tú"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#00b14f] transition-colors"
                />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mã số thuế (nếu có)</label>
                <input
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  placeholder="0123456789"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#00b14f] transition-colors"
                />
              </div>

              <h3 className="font-bold text-sm text-gray-900 mb-2">Chữ ký điện tử</h3>
              <p className="text-xs text-gray-500 mb-3">
                Chữ ký này sẽ được nhúng vào mỗi hợp đồng thuê xe mà bạn ký với người thuê.
              </p>
              <div className="flex justify-center mb-4">
                <SignaturePad
                  width={440}
                  height={160}
                  label="Vẽ chữ ký tại đây"
                  onSign={setSignature}
                  onClear={() => setSignature(null)}
                />
              </div>

              {error && <p className="text-red-600 text-xs mb-3 text-center">{error}</p>}

              <div className="flex gap-2.5">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 px-5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-semibold text-sm cursor-pointer hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  ← Quay lại
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !signature}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#00b14f] border-none rounded-lg text-white font-bold text-sm cursor-pointer hover:bg-[#009f45] transition-colors ${loading || !signature ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" /> Đang xử lý...
                    </>
                  ) : (
                    'Xác nhận đăng ký'
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Thành công ── */}
          {step === 3 && (
            <div className="text-center py-3">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-5xl text-emerald-600" />
              </div>
              <h2 className="font-extrabold text-gray-900 mb-2">Chúc mừng!</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Tài khoản của bạn đã được nâng cấp thành <strong>Showroom</strong>. Vui lòng đăng xuất và đăng nhập lại
                để áp dụng quyền mới.
              </p>
              <button
                onClick={handleClose}
                className="min-w-[140px] px-5 py-2.5 bg-[#00b14f] border-none rounded-lg text-white font-bold text-sm cursor-pointer hover:bg-[#009f45] transition-colors"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BecomeShowroomModal;
