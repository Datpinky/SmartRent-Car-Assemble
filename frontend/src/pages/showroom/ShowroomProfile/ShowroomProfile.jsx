import { useCallback, useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaFileSignature, FaMapMarkerAlt, FaSave, FaSpinner } from 'react-icons/fa';
import FileUpload from '../../../components/common/FileUpload';
import SignaturePad from '../../../components/common/SignaturePad';
import { useAuth } from '../../../contexts/AuthContext';
import authService from '../../../services/authService';

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

  // Chữ ký điện tử
  const [currentSignature, setCurrentSignature] = useState(null); // URL hiện tại
  const [newSignature, setNewSignature] = useState(null); // data URI vừa vẽ
  const [sigSaving, setSigSaving] = useState(false);
  const [sigSaved, setSigSaved] = useState(false);
  const [sigError, setSigError] = useState('');
  const [sigConfirming, setSigConfirming] = useState(false);
  const sigPadKey = useRef(0);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const u = await authService.getMe();
      if (u) {
        setCurrentSignature(u.signature || null);
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

  const handleSaveSignature = async () => {
    if (!newSignature) {
      setSigError('Vui lòng vẽ chữ ký trước khi lưu.');
      return;
    }
    setSigError('');
    setSigSaving(true);
    try {
      const updated = await authService.updateSignature(newSignature);
      updateUser(updated);
      setCurrentSignature(newSignature);
      setNewSignature(null);
      sigPadKey.current += 1;
      setSigSaved(true);
      setTimeout(() => setSigSaved(false), 2500);
    } catch (e) {
      setSigError(e?.response?.data?.message || e.message || 'Lưu chữ ký thất bại.');
    } finally {
      setSigSaving(false);
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
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || loading}>
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
              ['signature', 'Chữ ký điện tử'],
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
                    <label
                      htmlFor={`sp-${key}`}
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'block',
                        marginBottom: 5,
                      }}
                    >
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
                  <label
                    htmlFor="sp-address"
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#374151',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Địa chỉ công khai
                  </label>
                  <input
                    id="sp-address"
                    value={form.public_address}
                    onChange={(e) => setForm((f) => ({ ...f, public_address: e.target.value }))}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{
                      width: '100%',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 9,
                      padding: '9px 12px',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label
                    htmlFor="sp-description"
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#374151',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Mô tả ngắn
                  </label>
                  <textarea
                    id="sp-description"
                    value={form.showroom_description}
                    onChange={(e) => setForm((f) => ({ ...f, showroom_description: e.target.value }))}
                    rows={3}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{
                      width: '100%',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 9,
                      padding: '9px 12px',
                      fontSize: '0.85rem',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}
            {activeTab === 'policy' && (
              <div>
                <label
                  htmlFor="sp-policy"
                  style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}
                >
                  Nội dung chính sách (đặt cọc, hủy chuyến, phụ phí…)
                </label>
                <textarea
                  id="sp-policy"
                  value={form.policy_text}
                  onChange={(e) => setForm((f) => ({ ...f, policy_text: e.target.value }))}
                  rows={12}
                  placeholder="Nhập chính sách hiển thị cho khách hàng…"
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{
                    width: '100%',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 9,
                    padding: '9px 12px',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
            {activeTab === 'logo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.9rem', color: '#111827' }}>
                    URL logo (hoặc tải ảnh)
                  </div>
                  <input
                    id="sp-logo-url"
                    value={form.logo_url}
                    onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                    placeholder="https://…"
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{
                      width: '100%',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 9,
                      padding: '9px 12px',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      marginBottom: 12,
                    }}
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
            {activeTab === 'signature' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: 4 }}>
                    Chữ ký điện tử của Showroom
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
                    Chữ ký này sẽ được tự động in vào hợp đồng thuê xe (Bên A).
                    {!currentSignature && (
                      <>
                        {' '}
                        Vẽ chữ ký bằng chuột hoặc ngón tay, sau đó nhấn <strong>Lưu chữ ký</strong>.
                      </>
                    )}
                  </p>

                  {currentSignature ? (
                    /* ── Đã có chữ ký: hiển thị + khoá ── */
                    <div>
                      <div
                        style={{
                          border: '1.5px solid #e5e7eb',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 16,
                          background: '#f9fafb',
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                          Chữ ký đang sử dụng:
                        </div>
                        <div
                          style={{
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            padding: 8,
                            display: 'inline-block',
                          }}
                        >
                          <img
                            src={currentSignature}
                            alt="Chữ ký hiện tại"
                            style={{ maxHeight: 80, maxWidth: 300, objectFit: 'contain', display: 'block' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <FaCheckCircle style={{ color: '#16a34a', fontSize: '0.8rem' }} />
                          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                            Đã thiết lập chữ ký
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          border: '1.5px solid #fde68a',
                          borderRadius: 12,
                          padding: 14,
                          background: '#fffbeb',
                        }}
                      >
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                          🔒 Chữ ký đã được khoá
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#78350f', lineHeight: 1.6, marginBottom: 10 }}>
                          Để đảm bảo tính pháp lý của hợp đồng, chữ ký điện tử không thể tự thay đổi sau khi đã được sử
                          dụng. Nếu cần cập nhật, vui lòng liên hệ quản trị viên.
                        </p>
                        <a
                          href="mailto:admin@smartrent.vn?subject=Y%C3%AAu%20c%E1%BA%A7u%20thay%20%C4%91%E1%BB%95i%20ch%E1%BB%AF%20k%C3%BD%20showroom"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            border: '1.5px solid #d97706',
                            borderRadius: 8,
                            background: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#b45309',
                            textDecoration: 'none',
                          }}
                        >
                          ✉️ Gửi yêu cầu thay đổi cho Admin
                        </a>
                      </div>
                    </div>
                  ) : (
                    /* ── Chưa có chữ ký: pad + confirm ── */
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                          Vẽ chữ ký của bạn:
                        </div>
                        <SignaturePad
                          key={sigPadKey.current}
                          width={480}
                          height={150}
                          label=""
                          onSign={(s) => {
                            setNewSignature(s);
                            setSigConfirming(false);
                          }}
                          onClear={() => {
                            setNewSignature(null);
                            setSigConfirming(false);
                          }}
                        />
                      </div>

                      {sigError && (
                        <div
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            color: '#b91c1c',
                            marginBottom: 12,
                          }}
                        >
                          {sigError}
                        </div>
                      )}

                      {sigSaved && (
                        <div
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            color: '#15803d',
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <FaCheckCircle /> Đã lưu chữ ký thành công!
                        </div>
                      )}

                      {!sigConfirming ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!newSignature) {
                              setSigError('Vui lòng vẽ chữ ký trước khi lưu.');
                              return;
                            }
                            setSigError('');
                            setSigConfirming(true);
                          }}
                          disabled={!newSignature}
                          className="btn-primary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: !newSignature ? 0.6 : 1,
                            cursor: !newSignature ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <FaFileSignature aria-hidden /> Lưu chữ ký
                        </button>
                      ) : (
                        <div
                          style={{
                            border: '2px solid #f59e0b',
                            borderRadius: 12,
                            padding: 14,
                            background: '#fffbeb',
                          }}
                        >
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                            ⚠️ Xác nhận lưu chữ ký
                          </p>
                          <p style={{ fontSize: '0.78rem', color: '#78350f', lineHeight: 1.6, marginBottom: 12 }}>
                            Sau khi lưu, <strong>chữ ký sẽ được khoá vĩnh viễn</strong> và không thể tự thay đổi. Nếu
                            cần cập nhật sau này phải liên hệ admin.
                          </p>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              type="button"
                              onClick={() => setSigConfirming(false)}
                              style={{
                                flex: 1,
                                padding: '8px 0',
                                border: '1.5px solid #e5e7eb',
                                borderRadius: 8,
                                background: '#fff',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#374151',
                                cursor: 'pointer',
                              }}
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveSignature}
                              disabled={sigSaving}
                              className="btn-primary"
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                opacity: sigSaving ? 0.6 : 1,
                                cursor: sigSaving ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {sigSaving ? (
                                <>
                                  <FaSpinner className="animate-spin" aria-hidden /> Đang lưu...
                                </>
                              ) : (
                                <>✓ Xác nhận lưu</>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
