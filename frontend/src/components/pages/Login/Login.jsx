import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdDirectionsCar, MdEmail, MdPhone } from 'react-icons/md';
import { useAuth } from '../../../contexts/AuthContext';
import authService from '../../../services/authService';
import {
  PasswordStrengthInput,
  PasswordToggleInput,
  passwordMeetsPolicy,
} from '../../common/PasswordInput';

const ROLE_REDIRECTS = {
  admin: '/admin/dashboard',
  showroom: '/showroom/dashboard',
  renter: '/renter/dashboard',
};

const inputCls =
  'w-full py-3 pl-10 pr-3 border-[1.5px] border-gray-200 rounded-lg text-[0.875rem] text-gray-800 font-[inherit] transition-[border-color,box-shadow] outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,177,79,0.1)]';

const LoginFormField = ({
  label,
  name,
  type = 'text',
  icon: Icon,
  placeholder,
  required,
  value,
  onChange,
  error,
  extra = {},
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={`field-${name}`} className="text-[0.8rem] font-semibold text-gray-700">
      {label}
    </label>
    <div className="relative flex items-center">
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute left-3 text-gray-400"
        size={17}
      />
      <input
        id={`field-${name}`}
        className={`${inputCls} ${
          error ? 'border-red-400 shadow-[0_0_0_3px_rgba(229,62,62,0.1)]' : ''
        }`}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `field-${name}-error` : undefined}
        {...extra}
      />
    </div>
    {error && (
      <div
        id={`field-${name}-error`}
        role="alert"
        className="mt-2 flex items-center gap-1 text-[0.78rem] font-medium text-red-600"
      >
        Canh bao: {error}
      </div>
    )}
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    name: '',
    accountType: 'renter',
  });
  const [confirmError, setConfirmError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [forgotInlineOpen, setForgotInlineOpen] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotForm, setForgotForm] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });

  const registerPasswordInvalid =
    tab === 'register' && !!registerError && !passwordMeetsPolicy(form.password);
  const registerPhoneInvalid =
    tab === 'register' &&
    !!registerError &&
    (form.phone || '').replace(/\D/g, '').length !== 10;

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm((current) => ({ ...current, phone: digits }));
      if (registerError) setRegisterError('');
      return;
    }

    if (name === 'accountType') {
      setForm((current) => ({ ...current, accountType: value }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
    if (tab === 'register' && registerError) setRegisterError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');
    setRegisterError('');
    setConfirmError('');
    setRegisterSuccess('');

    if (tab === 'register') {
      if (!passwordMeetsPolicy(form.password)) {
        setRegisterError(
          'Mật khẩu chưa đủ độ mạnh. Vui lòng đáp ứng đầy đủ các yêu cầu bên dưới ở mật khẩu.'
        );
        return;
      }

      if (form.password !== form.confirmPassword) {
        setConfirmError('Mật khẩu xác nhận không khớp.');
        return;
      }

      const phoneDigits = (form.phone || '').replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        setRegisterError('Số điện thoại phải có đúng 10 chữ số.');
        return;
      }

      setSubmitting(true);
      const result = await register(
        form.name,
        form.email,
        form.password,
        form.phone,
        form.accountType || 'renter'
      );
      setSubmitting(false);

      if (result.success) {
        setRegisterSuccess('Tao tai khoan thanh cong. Vui long dang nhap.');
        setTab('login');
        setForm((current) => ({
          ...current,
          password: '',
          confirmPassword: '',
        }));
      } else {
        setRegisterError(result.error || 'Dang ky that bai. Vui long thu lai.');
      }
      return;
    }

    setSubmitting(true);
    const result = await login(form.email, form.password);
    setSubmitting(false);

    if (result.success) {
      const from = location.state?.from?.pathname;
      const fallback = ROLE_REDIRECTS[result.user.role] || '/';
      const allowedPrefix = {
        admin: '/admin',
        showroom: '/showroom',
        renter: '/renter',
      }[result.user.role];

      const redirect =
        from && from !== '/login' && allowedPrefix && String(from).startsWith(allowedPrefix)
          ? from
          : fallback;

      setTimeout(() => navigate(redirect, { replace: true }), 0);
    } else {
      setLoginError(result.error || 'Dang nhap that bai');
    }
  };

  const openForgotModal = () => {
    setForgotError('');
    setForgotSuccess('');
    setForgotForm({
      email: form.email || '',
      newPassword: '',
      confirmPassword: '',
    });
    setForgotInlineOpen(true);
  };

  const closeForgotModal = () => {
    if (forgotSubmitting) return;
    setForgotInlineOpen(false);
  };

  const handleBackToLogin = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (forgotSubmitting) return;

    setForgotInlineOpen(false);
    setForgotError('');
    setForgotSuccess('');
    setTab('login');
    setForm((current) => ({
      ...current,
      password: '',
    }));
  };

  const handleForgotChange = (event) => {
    const { name, value } = event.target;
    setForgotForm((current) => ({ ...current, [name]: value }));
    if (forgotError) setForgotError('');
    if (forgotSuccess) setForgotSuccess('');
  };

  const handleForgotSubmit = async (event) => {
    event.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotForm.email.trim()) {
      setForgotError('Vui long nhap email da dang ky.');
      return;
    }

    if (!passwordMeetsPolicy(forgotForm.newPassword)) {
      setForgotError('Mat khau moi chua du manh. Vui long dap ung day du yeu cau.');
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setForgotError('Mat khau xac nhan khong khop.');
      return;
    }

    setForgotSubmitting(true);
    try {
      await authService.forgotPassword({
        email: forgotForm.email,
        newPassword: forgotForm.newPassword,
      });
      setForgotSuccess('Dat lai mat khau thanh cong. Vui long dang nhap lai.');
      setForm((current) => ({
        ...current,
        email: forgotForm.email.trim(),
        password: '',
      }));
      setTimeout(() => {
        setForgotInlineOpen(false);
      }, 900);
    } catch (error) {
      setForgotError(error.message || 'Khong the dat lai mat khau. Vui long thu lai.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div
        className="sticky top-0 hidden h-full flex-1 items-center justify-center overflow-hidden px-10 py-[60px] md:flex"
        style={{ background: 'linear-gradient(145deg, #f0fdf4 0%, #ecfdf5 50%, #f8fffc 100%)' }}
      >
        <div
          className="absolute -right-[80px] -top-[80px] h-[420px] w-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,177,79,0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-[40px] -left-[40px] h-[280px] w-[280px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,177,79,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative z-[1] flex w-full max-w-[400px] flex-col items-center justify-center">
          <img
            src="/logo_transparent.png"
            alt="SmartRent Logo"
            className="w-full max-w-[340px] object-contain drop-shadow-md"
          />
        </div>
      </div>

      <div className="flex h-full w-full flex-col justify-center overflow-y-auto bg-white px-12 py-[60px] md:w-[480px] max-[480px]:px-6 max-[480px]:py-10">
        <div className="mb-2 text-[1.75rem] font-extrabold text-gray-900">
          {forgotInlineOpen ? 'Đặt lại mật khẩu' : tab === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản'}
        </div>
        <div className="mb-8 text-[0.875rem] text-gray-500">
          {forgotInlineOpen
            ? 'Nhập email đã đăng ký để đặt lại mật khẩu'
            : tab === 'login' && 'Đăng nhập để tiếp tục thuê xe'}
        </div>

        {!forgotInlineOpen && (
          <div className="mb-7 flex border-b-2 border-gray-200">
            {['login', 'register'].map((value) => (
              <button
                key={value}
                type="button"
                className={`-mb-0.5 flex-1 border-b-2 py-2.5 text-center text-[0.9rem] font-semibold transition-all ${
                  tab === value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => {
                  setForgotInlineOpen(false);
                  setTab(value);
                }}
              >
                {value === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>
        )}

        {registerSuccess && (
          <div className="mb-2.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[0.82rem] text-green-700">
            {registerSuccess}
          </div>
        )}
        {loginError && (
          <div className="mb-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] text-red-600">
            {loginError}
          </div>
        )}
        {tab === 'register' && registerError && !registerPasswordInvalid && !registerPhoneInvalid && (
          <div className="mb-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] text-red-600">
            {registerError}
          </div>
        )}

        {forgotInlineOpen ? (
          <form className="flex flex-col gap-3.5" onSubmit={handleForgotSubmit}>
            {forgotError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.8rem] text-red-600">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[0.8rem] text-green-700">
                {forgotSuccess}
              </div>
            )}

            <LoginFormField
              label="Email da dang ky"
              name="email"
              type="email"
              icon={MdEmail}
              placeholder="example@email.com"
              required
              value={forgotForm.email}
              onChange={handleForgotChange}
              extra={{ autoComplete: 'email' }}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8rem] font-semibold text-gray-700">Mat khau moi</label>
              <PasswordStrengthInput
                name="newPassword"
                id="forgot-new-password"
                value={forgotForm.newPassword}
                onChange={handleForgotChange}
                error={!!forgotError && !passwordMeetsPolicy(forgotForm.newPassword)}
                placeholder="Nhap mat khau moi"
              />
            </div>

            <PasswordToggleInput
              label="Xac nhan mat khau moi"
              name="confirmPassword"
              id="forgot-confirm-password"
              value={forgotForm.confirmPassword}
              onChange={handleForgotChange}
              error={
                !!forgotForm.confirmPassword &&
                forgotForm.newPassword !== forgotForm.confirmPassword
              }
              placeholder="Nhap lai mat khau moi"
              autoComplete="new-password"
              required
            />

            <button
              type="submit"
              disabled={forgotSubmitting}
              className="mt-1 w-full rounded-xl bg-gradient-to-br from-primary to-primary-dark py-3 text-[0.92rem] font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,177,79,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
            >
              {forgotSubmitting ? 'Dang cap nhat...' : 'Dat lai mat khau'}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              disabled={forgotSubmitting}
              className="text-center text-[0.83rem] font-semibold text-primary disabled:opacity-60"
            >
              Quay lại đăng nhập
            </button>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {tab === 'register' && (
            <LoginFormField
              label="Họ và tên"
              name="name"
              icon={MdDirectionsCar}
              placeholder="Nguyen Van A"
              value={form.name}
              onChange={handleChange}
            />
          )}

          {tab === 'register' && (
            <LoginFormField
              label="Số điện thoại (10 số)"
              name="phone"
              type="tel"
              icon={MdPhone}
              placeholder="0901234567"
              value={form.phone}
              onChange={handleChange}
              error={registerPhoneInvalid ? registerError : ''}
              extra={{ inputMode: 'numeric', autoComplete: 'tel', maxLength: 10 }}
            />
          )}

          {tab === 'register' && (
            <div className="flex flex-col gap-2">
              <span className="text-[0.8rem] font-semibold text-gray-700">Tôi muốn</span>
              <div className="flex flex-col gap-2">
                {[
                  { value: 'renter', label: 'Thuê xe (khách hàng)' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      form.accountType === value
                        ? 'border-primary bg-primary-light'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={value}
                      checked={form.accountType === value}
                      onChange={handleChange}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-[0.88rem] font-medium text-gray-800">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <LoginFormField
            label="Email"
            name="email"
            type="email"
            icon={MdEmail}
            placeholder="example@email.com"
            required
            value={form.email}
            onChange={handleChange}
            extra={{ autoComplete: tab === 'login' ? 'username' : 'email' }}
          />

          {tab === 'register' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8rem] font-semibold text-gray-700">Mật khẩu</label>
              <PasswordStrengthInput
                name="password"
                id="register-password"
                value={form.password}
                onChange={handleChange}
                error={registerPasswordInvalid}
                placeholder="Nhập mật khẩu"
              />
              {registerPasswordInvalid && (
                <div className="mt-1 flex items-center gap-1 text-[0.78rem] font-medium text-red-600">
                  Canh bao: {registerError}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <PasswordToggleInput
                label="Mật khẩu"
                name="password"
                id="login-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={openForgotModal}
                className="text-right text-[0.78rem] font-medium text-primary hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          {tab === 'register' && (
            <div className="flex flex-col gap-1.5">
              <PasswordToggleInput
                label="Xác nhận mật khẩu"
                name="confirmPassword"
                id="confirm-password"
                value={form.confirmPassword}
                onChange={(event) => {
                  handleChange(event);
                  setConfirmError('');
                }}
                error={confirmError}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                required
              />
              {confirmError && (
                <div className="mt-2 flex items-center gap-1 text-[0.78rem] font-medium text-red-600">
                  Cảnh báo: {confirmError}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full rounded-xl bg-gradient-to-br from-primary to-primary-dark py-3.5 text-[0.95rem] font-bold tracking-wide text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,177,79,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
          >
            {submitting ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
          </form>
        )}

        {!forgotInlineOpen && (
          <div className="mt-5 space-y-2 text-center text-[0.83rem] text-gray-500">
          {tab === 'login' ? (
            <>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                className="font-semibold text-primary"
                onClick={() => setTab('register')}
              >
                Đăng ký ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <button
                type="button"
                className="font-semibold text-primary"
                onClick={() => setTab('login')}
              >
                Đăng nhập
              </button>
            </>
          )}

          {tab === 'register' && (
            <div>
              Bạn là doanh nghiệp / showroom?{' '}
              <Link to="/partner/register" className="font-semibold text-primary hover:underline">
                Đăng ký đối tác
              </Link>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
