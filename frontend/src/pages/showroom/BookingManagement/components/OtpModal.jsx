import { useEffect, useState } from 'react';
import Modal from '../../../../components/common/Modal';
import bookingService from '../../../../services/bookingService';

const OtpModal = ({ otpModal, onClose }) => {
  const [localOtp, setLocalOtp] = useState(otpModal?.otp || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalOtp(otpModal?.otp || '');
    setError('');
    setLoading(false);
  }, [otpModal]);

  const handleResend = async () => {
    if (!otpModal?.bookingId) return;
    setLoading(true);
    setError('');
    try {
      const updated = await bookingService.resendHandoverOtp(otpModal.bookingId);
      // backend returns { handover_otp, handover_otp_expires_at }
      if (updated && (updated.handover_otp || updated.handoverOtp)) {
        setLocalOtp(updated.handover_otp || updated.handoverOtp);
      } else if (updated && updated.handover_otp === undefined && updated.handoverOtp === undefined) {
        // if service returned booking object
        setLocalOtp(updated.handover_otp || updated.handoverOtp || otpModal.otp || '');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={!!otpModal} onClose={onClose} title="Mã xác nhận bàn giao xe" width={400}>
      {otpModal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '0.84rem', color: '#374151' }}>
            Xe <b>{otpModal.vehicleName}</b> đã được bàn giao cho <b>{otpModal.renterName}</b>.
          </div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            Đọc mã OTP này cho khách hàng. Họ cần nhập mã để xác nhận đã nhận xe.
          </div>
          <div
            style={{
              background: '#f0fdf4',
              border: '2px solid #00b14f',
              borderRadius: 14,
              padding: '20px 32px',
              letterSpacing: '0.35em',
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#00b14f',
              fontFamily: 'monospace',
            }}
          >
            {localOtp}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Mã có hiệu lực trong 24 giờ</div>
          {error && <div style={{ color: '#dc2626', fontSize: '0.82rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button
              type="button"
              className="btn-outline"
              style={{
                flex: 1,
                border: '2px solid #0284c7',
                background: '#fff',
                color: '#0369a1',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
              onClick={handleResend}
              disabled={loading}
            >
              {loading ? 'Đang gửi...' : 'Xem lại mã'}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
              onClick={onClose}
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default OtpModal;
