import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowRight, FaDownload, FaImage, FaRobot } from 'react-icons/fa';
import AIInspectionReportView from '../../../components/common/AIInspectionReportView';
import StatusBadge from '../../../components/common/StatusBadge';
import bookingService from '../../../services/bookingService';
import inspectionService, { attachLatestAiInspectionToBookings } from '../../../services/inspectionService';
import { getAiInspectionSummaryMeta, mapServerAiInspectionToViewModel } from '../../../utils/aiInspectionReport';

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('vi-VN');
};

const mapReportBooking = (booking) => {
  const inv = booking.ai_inspection || null;
  const report = mapServerAiInspectionToViewModel(inv);

  return {
    id: booking._id,
    vehicleName: booking.vehicle?.name || booking.vehicle_id?.vehicle_name || 'Xe không tên',
    showroomName: booking.showroom?.name || booking.showroom_id?.name || 'SmartRent',
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
    report,
    serverInv: inv,
    workflowUpdatedAt: inv?.analyzed_at || booking.updatedAt || booking.end_date,
  };
};

const downloadBlob = (blob, fileName) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
};

const AIReports = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const presetBookingId = params.get('bookingId') || '';

  const [reports, setReports] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(presetBookingId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      setLoading(true);
      try {
        const [bookings, inspectionResponse] = await Promise.all([
          bookingService.getCurrentRoleBookingsDetailed(),
          inspectionService.list({ inspection_type: 'return', page: 1, limit: 200 }),
        ]);
        if (!mounted) {
          return;
        }

        const withAi = attachLatestAiInspectionToBookings(bookings || [], inspectionResponse?.items || []);
        const mapped = withAi
          .map(mapReportBooking)
          .filter((row) => Boolean(row.report))
          .sort(
            (left, right) =>
              new Date(right.workflowUpdatedAt || 0).getTime() - new Date(left.workflowUpdatedAt || 0).getTime()
          );

        setReports(mapped);
        setError('');
      } catch (err) {
        if (!mounted) {
          return;
        }

        setReports([]);
        setError(err.message || 'Không thể tải báo cáo AI lúc này.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadReports();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedBookingId('');
      return;
    }

    const matchedReport = reports.find((report) => report.id === presetBookingId);
    if (matchedReport) {
      setSelectedBookingId(matchedReport.id);
      return;
    }

    setSelectedBookingId((current) => (
      current && reports.some((report) => report.id === current) ? current : reports[0].id
    ));
  }, [presetBookingId, reports]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedBookingId) || null,
    [reports, selectedBookingId]
  );

  const summary = useMemo(
    () => ({
      total: reports.length,
      clean: reports.filter((report) => !report.report?.result?.damage_detected).length,
      warning: reports.filter((report) => report.report?.result?.damage_detected).length,
    }),
    [reports]
  );

  const exportReportJson = (reportItem) => {
    try {
      const payload = {
        bookingId: reportItem.id,
        vehicleName: reportItem.vehicleName,
        showroomName: reportItem.showroomName,
        startDate: reportItem.startDate,
        endDate: reportItem.endDate,
        workflowUpdatedAt: reportItem.workflowUpdatedAt,
        ai_inspection: reportItem.serverInv,
        report: reportItem.report,
      };

      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
        `ai-report-${reportItem.id}.json`
      );
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể export báo cáo AI lúc này.');
    }
  };

  const downloadEvidenceImage = async (imageUrl, fileName) => {
    if (!imageUrl) {
      setError('Không tìm thấy ảnh đối chiếu để tải xuống.');
      return;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Không thể tải ảnh đối chiếu từ storage hiện tại.');
      }

      const blob = await response.blob();
      downloadBlob(blob, fileName);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải ảnh đối chiếu lúc này.');
    }
  };

  return (
    <div className="ai-inspection">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Kết quả kiểm tra xe</h1>
          <p className="page-subtitle">
            Báo cáo AI được lưu trên server theo từng booking sau khi bạn hoàn tất bước trả xe trong quy trình trả xe.
            Ảnh trước thuê dùng cho so sánh là ảnh đối chiếu bạn đã upload khi nhận xe (hoặc ảnh showroom cung cấp trên hệ thống khi có).
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/renter/bookings')}>
          Về Chuyến đi của tôi
        </button>
      </div>

      <div
        style={{
          marginBottom: 16,
          background: '#ecfdf5',
          border: '1px solid #86efac',
          color: '#166534',
          borderRadius: 14,
          padding: '12px 14px',
          fontSize: '0.82rem',
          lineHeight: 1.65,
        }}
      >
        Dữ liệu hiển thị ở đây đồng bộ với backend theo <strong>bookingId</strong>. Bạn có thể đổi máy vẫn xem lại báo cáo
        nếu đã phân tích thành công trên server.
      </div>

      {error && (
        <div style={{ marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, padding: '12px 14px', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng báo cáo', value: summary.total, color: '#111827' },
          { label: 'Không thấy hư hỏng mới', value: summary.clean, color: '#059669' },
          { label: 'Cần đối chiếu thêm', value: summary.warning, color: '#d97706' },
        ].map((item) => (
          <div key={item.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '12px 18px', minWidth: 150 }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: '0.74rem', color: '#9ca3af', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#6b7280' }}>Đang tải báo cáo AI...</div>
      ) : reports.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', padding: 28, textAlign: 'center' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', margin: '0 auto 14px', display: 'grid', placeItems: 'center', background: '#eff6ff', color: '#2563eb', fontSize: '1.6rem' }}>
            <FaRobot />
          </div>
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>Chưa có báo cáo AI trên server</div>
          <div style={{ fontSize: '0.84rem', color: '#6b7280', lineHeight: 1.6, maxWidth: 580, margin: '0 auto 16px' }}>
            Báo cáo được tạo khi bạn lưu bước trả xe trong quy trình trả xe (ảnh nhận + ảnh trả đã upload). Nếu phân tích thất bại, hãy thử lại từ modal quy trình.
          </div>
          <button className="btn-primary" onClick={() => navigate('/renter/bookings')}>
            Mở quy trình trả xe
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '330px minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {reports.map((reportItem) => {
              const meta = getAiInspectionSummaryMeta(reportItem.report);
              const selected = reportItem.id === selectedBookingId;

              return (
                <button
                  key={reportItem.id}
                  type="button"
                  onClick={() => {
                    setSelectedBookingId(reportItem.id);
                    setParams({ bookingId: reportItem.id });
                  }}
                  style={{
                    textAlign: 'left',
                    background: selected ? '#eff6ff' : '#fff',
                    border: `1px solid ${selected ? '#bfdbfe' : '#e5e7eb'}`,
                    borderRadius: 18,
                    padding: 16,
                    cursor: 'pointer',
                    boxShadow: selected ? '0 12px 26px rgba(37, 99, 235, 0.08)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <StatusBadge status={reportItem.status} />
                    <div
                      style={{
                        borderRadius: 999,
                        padding: '5px 10px',
                        background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        color: meta.color,
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {meta.badgeLabel}
                    </div>
                  </div>

                  <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem', marginBottom: 4 }}>
                    {reportItem.vehicleName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 10 }}>{reportItem.showroomName}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.6 }}>
                    {formatDateTime(reportItem.startDate)} - {formatDateTime(reportItem.endDate)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6 }}>
                    Phân tích trên server: {formatDateTime(reportItem.workflowUpdatedAt)}
                  </div>
                  <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, color: selected ? '#2563eb' : '#6b7280', fontSize: '0.76rem', fontWeight: 700 }}>
                      Xem chi tiết <FaArrowRight />
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ minWidth: 0 }}>
            {selectedReport && (
              <AIInspectionReportView
                report={selectedReport.report}
                bookingCode={selectedReport.id}
                vehicleName={selectedReport.vehicleName}
                showroomName={selectedReport.showroomName}
                footer={
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 18,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 999,
                          background: '#ecfdf5',
                          border: '1px solid #86efac',
                          color: '#166534',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                        }}
                      >
                        Đã lưu trên server theo booking
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="renter-btn-soft"
                          onClick={() => exportReportJson(selectedReport)}
                          style={{ justifyContent: 'center' }}
                        >
                          <FaDownload />
                          Export báo cáo JSON
                        </button>
                        <button
                          type="button"
                          className="renter-btn-soft"
                          onClick={() =>
                            downloadEvidenceImage(
                              selectedReport.report?.beforeImageUrl,
                              `ai-before-rental-${selectedReport.id}.jpg`
                            )
                          }
                          disabled={!selectedReport.report?.beforeImageUrl}
                          style={{
                            justifyContent: 'center',
                            opacity: selectedReport.report?.beforeImageUrl ? 1 : 0.55,
                          }}
                        >
                          <FaImage />
                          Tải ảnh trước thuê
                        </button>
                        <button
                          type="button"
                          className="renter-btn-soft"
                          onClick={() =>
                            downloadEvidenceImage(
                              selectedReport.report?.afterImageUrl,
                              `ai-return-image-${selectedReport.id}.jpg`
                            )
                          }
                          disabled={!selectedReport.report?.afterImageUrl}
                          style={{
                            justifyContent: 'center',
                            opacity: selectedReport.report?.afterImageUrl ? 1 : 0.55,
                          }}
                        >
                          <FaImage />
                          Tải ảnh trả xe
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.65 }}>
                      Export JSON hoặc tải ảnh để lưu bản sao ngoài hệ thống. Nội dung phân tích chính nằm trên server.
                    </div>
                  </div>
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIReports;
