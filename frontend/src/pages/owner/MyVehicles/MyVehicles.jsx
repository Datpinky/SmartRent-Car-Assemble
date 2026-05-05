import React, { useState, useEffect, useCallback, useRef } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import Modal from '../../../components/common/Modal';
import FileUpload from '../../../components/common/FileUpload';
import { FaPlus, FaEdit, FaSpinner, FaExclamationCircle, FaChevronDown } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import vehicleService, { AMENITY_OPTIONS } from '../../../services/vehicleService';
import { useAuth } from '../../../contexts/AuthContext';
import { formatVndPerDay } from '../../../utils/currencyFormat';

// ─── Constants ────────────────────────────────────────────────────────────────

/** SmartRent: chỉ ô tô 4 bánh — không xe máy / xe đạp (đồng bộ backend `vehicle_type`). */
const VEHICLE_TYPES = ['Sedan', 'SUV', 'MPV', 'Hatchback', 'Wagon', 'Truck', 'others'];

/** Mô tả ngắn khi người dùng xem / di chuột qua từng loại (đồng bộ giá trị gửi API). */
const VEHICLE_TYPE_INFO = {
  Sedan:
    'Xe 3 khoang tách bạch (động cơ – cabin – cốp), thường 4 cửa, cốp chờm xuống. Đi phố và công việc rất phổ biến.',
  SUV:
    'Gầm cao hơn sedan, thân to, thường 5 chỗ hoặc 5+2; đi đường xấu tốt hơn, tầm nhìn thoáng (City SUV / SUV cỡ trung…).',
  MPV:
    'Xe đa dụng nhiều chỗ (thường 7 chỗ), ưu tiên không gian hành khách và cửa mở rộng; phù hợp gia đình đông người.',
  Hatchback:
    'Thân ngắn, cốp mở chung với khoang hành khách (cửa sau lớn); linh hoạt trong phố, dễ quay đầu.',
  Wagon:
    'Thân kéo dài kiểu “estate”: giống sedan nhưng cốp nối liền cabin, chở đồ dài / cồng kềnh hơn sedan thường.',
  Truck:
    'Bán tải / xe tải nhẹ 4 bánh (pickup): cabin kép hoặc thùng sau — chở người và hàng; không gồm xe máy hay xe đạp.',
  others:
    'Ô tô 4 bánh không thuộc các nhóm trên (ví dụ lai kiểu), hoặc xe đặc thù — SmartRent không cho thuê xe 2 bánh.',
};
const FUEL_OPTIONS  = [
  { value: 'petrol',   label: 'Xăng' },
  { value: 'diesel',   label: 'Dầu'  },
  { value: 'electric', label: 'Điện' },
  { value: 'hybrid',   label: 'Hybrid' },
  { value: 'others',   label: 'Khác' },
];
const TRANS_OPTIONS = [
  { value: 'automatic', label: 'Số tự động' },
  { value: 'manual',    label: 'Số sàn'     },
  { value: 'semi-auto', label: 'Bán tự động' },
];

const EMPTY_FORM = {
  vehicle_brand: '',
  vehicle_model: '',
  vehicle_plate_number: '',
  vehicle_type: 'Sedan',
  transmission: 'automatic',
  fuel_type: 'petrol',
  /** Chuỗi để tránh `Number('') === 0` khi người dùng xóa hết (input type=number) */
  number_of_seats: '',
  vehicle_hire_rate_in_figures: '',
  vehicle_images_paths: [],
  description: '',
  amenities: [],
};

/** Parse số chỗ gửi API: rỗng → mặc định 5; chỉ chữ số 1–20 */
function parseSeatsForApi(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return 5;
  return Math.min(20, Math.max(1, n));
}

function parsePriceForApi(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

const FieldRow = ({ label, required, children, id }) => (
  <div>
    <label
      htmlFor={id}
      style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}
    >
      {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9,
  padding: '8px 12px', fontSize: '0.85rem', boxSizing: 'border-box',
};
const inputCls = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const selectStyle = { ...inputStyle, background: '#fff' };

function VehicleTypeSelect({ id, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(value);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (open) setHovered(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hint = VEHICLE_TYPE_INFO[hovered] || VEHICLE_TYPE_INFO.others;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        onClick={() => setOpen((o) => !o)}
        className={inputCls}
        style={{
          ...selectStyle,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{value}</span>
        <FaChevronDown
          aria-hidden
          style={{
            opacity: 0.55,
            fontSize: '0.75rem',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>
      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Chọn loại xe"
          style={{
            position: 'absolute',
            zIndex: 80,
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 9,
            boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {VEHICLE_TYPES.map((t, i) => (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={t === value}
                onMouseEnter={() => setHovered(t)}
                onFocus={() => setHovered(t)}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={inputCls}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 12px',
                  fontSize: '0.85rem',
                  border: 'none',
                  borderBottom: i < VEHICLE_TYPES.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background:
                    t === value ? '#f0fdf4' : t === hovered ? '#f9fafb' : '#fff',
                  cursor: 'pointer',
                  color: '#111827',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div
            role="note"
            style={{
              borderTop: '1px solid #e5e7eb',
              padding: '10px 12px',
              background: '#fafafa',
              fontSize: '0.78rem',
              color: '#4b5563',
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: '#111827', fontWeight: 600 }}>{hovered}</span>
            <span style={{ color: '#9ca3af' }}> — </span>
            {hint}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vehicle Form (shared by Add & Edit) ──────────────────────────────────────

const VehicleForm = ({ form, onChange }) => {
  const set = (key, val) => onChange({ ...form, [key]: val });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Row 1: brand + model */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FieldRow label="Thương hiệu (Toyota, VinFast…)" required id="vehicle-brand">
          <input
            id="vehicle-brand"
            name="vehicle_brand"
            autoComplete="off"
            className={inputCls}
            style={inputStyle}
            value={form.vehicle_brand}
            placeholder="Toyota"
            onChange={e => set('vehicle_brand', e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Dòng xe (Camry, VF e34…)" required id="vehicle-model">
          <input
            id="vehicle-model"
            name="vehicle_model"
            autoComplete="off"
            className={inputCls}
            style={inputStyle}
            value={form.vehicle_model}
            placeholder="Camry"
            onChange={e => set('vehicle_model', e.target.value)}
          />
        </FieldRow>
      </div>

      {/* Row 2: plate + type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FieldRow label="Biển số xe" required id="vehicle-plate">
          <input
            id="vehicle-plate"
            name="vehicle_plate_number"
            autoComplete="off"
            className={inputCls}
            style={inputStyle}
            value={form.vehicle_plate_number}
            placeholder="51A-123.45"
            onChange={e => set('vehicle_plate_number', e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Loại xe" id="vehicle-type">
          <VehicleTypeSelect
            id="vehicle-type"
            value={form.vehicle_type}
            onChange={(t) => set('vehicle_type', t)}
          />
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '0.72rem',
              color: '#6b7280',
              lineHeight: 1.45,
            }}
          >
            {' '}
            <strong style={{ color: '#374151' }}>{form.vehicle_type}</strong> —{' '}
            {VEHICLE_TYPE_INFO[form.vehicle_type] || VEHICLE_TYPE_INFO.others}
          </p>
        </FieldRow>
      </div>

      {/* Row 3: transmission + fuel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FieldRow label="Hộp số" id="vehicle-transmission">
          <select
            id="vehicle-transmission"
            name="transmission"
            className={inputCls}
            style={selectStyle}
            value={form.transmission}
            onChange={e => set('transmission', e.target.value)}
          >
            {TRANS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Nhiên liệu" id="vehicle-fuel">
          <select
            id="vehicle-fuel"
            name="fuel_type"
            className={inputCls}
            style={selectStyle}
            value={form.fuel_type}
            onChange={e => set('fuel_type', e.target.value)}
          >
            {FUEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldRow>
      </div>

      {/* Row 4: seats + price — text + inputMode để không có mũi tên tăng/giảm của trình duyệt */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FieldRow label="Số chỗ ngồi" id="vehicle-seats">
          <input
            id="vehicle-seats"
            name="number_of_seats"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={inputCls}
            style={inputStyle}
            value={form.number_of_seats}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
              set('number_of_seats', digits);
            }}
          />
        </FieldRow>
        <FieldRow label="Giá thuê (VNĐ/ngày)" id="vehicle-price">
          <input
            id="vehicle-price"
            name="vehicle_hire_rate_in_figures"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={inputCls}
            style={inputStyle}
            value={form.vehicle_hire_rate_in_figures}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '');
              set('vehicle_hire_rate_in_figures', digits);
            }}
          />
        </FieldRow>
      </div>

      {/* Description */}
      <FieldRow label="Mô tả ngắn gọn (tối đa 500 ký tự)" id="vehicle-description">
        <textarea
          id="vehicle-description"
          name="description"
          rows={3}
          maxLength={500}
          className={inputCls}
          style={{ ...inputStyle, resize: 'vertical' }}
          value={form.description}
          placeholder="Xe đẹp, nội thất sạch sẽ…"
          onChange={e => set('description', e.target.value)}
        />
        <div style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'right' }}>
          <span className="tabular-nums">{form.description.length}</span>/500
        </div>
      </FieldRow>

      <FieldRow label="Tiện nghi" id="vehicle-amenities">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 14px',
            alignItems: 'flex-start',
          }}
        >
          {AMENITY_OPTIONS.map((label) => (
            <label
              key={label}
              htmlFor={`amenity-${label}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.82rem',
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              <input
                id={`amenity-${label}`}
                type="checkbox"
                checked={(form.amenities || []).includes(label)}
                onChange={() => {
                  const cur = new Set(form.amenities || []);
                  if (cur.has(label)) cur.delete(label);
                  else cur.add(label);
                  set('amenities', [...cur]);
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </FieldRow>

      {/* Images */}
      <FieldRow label="Danh sách URL ảnh xe" id="vehicle-images">
        <ImageUrlsEditor
          urls={form.vehicle_images_paths}
          onChange={urls => set('vehicle_images_paths', urls)}
        />
      </FieldRow>
    </div>
  );
};

// Manage image URLs as a list (upload via FileUpload OR paste URL directly)
const ImageUrlsEditor = ({ urls, onChange }) => {
  const handleUpload = (newUrls) => {
    onChange([...urls, ...newUrls]);
  };
  const remove = (idx) => onChange(urls.filter((_, i) => i !== idx));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <FileUpload
        multiple
        maxFiles={6}
        hint="Kéo thả hoặc chọn ảnh xe — sẽ tự upload lên Cloudinary"
        onUpload={handleUpload}
      />
      {urls.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {urls.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
              <img src={url} alt={`Ảnh xe ${i + 1}`}
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <button
                type="button"
                aria-label={`Xóa ảnh ${i + 1}`}
                onClick={() => remove(i)}
                style={{
                  position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer',
                  fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const MyVehicles = () => {
  const { user } = useAuth();

  const [vehicles, setVehicles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Add modal
  const [addModal, setAddModal]   = useState(false);
  const [addForm, setAddForm]     = useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState('');

  // Edit modal
  const [editModal, setEditModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null); // full vehicle object
  const [editForm, setEditForm]       = useState(EMPTY_FORM);
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState('');

  // ── Load vehicles ──────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    setError('');
    try {
      const res = await vehicleService.getList({ added_by: user._id, limit: 100 });
      setVehicles(res.data);
    } catch (e) {
      setError(e.message || 'Không tải được danh sách xe. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  // ── Add handlers ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setAddForm(EMPTY_FORM);
    setAddError('');
    setAddModal(true);
  };

  const handleAdd = async () => {
    if (!addForm.vehicle_brand.trim() || !addForm.vehicle_model.trim() || !addForm.vehicle_plate_number.trim()) {
      setAddError('Vui lòng nhập đủ Thương hiệu, Dòng xe và Biển số xe.');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      const payload = {
        ...addForm,
        number_of_seats: parseSeatsForApi(addForm.number_of_seats),
        vehicle_hire_rate_in_figures: parsePriceForApi(addForm.vehicle_hire_rate_in_figures),
        vehicle_hire_rate_currency: 'VND',
        vehicle_hire_charge_per_timing: 'day',
      };
      const created = await vehicleService.create(payload);
      setVehicles(prev => [created, ...prev]);
      setAddModal(false);
    } catch (e) {
      setAddError(e.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setAddSaving(false);
    }
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────
  const openEdit = (v) => {
    setEditTarget(v);
    setEditForm({
      vehicle_brand: v.brand || '',
      vehicle_model: v.model || '',
      vehicle_plate_number: v.plateNumber || '',
      vehicle_type: v.type || 'Sedan',
      transmission: toApiTransmission(v.transmission),
      fuel_type: toApiFuel(v.fuel),
      number_of_seats:
        v.seats != null && v.seats !== '' && Number(v.seats) >= 1
          ? String(v.seats)
          : '',
      vehicle_hire_rate_in_figures:
        v.price != null && v.price !== '' && Number(v.price) > 0 ? String(v.price) : '',
      vehicle_images_paths: v.images || [],
      description: v.description || '',
      amenities: Array.isArray(v.amenities)
        ? v.amenities.filter((a) => AMENITY_OPTIONS.includes(a))
        : [],
    });
    setEditError('');
    setEditModal(true);
  };

  const handleEdit = async () => {
    if (!editForm.vehicle_brand.trim() || !editForm.vehicle_model.trim()) {
      setEditError('Vui lòng nhập đủ Thương hiệu và Dòng xe.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const payload = {
        ...editForm,
        number_of_seats: parseSeatsForApi(editForm.number_of_seats),
        vehicle_hire_rate_in_figures: parsePriceForApi(editForm.vehicle_hire_rate_in_figures),
      };
      const updated = await vehicleService.update(editTarget._id, payload);
      setVehicles(prev => prev.map(v => v._id === updated._id ? updated : v));
      setEditModal(false);
    } catch (e) {
      setEditError(e.message || 'Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Xe của tôi</h1>
          <p className="page-subtitle">Quản lý và theo dõi các xe đang ký gửi</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAdd}>
          <FaPlus aria-hidden="true" /> Đăng ký ký gửi xe mới
        </button>
      </div>

      <div aria-live="polite">
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <FaSpinner style={{ fontSize: '2rem', color: '#00b14f', animation: 'spin 1s linear infinite' }} aria-label="Đang tải…" />
          </div>
        )}
      </div>

      {!loading && error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16,
          display: 'flex', alignItems: 'center', gap: 10, color: '#b91c1c', fontSize: '0.875rem' }}>
          <FaExclamationCircle aria-hidden="true" /> {error}
          <button
            type="button"
            onClick={loadVehicles}
            style={{ marginLeft: 'auto', background: 'none', border: 'none',
              color: '#b91c1c', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && vehicles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <MdDirectionsCar style={{ fontSize: '3rem', marginBottom: 12 }} aria-hidden="true" />
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#6b7280' }}>Bạn chưa có xe nào được đăng ký</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Nhấn <strong>Đăng ký ký gửi xe mới</strong> để bắt đầu</div>
        </div>
      )}

      {!loading && !error && vehicles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'stretch' }}>
          {vehicles.map(v => (
            <div key={v._id || v.id} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRadius: 16, padding: 18, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                {v.image ? (
                  <img src={v.image} alt={v.name}
                    style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: '#e0f2fe',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  display: v.image ? 'none' : 'flex',
                }}>
                  <MdDirectionsCar style={{ fontSize: '1.8rem', color: '#0891b2' }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{v.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>BKS: {v.plateNumber || '—'}</div>
                  <div style={{ marginTop: 6 }}><StatusBadge status={v.status} /></div>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ flexShrink: 0 }}
                  aria-label="Chỉnh sửa xe"
                  title="Chỉnh sửa"
                  onClick={() => openEdit(v)}
                >
                  <FaEdit aria-hidden="true" />
                </button>
              </div>

              {/* Stats grid */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  ['Showroom', v.showroom || 'Chưa phân bổ'],
                  ['Giá thuê', v.price ? formatVndPerDay(v.price) : '—'],
                  ['Số chỗ', v.seats || '—'],
                  ['Nhiên liệu', v.fuel || '—'],
                ].map(([k, val]) => (
                  <div key={k} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{k}</div>
                    <div style={{
                      fontWeight: 700, fontSize: '0.82rem', color: '#111827', marginTop: 2,
                      ...(k === 'Showroom' ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
                    }} className={k === 'Giá thuê' || k === 'Số chỗ' ? 'tabular-nums' : ''}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Số chuyến</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }} className="tabular-nums">{v.trips || 0}</div>
                </div>
                {v.rating > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Đánh giá</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f59e0b' }} className="tabular-nums">★ {v.rating}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Đăng ký ký gửi xe mới" width={600}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setAddModal(false)} disabled={addSaving}>Hủy</button>
            <button type="button" className="btn-primary" onClick={handleAdd} disabled={addSaving}>
              {addSaving ? <><FaSpinner style={{ marginRight: 6, display: 'inline', animation: 'spin 1s linear infinite' }} aria-hidden="true" />Đang gửi…</> : 'Gửi đăng ký'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, fontSize: '0.8rem', color: '#92400e' }}>
            Sau khi đăng ký, nhân viên SmartRent sẽ liên hệ để kiểm tra xe và ký hợp đồng ký gửi.
          </div>
          {addError && (
            <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#b91c1c', display: 'flex', gap: 8 }}>
              <FaExclamationCircle style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" /> {addError}
            </div>
          )}
          <VehicleForm form={addForm} onChange={setAddForm} />
        </div>
      </Modal>

      {/* ─── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)}
        title={editTarget ? `Chỉnh sửa — ${editTarget.name}` : 'Chỉnh sửa xe'} width={600}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setEditModal(false)} disabled={editSaving}>Hủy</button>
            <button type="button" className="btn-primary" onClick={handleEdit} disabled={editSaving}>
              {editSaving ? <><FaSpinner style={{ marginRight: 6, display: 'inline', animation: 'spin 1s linear infinite' }} aria-hidden="true" />Đang lưu…</> : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editError && (
            <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#b91c1c', display: 'flex', gap: 8 }}>
              <FaExclamationCircle style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" /> {editError}
            </div>
          )}
          <VehicleForm form={editForm} onChange={setEditForm} />
        </div>
      </Modal>
    </div>
  );
};

// ─── Reverse-mapping helpers ───────────────────────────────────────────────────

const FUEL_LABEL_TO_API = { 'Xăng': 'petrol', 'Dầu': 'diesel', 'Điện': 'electric', 'Hybrid': 'hybrid', 'Khác': 'others' };
const TRANS_LABEL_TO_API = { 'Số tự động': 'automatic', 'Số sàn': 'manual', 'Bán tự động': 'semi-auto' };

function toApiFuel(label)  { return FUEL_LABEL_TO_API[label]  || label || 'petrol'; }
function toApiTransmission(label) { return TRANS_LABEL_TO_API[label] || label || 'automatic'; }

export default MyVehicles;
