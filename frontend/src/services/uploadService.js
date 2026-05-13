import apiClient from './apiClient';

export const uploadService = {
  /**
   * Upload up to 5 image files to Cloudinary via backend.
   * files: File[] array (from <input type="file">)
   * Returns: [{ url: string, publicId: string }]
   */
  async uploadImages(files) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));

    const res = await apiClient.post('/api/uploads/image/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data.data || [];
  },

  /**
   * So sánh nhiều vị trí xe trong một lần gọi AI.
   * positions: [{ key: string, label: string, beforeFile: File, afterFile: File }]
   * Chỉ gửi các vị trí có đủ cả hai ảnh.
   */
  async compareMultiPosition(positions) {
    const valid = positions.filter((p) => p.beforeFile && p.afterFile);
    if (valid.length === 0) throw new Error('Cần ít nhất một cặp ảnh để phân tích');

    const formData = new FormData();
    formData.append('count', valid.length);
    valid.forEach((p, i) => {
      formData.append(`pos_${i}_before`, p.beforeFile);
      formData.append(`pos_${i}_after`, p.afterFile);
      formData.append(`label_${i}`, p.label);
    });

    const res = await apiClient.post('/api/uploads/image/vehicle-damage-multi', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
    return res.data?.data ?? null;
  },
};

export default uploadService;
