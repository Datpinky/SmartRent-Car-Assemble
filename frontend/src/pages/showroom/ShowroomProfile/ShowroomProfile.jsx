import React, { useState, useEffect, useCallback } from 'react';
import FileUpload from '../../../components/common/FileUpload';
import { FaSave, FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';
import authService from '../../../services/authService';
import { useAuth } from '../../../contexts/AuthContext';

const ShowroomProfile = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    business_name: '',
    showroom_representative_name: '',
    phone: '',
    email: '',
    public_address: '',
    showroom_description: '',
    opening_hours: '',
    showroom_license_public: '',
    policy_text: '',
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const hydrate = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const u = await authService.getMe();
      if (u) {
        setForm({
          business_name: u.business_name || '',
          showroom_representative_name: u.showroom_representative_name || '',
          phone: u.phone || '',
          email: u.email || '',
          public_address: u.public_address || '',
          showroom_description: u.showroom_description || '',
          opening_hours: u.opening_hours || '',
          showroom_license_public: u.showroom_license_public || '',
          policy_text: u.policy_text || '',
          logo_url: u.logo_url || '',
        });
      }
    } catch (e) {
      setLoadError(e.message || 'Không tải được hồ sơ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const digits = String(form.phone).replace(/\D/g, '');
      const payload = {
        business_name: form.business_name,
        showroom_representative_name: form.showroom_representative_name,
        public_address: form.public_address,
        showroom_description: form.showroom_description,
        opening_hours: form.opening_hours,
        showroom_license_public: form.showroom_license_public,
        policy_text: form.policy_text,
        logo_url: form.logo_url,
      };
      if (digits.length === 10) payload.phone = digits;
      const updated = await authService.updateProfile(payload);
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setLoadError(e.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const displayName = form.business_name || user?.business_name || user?.name || 'Showroom';
  const initials = String(displayName).trim().slice(0, 1).toUpperCase() || 'S';
  const statusLabel =
    user?.showroom_status === 'approved'
      ? 'Đã xác minh'
      : user?.showroom_status === 'pending'
        ? 'Chờ duyệt'
        : user?.showroom_status === 'rejected'
          ? 'Bị từ chối'
          : '';

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Hồ sơ Showroom</h1>
          <p className="page-subtitle">Quản lý thông tin hiển thị và chính sách showroom</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? <FaSpinner className="animate-spin inline" aria-hidden="true" /> : <FaSave aria-hidden="true" />}{' '}
          {saved ? 'Đã lưu!' : 'Lưu thay đổi'}
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4" role="alert">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FaSpinner className="animate-spin text-primary text-xl" aria-hidden="true" />
          <span>Đang tải hồ sơ…</span>
        </div>
      ) : (
        <>
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 16,
              padding: 24,
              color: '#fff',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt=""
                width={72}
                height={72}
                className="rounded-[18px] object-cover shrink-0 border-2 border-white/20"
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: '#00b14f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {displayName}
                <FaMapMarkerAlt aria-hidden="true" className="shrink-0" style={{ fontSize: '0.9rem', opacity: 0.85 }} />
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: 4 }}>
                {form.public_address || 'Chưa có địa chỉ công khai'}
              </div>
              {statusLabel && (
                <div className="mt-2 text-[0.8rem]">
                  <span className="bg-primary px-2.5 py-0.5 rounded-full font-bold text-white">{statusLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 4,
              background: '#f3f4f6',
              borderRadius: 10,
              padding: 4,
              marginBottom: 20,
              width: 'fit-content',
            }}
          >
            {[
              ['info', 'Thông tin cơ bản'],
              ['policy', 'Chính sách'],
              ['logo', 'Logo & Hình ảnh'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === key ? '#fff' : 'transparent',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  color: activeTab === key ? '#111827' : '#6b7280',
                  cursor: 'pointer',
                  boxShadow: activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f0f0f0' }}>
            {activeTab === 'info' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Tên showroom (hiển thị)', 'business_name'],
                  ['Người đại diện', 'showroom_representative_name'],
                  ['Số điện thoại (10 số)', 'phone'],
                  ['Email', 'email'],
                  ['Giờ mở cửa', 'opening_hours'],
                  ['Giấy phép / GPKD (công khai)', 'showroom_license_public'],
                ].map(([label, key]) => (
                  <div key={key} style={key === 'email' ? { gridColumn: 'span 1' } : {}}>
                    <label htmlFor={`sp-${key}`} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                      {label}
                    </label>
                    <input
                      id={`sp-${key}`}
                      value={form[key]}
                      readOnly={key === 'email'}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      style={{
                        width: '100%',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 9,
                        padding: '9px 12px',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        ...(key === 'email' ? { background: '#f9fafb', color: '#6b7280' } : {}),
                      }}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="sp-address" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                    Địa chỉ công khai
                  </label>
                  <input
                    id="sp-address"
                    value={form.public_address}
                    onChange={(e) => setForm((f) => ({ ...f, public_address: e.target.value }))}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="sp-description" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                    Mô tả ngắn
                  </label>
                  <textarea
                    id="sp-description"
                    value={form.showroom_description}
                    onChange={(e) => setForm((f) => ({ ...f, showroom_description: e.target.value }))}
                    rows={3}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}
            {activeTab === 'policy' && (
              <div>
                <label htmlFor="sp-policy" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Nội dung chính sách (đặt cọc, hủy chuyến, phụ phí…)
                </label>
                <textarea
                  id="sp-policy"
                  value={form.policy_text}
                  onChange={(e) => setForm((f) => ({ ...f, policy_text: e.target.value }))}
                  rows={12}
                  placeholder="Nhập chính sách hiển thị cho khách hàng…"
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            )}
            {activeTab === 'logo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.9rem', color: '#111827' }}>URL logo (hoặc tải ảnh)</div>
                  <input
                    id="sp-logo-url"
                    value={form.logo_url}
                    onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                    placeholder="https://…"
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: 12 }}
                  />
                  <FileUpload
                    label="Tải logo lên"
                    hint="PNG, JPG — tối đa 5 ảnh; ảnh đầu dùng làm logo"
                    maxFiles={1}
                    onUpload={(urls) => {
                      if (urls && urls[0]) setForm((f) => ({ ...f, logo_url: urls[0] }));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ShowroomProfile;
