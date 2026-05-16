const GplxRequirementBanner = ({ status, rejectReason, onGoProfile }) => {
  if (status === 'approved') return null;

  const configs = {
    none: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: '🪪',
      message: 'Bạn cần thêm Giấy phép lái xe (GPLX) để đặt xe.',
      action: 'Thêm GPLX ngay →',
      showAction: true,
    },
    pending: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⏳',
      message: 'Giấy phép lái xe của bạn đang chờ duyệt. Bạn có thể đặt xe sau khi được xác minh.',
      showAction: false,
    },
    rejected: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '⚠️',
      message: `GPLX bị từ chối${rejectReason ? `: ${rejectReason}` : ''}. Vui lòng cập nhật lại.`,
      action: 'Cập nhật GPLX →',
      showAction: true,
    },
  };

  const cfg = configs[status] || configs.none;

  return (
    <div className={`rounded-xl border ${cfg.bg} ${cfg.border} px-3 py-2.5 mb-3`}>
      <div className={`text-[0.78rem] font-medium ${cfg.text} flex items-start gap-2`}>
        <span aria-hidden="true">{cfg.icon}</span>
        <span className="flex-1">{cfg.message}</span>
      </div>
      {cfg.showAction && (
        <button
          type="button"
          onClick={onGoProfile}
          className={`mt-2 w-full rounded-lg border ${cfg.border} bg-white px-3 py-1.5 text-[0.8rem] font-semibold ${cfg.text} hover:opacity-80 transition-opacity`}
        >
          {cfg.action}
        </button>
      )}
    </div>
  );
};

export default GplxRequirementBanner;
