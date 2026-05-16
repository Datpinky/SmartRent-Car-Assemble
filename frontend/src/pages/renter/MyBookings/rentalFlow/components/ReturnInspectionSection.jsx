import { useEffect, useRef, useState } from 'react';
import { FaCamera, FaCheckCircle, FaPlus, FaTimes } from 'react-icons/fa';
import { ACCEPTED_IMAGE_INPUT_ACCEPT, isAcceptedImageFile } from '../../../../../utils/acceptedImageTypes';
import { BASE_CARD_STYLE } from '../rentalFlow.constants';

const MAX_RETURN_IMAGES = 6;

const normalizeImages = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, MAX_RETURN_IMAGES);
  if (value && typeof value === 'object')
    return Object.values(value).flat().filter(Boolean).slice(0, MAX_RETURN_IMAGES);
  return [];
};

const ReturnInspectionSection = ({ workflow, onChangeReturnImages, returnLocked }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [localPreviews, setLocalPreviews] = useState([]); // blob previews for immediate UI
  const returnImages = normalizeImages(workflow.returnImages);
  const canAddMore = returnImages.length + localPreviews.length < MAX_RETURN_IMAGES;

  useEffect(() => {
    // Clear local previews if workflow already contains matching serialized previews
    // (we conservatively clear previews when workflow.returnImages length changes)
    setLocalPreviews((prev) => (returnImages.length ? [] : prev));
  }, [workflow.returnImages]);

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Lỗi đọc file'));
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (event) => {
    if (returnLocked || uploading) return;

    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const remainingSlots = MAX_RETURN_IMAGES - (returnImages.length + localPreviews.length);
    const acceptedFiles = files.filter((file) => isAcceptedImageFile(file)).slice(0, remainingSlots);
    if (!acceptedFiles.length) return;

    setUploading(true);
    try {
      // Immediate UI: show blob previews
      const previews = acceptedFiles.map((f) => URL.createObjectURL(f));
      setLocalPreviews((curr) => [...curr, ...previews]);

      // Convert to data URLs for persistent localStorage saving
      const dataUrls = await Promise.all(acceptedFiles.map((f) => readFileAsDataUrl(f)));

      // Append data URLs to parent's workflow (these are serializable)
      onChangeReturnImages([...returnImages, ...dataUrls].slice(0, MAX_RETURN_IMAGES));

      // Revoke blob URLs after they are replaced by data URLs in workflow
      previews.forEach((p) => URL.revokeObjectURL(p));
      setLocalPreviews([]);
    } catch (err) {
      console.error('Lỗi xử lý ảnh:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    if (returnLocked) return;
    // Distinguish between persisted images and local previews
    if (index < returnImages.length) {
      onChangeReturnImages(returnImages.filter((_, i) => i !== index));
    } else {
      const previewIndex = index - returnImages.length;
      const previewUrl = localPreviews[previewIndex];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setLocalPreviews((prev) => prev.filter((_, i) => i !== previewIndex));
    }
  };

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
            {returnImages.length > 0 && (
              <FaCheckCircle style={{ display: 'inline', marginLeft: 8, color: '#10b981' }} />
            )}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>
            Upload tối đa {MAX_RETURN_IMAGES} ảnh xe khi trả, không cần chọn vị trí ({returnImages.length}/
            {MAX_RETURN_IMAGES})
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/** Render persisted images first, then local blob previews */}
        {returnImages.map((url, idx) => (
          <div
            key={`${String(url)}-${idx}`}
            style={{
              position: 'relative',
              borderRadius: 10,
              overflow: 'hidden',
              background: '#e5e7eb',
              aspectRatio: '1',
              border: '1px solid #d1d5db',
            }}
          >
            <img
              src={typeof url === 'string' ? url : url.url || url.preview || ''}
              alt={`Ảnh trả xe ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {!returnLocked && (
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: 'rgba(17, 24, 39, 0.72)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
                aria-label="Xóa ảnh"
              >
                <FaTimes />
              </button>
            )}
          </div>
        ))}

        {localPreviews.map((previewUrl, pIdx) => (
          <div
            key={`${previewUrl}-${pIdx}`}
            style={{
              position: 'relative',
              borderRadius: 10,
              overflow: 'hidden',
              background: '#e5e7eb',
              aspectRatio: '1',
              border: '1px solid #d1d5db',
            }}
          >
            <img
              src={previewUrl}
              alt={`Ảnh tạm ${pIdx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {!returnLocked && (
              <button
                type="button"
                onClick={() => handleRemoveImage(returnImages.length + pIdx)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: 'rgba(17, 24, 39, 0.72)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
                aria-label="Xóa ảnh"
              >
                <FaTimes />
              </button>
            )}
          </div>
        ))}

        {!returnLocked && canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              borderRadius: 10,
              border: '1.5px dashed #9ca3af',
              background: '#f9fafb',
              aspectRatio: '1/0.2',
              cursor: uploading ? 'default' : 'pointer',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 6,
              fontWeight: 700,
              opacity: uploading ? 0.7 : 1,
            }}
          >
            <FaPlus />
            <span style={{ fontSize: '0.78rem' }}>{uploading ? 'Đang xử lý...' : 'Thêm ảnh'}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
        onChange={handleImageUpload}
        disabled={returnLocked || uploading}
        style={{ display: 'none' }}
      />

      <div
        style={{
          fontSize: '0.76rem',
          color: returnImages.length > 0 ? '#059669' : '#6b7280',
          textAlign: 'center',
          fontWeight: 500,
        }}
      >
        {returnLocked
          ? 'Hồ sơ đã gửi - không thể chỉnh sửa'
          : returnImages.length > 0
            ? 'Đã có ảnh trả xe - sẵn sàng gửi yêu cầu'
            : 'Thêm ít nhất 1 ảnh để lưu chứng cứ trả xe'}
      </div>
    </div>
  );
};

export default ReturnInspectionSection;
