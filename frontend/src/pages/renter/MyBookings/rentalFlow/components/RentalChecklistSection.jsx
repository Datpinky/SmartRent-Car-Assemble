import { FaClipboardCheck } from 'react-icons/fa';

const RentalChecklistSection = ({
  title,
  fields,
  sectionKey,
  noteKey,
  saveKey,
  options = {},
  workflow,
  savingSection,
  onToggleChecklist,
  onChangeNote,
  onSaveSection,
}) => (
  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <FaClipboardCheck style={{ color: '#00b14f' }} />
      <div style={{ fontWeight: 800, color: '#111827' }}>{title}</div>
    </div>

    {options.notice && (
      <div
        style={{
          marginBottom: 14,
          padding: '10px 12px',
          borderRadius: 12,
          fontSize: '0.8rem',
          lineHeight: 1.6,
          background:
            options.notice.tone === 'warning' ? '#fff7ed' : options.notice.tone === 'success' ? '#f0fdf4' : '#eff6ff',
          border:
            options.notice.tone === 'warning'
              ? '1px solid #fdba74'
              : options.notice.tone === 'success'
                ? '1px solid #86efac'
                : '1px solid #bfdbfe',
          color:
            options.notice.tone === 'warning' ? '#9a3412' : options.notice.tone === 'success' ? '#166534' : '#1d4ed8',
        }}
      >
        {options.notice.text}
      </div>
    )}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
      {fields.map((field) => (
        <label
          key={field.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: workflow[sectionKey][field.key] ? '#f0fdf4' : '#fff',
            cursor: options.readOnly ? 'default' : 'pointer',
            opacity: options.readOnly ? 0.8 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={Boolean(workflow[sectionKey][field.key])}
            onChange={() => !options.readOnly && onToggleChecklist(sectionKey, field.key)}
            disabled={options.readOnly}
            style={{ accentColor: '#00b14f', width: 16, height: 16 }}
          />
          <span style={{ fontSize: '0.84rem', color: '#374151', fontWeight: 500 }}>{field.label}</span>
        </label>
      ))}
    </div>

    <div style={{ marginBottom: 14 }}>
      <label className="form-label">Ghi chu</label>
      <textarea
        rows={3}
        value={workflow[noteKey]}
        onChange={(event) => !options.readOnly && onChangeNote(noteKey, event.target.value)}
        disabled={options.readOnly}
        placeholder="Ghi lại tình trạng xe, vật dụng đi kèm, trao đổi với showroom..."
        style={{
          width: '100%',
          border: '1px solid #d1d5db',
          borderRadius: 12,
          padding: '10px 12px',
          fontSize: '0.84rem',
          resize: 'vertical',
          boxSizing: 'border-box',
          background: options.readOnly ? '#f9fafb' : '#fff',
        }}
      />
    </div>

    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
      <button
        type="button"
        className="btn-primary"
        onClick={() => onSaveSection(saveKey)}
        disabled={savingSection === saveKey || options.disableSave}
        style={{ opacity: savingSection === saveKey || options.disableSave ? 0.65 : 1 }}
      >
        {savingSection === saveKey ? 'Đang lưu...' : options.saveLabel || 'Lưu biên bản'}
      </button>
    </div>
  </div>
);

export default RentalChecklistSection;
