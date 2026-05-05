import React, { useState } from 'react';
import {
  FaCar,
  FaCheckCircle,
  FaExclamationCircle,
  FaKey,
  FaMoneyBillWave,
  FaSave,
  FaShieldAlt,
  FaUser,
} from 'react-icons/fa';
import { MdVerifiedUser, MdDirectionsCar } from 'react-icons/md';
import { useAuth } from '../../../contexts/AuthContext';
import { formatVnd } from '../../../utils/currencyFormat';

const passwordMeetsPolicy = (value) => {
  const password = String(value || '');
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasDigit && hasSpecial;
};

const OWNER_STATS = [
  { label: 'Xe đang ký gửi',  value: '3',          icon: <MdDirectionsCar aria-hidden="true" />, color: '#6d28d9' },
  { label: 'Tổng doanh thu',   value: formatVnd(52_400_000), icon: <FaMoneyBillWave aria-hidden="true" />, color: '#059669' },
  { label: 'Chờ rút tiền',     value: formatVnd(8_200_000),  icon: <FaExclamationCircle aria-hidden="true" />, color: '#d97706' },
];

const OwnerProfile = () => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({
    name: user?.name || 'Nguyễn Văn Khoa',
    email: user?.email || 'owner@smartrent.com',
    phone: user?.phone || '0900000003',
    dob: '15/07/1985',
    address: '56 Trần Hưng Đạo, Q.1, TP.HCM',
    bank: 'Vietcombank - 0012345678910',
  });
  const [saved, setSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [dobError, setDobError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const initials =
    user?.name
      ?.split(' ')
      .map((word) => word[0])
      .slice(-2)
      .join('')
      .toUpperCase() || 'OW';

  const toTitleCase = (value) =>
    String(value || '')
      .split(' ')
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
      .join(' ');

  const handleFieldChange = (key, value) => {
    if (key === 'name') {
      setNameError('');
      setForm((current) => ({ ...current, name: toTitleCase(value) }));
      return;
    }

    if (key === 'phone') {
      const digits = String(value).replace(/\D/g, '').slice(0, 10);
      setForm((current) => ({ ...current, phone: digits }));
      setPhoneError('');
      return;
    }

    if (key === 'email') {
      setEmailError('');
    }

    if (key === 'dob') {
      setDobError('');
    }

    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    let hasError = false;
    const trimmedName = String(form.name || '').trim();

    if (!trimmedName) {
      setNameError('Họ và tên không được để trống.');
      hasError = true;
    } else if (/[^a-zA-ZÀ-ỹ\s]/.test(trimmedName)) {
      setNameError('Họ và tên chỉ được chứa chữ cái.');
      hasError = true;
    } else {
      setNameError('');
    }

    const dobParts = String(form.dob || '').split('/');
    if (dobParts.length === 3) {
      const day = parseInt(dobParts[0], 10);
      const month = parseInt(dobParts[1], 10);
      const year = parseInt(dobParts[2], 10);

      if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
        setDobError('Ngày sinh không hợp lệ (định dạng DD/MM/YYYY).');
        hasError = true;
      } else if (month < 1 || month > 12) {
        setDobError('Tháng không hợp lệ, phải từ 1 đến 12.');
        hasError = true;
      } else {
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const maxDays = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];

        if (day < 1 || day > maxDays) {
          setDobError(month === 2 ? `Tháng 2 năm ${year} chỉ có ${maxDays} ngày.` : `Tháng ${month} chỉ có ${maxDays} ngày.`);
          hasError = true;
        } else {
          const dob = new Date(year, month - 1, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const age =
            today.getFullYear() -
            year -
            (today < new Date(today.getFullYear(), month - 1, day) ? 1 : 0);

          if (dob >= today) {
            setDobError('Ngày sinh không được là ngày trong tương lai.');
            hasError = true;
          } else if (age < 18) {
            setDobError('Bạn phải đủ 18 tuổi để đăng ký.');
            hasError = true;
          } else {
            setDobError('');
          }
        }
      }
    } else {
      setDobError('Ngày sinh không hợp lệ (định dạng DD/MM/YYYY).');
      hasError = true;
    }

    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setPhoneError('Số điện thoại phải có đúng 10 chữ số.');
      hasError = true;
    } else if (!phoneDigits.startsWith('0')) {
      setPhoneError('Số điện thoại phải bắt đầu bằng số 0.');
      hasError = true;
    } else {
      setPhoneError('');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(String(form.email || ''))) {
      setEmailError('Email không hợp lệ (ví dụ: name@domain.com).');
      hasError = true;
    } else {
      setEmailError('');
    }

    if (hasError) {
      return;
    }

    updateUser({ name: form.name, phone: form.phone });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePwSave = () => {
    if (!pwForm.current) {
      setPwError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (!passwordMeetsPolicy(pwForm.next)) {
      setPwError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
      return;
    }

    if (pwForm.next !== pwForm.confirm) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }

    setPwError('');
    setPwSaved(true);
    setPwForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPwSaved(false), 2500);
  };

  const tabs = [
    ['info', <FaUser aria-hidden="true" />, 'Thông tin'],
    ['security', <FaShieldAlt aria-hidden="true" />, 'Bảo mật'],
  ];

  return (
    <div className="op-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Hồ sơ chủ xe</h1>
          <p className="page-subtitle">Quản lý thông tin và bảo mật tài khoản</p>
        </div>
      </div>

      <div className="op-hero">
        <div className="op-avatar-wrap">
          <div className="op-avatar">{initials}</div>
          <div className="op-avatar-badge">
            <FaCar aria-hidden="true" />
          </div>
        </div>

        <div className="op-hero-info">
          <div className="op-hero-name">{user?.name}</div>
          <div className="op-hero-email">{user?.email}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="op-role-badge">
              <MdVerifiedUser style={{ fontSize: '0.8rem' }} aria-hidden="true" /> Chủ xe ký gửi
            </span>
          </div>
        </div>

        <div className="op-hero-stats">
          {OWNER_STATS.map((item) => (
            <div key={item.label} className="op-stat">
              <div className="op-stat-icon" style={{ color: item.color }}>
                {item.icon}
              </div>
              <div className="op-stat-val tabular-nums">{item.value}</div>
              <div className="op-stat-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="op-tabs">
        {tabs.map(([key, icon, label]) => (
          <button
            type="button"
            key={key}
            className={`op-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="op-card">
          <h3 className="op-section-title">Thông tin cá nhân</h3>

          <div className="op-form-grid">
            <div>
              <label className="op-label" htmlFor="owner-name">Họ và tên</label>
              <input
                id="owner-name"
                name="name"
                autoComplete="name"
                type="text"
                value={form.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                className="op-input"
                placeholder="Nguyễn Văn A"
              />
              {nameError && <div role="alert" style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: 4 }}>{nameError}</div>}
            </div>

            <div>
              <label className="op-label" htmlFor="owner-email">Email</label>
              <input
                id="owner-email"
                name="email"
                autoComplete="email"
                type="email"
                value={form.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                className="op-input"
                placeholder="name@domain.com"
              />
              {emailError && <div role="alert" style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: 4 }}>{emailError}</div>}
            </div>

            <div>
              <label className="op-label" htmlFor="owner-phone">Số điện thoại (10 số)</label>
              <input
                id="owner-phone"
                name="tel"
                autoComplete="tel"
                type="tel"
                value={form.phone}
                onChange={(event) => handleFieldChange('phone', event.target.value)}
                className="op-input"
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0xxxxxxxxx"
              />
              {phoneError && <div role="alert" style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: 4 }}>{phoneError}</div>}
            </div>

            <div>
              <label className="op-label" htmlFor="owner-dob">Ngày sinh (DD/MM/YYYY)</label>
              <input
                id="owner-dob"
                name="bday"
                autoComplete="bday"
                type="text"
                value={form.dob}
                onChange={(event) => handleFieldChange('dob', event.target.value)}
                className="op-input"
                placeholder="DD/MM/YYYY"
                maxLength={10}
              />
              {dobError && <div role="alert" style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: 4 }}>{dobError}</div>}
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label className="op-label" htmlFor="owner-address">Địa chỉ</label>
              <input
                id="owner-address"
                name="street-address"
                autoComplete="street-address"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                className="op-input"
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label className="op-label" htmlFor="owner-bank">Tài khoản ngân hàng nhận tiền</label>
              <input
                id="owner-bank"
                name="bank-account"
                autoComplete="off"
                value={form.bank}
                onChange={(event) => setForm((current) => ({ ...current, bank: event.target.value }))}
                className="op-input"
                placeholder="Tên ngân hàng - Số tài khoản"
              />
            </div>
          </div>

          <div aria-live="polite">
            {saved && (
              <div
                role="status"
                style={{
                  marginTop: 12,
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
                <FaCheckCircle aria-hidden="true" /> Thông tin đã được lưu!
              </div>
            )}
          </div>

          <button type="button" className="op-btn-primary" onClick={handleSave} style={{ marginTop: 18 }}>
            <FaSave aria-hidden="true" /> {saved ? 'Đã lưu!' : 'Lưu thay đổi'}
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="op-card">
          <h3 className="op-section-title">Đổi mật khẩu</h3>

          <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Mật khẩu hiện tại', 'pw-current', 'current', 'current-password'],
              ['Mật khẩu mới', 'pw-new', 'next', 'new-password'],
              ['Xác nhận mật khẩu mới', 'pw-confirm', 'confirm', 'new-password'],
            ].map(([label, id, key, autoComplete]) => (
              <div key={id}>
                <label className="op-label" htmlFor={id}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <FaKey
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      fontSize: '0.8rem',
                    }}
                    aria-hidden="true"
                  />
                  <input
                    id={id}
                    name={autoComplete}
                    autoComplete={autoComplete}
                    type="password"
                    value={pwForm[key]}
                    onChange={(event) => setPwForm((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder="••••••••"
                    className="op-input"
                    style={{ paddingLeft: 34 }}
                  />
                </div>
              </div>
            ))}

            {pwError && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', color: '#dc2626', fontSize: '0.82rem' }}>
                {pwError}
              </div>
            )}

            <div aria-live="polite">
              {pwSaved && (
                <div role="status" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', color: '#166534', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaCheckCircle aria-hidden="true" /> Mật khẩu đã được cập nhật!
                </div>
              )}
            </div>

            <button type="button" className="op-btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handlePwSave}>
              <FaShieldAlt aria-hidden="true" /> Cập nhật mật khẩu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerProfile;
