import React, { useLayoutEffect, useRef, useState } from 'react';

const AutoFitStatValue = ({ value }) => {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(26);

  useLayoutEffect(() => {
    const wrapEl = wrapRef.current;
    const textEl = textRef.current;
    if (!wrapEl || !textEl) return;

    const fit = () => {
      const maxPx = 26;
      const minPx = 14;
      let next = maxPx;
      textEl.style.fontSize = `${maxPx}px`;

      while (textEl.scrollWidth > wrapEl.clientWidth && next > minPx) {
        next -= 1;
        textEl.style.fontSize = `${next}px`;
      }
      setFontSize(next);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrapEl);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div ref={wrapRef} className="w-full min-w-0">
      <div
        ref={textRef}
        className="font-extrabold text-gray-900 leading-none tabular-nums whitespace-nowrap"
        style={{ fontSize }}
      >
        {value}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon, color = '#00b14f', trend, trendLabel }) => {
  return (
    <div className="bg-white rounded-[14px] p-5 flex items-center gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.07)] border border-[#f0f0f0] transition-shadow duration-200 hover:shadow-md">
      <div
        aria-hidden="true"
        className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[1.4rem] shrink-0"
        style={{ background: color + '20', color }}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AutoFitStatValue value={value} />
        <div className="text-[0.82rem] text-gray-500 mt-0.5 font-medium">{title}</div>
        {(trend !== undefined || subtext || trendLabel) && (
          <div className="flex flex-nowrap items-center gap-1.5 mt-1 min-w-0">
            {trend !== undefined && (
              <span
                className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[0.72rem] font-bold leading-none ${
                  trend >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {`${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%`}
              </span>
            )}
            {trendLabel && (
              <span className="whitespace-nowrap text-[0.72rem] text-gray-400">{trendLabel}</span>
            )}
            {subtext && !trendLabel && <span className="text-[0.72rem] text-gray-400">{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
