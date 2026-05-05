import React from 'react';
import { FaCalendarAlt, FaCheckCircle, FaClipboardCheck, FaRobot } from 'react-icons/fa';
import { MdWarning } from 'react-icons/md';
import ImageCompareSlider from './ImageCompareSlider';
import {
  getAiInspectionDifferences,
  getAiInspectionResult,
  getAiInspectionSeverityLabel,
  getAiInspectionSummaryMeta,
} from '../../utils/aiInspectionReport';

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('vi-VN');
};

const AIInspectionReportView = ({
  report,
  bookingCode = '',
  vehicleName = '',
  showroomName = '',
  footer = null,
}) => {
  const result = getAiInspectionResult(report);
  const meta = getAiInspectionSummaryMeta(report);
  const differences = getAiInspectionDifferences(report);
  const severityLabel = getAiInspectionSeverityLabel(report);

  if (!result) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px dashed #cbd5e1',
          borderRadius: 18,
          padding: 20,
          color: '#64748b',
          fontSize: '0.84rem',
        }}
      >
        Chua co bao cao AI cho booking nay.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          borderRadius: 22,
          padding: 20,
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          color: meta.color,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 640 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 999,
                padding: '7px 12px',
                background: 'rgba(255,255,255,0.65)',
                fontSize: '0.75rem',
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              <FaRobot />
              {meta.eyebrow}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.18rem', lineHeight: 1.35, marginBottom: 8 }}>
              {meta.title}
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>{meta.description}</div>
          </div>

          <div
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px',
              borderRadius: 999,
              background: '#fff',
              border: `1px solid ${meta.border}`,
              color: meta.color,
              fontWeight: 800,
              fontSize: '0.8rem',
            }}
          >
            {meta.badgeLabel}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {bookingCode && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 999,
                padding: '8px 12px',
                background: '#fff',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <FaClipboardCheck />
              Booking: {bookingCode}
            </div>
          )}

          {report?.analyzedAt && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 999,
                padding: '8px 12px',
                background: '#fff',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <FaCalendarAlt />
              {formatDateTime(report.analyzedAt)}
            </div>
          )}

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 999,
              padding: '8px 12px',
              background: '#fff',
              color: '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <MdWarning />
            Muc do: {severityLabel}
          </div>
        </div>

        {(vehicleName || showroomName) && (
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#334155' }}>
            <strong>{vehicleName || 'Xe dang duoc doi chieu'}</strong>
            {showroomName ? ` · ${showroomName}` : ''}
          </div>
        )}
      </div>

      {(report?.beforeImageUrl || report?.afterImageUrl) && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 16 }}>
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 12 }}>Doi chieu anh truoc / sau thue</div>
          <ImageCompareSlider beforeSrc={report.beforeImageUrl} afterSrc={report.afterImageUrl} damages={[]} />
        </div>
      )}

      {result.summary && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 16 }}>
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>Tom tat AI</div>
          <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.7 }}>{result.summary}</div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 16 }}>
        <div style={{ fontWeight: 800, color: '#111827', marginBottom: 12 }}>Khac biet AI ghi nhan</div>
        {differences.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            Chua co diem khac biet nao duoc liet ke trong bao cao nay.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {differences.map((difference, index) => (
              <div
                key={`${difference.area || 'difference'}-${index}`}
                style={{
                  borderRadius: 16,
                  padding: '13px 14px',
                  background: difference.likely_new_damage ? '#fffbeb' : '#f8fafc',
                  border: `1px solid ${difference.likely_new_damage ? '#fde68a' : '#e2e8f0'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, color: '#111827' }}>{difference.area || `Muc ${index + 1}`}</div>
                  {difference.likely_new_damage && (
                    <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 800 }}>
                      <MdWarning style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'text-bottom' }} />
                      Co the la hu hong moi
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.65 }}>
                  {difference.description || 'AI ghi nhan co su thay doi o khu vuc nay.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {result.conclusion && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            {result.damage_detected ? <MdWarning style={{ color: '#d97706' }} /> : <FaCheckCircle style={{ color: '#059669' }} />}
            Ket luan
          </div>
          <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.7 }}>{result.conclusion}</div>
        </div>
      )}

      {result.disclaimer && (
        <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.65, fontStyle: 'italic' }}>
          {result.disclaimer}
        </div>
      )}

      {footer}
    </div>
  );
};

export default AIInspectionReportView;
