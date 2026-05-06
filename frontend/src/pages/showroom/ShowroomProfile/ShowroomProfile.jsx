import React, { useState, useEffect, useCallback, useRef } from 'react';
import FileUpload from '../../../components/common/FileUpload';
import CarLocationMap from '../../../components/Map/CarLocationMap';
import { FaSave, FaMapMarkerAlt, FaSpinner, FaLocationArrow } from 'react-icons/fa';
import authService from '../../../services/authService';
import profileService from '../../../services/profileService';
import mapService from '../../../services/mapService';
import userLocationService from '../../../services/userLocationService';
import { useAuth } from '../../../contexts/AuthContext';

const formatCoordinates = (latitude, longitude) =>
  `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;

const FIELD_INPUT_STYLE = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  width: '100%',
};

const parseCoordinateAddress = (value) => {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const hasValidCoordinates = (location) =>
  Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));

const ShowroomProfile = () => {
  const { user, updateUser } = useAuth();
  const userId = user?._id || user?.id || '';

  const [form, setForm] = useState({
    business_name: '',
    showroom_representative_name: '',
    phone: '',
    email: '',
    public_address: '',
    showroom_description: '',
    opening_hours: '',
    showroom_license_public: '',
    policy_text: '',
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [mapLocation, setMapLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const addressInputRef = useRef(null);
  const updateUserRef = useRef(updateUser);
  updateUserRef.current = updateUser;

  const applyStoredLocation = useCallback((userLocation, addressOverride = '') => {
    const latitude = Number(userLocation?.latitude);
    const longitude = Number(userLocation?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    setLoadingLocation(false);
    setMapLocation({
      address: addressOverride || userLocation?.address || '',
      latitude,
      longitude,
      plusCode: userLocation?.plusCode || '',
    });
    return true;
  }, []);

  const resolveAddressLocation = useCallback(async (address, fallbackLocation = null) => {
    const nextAddress = String(address || '').trim();
    const parsed = parseCoordinateAddress(nextAddress);
    if (parsed) {
      setLoadingLocation(false);
      return {
        address: nextAddress,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        plusCode: '',
      };
    }
    if (nextAddress.length >= 4) {
      try {
        setLoadingLocation(true);
        const results = await mapService.directForwardGeocode(nextAddress, { limit: 1 });
        const best = results[0];
        if (best) {
          return {
            address: nextAddress,
            latitude: best.lat,
            longitude: best.lng,
            plusCode: best.plusCode || '',
          };
        }
      } catch {
        /* noop */
      } finally {
        setLoadingLocation(false);
      }
    } else {
      setLoadingLocation(false);
    }

    if (hasValidCoordinates(fallbackLocation)) {
      return {
        address: nextAddress || fallbackLocation?.address || '',
        latitude: Number(fallbackLocation.latitude),
        longitude: Number(fallbackLocation.longitude),
        plusCode: fallbackLocation.plusCode || '',
      };
    }
    return null;
  }, []);

  const hydrateMapFromProfile = useCallback(
    async (profileData) => {
      const nextAddress = String(
        profileData?.public_address || profileData?.address || ''
      ).trim();
      const resolved = await resolveAddressLocation(nextAddress, profileData?.userLocation);
      if (resolved) {
        setMapLocation(resolved);
        return;
      }
      if (applyStoredLocation(profileData?.userLocation, nextAddress)) return;
      setMapLocation(null);
    },
    [applyStoredLocation, resolveAddressLocation]
  );

  const hydrate = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError('');
    try {
      const profile = await profileService.getProfileById(userId);
      if (profile) {
        setForm({
          business_name: profile.business_name || '',
          showroom_representative_name: profile.showroom_representative_name || '',
          phone: profile.phone || '',
          email: profile.email || '',
          public_address: profile.public_address || profile.address || '',
          showroom_description: profile.showroom_description || '',
          opening_hours: profile.opening_hours || '',
          showroom_license_public: profile.showroom_license_public || '',
          policy_text: profile.policy_text || '',
          logo_url: profile.logo_url || '',
        });
        await hydrateMapFromProfile(profile);
        const forAuth = authService.mapUser({
          ...profile,
          userLocation: profile.userLocation,
        });
        if (forAuth) updateUserRef.current(forAuth);
      }
    } catch (e) {
      setLoadError(e.message || 'Không tải được hồ sơ');
    } finally {
      setLoading(false);
    }
  }, [userId, hydrateMapFromProfile]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const normalized = String(form.public_address || '').trim();
    if (
      !normalized ||
      normalized.length < 3 ||
      parseCoordinateAddress(normalized) ||
      normalized === mapLocation?.address
    ) {
      setAddressSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingSuggestions(true);
    const t = window.setTimeout(() => {
      mapService
        .directAutocomplete(normalized, { limit: 5 })
        .then((items) => {
          if (!cancelled) setAddressSuggestions(items || []);
        })
        .catch(() => {
          if (!cancelled) setAddressSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingSuggestions(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [form.public_address, mapLocation?.address]);

  const handlePublicAddressChange = (value) => {
    const parsed = parseCoordinateAddress(value);
    setForm((f) => ({ ...f, public_address: value }));
    if (parsed) {
      setLoadingLocation(false);
      setMapLocation({
        address: value,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        plusCode: '',
      });
      setAddressSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    if (!suggestion?.address) return;
    setLoadingLocation(false);
    setForm((f) => ({ ...f, public_address: suggestion.address }));
    setAddressSuggestions([]);
    setMapLocation({
      address: suggestion.address,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      plusCode: suggestion.plusCode || '',
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const addr = formatCoordinates(latitude, longitude);
        setForm((f) => ({ ...f, public_address: addr }));
        setAddressSuggestions([]);
        setMapLocation({ address: addr, latitude, longitude, plusCode: '' });
        setLoadingLocation(false);
      },
      () => setLoadingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    setLoadError('');
    try {
      const digits = String(form.phone).replace(/\D/g, '');
      const trimmedAddr = String(form.public_address || '').trim();

      const currentAddr = String(user?.userLocation?.address || user?.address || '').trim();
      const shouldReuse =
        trimmedAddr && trimmedAddr === currentAddr && hasValidCoordinates(user?.userLocation);
      let resolved =
        trimmedAddr &&
        hasValidCoordinates(mapLocation) &&
        mapLocation.address === trimmedAddr
          ? mapLocation
          : null;
      if (trimmedAddr && !resolved) {
        resolved = await resolveAddressLocation(
          trimmedAddr,
          shouldReuse ? user?.userLocation : null
        );
      }

      const payload = {
        business_name: form.business_name,
        showroom_representative_name: form.showroom_representative_name,
        public_address: trimmedAddr,
        showroom_description: form.showroom_description,
        opening_hours: form.opening_hours,
        showroom_license_public: form.showroom_license_public,
        policy_text: form.policy_text,
        logo_url: form.logo_url,
        address: trimmedAddr,
        showroom_address: trimmedAddr,
      };
      if (digits.length === 10) payload.phone = digits;

      await authService.updateProfile(payload);

      if (trimmedAddr && resolved && Number.isFinite(resolved.latitude)) {
        await userLocationService.upsert(userId, {
          address: trimmedAddr,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          plus_code: resolved.plusCode || null,
        });
        setMapLocation(resolved);
      } else if (!trimmedAddr) {
        await userLocationService.remove(userId);
        setMapLocation(null);
      }

      const refreshed = await profileService.getProfileById(userId);
      if (refreshed) {
        const mapped = authService.mapUser({
          _id: refreshed._id,
          id: refreshed.id,
          name: refreshed.name,
          email: refreshed.email,
          role: refreshed.backendRole || refreshed.role,
          backendRole: refreshed.backendRole,
          phone: refreshed.phone,
          showroom_status: refreshed.showroom_status,
          business_name: refreshed.business_name,
          address: refreshed.address,
          userLocation: refreshed.userLocation,
          tax_code: refreshed.tax_code,
          public_address: refreshed.public_address,
          opening_hours: refreshed.opening_hours,
          policy_text: refreshed.policy_text,
          logo_url: refreshed.logo_url,
          showroom_description: refreshed.showroom_description,
          showroom_representative_name: refreshed.showroom_representative_name,
          showroom_license_public: refreshed.showroom_license_public,
          license_document_urls: refreshed.license_document_urls,
        });
        if (mapped) updateUser(mapped);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setLoadError(e.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const displayName = form.business_name || user?.business_name || user?.name || 'Showroom';
  const initials = String(displayName).trim().slice(0, 1).toUpperCase() || 'S';
  const statusLabel =
    user?.showroom_status === 'approved'
      ? 'Đã xác minh'
      : user?.showroom_status === 'pending'
        ? 'Chờ duyệt'
        : user?.showroom_status === 'rejected'
          ? 'Bị từ chối'
          : '';

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Hồ sơ Showroom</h1>
          <p className="page-subtitle">Quản lý thông tin hiển thị và chính sách showroom</p>
        </div>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? <FaSpinner className="animate-spin inline" aria-hidden="true" /> : <FaSave aria-hidden="true" />}{' '}
          {saved ? 'Đã lưu!' : 'Lưu thay đổi'}
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4" role="alert">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FaSpinner className="animate-spin text-primary text-xl" aria-hidden="true" />
          <span>Đang tải hồ sơ…</span>
        </div>
      ) : (
        <>
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 16,
              padding: 24,
              color: '#fff',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt=""
                width={72}
                height={72}
                className="rounded-[18px] object-cover shrink-0 border-2 border-white/20"
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: '#00b14f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {displayName}
                <FaMapMarkerAlt aria-hidden="true" className="shrink-0" style={{ fontSize: '0.9rem', opacity: 0.85 }} />
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: 4 }}>
                {form.public_address || 'Chưa có địa chỉ công khai'}
              </div>
              {statusLabel && (
                <div className="mt-2 text-[0.8rem]">
                  <span className="bg-primary px-2.5 py-0.5 rounded-full font-bold text-white">{statusLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 4,
              background: '#f3f4f6',
              borderRadius: 10,
              padding: 4,
              marginBottom: 20,
              width: 'fit-content',
            }}
          >
            {[
              ['info', 'Thông tin cơ bản'],
              ['location', 'Địa điểm & bản đồ'],
              ['policy', 'Chính sách'],
              ['logo', 'Logo & Hình ảnh'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === key ? '#fff' : 'transparent',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  color: activeTab === key ? '#111827' : '#6b7280',
                  cursor: 'pointer',
                  boxShadow: activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f0f0f0' }}>
            {activeTab === 'info' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['Tên showroom (hiển thị)', 'business_name'],
                    ['Người đại diện', 'showroom_representative_name'],
                    ['Số điện thoại (10 số)', 'phone'],
                    ['Email', 'email'],
                    ['Giờ mở cửa', 'opening_hours'],
                    ['Giấy phép / GPKD (công khai)', 'showroom_license_public'],
                  ].map(([label, key]) => (
                    <div key={key} style={key === 'email' ? { gridColumn: 'span 1' } : {}}>
                      <label htmlFor={`sp-${key}`} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                        {label}
                      </label>
                      <input
                        id={`sp-${key}`}
                        value={form[key]}
                        readOnly={key === 'email'}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{
                          width: '100%',
                          border: '1.5px solid #e5e7eb',
                          borderRadius: 9,
                          padding: '9px 12px',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                          ...(key === 'email' ? { background: '#f9fafb', color: '#6b7280' } : {}),
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="sp-description" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                      Mô tả ngắn
                    </label>
                    <textarea
                      id="sp-description"
                      value={form.showroom_description}
                      onChange={(e) => setForm((f) => ({ ...f, showroom_description: e.target.value }))}
                      rows={3}
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Địa chỉ công khai (hiển thị cho khách)</div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 9,
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        background: '#fafafa',
                      }}
                    >
                      <span style={{ color: form.public_address ? '#111827' : '#9ca3af', flex: 1 }}>
                        {form.public_address || 'Chưa nhập — mở tab Địa điểm & bản đồ để nhập địa chỉ hoặc ghim GPS.'}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg border border-primary bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-primary hover:bg-primary-light"
                        onClick={() => setActiveTab('location')}
                      >
                        Nhập / chỉnh địa chỉ
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {activeTab === 'location' && (
              <>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                  Nhập địa chỉ showroom (gợi ý khi gõ), chọn từ danh sách, hoặc dùng nút GPS. Bản đồ cập nhật theo lựa chọn; nhấn <strong>Lưu thay đổi</strong> ở đầu trang để ghi vào hệ thống.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="sp-address" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                    Địa chỉ showroom công khai
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 9,
                        padding: '9px 12px',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        background: '#fff',
                      }}
                      className="focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-shadow"
                    >
                      <span style={{ color: '#6b7280', flexShrink: 0 }} aria-hidden="true">
                        <FaMapMarkerAlt />
                      </span>
                      <input
                        ref={addressInputRef}
                        id="sp-address"
                        type="text"
                        autoComplete="off"
                        value={form.public_address}
                        onChange={(e) => handlePublicAddressChange(e.target.value)}
                        placeholder="Ví dụ: 135 Điện Biên Phủ, Đà Nẵng"
                        style={FIELD_INPUT_STYLE}
                      />
                      <button
                        type="button"
                        title="Lấy vị trí hiện tại"
                        aria-label="Lấy vị trí hiện tại"
                        onClick={handleUseCurrentLocation}
                        disabled={loadingLocation}
                        className="rounded-md p-1.5 text-primary hover:bg-primary-light disabled:opacity-50 shrink-0"
                      >
                        {loadingLocation ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaLocationArrow aria-hidden="true" />}
                      </button>
                    </div>
                    {(loadingSuggestions || addressSuggestions.length > 0) && (
                      <div
                        className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                        role="listbox"
                      >
                        {loadingSuggestions && (
                          <div className="flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-500">
                            <FaSpinner className="animate-spin" aria-hidden="true" /> Đang tìm gợi ý địa chỉ…
                          </div>
                        )}
                        {!loadingSuggestions &&
                          addressSuggestions.map((s) => (
                            <button
                              key={`${s.lat}-${s.lng}-${s.address}`}
                              type="button"
                              role="option"
                              className="block w-full px-3 py-2 text-left text-[0.8rem] text-gray-700 hover:bg-primary-light focus:bg-primary-light focus:outline-none"
                              onClick={() => handleSelectSuggestion(s)}
                            >
                              {s.address}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <h3 className="profile-section-title" style={{ marginBottom: 12 }}>
                    Vị trí của bạn
                  </h3>
                  {loadingLocation ? (
                    <div
                      style={{
                        minHeight: 280,
                        borderRadius: 16,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                        gap: 8,
                      }}
                    >
                      <FaSpinner className="animate-spin" aria-hidden="true" />
                      Đang lấy địa chỉ…
                    </div>
                  ) : mapLocation ? (
                    <CarLocationMap
                      locationText={mapLocation.address || form.public_address}
                      lat={mapLocation.latitude}
                      lng={mapLocation.longitude}
                      plusCode={mapLocation.plusCode}
                      openMapLabel="Mở trong map"
                      mapHeight={360}
                    />
                  ) : (
                    <div
                      style={{
                        minHeight: 280,
                        borderRadius: 16,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        color: '#9ca3af',
                        padding: 24,
                      }}
                    >
                      Nhập địa chỉ ở ô phía trên hoặc bật GPS để hiển thị bản đồ.
                    </div>
                  )}
                </div>
              </>
            )}
            {activeTab === 'policy' && (
              <div>
                <label htmlFor="sp-policy" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Nội dung chính sách (đặt cọc, hủy chuyến, phụ phí…)
                </label>
                <textarea
                  id="sp-policy"
                  value={form.policy_text}
                  onChange={(e) => setForm((f) => ({ ...f, policy_text: e.target.value }))}
                  rows={12}
                  placeholder="Nhập chính sách hiển thị cho khách hàng…"
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            )}
            {activeTab === 'logo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.9rem', color: '#111827' }}>URL logo (hoặc tải ảnh)</div>
                  <input
                    id="sp-logo-url"
                    value={form.logo_url}
                    onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                    placeholder="https://…"
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: 12 }}
                  />
                  <FileUpload
                    label="Tải logo lên"
                    hint="PNG, JPG — tối đa 5 ảnh; ảnh đầu dùng làm logo"
                    maxFiles={1}
                    onUpload={(urls) => {
                      if (urls && urls[0]) setForm((f) => ({ ...f, logo_url: urls[0] }));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ShowroomProfile;
