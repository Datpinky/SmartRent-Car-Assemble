/**
 * Trạng thái báo cáo AI theo booking (server `ai_inspection`).
 */

export const AI_FLOW_MESSAGES = {
  needUpload: 'Bạn cần tải ảnh trả xe',
  analyzing: 'Hệ thống đang phân tích AI',
  showroomWait: 'Showroom đang chờ xem báo cáo',
  ready: 'Báo cáo AI đã sẵn sàng',
  failed: 'Phân tích thất bại, thử lại',
  none: 'Chưa có báo cáo',
};

/**
 * @param {{ status?: string, return_image_urls?: string[], result?: unknown } | null | undefined} inv
 * @returns {'no_return'|'none'|'pending'|'ready'|'failed'}
 */
export function deriveAiPipelineStatus(inv) {
  if (!inv || typeof inv !== 'object') {
    return 'no_return';
  }
  const st = String(inv.status || 'none');
  if (st === 'pending') return 'pending';
  if (st === 'ready' && inv.result) return 'ready';
  if (st === 'failed') return 'failed';
  const hasUrls = Array.isArray(inv.return_image_urls) && inv.return_image_urls.length > 0;
  if (st === 'none' && !hasUrls) return 'no_return';
  return 'none';
}

/**
 * Badge ngắn trên thẻ booking (renter).
 * @param {{ status?: string, return_image_urls?: string[], result?: unknown } | null | undefined} inv
 */
export function getAiReportBadgeLabel(inv) {
  const pipe = deriveAiPipelineStatus(inv);
  if (pipe === 'ready') return 'Đã có báo cáo AI';
  if (pipe === 'pending') return 'Đang chờ AI phân tích';
  if (pipe === 'failed') return 'AI cần kiểm tra lại';
  if (pipe === 'no_return') return 'Chưa gửi ảnh trả xe';
  return 'Chưa có báo cáo';
}

/**
 * Dòng trạng thái chi tiết “ai đang chờ ai”.
 * @param {{ status?: string, return_image_urls?: string[], result?: unknown } | null | undefined} inv
 */
export function getAiFlowHeadline(inv) {
  const pipe = deriveAiPipelineStatus(inv);
  if (pipe === 'ready') {
    const dmg = Boolean(inv?.result?.damage_detected);
    return dmg ? AI_FLOW_MESSAGES.showroomWait : AI_FLOW_MESSAGES.ready;
  }
  if (pipe === 'pending') return AI_FLOW_MESSAGES.analyzing;
  if (pipe === 'failed') return AI_FLOW_MESSAGES.failed;
  if (pipe === 'no_return') return AI_FLOW_MESSAGES.needUpload;
  return AI_FLOW_MESSAGES.none;
}
