import { useRef, useState } from 'react';
import { FaCamera, FaTimesCircle } from 'react-icons/fa';
import Modal from '../../../../components/common/Modal';
import { HANDOVER_POSITIONS } from '../bookingManagement.helpers';

const HandoverPhotoModal = ({ handoverPhotoModal, handoverUploading, onConfirm, onClose }) => {
  const [handoverPhotos, setHandoverPhotos] = useState({});
  const photoInputRefs = useRef({});

  const handleClose = () => {
    if (!handoverUploading) { setHandoverPhotos({}); onClose(); }
  };

  const handleConfirm = (skipPhotos) => {
    onConfirm(handoverPhotos, skipPhotos);
    setHandoverPhotos({});
  };

  return (
    <Modal isOpen={!!handoverPhotoModal} onClose={handleClose} title="Chụp ảnh xe trước khi bàn giao (không bắt buộc)" width={540}>
      {handoverPhotoModal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#1e40af' }}>
            <strong>Mẹo:</strong> Chụp ảnh xe từng góc trước khi bàn giao giúp AI so sánh tự động khi khách trả xe. Bạn có thể bỏ qua bước này và vẫn bàn giao xe bình thường.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {HANDOVER_POSITIONS.map((label, idx) => {
              const file = handoverPhotos[idx];
              const preview = file ? URL.createObjectURL(file) : null;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>{label}</span>
                  {preview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={preview} alt={label} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #2563eb' }} />
                      <button type="button" onClick={() => setHandoverPhotos((p) => { const n = { ...p }; delete n[idx]; return n; })}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaTimesCircle style={{ color: '#fff', fontSize: '0.7rem' }} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => photoInputRefs.current[idx]?.click()}
                      style={{ width: '100%', height: 80, border: '2px dashed #93c5fd', borderRadius: 8, background: '#eff6ff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <FaCamera style={{ color: '#2563eb', fontSize: '1.1rem' }} />
                      <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>Chọn ảnh</span>
                    </button>
                  )}
                  <input ref={(el) => { photoInputRefs.current[idx] = el; }} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setHandoverPhotos((p) => ({ ...p, [idx]: f })); e.target.value = ''; }} />
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
            {Object.keys(handoverPhotos).length} / {HANDOVER_POSITIONS.length} góc đã chọn
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => handleConfirm(true)} disabled={handoverUploading}>
              Bỏ qua ảnh & bàn giao
            </button>
            <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={() => handleConfirm(false)} disabled={handoverUploading}>
              {handoverUploading ? 'Đang tải ảnh...' : 'Lưu ảnh & bàn giao'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default HandoverPhotoModal;