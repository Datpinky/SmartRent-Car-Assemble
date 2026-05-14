import { FaCheckCircle, FaFileSignature, FaSpinner } from 'react-icons/fa';
import SignaturePad from '../../../../components/common/SignaturePad';

const SignatureTab = ({ currentSignature, newSignature, setNewSignature, sigPadKey, sigSaving, sigSaved, sigError, sigConfirming, setSigConfirming, onSave }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: 4 }}>Chữ ký điện tử của Showroom</div>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
        Chữ ký này sẽ được tự động in vào hợp đồng thuê xe (Bên A).
        {!currentSignature && <> Vẽ chữ ký bằng chuột hoặc ngón tay, sau đó nhấn <strong>Lưu chữ ký</strong>.</>}
      </p>

      {currentSignature ? (
        <div>
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FaCheckCircle style={{ color: '#00b14f' }} aria-hidden="true" />
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#166534' }}>Đã có chữ ký điện tử</span>
            </div>
            <img src={currentSignature} alt="Chữ ký hiện tại" style={{ maxWidth: '100%', maxHeight: 120, border: '1px solid #dcfce7', borderRadius: 8, background: '#fff' }} />
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#92400e' }}>
            <FaFileSignature style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
            Chữ ký đã được khóa. Để thay đổi, vui lòng liên hệ quản trị viên.
          </div>
        </div>
      ) : (
        <div>
          <SignaturePad key={sigPadKey} onSave={setNewSignature} />
          {newSignature && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Xem trước chữ ký:</div>
              <img src={newSignature} alt="Xem trước chữ ký" style={{ maxWidth: '100%', maxHeight: 100, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }} />
            </div>
          )}
          {sigError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem', color: '#b91c1c', marginTop: 12 }}>{sigError}</div>}
          {sigSaved && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem', color: '#166534', marginTop: 12 }}>Đã lưu chữ ký thành công!</div>}
          {!sigConfirming ? (
            <button type="button" className="btn-primary" style={{ marginTop: 16 }} disabled={!newSignature || sigSaving} onClick={() => setSigConfirming(true)}>
              {sigSaving ? <><FaSpinner className="animate-spin inline" aria-hidden="true" /> Đang lưu...</> : 'Lưu chữ ký'}
            </button>
          ) : (
            <div style={{ marginTop: 16, background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: '0.84rem', color: '#92400e', marginBottom: 12 }}>Chữ ký điện tử <strong>không thể thay đổi</strong> sau khi lưu. Bạn chắc chắn muốn lưu?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => setSigConfirming(false)}>Hủy</button>
                <button type="button" className="btn-primary" disabled={sigSaving} onClick={onSave}>
                  {sigSaving ? <><FaSpinner className="animate-spin inline" aria-hidden="true" /> Đang lưu...</> : 'Xác nhận lưu'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

export default SignatureTab;