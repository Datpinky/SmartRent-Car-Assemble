import React, { useState } from 'react';
import {
  FaAmbulance,
  FaCar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaPhone,
  FaSpinner,
} from 'react-icons/fa';
import { MdFireTruck, MdLocalPolice } from 'react-icons/md';
import FileUpload from '../../../components/common/FileUpload';
import { useAuth } from '../../../contexts/AuthContext';
import contactService from '../../../services/contactService';

const INCIDENT_TYPES = [
  { id: 'accident', label: 'Tai nạn giao thông', icon: <FaCar aria-hidden="true" />, color: '#dc2626' },
  { id: 'breakdown', label: 'Xe hỏng/chết máy', icon: <FaCar aria-hidden="true" />, color: '#d97706' },
  { id: 'flat', label: 'Xịt lốp/thủng xe', icon: <FaCar aria-hidden="true" />, color: '#d97706' },
  { id: 'lock', label: 'Khóa của xe/mất chìa', icon: <FaCar aria-hidden="true" />, color: '#7c3aed' },
  { id: 'other', label: 'Sự cố khác', icon: <FaExclamationTriangle aria-hidden="true" />, color: '#6b7280' },
];

const HOTLINES = [
  { label: 'SmartRent Hỗ trợ', number: '1900 1234', icon: <FaPhone aria-hidden="true" />, color: '#87ceeb', desc: '24/7 - Miễn phí' },
  { label: 'Cấp cứu', number: '115', icon: <FaAmbulance aria-hidden="true" />, color: '#dc2626', desc: 'Khẩn cấp y tế' },
  { label: 'Cảnh sát', number: '113', icon: <MdLocalPolice aria-hidden="true" />, color: '#2563eb', desc: 'Tai nạn, sự cố' },
  { label: 'Cứu hỏa', number: '114', icon: <MdFireTruck aria-hidden="true" />, color: '#d97706', desc: 'Cháy nổ' },
];

const textStyle = {
  alert: {
    padding: '10px 12px',
    borderRadius: 10,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontSize: '0.82rem',
    marginBottom: 12,
  },
};

const trimBody = (value) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 100);
const formatCoordinates = (latitude, longitude) => `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

const SOSReport = () => {
  const { user } = useAuth();
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [locationShared, setLocationShared] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);
  const [sceneImageUrls, setSceneImageUrls] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedIncident = INCIDENT_TYPES.find((item) => item.id === incidentType);

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setLocationShared(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const address = formatCoordinates(latitude, longitude);

        setLocationInfo({ latitude, longitude, address });
        setLocationShared(true);
      },
      () => setLocationShared(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    if (!incidentType || submitting) return;

    const name = user?.name || 'Renter SmartRent';
    const email = user?.email || '';

    if (!email) {
      setSubmitError('Tài khoản chưa có email hợp lệ để gửi yêu cầu hỗ trợ.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const locationText = locationInfo?.address || (locationShared ? 'Đã chia sẻ vị trí' : 'Chưa chia sẻ vị trí');
      const photoText = sceneImageUrls.length > 0 ? `${sceneImageUrls.length} anh` : 'chua co anh';
      const body = trimBody(`${selectedIncident?.label || incidentType}. ${locationText}. ${photoText}. ${description || 'Cần hỗ trợ gấp.'}`);

      await contactService.create({
        title: `SOS ${selectedIncident?.label || incidentType}`,
        body,
        name,
        email,
      });

      setSubmitted(true);
    } catch (error) {
      setSubmitError(error.message || 'Không thể gửi báo cáo sự cố. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="sos-page" aria-live="polite">
        <div className="sos-success">
          <div className="sos-success-icon"><FaCheckCircle aria-hidden="true" /></div>
          <h2>Bao cao da duoc gui</h2>
          <p>Doi ho tro SmartRent da nhan duoc bao cao cua ban va se lien he trong vong <b>5 phut</b>.</p>
          <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
            {[
              ['Ma bao cao', `SOS${Date.now().toString().slice(-6)}`],
              ['Loai su co', selectedIncident?.label || incidentType],
              ['Thoi gian', new Date().toLocaleString('vi-VN')],
              ['Trang thai', 'Dang xu ly'],
            ].map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem', gap: 12 }}>
                <span style={{ color: '#9ca3af' }}>{key}</span>
                <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>
          <div className="hotline-grid">
            {HOTLINES.map((hotline) => (
              <a key={hotline.label} href={`tel:${hotline.number}`} className="hotline-card" style={{ borderColor: `${hotline.color}40`, background: `${hotline.color}08` }}>
                <div className="hotline-icon" style={{ color: hotline.color, background: `${hotline.color}15` }}>{hotline.icon}</div>
                <div className="hotline-label">{hotline.label}</div>
                <div className="hotline-number" style={{ color: hotline.color }}>{hotline.number}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sos-page">
      <div className="sos-header">
        <div className="sos-header-icon"><FaExclamationTriangle aria-hidden="true" /></div>
        <div>
          <h1 className="sos-title">Báo cáo sự cố khẩn cấp</h1>
          <p className="sos-sub">Hotline hỗ trợ 24/7: <a href="tel:19001234" className="sos-phone">1900 1234</a></p>
        </div>
      </div>

      <div className="hotline-grid" style={{ marginBottom: 24 }}>
        {HOTLINES.map((hotline) => (
          <a key={hotline.label} href={`tel:${hotline.number}`} className="hotline-card" style={{ borderColor: `${hotline.color}40`, background: `${hotline.color}08` }}>
            <div className="hotline-icon" style={{ color: hotline.color, background: `${hotline.color}15` }}>{hotline.icon}</div>
            <div className="hotline-label">{hotline.label}</div>
            <div className="hotline-number" style={{ color: hotline.color }}>{hotline.number}</div>
            <div className="hotline-desc">{hotline.desc}</div>
          </a>
        ))}
      </div>

      <div className="sos-form-card">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 16 }}>Gửi báo cáo sự cố</h3>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label" id="incident-type-label">Loại sự cố *</label>
          <div
            role="radiogroup"
            aria-labelledby="incident-type-label"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}
          >
            {INCIDENT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={incidentType === type.id}
                onClick={() => setIncidentType(type.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `2px solid ${incidentType === type.id ? type.color : '#e5e7eb'}`,
                  background: incidentType === type.id ? `${type.color}10` : '#fff',
                  color: incidentType === type.id ? type.color : '#374151',
                  fontWeight: incidentType === type.id ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                }}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label" htmlFor="sos-description">Mô tả sự cố</label>
          <textarea
            id="sos-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Mô tả ngắn gọn tình huống, vị trí, tình trạng xe..."
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '10px 12px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Chia sẻ vị trí</label>
          {!locationShared ? (
            <button
              type="button"
              onClick={shareLocation}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <FaMapMarkerAlt aria-hidden="true" /> Chia sẻ vị trí hiện tại
            </button>
          ) : (
            <div style={{ display: 'grid', gap: 6, padding: '10px 16px', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10, color: '#0284c7', fontSize: '0.85rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaCheckCircle aria-hidden="true" /> Đã chia sẻ vị trí
              </div>
              {locationInfo?.address && (
                <div style={{ color: '#475569', fontWeight: 500, lineHeight: 1.45 }}>
                  {locationInfo.address}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <FileUpload
            label="Ảnh hiện trường"
            multiple
            maxFiles={5}
            hint="Chụp ảnh xe, vết và chạm, biển báo khu vực"
            onUpload={setSceneImageUrls}
          />
        </div>

        {submitError && <div style={textStyle.alert}>{submitError}</div>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!incidentType || submitting}
          style={{ width: '100%', padding: '13px 0', background: incidentType && !submitting ? '#dc2626' : '#e5e7eb', color: incidentType && !submitting ? '#fff' : '#9ca3af', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.95rem', cursor: incidentType && !submitting ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {submitting ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaExclamationTriangle aria-hidden="true" />}
          {submitting ? 'Đang gửi báo cáo...' : 'Gửi báo cáo sự cố'}
        </button>
      </div>
    </div>
  );
};

export default SOSReport;
