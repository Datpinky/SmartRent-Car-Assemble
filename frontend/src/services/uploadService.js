import apiClient from './apiClient';

export const uploadService = {
  /**
   * Upload up to 6 image files to Cloudinary via backend.
   * files: File[] array (from <input type="file">)
   * Returns: [{ url: string, publicId: string }]
   */
  async uploadImages(files) {
    const safeFiles = Array.from(files).slice(0, 6);
    const formData = new FormData();
    safeFiles.forEach((file) => formData.append('files', file));

    const res = await apiClient.post('/api/uploads/image/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data.data || [];
  },

  /**
   * Analyze a single free-form gallery. Use this when there is no BEFORE gallery.
   * images: [{ type: 'file', data: File } | { type: 'url', data: string }]
   */
  async compareGalleryImages(images) {
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('Cần ít nhất một ảnh để phân tích');
    }

    const formData = new FormData();
    const safeImages = images.slice(0, 6);
    formData.append('count', safeImages.length);

    safeImages.forEach((img, i) => {
      if (img.type === 'file') {
        formData.append(`image_${i}`, img.data);
      } else if (img.type === 'url') {
        formData.append(`image_url_${i}`, img.data);
      }
    });

    const res = await apiClient.post('/api/uploads/image/vehicle-damage-gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
    return res.data?.data ?? null;
  },

  /**
   * Compare two free-form galleries. BEFORE is showroom pickup, AFTER is return.
   * beforeImages/afterImages: [{ type: 'file', data: File } | { type: 'url', data: string }]
   */
  async compareBeforeAfterGallery(beforeImages = [], afterImages = []) {
    if (!Array.isArray(afterImages) || afterImages.length === 0) {
      throw new Error('Cần ít nhất một ảnh trả xe để phân tích');
    }

    const before = Array.isArray(beforeImages) ? beforeImages.slice(0, 6) : [];
    const after = afterImages.slice(0, 6);
    const formData = new FormData();
    formData.append('before_count', before.length);
    formData.append('after_count', after.length);

    before.forEach((img, i) => {
      if (img.type === 'file') {
        formData.append(`before_${i}`, img.data);
      } else if (img.type === 'url') {
        formData.append(`before_url_${i}`, img.data);
      }
    });

    after.forEach((img, i) => {
      if (img.type === 'file') {
        formData.append(`after_${i}`, img.data);
      } else if (img.type === 'url') {
        formData.append(`after_url_${i}`, img.data);
      }
    });

    const res = await apiClient.post('/api/uploads/image/vehicle-damage-gallery-compare', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
    return res.data?.data ?? null;
  },
};

export default uploadService;
