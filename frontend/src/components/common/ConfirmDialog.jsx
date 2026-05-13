import { FaExclamationTriangle, FaSpinner, FaTimes } from 'react-icons/fa';

/**
 * Reusable confirmation dialog.
 *
 * Props:
 *   isOpen        {boolean}  – whether to show
 *   title         {string}   – heading text
 *   message       {string}   – body text
 *   confirmLabel  {string}   – confirm button label (default "Xác nhận")
 *   cancelLabel   {string}   – cancel button label (default "Hủy")
 *   confirmVariant {'danger'|'primary'} – button colour
 *   onConfirm     {fn}       – called on confirm click
 *   onCancel      {fn}       – called on cancel click or backdrop click
 *   loading       {boolean}  – disable buttons and show spinner text
 */
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const confirmBtnClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-400 text-white'
      : 'bg-primary hover:bg-primary/90 focus-visible:ring-primary/40 text-white';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 flex flex-col gap-5"
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Đóng"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <FaTimes />
        </button>

        {/* Icon + text */}
        <div className="flex items-start gap-3 pr-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-lg">
            <FaExclamationTriangle aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="font-bold text-gray-900 text-[0.97rem] leading-snug">
              {title}
            </h3>
            {message && <p className="mt-1.5 text-[0.84rem] text-gray-600 leading-relaxed">{message}</p>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[0.88rem] font-bold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 ${confirmBtnClass}`}
          >
            {loading && <FaSpinner aria-hidden="true" className="animate-spin text-sm" />}
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
