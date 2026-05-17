import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

/**
 * SignaturePad — wrapper quanh react-signature-canvas.
 *
 * Props:
 *  - onSign(dataUri: string) — được gọi khi người dùng xong (mouseup / touchend)
 *  - onClear() — (tuỳ chọn) callback khi xóa
 *  - width, height — kích thước canvas (px); không truyền width để tự co theo khung cha
 *  - label — nhãn hiển thị trên pad
 */
const SignaturePad = ({ onSign, onSave, onClear, width: widthProp, height = 150, label = 'Vẽ chữ ký của bạn' }) => {
  const wrapRef = useRef(null);
  const sigRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(() =>
    typeof widthProp === 'number' ? widthProp : 320,
  );

  useEffect(() => {
    if (typeof widthProp === 'number') {
      setCanvasWidth(widthProp);
      return;
    }
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr?.width) return;
      const next = Math.max(200, Math.min(560, Math.floor(cr.width)));
      setCanvasWidth((w) => (Math.abs(w - next) > 2 ? next : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthProp]);

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
    <div ref={wrapRef} className="block w-full max-w-[560px]">
      {label && <p className="mb-1.5 text-center text-xs text-gray-500">{label}</p>}
      <div className="inline-block w-full max-w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 leading-none">
        <SignatureCanvas
          key={typeof widthProp === 'number' ? `${canvasWidth}-fixed` : `${canvasWidth}-auto`}
          ref={sigRef}
          penColor="#1e293b"
          backgroundColor="rgba(0,0,0,0)"
          canvasProps={{ width: canvasWidth, height, style: { display: 'block' } }}
          onEnd={handleEnd}
        />
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="cursor-pointer rounded-md border border-gray-200 bg-gray-100 px-3.5 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200"
        >
          Xóa
        </button>
        {isEmpty && <span className="text-xs text-gray-400">Chưa có chữ ký</span>}
      </div>
    </div>
  );
};

export default SignaturePad;
