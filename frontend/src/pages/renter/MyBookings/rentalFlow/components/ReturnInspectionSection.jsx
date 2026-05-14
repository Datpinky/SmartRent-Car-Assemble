import { FaCamera, FaCheckCircle } from 'react-icons/fa';
import uploadService from '../../../../../services/uploadService';
import { BASE_CARD_STYLE } from '../rentalFlow.constants';

const RETURN_POSITIONS = [
  { key: 'front', label: 'Đầu xe', icon: '⬆️' },
  { key: 'rear', label: 'Đuôi xe', icon: '⬇️' },
  { key: 'left', label: 'Hông trái', icon: '⬅️' },
  { key: 'right', label: 'Hông phải', icon: '➡️' },
  { key: 'interior', label: 'Nội thất', icon: '🪑' },
  { key: 'odometer', label: 'Đồng hồ km', icon: '🔢' },
];

const ReturnInspectionSection = ({ workflow, onChangeReturnImages, returnLocked }) => {
  const returnImages = workflow.returnImages || {};

  console.log('🖼️ ReturnInspectionSection render:', {
    returnLockedStatus: returnLocked,
    returnImagesStructure: {
      type: typeof returnImages,
      isArray: Array.isArray(returnImages),
      keys: Array.isArray(returnImages) ? 'array' : Object.keys(returnImages),
      total: Array.isArray(returnImages) ? returnImages.length : Object.values(returnImages).flat().length,
    },
    rawReturnImages: returnImages,
  });

  // Track images per position
  const getPositionImages = (posKey) => returnImages[posKey] || [];
  const updatePositionImages = (posKey, images) => {
    console.log(`📸 updatePositionImages for ${posKey}:`, {
      currentCount: getPositionImages(posKey).length,
      newCount: images.length,
    });
    onChangeReturnImages({ ...returnImages, [posKey]: images });
  };

  const handleImageUpload = async (event, posKey) => {
    if (returnLocked) return;

    const files = Array.from(event.target.files);
    if (!files.length) return;

    try {
      const uploadedUrls = await uploadService.uploadImages(files);
      const newImages = [...getPositionImages(posKey), ...uploadedUrls.map((u) => u.url)];
      updatePositionImages(posKey, newImages);
    } catch (err) {
      console.error('Lỗi upload ảnh:', err);
    }
  };

  const handleRemoveImage = (posKey, index) => {
    if (returnLocked) return;
    const newImages = getPositionImages(posKey).filter((_, i) => i !== index);
    updatePositionImages(posKey, newImages);
  };

  const completedPositions = RETURN_POSITIONS.filter((p) => getPositionImages(p.key).length > 0).length;
  const allPositionsComplete = completedPositions === RETURN_POSITIONS.length;

  return (
    <div style={BASE_CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: '#dbeafe',
            color: '#1d4ed8',
            flexShrink: 0,
          }}
        >
          <FaCamera />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: '#111827' }}>
            Ảnh trả xe
            {allPositionsComplete && <FaCheckCircle style={{ display: 'inline', marginLeft: 8, color: '#10b981' }} />}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>
            Upload đủ 6 vị trí để AI phân tích tình trạng xe ({completedPositions}/6)
          </div>
        </div>
      </div>

      {/* Position grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 14,
          marginBottom: 12,
        }}
      >
        {RETURN_POSITIONS.map((pos) => {
          const images = getPositionImages(pos.key);
          const isFilled = images.length > 0;
          console.log(`🖼️ Rendering position ${pos.key}:`, { imageCount: images.length, images });
          return (
            <div
              key={pos.key}
              style={{
                border: '2px solid #e5e7eb',
                borderRadius: 12,
                padding: 10,
                background: isFilled ? '#f0fdf4' : '#f9fafb',
                transition: 'all 0.2s',
              }}
            >
              {/* Position header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>{pos.icon}</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', flex: 1 }}>{pos.label}</span>
                {isFilled && <FaCheckCircle style={{ color: '#10b981', fontSize: '0.75rem' }} />}
              </div>

              {/* Images for position */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 8 }}>
                {images.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#e5e7eb',
                      aspectRatio: '1',
                    }}
                  >
                    <img
                      src={url}
                      alt={`${pos.key}-${idx}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {!returnLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(pos.key, idx)}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Upload button */}
              {!returnLocked && (
                <label
                  style={{
                    borderRadius: 8,
                    border: '1px dashed #9ca3af',
                    background: '#f3f4f6',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#6b7280',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1d4ed8';
                    e.currentTarget.style.background = '#e0f2fe';
                    e.currentTarget.style.color = '#1d4ed8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, pos.key)}
                    disabled={returnLocked}
                    style={{ display: 'none' }}
                  />
                  <span>+ Thêm</span>
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div
        style={{
          fontSize: '0.76rem',
          color: allPositionsComplete ? '#059669' : '#6b7280',
          textAlign: 'center',
          fontWeight: 500,
        }}
      >
        {returnLocked ? (
          <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            🔒 Hồ sơ đã gửi - không thể chỉnh sửa
          </div>
        ) : allPositionsComplete ? (
          '✓ Đủ 6 vị trí - Sẵn sàng xác nhận'
        ) : (
          `Cần ${RETURN_POSITIONS.length - completedPositions} vị trí nữa`
        )}
      </div>
    </div>
  );
};

export default ReturnInspectionSection;
