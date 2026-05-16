import { useEffect, useState } from 'react';
import { FaEdit, FaIdCard, FaSave, FaSpinner, FaUpload } from 'react-icons/fa';
import apiClient from '../../../../services/apiClient';
import profileService from '../../../../services/profileService';
import { ACCEPTED_IMAGE_INPUT_ACCEPT, isAcceptedImageFile } from '../../../../utils/acceptedImageTypes';
import { formatDateInput, LICENSE_CLASS_OPTIONS, LICENSE_STATUS_BADGE } from '../profile.helpers';

const DriverLicenseSection = ({ userId, profile, onSaved }) => {
  const hasLicense = Boolean(profile?.driver_license_number);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [form, setForm] = useState({
    driver_license_number: profile?.driver_license_number || '',
    driver_license_fullname: profile?.driver_license_fullname || '',
    driver_license_dob: formatDateInput(profile?.driver_license_dob),
    driver_license_class: profile?.driver_license_class || '',
    driver_license_expiry: formatDateInput(profile?.driver_license_expiry),
    driver_license_front_image: profile?.driver_license_front_image || '',
    driver_license_back_image: profile?.driver_license_back_image || '',
  });

  useEffect(() => {
    if (!editing) {
      setForm({
        driver_license_number: profile?.driver_license_number || '',
        driver_license_fullname: profile?.driver_license_fullname || '',
        driver_license_dob: formatDateInput(profile?.driver_license_dob),
        driver_license_class: profile?.driver_license_class || '',
        driver_license_expiry: formatDateInput(profile?.driver_license_expiry),
        driver_license_front_image: profile?.driver_license_front_image || '',
        driver_license_back_image: profile?.driver_license_back_image || '',
      });
    }
  }, [profile, editing]);

  const uploadImage = async (file, side) => {
    if (!isAcceptedImageFile(file)) {
      setNotice({ type: 'error', message: 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP. SVG không được hỗ trợ.' });
      return;
    }

    const setter = side === 'front' ? setUploadingFront : setUploadingBack;
    const field = side === 'front' ? 'driver_license_front_image' : 'driver_license_back_image';
    setter(true);
    try {
      const data = new FormData();
      data.append('files', file);
      const res = await apiClient.post('/api/uploads/image/files', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.[0]?.url || res.data?.data?.[0];
      if (!url) throw new Error('Khong nhan duoc URL anh');
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Upload anh that bai' });
    } finally {
      setter(false);
    }
  };

  const handleSave = async () => {
    if (!form.driver_license_number.trim()) {
      setNotice({ type: 'error', message: 'Vui long nhap so giay phep lai xe' });
      return;
    }
    if (!form.driver_license_fullname.trim()) {
      setNotice({ type: 'error', message: 'Vui long nhap ho ten tren GPLX' });
      return;
    }
    if (!form.driver_license_dob) {
      setNotice({ type: 'error', message: 'Vui long nhap ngay sinh' });
      return;
    }
    if (!form.driver_license_front_image || !form.driver_license_back_image) {
      setNotice({ type: 'error', message: 'Vui long tai anh 2 mat GPLX' });
      return;
    }
    setSaving(true);
    setNotice({ type: '', message: '' });
    try {
      const updated = await profileService.updateDriverLicense(userId, form);
      onSaved(updated);
      setEditing(false);
      setNotice({ type: 'success', message: 'Cap nhat giay phep lai xe thanh cong' });
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Khong the cap nhat' });
    } finally {
      setSaving(false);
    }
  };

  const badge = LICENSE_STATUS_BADGE[profile?.driver_license_status] ?? LICENSE_STATUS_BADGE.none;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="profile-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaIdCard style={{ color: '#00b14f' }} />
          Giấy phép lái xe
          <span
            style={{
              background: badge.background,
              color: badge.color,
              borderRadius: 999,
              padding: '2px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginLeft: 6,
            }}
          >
            {badge.label}
          </span>
        </h3>
        {!editing && profile?.driver_license_status !== 'approved' && (
          <button
            className="btn-outline"
            type="button"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            onClick={() => {
              setEditing(true);
              setNotice({ type: '', message: '' });
            }}
          >
            <FaEdit style={{ marginRight: 4 }} />
            {hasLicense ? 'Chỉnh sửa' : 'Thêm GPLX'}
          </button>
        )}
      </div>

      {notice.message && (
        <div
          style={{
            ...(notice.type === 'success'
              ? { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }
              : notice.type === 'error'
                ? { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }
                : { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }),
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: '0.82rem',
          }}
        >
          {notice.message}
        </div>
      )}

      {!editing && profile?.driver_license_status === 'approved' && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: '0.82rem',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: '1rem' }}>🔒</span>
          <span>
            Giấy phép lái xe đã được xác minh và <strong>không thể chỉnh sửa</strong>. Nếu cần cập nhật, vui lòng liên
            hệ Admin.
          </span>
        </div>
      )}

      {!editing && hasLicense && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['So GPLX', profile.driver_license_number],
            ['Ho ten tren GPLX', profile.driver_license_fullname || 'Chua cap nhat'],
            ['Ngay sinh', formatDateInput(profile.driver_license_dob) || 'Chua cap nhat'],
            ['Hang GPLX', profile.driver_license_class || 'Chua cap nhat'],
            ['Ngay het han', formatDateInput(profile.driver_license_expiry) || 'Chua cap nhat'],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="form-label">{label}</div>
              <div className="form-input" style={{ background: '#f9fafb' }}>
                {value}
              </div>
            </div>
          ))}
          <div />
          {profile.driver_license_front_image && (
            <div>
              <div className="form-label">Mặt trước GPLX</div>
              <img
                src={profile.driver_license_front_image}
                alt="Mặt trước GPLX"
                style={{ width: '100%', maxWidth: 200, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
          )}
          {profile.driver_license_back_image && (
            <div>
              <div className="form-label">Mặt sau GPLX</div>
              <img
                src={profile.driver_license_back_image}
                alt="Mặt sau GPLX"
                style={{ width: '100%', maxWidth: 200, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
          )}
        </div>
      )}

      {!editing && !hasLicense && (
        <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '12px 0' }}>
          Bạn chưa cung cấp thông tin giấy phép lái xe. Hãy thêm để có thể đặt xe.
        </div>
      )}

      {!editing &&
        hasLicense &&
        profile?.driver_license_status === 'rejected' &&
        profile?.driver_license_reject_reason && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: '0.82rem',
              color: '#991b1b',
              marginBottom: 4,
            }}
          >
            <strong>Lý do từ chối:</strong> {profile.driver_license_reject_reason}
            <div style={{ marginTop: 4, color: '#b91c1c' }}>Vui lòng chỉnh sửa và nộp lại GPLX để được xét duyệt.</div>
          </div>
        )}

      {!editing && hasLicense && profile?.driver_license_status === 'pending' && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#92400e',
            marginBottom: 4,
          }}
        >
          GPLX của bạn đang chờ admin xác minh. Bạn chưa thể đặt xe cho đến khi được duyệt.
        </div>
      )}

      {editing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="form-label">Số GPLX *</label>
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={form.driver_license_number}
                onChange={(e) => setForm((p) => ({ ...p, driver_license_number: e.target.value }))}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                placeholder="Nhập số GPLX"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Họ tên trên GPLX *</label>
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={form.driver_license_fullname}
                onChange={(e) => setForm((p) => ({ ...p, driver_license_fullname: e.target.value }))}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
                placeholder="Họ tên đầy đủ"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Ngày sinh *</label>
            <div className="form-input">
              <input
                type="date"
                value={form.driver_license_dob}
                onChange={(e) => setForm((p) => ({ ...p, driver_license_dob: e.target.value }))}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Hạng bằng lái</label>
            <div className="form-input">
              <select
                value={form.driver_license_class}
                onChange={(e) => setForm((p) => ({ ...p, driver_license_class: e.target.value }))}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
              >
                <option value="">-- Chọn hạng --</option>
                {LICENSE_CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Ngày hết hạn</label>
            <div className="form-input">
              <input
                type="date"
                value={form.driver_license_expiry}
                onChange={(e) => setForm((p) => ({ ...p, driver_license_expiry: e.target.value }))}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%' }}
              />
            </div>
          </div>
          <div />
          {['front', 'back'].map((side) => {
            const field = `driver_license_${side}_image`;
            const uploading = side === 'front' ? uploadingFront : uploadingBack;
            const label =
              side === 'front'
                ? 'Ảnh đối chiếu mặt trước Giấy phép lái xe *'
                : 'Ảnh đối chiếu mặt sau Giấy phép lái xe *';
            return (
              <div key={side}>
                <label className="form-label">{label}</label>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    border: '2px dashed #d1fae5',
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    background: '#f9fafb',
                    minHeight: 100,
                  }}
                >
                  {form[field] ? (
                    <img src={form[field]} alt={label} style={{ maxHeight: 80, borderRadius: 6, objectFit: 'cover' }} />
                  ) : uploading ? (
                    <FaSpinner className="animate-spin" style={{ color: '#00b14f', fontSize: '1.4rem' }} />
                  ) : (
                    <>
                      <FaUpload style={{ color: '#00b14f', fontSize: '1.2rem' }} />
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Chọn ảnh</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadImage(e.target.files[0], side);
                    }}
                  />
                </label>
              </div>
            );
          })}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              className="btn-primary"
              type="button"
              onClick={handleSave}
              disabled={saving || uploadingFront || uploadingBack}
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Lưu GPLX
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => {
                setEditing(false);
                setNotice({ type: '', message: '' });
              }}
              disabled={saving}
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverLicenseSection;
