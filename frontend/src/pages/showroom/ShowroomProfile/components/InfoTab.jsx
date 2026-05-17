import CarLocationMap from '../../../../components/Map/CarLocationMap';
import { INFO_FIELDS } from '../showroomProfile.helpers';

const inputStyle = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', boxSizing: 'border-box' };

const InfoTab = ({ form, setForm }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
    {INFO_FIELDS.map(([label, key]) => (
      <div key={key}>
        <label htmlFor={`sp-${key}`} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{label}</label>
        <input id={`sp-${key}`} value={form[key]} readOnly={key === 'email'}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ ...inputStyle, ...(key === 'email' ? { background: '#f9fafb', color: '#6b7280' } : {}) }} />
      </div>
    ))}
    <div style={{ gridColumn: 'span 2' }}>
      <label htmlFor="sp-address" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
        Địa chỉ công khai <span style={{ color: '#dc2626' }}>*</span>
      </label>
      <input
        id="sp-address"
        value={form.public_address}
        onChange={(e) => setForm((f) => ({ ...f, public_address: e.target.value }))}
        required
        minLength={10}
        autoComplete="street-address"
        placeholder="Địa chỉ nhận xe hiển thị cho khách (bắt buộc)"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={inputStyle}
      />
    </div>
    {String(form.public_address || '').trim().length >= 10 && (
      <div style={{ gridColumn: 'span 2' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Vị trí điểm nhận (xem trước)</div>
        <CarLocationMap locationText={String(form.public_address || '').trim()} openMapLabel="Mở trong Maps" mapHeight={260} />
      </div>
    )}
    <div style={{ gridColumn: 'span 2' }}>
      <label htmlFor="sp-description" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Mô tả ngắn</label>
      <textarea id="sp-description" value={form.showroom_description} onChange={(e) => setForm((f) => ({ ...f, showroom_description: e.target.value }))}
        rows={3} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ ...inputStyle, resize: 'vertical' }} />
    </div>
  </div>
);

export default InfoTab;