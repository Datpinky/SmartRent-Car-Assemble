import React, { useMemo, useState } from 'react';
import { CheckCheck, Eye, EyeOff, X } from 'lucide-react';
import { MdLock } from 'react-icons/md';

const inputCls =
  'w-full py-3 pl-10 pr-10 border-[1.5px] border-gray-200 rounded-lg text-[0.875rem] text-gray-800 font-[inherit] transition-[border-color,box-shadow] outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,177,79,0.1)]';

// Must stay in sync with backend/src/utils/passwordPolicy.js
export const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: 'Ít nhất 8 ký tự' },
  { regex: /[0-9]/, text: 'Ít nhất 1 chữ số' },
  { regex: /[a-z]/, text: 'Ít nhất 1 chữ thường' },
  { regex: /[A-Z]/, text: 'Ít nhất 1 chữ hoa' },
  { regex: /[!-/:-@[-`{-~]/, text: 'Ít nhất 1 ký tự đặc biệt' },
];

const STRENGTH_TEXTS = {
  0: 'Nhập mật khẩu',
  1: 'Mật khẩu yếu',
  2: 'Mật khẩu trung bình',
  3: 'Mật khẩu khá mạnh',
  4: 'Mật khẩu mạnh',
  5: 'Mật khẩu rất mạnh',
};

export function passwordMeetsPolicy(password) {
  return PASSWORD_REQUIREMENTS.every((req) => req.regex.test(password || ''));
}

export function PasswordStrengthInput({
  name = 'password',
  id = 'register-password',
  value,
  onChange,
  error,
  placeholder = 'Nhập mật khẩu',
  required = true,
}) {
  const [isVisible, setIsVisible] = useState(false);

  const calculateStrength = useMemo(() => {
    const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
      met: req.regex.test(value || ''),
      text: req.text,
    }));

    return {
      score: requirements.filter((req) => req.met).length,
      requirements,
    };
  }, [value]);

  const emit = (nextValue) => {
    onChange({ target: { name, value: nextValue } });
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative flex items-center">
        <MdLock
          aria-hidden="true"
          className="pointer-events-none absolute left-3 z-[1] text-gray-400"
          size={17}
        />
        <input
          id={id}
          name={name}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => emit(event.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          required={required}
          aria-describedby="password-strength-hint"
          className={`${inputCls} ${
            error ? 'border-red-400 shadow-[0_0_0_3px_rgba(229,62,62,0.1)]' : ''
          }`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isVisible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
        </button>
      </div>

      <div className="mt-0.5 flex w-full justify-between gap-1.5">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              calculateStrength.score >= step ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <p
        id="password-strength-hint"
        className="flex justify-between gap-2 text-[0.8rem] font-medium text-gray-700"
      >
        <span>Yêu cầu:</span>
        <span className="shrink-0 font-semibold text-primary">
          {STRENGTH_TEXTS[Math.min(calculateStrength.score, 5)]}
        </span>
      </p>

      <ul className="space-y-1.5" aria-label="Yêu cầu mật khẩu">
        {calculateStrength.requirements.map((req) => (
          <li key={req.text} className="flex items-center gap-2">
            {req.met ? (
              <CheckCheck size={16} className="shrink-0 text-emerald-500" strokeWidth={2} />
            ) : (
              <X size={16} className="shrink-0 text-gray-400" strokeWidth={2} />
            )}
            <span className={`text-[0.75rem] ${req.met ? 'text-emerald-700' : 'text-gray-500'}`}>
              {req.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PasswordToggleInput({
  name,
  id,
  label,
  value,
  onChange,
  error,
  placeholder = 'Nhập mật khẩu',
  autoComplete = 'current-password',
  required = false,
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[0.8rem] font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <MdLock
          aria-hidden="true"
          className="pointer-events-none absolute left-3 z-[1] text-gray-400"
          size={17}
        />
        <input
          id={id}
          name={name}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange({ target: { name, value: event.target.value } })}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`${inputCls} ${
            error ? 'border-red-400 shadow-[0_0_0_3px_rgba(229,62,62,0.1)]' : ''
          }`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
            aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isVisible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

export default PasswordStrengthInput;
