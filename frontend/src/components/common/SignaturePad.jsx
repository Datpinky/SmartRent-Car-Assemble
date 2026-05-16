import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

/**
 * SignaturePad — wrapper quanh react-signature-canvas.
 *
 * Props:
 *  - onSign(dataUri: string) — được gọi khi người dùng xong (mouseup / touchend)
 *  - onClear() — (tuỳ chọn) callback khi xóa
 *  - width, height — kích thước canvas (px)
 *  - label — nhãn hiển thị trên pad
 */
const SignaturePad = ({ onSign, onSave, onClear, width = 400, height = 150, label = 'Vẽ chữ ký của bạn' }) => {
  const sigRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleEnd = () => {
    if (!sigRef.current) return;
    if (sigRef.current.isEmpty()) return;
    setIsEmpty(false);
    const data = sigRef.current.toDataURL('image/png');
    if (onSign) onSign(data);
    if (onSave) onSave(data);
  };

  const handleClear = () => {
    if (!sigRef.current) return;
    sigRef.current.clear();
    setIsEmpty(true);
    if (onClear) onClear();
    if (onSign) onSign(null);
    if (onSave) onSave(null);
  };

  return (
    <div className="inline-block">
      {label && <p className="text-xs text-gray-500 mb-1.5 text-center">{label}</p>}
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 inline-block leading-none overflow-hidden">
        <SignatureCanvas
          ref={sigRef}
          penColor="#1e293b"
          backgroundColor="rgba(0,0,0,0)"
          canvasProps={{ width, height, style: { display: 'block' } }}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex justify-end items-center gap-2 mt-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-3.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
        >
          Xóa
        </button>
        {isEmpty && <span className="text-xs text-gray-400">Chưa có chữ ký</span>}
      </div>
    </div>
  );
};

export default SignaturePad;
