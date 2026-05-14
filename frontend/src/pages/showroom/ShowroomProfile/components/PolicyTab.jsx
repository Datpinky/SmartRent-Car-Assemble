const PolicyTab = ({ form, setForm }) => (
  <div>
    <label htmlFor="sp-policy" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
      Nội dung chính sách (đặt cọc, hủy chuyến, phụ phí…)
    </label>
    <textarea id="sp-policy" value={form.policy_text} onChange={(e) => setForm((f) => ({ ...f, policy_text: e.target.value }))}
      rows={12} placeholder="Nhập chính sách hiển thị cho khách hàng…"
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} />
  </div>
);

export default PolicyTab;