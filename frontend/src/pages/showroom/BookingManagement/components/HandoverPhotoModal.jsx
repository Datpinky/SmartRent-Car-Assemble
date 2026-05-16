import { useRef, useState } from 'react';
import { FaCamera, FaPlus, FaTimesCircle } from 'react-icons/fa';
import Modal from '../../../../components/common/Modal';
import { ACCEPTED_IMAGE_INPUT_ACCEPT, isAcceptedImageFile } from '../../../../utils/acceptedImageTypes';

const MAX_HANDOVER_PHOTOS = 6;

const HandoverPhotoModal = ({ handoverPhotoModal, handoverUploading, onConfirm, onClose }) => {
  const [handoverPhotos, setHandoverPhotos] = useState([]);
  const photoInputRef = useRef(null);

  const handleClose = () => {
    if (!handoverUploading) {
      setHandoverPhotos([]);
      onClose();
    }
  };

  const handleConfirm = (skipPhotos) => {
    onConfirm(handoverPhotos, skipPhotos);
    setHandoverPhotos([]);
  };

  const handleSelectPhotos = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => isAcceptedImageFile(file));
    event.target.value = '';
    if (!files.length) return;

    setHandoverPhotos((current) => [...current, ...files].slice(0, MAX_HANDOVER_PHOTOS));
  };

  const removePhoto = (index) => {
    setHandoverPhotos((current) => current.filter((_, idx) => idx !== index));
  };

  return (
    <Modal
      isOpen={!!handoverPhotoModal}
      onClose={handleClose}
      title="Chụp ảnh xe trước khi bàn giao (không bắt buộc)"
      width={560}
    >
      {handoverPhotoModal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: '#1e40af',
            }}
          >
            <strong>Mẹo:</strong> Tải tối đa {MAX_HANDOVER_PHOTOS} ảnh xe trước khi bàn giao. Ảnh này sẽ được sử dụng
            làm bằng chứng tình trạng xe khi bàn giao, giúp AI so sánh với ảnh trả xe sau này. Nếu bạn không có ảnh hoặc
            không muốn tải lên, vẫn có thể tiếp tục bàn giao xe bình thường mà không cần ảnh.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 10 }}>
            {handoverPhotos.map((file, idx) => {
              const preview = URL.createObjectURL(file);
              return (
                <div key={`${file.name}-${idx}`} style={{ position: 'relative', aspectRatio: '1' }}>
                  <img
                    src={preview}
                    alt={`Ảnh bàn giao ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '2px solid #2563eb',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.55)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Xóa ảnh"
                  >
                    <FaTimesCircle style={{ color: '#fff', fontSize: '0.75rem' }} />
                  </button>
                </div>
              );
            })}

            {handoverPhotos.length < MAX_HANDOVER_PHOTOS && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={handoverUploading}
                style={{
                  aspectRatio: '1/0.5',
                  border: '2px dashed #93c5fd',
                  borderRadius: 8,
                  background: '#eff6ff',
                  cursor: handoverUploading ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {handoverPhotos.length === 0 ? (
                  <FaCamera style={{ color: '#2563eb', fontSize: '1.2rem' }} />
                ) : (
                  <FaPlus style={{ color: '#2563eb', fontSize: '1rem' }} />
                )}
                <span style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 700 }}>Thêm ảnh</span>
              </button>
            )}
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
            multiple
            style={{ display: 'none' }}
            onChange={handleSelectPhotos}
          />

          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
            {handoverPhotos.length} / {MAX_HANDOVER_PHOTOS} ảnh đã chọn
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-outline"
              style={{ flex: 1 }}
              onClick={() => handleConfirm(true)}
              disabled={handoverUploading}
            >
              Bỏ qua ảnh & bàn giao
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => handleConfirm(false)}
              disabled={handoverUploading}
            >
              {handoverUploading ? 'Đang tải ảnh...' : 'Lưu ảnh & bàn giao'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default HandoverPhotoModal;
