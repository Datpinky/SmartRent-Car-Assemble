import React, { useEffect, useId } from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, title, children, width = 520, footer }) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-[9000] p-4 animate-[modalFade_0.15s_ease] motion-reduce:animate-none"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-[modalUp_0.2s_ease] motion-reduce:animate-none max-h-[90vh] flex flex-col"
        style={{ maxWidth: width }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-[18px] border-b border-[#f0f0f0] shrink-0">
          <h3 id={titleId} className="text-base font-bold text-gray-900 m-0">{title}</h3>
          <button
            type="button"
            aria-label="Đóng"
            className="w-8 h-8 border-none bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-[0.85rem] transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={onClose}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1 overscroll-contain">{children}</div>
        {footer && (
          <div className="px-6 py-3.5 border-t border-[#f0f0f0] flex gap-2.5 justify-end shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
