import { useCallback, useEffect, useRef, useState } from 'react';
import { FaMapMarkerAlt, FaSave, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import authService from '../../../services/authService';
import InfoTab from './components/InfoTab';
import LogoTab from './components/LogoTab';
import PolicyTab from './components/PolicyTab';
import SignatureTab from './components/SignatureTab';
import { buildFormFromUser, buildSavePayload, INITIAL_FORM, TABS } from './showroomProfile.helpers';

const ShowroomProfile = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [currentSignature, setCurrentSignature] = useState(null);
  const [newSignature, setNewSignature] = useState(null);
  const [sigSaving, setSigSaving] = useState(false);
  const [sigSaved, setSigSaved] = useState(false);
  const [sigError, setSigError] = useState('');
  const [sigConfirming, setSigConfirming] = useState(false);
  const sigPadKey = useRef(0);

  const hydrate = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const u = await authService.getMe();
      if (u) { setCurrentSignature(u.signature || null); setForm(buildFormFromUser(u)); }
    } catch (e) {
      setLoadError(e.message || 'Không tải được hồ sơ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleSave = async () => {
    const pub = String(form.public_address || '').trim();
    if (pub.length < 10) {
      setLoadError('Vui lòng nhập địa chỉ công khai (tối thiểu 10 ký tự) để khách thấy điểm nhận xe khi đặt.');
      return;
    }
    setLoadError('');
    setSaving(true); setSaved(false);
    try {
      const updated = await authService.updateProfile(buildSavePayload(form));
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
    if (!newSignature) { setSigError('Vui lòng vẽ chữ ký trước khi lưu.'); return; }
    setSigError(''); setSigSaving(true);
    try {
      const updated = await authService.updateSignature(newSignature);
      updateUser(updated);
      setCurrentSignature(newSignature);
      setNewSignature(null);
      sigPadKey.current += 1;
      setSigSaved(true);
      setSigConfirming(false);
      setTimeout(() => setSigSaved(false), 2500);
    } catch (e) {
      setSigError(e?.response?.data?.message || e.message || 'Lưu chữ ký thất bại.');
    } finally {
      setSigSaving(false);
    }
  };

  const displayName = form.business_name || user?.business_name || user?.name || 'Showroom';
  const initials = String(displayName).trim().slice(0, 1).toUpperCase() || 'S';
  const statusLabel = user?.showroom_status === 'approved' ? 'Đã xác minh' : user?.showroom_status === 'pending' ? 'Chờ duyệt' : user?.showroom_status === 'rejected' ? 'Bị từ chối' : '';

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

      {loadError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4" role="alert">{loadError}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FaSpinner className="animate-spin text-primary text-xl" aria-hidden="true" /><span>Đang tải hồ sơ…</span>
        </div>
      ) : (
        <>
          <div
            className="max-w-full min-w-0 flex-col sm:flex-row"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 16, padding: 24, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}
          >
            {form.logo_url ? (
              <img src={form.logo_url} alt="" width={72} height={72} className="rounded-[18px] object-cover shrink-0 border-2 border-white/20" />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 18, background: '#00b14f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, flexShrink: 0 }}>
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 break-words" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {displayName} <FaMapMarkerAlt aria-hidden="true" className="shrink-0" style={{ fontSize: '0.9rem', opacity: 0.85 }} />
              </div>
              <div className="break-words" style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: 4 }}>{form.public_address || 'Chưa có địa chỉ công khai'}</div>
              {statusLabel && <div className="mt-2 text-[0.8rem]"><span className="bg-primary px-2.5 py-0.5 rounded-full font-bold text-white">{statusLabel}</span></div>}
            </div>
          </div>

          <div
            className="max-w-full min-w-0"
            style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {TABS.map(([key, label]) => (
              <button type="button" key={key} onClick={() => setActiveTab(key)}
                className="shrink-0"
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: activeTab === key ? '#fff' : 'transparent', fontWeight: 600, fontSize: '0.82rem', color: activeTab === key ? '#111827' : '#6b7280', cursor: 'pointer', boxShadow: activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          <div className="max-w-full min-w-0" style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f0f0f0' }}>
            {activeTab === 'info' && <InfoTab form={form} setForm={setForm} />}
            {activeTab === 'policy' && <PolicyTab form={form} setForm={setForm} />}
            {activeTab === 'logo' && <LogoTab form={form} setForm={setForm} />}
            {activeTab === 'signature' && (
              <SignatureTab
                currentSignature={currentSignature}
                newSignature={newSignature}
                setNewSignature={setNewSignature}
                sigPadKey={sigPadKey.current}
                sigSaving={sigSaving}
                sigSaved={sigSaved}
                sigError={sigError}
                sigConfirming={sigConfirming}
                setSigConfirming={setSigConfirming}
                onSave={handleSaveSignature}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ShowroomProfile;