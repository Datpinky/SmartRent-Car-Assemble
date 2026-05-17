import React from 'react';

/**
 * Ô nhập OTP bàn giao (6 chữ số) — dùng trang Chờ nhận xe.
 */
export default function HandoverOtpInput({ value = '', onValueChange, disabled = false, size = 'default' }) {
  const handleChange = (e) => {
    const next = String(e.target.value || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    onValueChange?.(next);
  };

  const compact = size === 'compact';

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder={compact ? 'OTP' : 'Nhập 6 số'}
      aria-label="Mã OTP xác nhận nhận xe"
      className={[
        'rounded-lg border border-gray-200 bg-white text-gray-900 outline-none transition',
        'focus:border-primary focus:ring-2 focus:ring-primary/25',
        'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70',
        compact
          ? 'min-w-0 px-2 py-1.5 text-center text-sm font-semibold tracking-[0.2em] w-[7rem]'
          : 'px-3 py-2.5 text-center text-base font-semibold tracking-[0.25em] w-[11rem]',
      ].join(' ')}
    />
  );
}
