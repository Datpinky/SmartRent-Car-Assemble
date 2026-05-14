import Modal from '../../../../components/common/Modal';

const OtpModal = ({ otpModal, onClose }) => (
  <Modal isOpen={!!otpModal} onClose={onClose} title="Mã xác nhận bàn giao xe" width={400}>
    {otpModal && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '0.84rem', color: '#374151' }}>
          Xe <b>{otpModal.vehicleName}</b> đã được bàn giao cho <b>{otpModal.renterName}</b>.
        </div>
        <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Đọc mã OTP này cho khách hàng. Họ cần nhập mã để xác nhận đã nhận xe.</div>
        <div style={{ background: '#f0fdf4', border: '2px solid #00b14f', borderRadius: 14, padding: '20px 32px', letterSpacing: '0.35em', fontSize: '2.2rem', fontWeight: 900, color: '#00b14f', fontFamily: 'monospace' }}>
          {otpModal.otp}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Mã có hiệu lực trong 24 giờ</div>
        <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onClose}>Đã thông báo cho khách</button>
      </div>
    )}
  </Modal>
);

export default OtpModal;