const DriverLicenseRequiredModal = ({ status, rejectReason, onClose, onGoProfile }) => {
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';

  return (
    <div style={{ padding: '8px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: isPending
              ? 'linear-gradient(135deg,#fef9c3,#fde68a)'
              : isRejected
                ? 'linear-gradient(135deg,#fee2e2,#fecaca)'
                : 'linear-gradient(135deg,#fef9c3,#fde68a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
          }}
        >
          {isPending ? '⏳' : isRejected ? '❌' : '🪪'}
        </div>
      </div>
      <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', color: '#111827', marginBottom: 8 }}>
        {isPending ? 'Giấy phép lái xe đang chờ xác minh' : isRejected ? 'Giấy phép lái xe bị từ chối' : 'Chưa có Giấy phép lái xe'}
      </p>
      <p
        style={{
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#6b7280',
          marginBottom: isPending || isRejected ? 12 : 24,
          lineHeight: 1.6,
        }}
      >
        {isPending ? (
          'Giấy phép lái xe của bạn đang chờ admin xác minh. Bạn chưa thể đặt xe cho đến khi được duyệt.'
        ) : isRejected ? (
          'Giấy phép lái xe của bạn đã bị từ chối. Vui lòng cập nhật lại thông tin.'
        ) : (
          <>
            Bạn cần cung cấp thông tin giấy phép lái xe trước khi đặt xe.
            <br />
            Hãy cập nhật trong phần <strong>Hồ sơ cá nhân</strong>.
          </>
        )}
      </p>
      {isRejected && rejectReason && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: '0.82rem',
            color: '#991b1b',
            marginBottom: 16,
          }}
        >
          <strong>Lý do:</strong> {rejectReason}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        {!isPending && (
          <button
            type="button"
            onClick={onGoProfile}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: '#00b14f',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {isRejected ? 'Cập nhật lại GPLX' : 'Cập nhật GPLX'}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            border: '1.5px solid #e5e7eb',
            background: '#fff',
            color: '#374151',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default DriverLicenseRequiredModal;
