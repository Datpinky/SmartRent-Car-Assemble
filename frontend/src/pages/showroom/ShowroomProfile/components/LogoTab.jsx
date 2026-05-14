import FileUpload from '../../../../components/common/FileUpload';

const LogoTab = ({ form, setForm }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div>
      <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.9rem', color: '#111827' }}>URL logo (hoặc tải ảnh)</div>
      <input id="sp-logo-url" value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
        placeholder="https://…" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: 12 }} />
      <FileUpload label="Tải logo lên" hint="PNG, JPG — tối đa 1 ảnh" maxFiles={1}
        onUpload={(urls) => { if (urls && urls[0]) setForm((f) => ({ ...f, logo_url: urls[0] })); }} />
    </div>
  </div>
);

export default LogoTab;