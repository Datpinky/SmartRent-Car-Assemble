import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { FaSave, FaUser, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { MdVerifiedUser, MdAdminPanelSettings } from 'react-icons/md';
import {
  PasswordStrengthInput,
  PasswordToggleInput,
  passwordMeetsPolicy,
} from '../../../components/common/PasswordInput';
import adminService from '../../../services/adminService';
import authService from '../../../services/authService';

const fmtStat = (n) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('vi-VN');

const AdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '100 Lê Lợi, Q.1, TP.HCM',
    dept: 'Ban Quản trị Hệ thống',
  });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [confirmPwError, setConfirmPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [sessionsState, setSessionsState] = useState({
    items: [],
    legacyToken: false,
    loading: false,
    error: '',
  });
  const [sessionRefresh, setSessionRefresh] = useState(0);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: user.name || '',
      email: user.email || '',
      phone: (user.phone || '').replace(/\D/g, '').slice(0, 10),
    }));
  }, [user]);

  useEffect(() => {
    let mounted = true;
    setStatsLoading(true);
    setStatsError(false);
    adminService
      .getDashboardStats()
      .then((s) => {
        if (mounted) setStats(s);
      })
      .catch(() => {
        if (mounted) setStatsError(true);
      })
      .finally(() => {
        if (mounted) setStatsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== 'security') return;
    let mounted = true;
    setSessionsState((s) => ({ ...s, loading: true, error: '' }));
    authService
      .listSessions()
      .then((data) => {
        if (!mounted) return;
        setSessionsState({
          items: data?.sessions || [],
          legacyToken: !!data?.legacyToken,
          loading: false,
          error: '',
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setSessionsState({
          items: [],
          legacyToken: false,
          loading: false,
          error: err.message || 'Không tải được danh sách phiên.',
        });
      });
    return () => {
      mounted = false;
    };
  }, [tab, sessionRefresh]);

  const initials =
    user?.name
      ?.split(' ')
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase() || 'AD';

  const handleFieldChange = (key, value) => {
    if (key === 'phone') {
      const digits = String(value).replace(/\D/g, '').slice(0, 10);
      setForm((f) => ({ ...f, phone: digits }));
      setPhoneError('');
      return;
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm((f) => ({ ...f, [name]: value }));
    setPwError('');
    if (name === 'confirm') setConfirmPwError('');
  };

  const handleSave = async () => {
    const phoneDigits = (form.phone || '').replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setPhoneError('Số điện thoại phải có đúng 10 chữ số.');
      return;
    }
    setPhoneError('');
    setSaving(true);
    try {
      const updated = await authService.updateProfile({ name: form.name, phone: form.phone });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setPhoneError(err.message || 'Không thể lưu.');
    } finally {
      setSaving(false);
    }
  };

  const handlePwSave = async () => {
    if (!pwForm.current) {
      setPwError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!passwordMeetsPolicy(pwForm.next)) {
      setPwError(
        'Mật khẩu mới chưa đủ độ mạnh. Vui lòng đáp ứng đủ các yêu cầu bên dưới ô mật khẩu.'
      );
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setConfirmPwError('Mật khẩu xác nhận không khớp');
      return;
    }
    setPwError('');
    setConfirmPwError('');
    setPwSubmitting(true);
    try {
      await authService.changePassword({
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      setPwSaved(true);
      setPwForm({ current: '', next: '', confirm: '' });
      setSessionRefresh((n) => n + 1);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwError(err.message || 'Không thể đổi mật khẩu.');
    } finally {
      setPwSubmitting(false);
    }
  };

  const TABS = [
    ['info', <FaUser aria-hidden="true" />, 'Thông tin'],
    ['security', <FaShieldAlt aria-hidden="true" />, 'Bảo mật'],
  ];

  return (
    <div className="ap-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Hồ sơ Quản trị viên</h1>
          <p className="page-subtitle">Quản lý thông tin tài khoản và cài đặt bảo mật</p>
        </div>
      </div>

      <div className="ap-hero">
        <div className="ap-avatar-wrap">
          <div className="ap-avatar">{initials}</div>
          <div className="ap-avatar-badge">
            <MdAdminPanelSettings aria-hidden="true" />
          </div>
        </div>
        <div className="ap-hero-info">
          <div className="ap-hero-name">{user?.name}</div>
          <div className="ap-hero-email">{user?.email}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="ap-role-badge">
              <MdVerifiedUser aria-hidden="true" style={{ fontSize: '0.8rem' }} /> Quản trị viên
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.55)',
                alignSelf: 'center',
              }}
            >
              Truy cập toàn quyền hệ thống
            </span>
          </div>
        </div>
        <div className="ap-hero-stats">
          <div className="ap-stat">
            <div className="ap-stat-val tabular-nums">
              {statsLoading ? '…' : statsError ? '—' : fmtStat(stats?.totalUsers)}
            </div>
            <div className="ap-stat-label">Người dùng</div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-val tabular-nums">
              {statsLoading ? '…' : statsError ? '—' : fmtStat(stats?.totalShowrooms)}
            </div>
            <div className="ap-stat-label">Showroom</div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-val tabular-nums">
              {statsLoading ? '…' : statsError ? '—' : fmtStat(stats?.totalBookings)}
            </div>
            <div className="ap-stat-label">Tổng booking</div>
          </div>
        </div>
      </div>

      <div className="ap-tabs">
        {TABS.map(([key, icon, label]) => (
          <button
            type="button"
            key={key}
            className={`ap-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="ap-card">
          <h3 className="ap-section-title">Thông tin cá nhân</h3>
          <div className="ap-form-grid">
            {[
              ['Họ và tên', 'name', 'text', 'name'],
              ['Email', 'email', 'email', 'email'],
              ['Số điện thoại (10 số)', 'phone', 'tel', 'tel'],
              ['Phòng ban', 'dept', 'text', 'organization-title'],
            ].map(([label, key, type, autoComplete]) => (
              <div key={key}>
                <label htmlFor={`ap-${key}`} className="ap-label">
                  {label}
                </label>
                <input
                  id={`ap-${key}`}
                  type={type}
                  autoComplete={autoComplete}
                  value={form[key]}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="ap-input"
                  readOnly={key === 'email'}
                  {...(key === 'phone'
                    ? { maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }
                    : {})}
                />
              </div>
            ))}
            {phoneError && (
              <div
                style={{
                  gridColumn: 'span 2',
                  color: '#dc2626',
                  fontSize: '0.82rem',
                  marginTop: 6,
                }}
              >
                {phoneError}
              </div>
            )}
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="ap-address" className="ap-label">
                Địa chỉ
              </label>
              <input
                id="ap-address"
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="ap-input"
              />
            </div>
          </div>

          <button
            type="button"
            className="ap-btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: 16 }}
          >
            <FaSave aria-hidden="true" /> {saved ? 'Đã lưu!' : saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="ap-card">
          <h3 className="ap-section-title">Đổi mật khẩu</h3>
          <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PasswordToggleInput
              id="ap-pw-current"
              name="current"
              label="Mật khẩu hiện tại"
              value={pwForm.current}
              onChange={handlePwChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8rem] font-semibold text-gray-700" htmlFor="ap-pw-next">
                Mật khẩu mới
              </label>
              <PasswordStrengthInput
                id="ap-pw-next"
                name="next"
                value={pwForm.next}
                onChange={handlePwChange}
                error={!!pwError && pwError.includes('độ mạnh')}
              />
            </div>
            <PasswordToggleInput
              id="ap-pw-confirm"
              name="confirm"
              label="Xác nhận mật khẩu mới"
              value={pwForm.confirm}
              onChange={(e) => {
                handlePwChange(e);
                setConfirmPwError('');
              }}
              placeholder="Nhập lại mật khẩu"
              error={!!confirmPwError}
              autoComplete="new-password"
              required
            />
            {confirmPwError && (
              <div className="text-[0.78rem] text-red-600 font-medium flex items-center gap-1">
                ⚠ {confirmPwError}
              </div>
            )}
            {pwError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#dc2626',
                  fontSize: '0.82rem',
                }}
              >
                {pwError}
              </div>
            )}
            {pwSaved && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#166534',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FaCheckCircle aria-hidden="true" /> Mật khẩu đã được cập nhật thành công!
              </div>
            )}
            <button
              type="button"
              className="ap-btn-primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={handlePwSave}
              disabled={pwSubmitting}
            >
              <FaShieldAlt aria-hidden="true" /> {pwSubmitting ? 'Đang xử lý…' : 'Cập nhật mật khẩu'}
            </button>
          </div>

          <div style={{ marginTop: 32 }}>
            <h3 className="ap-section-title">Phiên đăng nhập</h3>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 12px' }}>
              Các phiên được ghi nhận khi đăng nhập (thiết bị, trình duyệt, thời gian hoạt động gần nhất).
            </p>
            {sessionsState.loading && (
              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Đang tải phiên đăng nhập…</div>
            )}
            {sessionsState.error && (
              <div role="alert" style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: 8 }}>
                {sessionsState.error}
              </div>
            )}
            {!sessionsState.loading &&
              !sessionsState.error &&
              sessionsState.legacyToken &&
              sessionsState.items.length === 0 && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: '0.82rem',
                    color: '#92400e',
                  }}
                >
                  Token đăng nhập hiện tại chưa gắn phiên. Vui lòng{' '}
                  <strong>đăng xuất và đăng nhập lại</strong> để xem danh sách phiên trên máy chủ.
                </div>
              )}
            {!sessionsState.loading &&
              !sessionsState.error &&
              sessionsState.items.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sessionsState.items.map((s) => (
                    <div
                      key={s.jti}
                      style={{
                        background: '#f9fafb',
                        borderRadius: 10,
                        padding: 16,
                        border: s.isCurrent ? '1px solid #c4b5fd' : '1px solid #f0f0f0',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              color: '#111827',
                            }}
                          >
                            {s.isCurrent ? 'Thiết bị hiện tại' : 'Phiên khác'}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#9ca3af',
                              marginTop: 2,
                              wordBreak: 'break-word',
                            }}
                          >
                            {s.summary}
                          </div>
                        </div>
                        <span
                          style={{
                            background: s.isCurrent ? '#d1fae5' : '#f3f4f6',
                            color: s.isCurrent ? '#059669' : '#6b7280',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 50,
                            flexShrink: 0,
                          }}
                        >
                          {s.isCurrent ? 'Hoạt động' : 'Đã lưu'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
