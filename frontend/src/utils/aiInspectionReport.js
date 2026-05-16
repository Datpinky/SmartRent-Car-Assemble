export const AI_SEVERITY_LABELS = {
  none: 'Không đáng kể',
  minor: 'Nhẹ',
  moderate: 'Trung bình',
  severe: 'Nặng',
};

export const getAiInspectionResult = (report) => report?.result || null;

/** Chuẩn hóa payload server `ai_inspection` → shape dùng cho AIInspectionReportView (trước: local workflow.aiInspection). */
export function mapServerAiInspectionToViewModel(inv) {
  if (!inv || inv.status !== 'ready' || !inv.result) {
    return null;
  }
  const urls = Array.isArray(inv.return_image_urls) ? inv.return_image_urls : [];
  return {
    beforeImageUrl: inv.pickup_image_url || '',
    afterImageUrl: urls[0] || '',
    analyzedAt: inv.analyzed_at || null,
    result: inv.result,
  };
}

/**
 * Có báo cáo AI hợp lệ: server `status === ready` hoặc legacy local `workflow.aiInspection.result`.
 */
export const hasAiInspectionReport = (payload) => {
  if (payload?.ai_inspection?.status === 'ready' && payload?.ai_inspection?.result) {
    return true;
  }
  return Boolean(getAiInspectionResult(payload?.aiInspection));
};

export const getAiInspectionDifferences = (report) => {
  const result = getAiInspectionResult(report);
  const differences = result?.differences;
  if (Array.isArray(differences) && differences.length > 0) {
    return differences;
  }

  if (Array.isArray(result?.observations)) {
    return result.observations.map((obs) => ({
      area: obs.area || 'Khu vuc chua xac dinh',
      description: obs.description || obs.evidence || '',
      likely_new_damage: !!obs.likely_new_damage,
    }));
  }

  return [];
};

export const getAiInspectionSummaryMeta = (report) => {
  const result = getAiInspectionResult(report);
  const severity = String(result?.severity || '').toLowerCase();

  if (!result) {
    return {
      badgeLabel: 'Chưa có báo cáo',
      eyebrow: 'Báo cáo AI',
      title: 'Chưa có dữ liệu phân tích',
      description: 'Hệ thống sẽ lưu kết quả AI ngay sau khi bộ ảnh đối chiếu được phân tích thành công.',
      bg: '#f8fafc',
      border: '#e2e8f0',
      color: '#334155',
      status: 'empty',
    };
  }

  if (!result.damage_detected) {
    return {
      badgeLabel: 'Không có hư hỏng mới',
      eyebrow: 'AI xác nhận',
      title: 'Không ghi nhận hư hỏng mới rõ rệt',
      description: result.summary || 'AI không phát hiện khác biệt đáng lo ngại giữa ảnh nhận xe và ảnh trả xe.',
      bg: '#ecfdf5',
      border: '#86efac',
      color: '#166534',
      status: 'clean',
    };
  }

  if (severity === 'severe') {
    return {
      badgeLabel: 'Cần xử lý gấp',
      eyebrow: 'AI cảnh báo',
      title: 'Có dấu hiệu hư hỏng nghiêm trọng',
      description: result.summary || 'AI ghi nhận thay đổi lớn giữa 2 bộ ảnh. Showroom nên đối chiếu trực tiếp.',
      bg: '#fef2f2',
      border: '#fca5a5',
      color: '#b91c1c',
      status: 'severe',
    };
  }

  if (severity === 'moderate') {
    return {
      badgeLabel: 'Cần đối chiếu',
      eyebrow: 'AI cảnh báo',
      title: 'Có khả năng phát sinh hư hỏng mới',
      description: result.summary || 'AI phát hiện một vài điểm thay đổi cần showroom kiểm tra lại khi nhận xe.',
      bg: '#fffbeb',
      border: '#fcd34d',
      color: '#b45309',
      status: 'moderate',
    };
  }

  return {
    badgeLabel: 'Cần kiểm tra',
    eyebrow: 'AI phát hiện',
    title: 'Có thay đổi nhỏ cần lưu ý',
    description: result.summary || 'AI thấy một số khác biệt nhỏ giữa ảnh trước và sau thuê.',
    bg: '#fff7ed',
    border: '#fdba74',
    color: '#9a3412',
    status: 'minor',
  };
};

export const getAiInspectionSeverityLabel = (report) => {
  const severity = String(getAiInspectionResult(report)?.severity || '').toLowerCase();
  return AI_SEVERITY_LABELS[severity] || severity || 'N/A';
};
