import { useEffect, useRef, useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import {
  CALENDAR_DAYS,
  CALENDAR_MONTHS,
  formatDateTimeInputLabel,
  pad2,
  parseLocalDateTime,
  toLocalInputValue,
} from '../checkout.helpers';

function DateTimeField({ id, label, value, minValue, onChange, isDayDisabled, dayClassName }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedDate = parseLocalDateTime(value) || new Date();
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const minDate = parseLocalDateTime(minValue);
  const [viewMonth, setViewMonth] = useState(new Date(selectedYear, selectedMonth, 1));

  useEffect(() => {
    setViewMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = (first.getDay() + 6) % 7;

  const applyDate = (nextDate) => {
    if (!nextDate || Number.isNaN(nextDate.getTime())) return;
    const safeDate = minDate && nextDate < minDate ? new Date(minDate) : nextDate;
    if (typeof isDayDisabled === 'function' && isDayDisabled(safeDate)) return;
    onChange(toLocalInputValue(safeDate));
  };

  const onSelectDay = (day) => {
    const next = new Date(selectedDate);
    next.setFullYear(year, month, day);
    applyDate(next);
  };

  const hour12 = selectedDate.getHours() % 12 || 12;
  const minute = selectedDate.getMinutes();
  const ampm = selectedDate.getHours() >= 12 ? 'CH' : 'SA';

  const onHourChange = (nextHour12) => {
    const next = new Date(selectedDate);
    const h = Number(nextHour12) % 12;
    next.setHours(ampm === 'CH' ? h + 12 : h);
    applyDate(next);
  };

  const onMinuteChange = (nextMinute) => {
    const next = new Date(selectedDate);
    next.setMinutes(Number(nextMinute));
    applyDate(next);
  };

  const onAmPmChange = (nextAmPm) => {
    const next = new Date(selectedDate);
    const h12 = next.getHours() % 12;
    next.setHours(nextAmPm === 'CH' ? h12 + 12 : h12);
    applyDate(next);
  };

  return (
    <div className="relative" ref={rootRef}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
        <FaCalendarAlt aria-hidden="true" className="text-primary/80" />
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-left hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
        onClick={() => setOpen((v) => !v)}
      >
        {formatDateTimeInputLabel(value)}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute z-30 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-lg p-3"
        >
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-gray-200 hover:bg-gray-50"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            >
              {'<'}
            </button>
            <select
              className="h-8 rounded-md border border-gray-200 px-2 text-sm"
              value={month}
              onChange={(e) => setViewMonth(new Date(year, Number(e.target.value), 1))}
            >
              {CALENDAR_MONTHS.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-md border border-gray-200 px-2 text-sm"
              value={year}
              onChange={(e) => setViewMonth(new Date(Number(e.target.value), month, 1))}
            >
              {Array.from({ length: 11 }).map((_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              className="ml-auto h-8 w-8 rounded-md border border-gray-200 hover:bg-gray-50"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            >
              {'>'}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[0.72rem] text-gray-500 mb-1">
            {CALENDAR_DAYS.map((d) => (
              <div key={d} className="font-semibold py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {Array.from({ length: leadingEmpty }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const cur = new Date(year, month, day, selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
              const isSelected =
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;
              const disabledByMin = !!(minDate && cur < minDate);
              const disabledByRule = typeof isDayDisabled === 'function' ? isDayDisabled(cur) : false;
              const disabled = disabledByMin || disabledByRule;
              const extraClass = typeof dayClassName === 'function' ? dayClassName(cur) : '';
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  className={`h-9 rounded-md text-sm transition ${
                    isSelected ? 'bg-primary text-white' : 'text-gray-700 hover:bg-primary-light'
                  } ${disabled ? 'opacity-35 cursor-not-allowed hover:bg-transparent' : ''} ${extraClass}`}
                  onClick={() => onSelectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
            <select
              className="h-9 rounded-md border border-gray-200 px-2 text-sm"
              value={hour12}
              onChange={(e) => onHourChange(e.target.value)}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const v = i + 1;
                return (
                  <option key={v} value={v}>
                    {pad2(v)}
                  </option>
                );
              })}
            </select>
            <select
              className="h-9 rounded-md border border-gray-200 px-2 text-sm"
              value={minute}
              onChange={(e) => onMinuteChange(e.target.value)}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const v = i * 5;
                return (
                  <option key={v} value={v}>
                    {pad2(v)}
                  </option>
                );
              })}
            </select>
            <select
              className="h-9 rounded-md border border-gray-200 px-2 text-sm"
              value={ampm}
              onChange={(e) => onAmPmChange(e.target.value)}
            >
              <option value="SA">SA</option>
              <option value="CH">CH</option>
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => applyDate(new Date())}
            >
              Hôm nay
            </button>
            <button type="button" className="text-xs text-gray-500 hover:text-gray-700" onClick={() => setOpen(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateTimeField;
