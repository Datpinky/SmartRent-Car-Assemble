import { FaInfoCircle, FaShieldAlt } from 'react-icons/fa';
import { BASE_CARD_STYLE, NOTICE_STYLES, RETURN_FIELDS } from '../rentalFlow.constants';
import { formatFlowDateTime } from '../rentalFlow.utils';
import ReturnInspectionSection from './ReturnInspectionSection';

const RentalReturnSection = ({
  returnStateMeta,
  returnDueDate,
  workflow,
  returnLocked,
  returnChecklistCount,
  returnProgressPercent,
  savingSection,
  onToggleChecklist,
  onChangeReturnNote,
  onChangeReturnImages,
  onSaveReturn,
}) => {
  const actionDisabled = returnLocked;
  const noticeStyle = NOTICE_STYLES[returnStateMeta.tone] || NOTICE_STYLES.info;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          ...noticeStyle,
          borderRadius: 12,
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.84rem' }}>
          <FaInfoCircle />
          {returnStateMeta.title}
        </div>
        {returnDueDate && (
          <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>Hạn trả: {formatFlowDateTime(returnDueDate)}</span>
        )}
      </div>

      <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.65 }}>{returnStateMeta.description}</div>

      <div style={BASE_CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              background: '#ecfdf5',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <FaShieldAlt />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#111827' }}>
              Checklist trả xe ({returnChecklistCount}/{RETURN_FIELDS.length})
            </div>
            <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>Đánh dấu những mục bạn đã tự kiểm tra xong.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RETURN_FIELDS.map((field) => {
            const checked = Boolean(workflow.returnChecklist[field.key]);
            return (
              <label
                key={field.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 14px',
                  borderRadius: 14,
                  border: `1px solid ${checked ? '#86efac' : '#e5e7eb'}`,
                  background: checked ? '#f0fdf4' : '#fff',
                  cursor: returnLocked ? 'default' : 'pointer',
                  opacity: returnLocked ? 0.84 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={returnLocked}
                  onChange={() => !returnLocked && onToggleChecklist('returnChecklist', field.key)}
                  style={{ accentColor: '#00b14f', width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.84rem', color: '#111827', fontWeight: checked ? 700 : 500 }}>
                  {field.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <ReturnInspectionSection
        workflow={workflow}
        onChangeReturnImages={onChangeReturnImages}
        returnLocked={returnLocked}
      />

      <div style={BASE_CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              background: '#eff6ff',
              color: '#2563eb',
              flexShrink: 0,
            }}
          >
            <FaInfoCircle />
          </div>
          <div style={{ fontWeight: 800, color: '#111827' }}>Ghi chú trả xe</div>
        </div>
        <textarea
          rows={4}
          value={workflow.returnNote}
          onChange={(event) => !returnLocked && onChangeReturnNote(event.target.value)}
          disabled={returnLocked}
          placeholder="Ví dụ: đã nạp đầy xăng, có vết xước nhỏ ở cánh cửa sau, đã để lại chìa khóa..."
          style={{
            width: '100%',
            border: '1px solid #d1d5db',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: '0.84rem',
            resize: 'vertical',
            boxSizing: 'border-box',
            background: returnLocked ? '#f9fafb' : '#fff',
            minHeight: 100,
          }}
        />
      </div>

      <div
        style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 160 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.76rem',
              color: '#6b7280',
              marginBottom: 6,
            }}
          >
            <span>Mức độ sẵn sàng</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>{returnProgressPercent}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
            <div
              style={{
                width: `${returnProgressPercent}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onSaveReturn}
          disabled={savingSection === 'return' || actionDisabled}
          style={{
            minWidth: 200,
            justifyContent: 'center',
            opacity: savingSection === 'return' || actionDisabled ? 0.7 : 1,
          }}
        >
          {savingSection === 'return'
            ? 'Đang lưu...'
            : returnLocked
              ? 'Đã lưu hồ sơ trả xe'
              : 'Lưu hồ sơ & gửi yêu cầu trả xe'}
        </button>
      </div>
    </div>
  );
};

export default RentalReturnSection;
