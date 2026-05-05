import apiClient from './apiClient';

/**
 * @param {string} bookingId
 * @returns {Promise<{
 *   status: string,
 *   pickup_image_url: string,
 *   return_image_urls: string[],
 *   result: object|null,
 *   analyzed_at: string|null,
 *   error_message: string,
 *   report_id: string
 * }>}
 */
export async function getReportByBookingId(bookingId) {
  const res = await apiClient.get(`/api/booking-ai/report/${bookingId}`);
  return res.data?.data ?? null;
}

/**
 * @param {string} bookingId
 * @param {{ pickup_image_url: string, return_image_urls: string[] }} payload
 * @returns {Promise<{ data: object, ok: boolean, message?: string }>}
 */
export async function generateReport(bookingId, payload) {
  try {
    const res = await apiClient.post(`/api/booking-ai/report/${bookingId}/generate`, payload);
    const data = res.data?.data ?? null;
    const ok = data?.status === 'ready';
    return {
      data,
      ok,
      message: res.data?.message,
      status: res.status,
    };
  } catch (err) {
    const data = err.response?.data?.data ?? null;
    const ok = data?.status === 'ready';
    return {
      data,
      ok: Boolean(ok),
      message: err.response?.data?.message || err.message,
      status: err.response?.status || 0,
    };
  }
}

/**
 * Dành cho tương lai khi BE tách upload ảnh trả xe riêng theo booking.
 * @param {string} _bookingId
 * @param {File[]} _files
 * @returns {Promise<never>}
 */
export async function uploadReturnImages(_bookingId, _files) {
  throw new Error('uploadReturnImages: API chưa được backend triển khai.');
}

const bookingAiService = {
  getReportByBookingId,
  generateReport,
  uploadReturnImages,
};

export default bookingAiService;
