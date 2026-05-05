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
   * So sánh ảnh trước/sau thuê qua AI (multipart: before_rental, after_return).
   * Trả về object JSON phân tích từ backend (damage_detected, severity, summary, …).
   */
  async compareVehicleDamage(beforeFile, afterFile) {
    const formData = new FormData();
    formData.append('before_rental', beforeFile);
    formData.append('after_return', afterFile);

    const res = await apiClient.post('/api/uploads/image/vehicle-damage', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });

    return res.data?.data ?? null;
  },
};

export default uploadService;
