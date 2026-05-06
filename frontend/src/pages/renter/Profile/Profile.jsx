import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaEdit, FaLocationArrow, FaMapMarkerAlt, FaSave, FaSpinner, FaUser } from 'react-icons/fa';
import { MdAlternateEmail, MdInfoOutline, MdPhoneIphone } from 'react-icons/md';
import CarLocationMap from '../../../components/Map/CarLocationMap';
import { useAuth } from '../../../contexts/AuthContext';
import mapService from '../../../services/mapService';
import profileService from '../../../services/profileService';

const ROLE_LABELS = {
  renter: 'Khách thuê',
  showroom: 'Showroom',
  admin: 'Quản trị',
};

const buildInitialForm = (user) => ({
  name: user?.name || '',
  phone: user?.phone || '',
  address: user?.address || '',
});

const FIELD_INPUT_STYLE = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  width: '100%',
};

const noticeStyles = {
  success: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
  },
  warning: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    color: '#92400e',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
  },
};

const formatCoordinates = (latitude, longitude) => `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

const parseCoordinateAddress = (value) => {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const hasValidCoordinates = (location) =>
  Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));

const Profile = () => {
  const { user, updateUser } = useAuth();
  const authUserId = user?._id || user?.id || '';
  const [profile, setProfile] = useState(() => profileService.mapProfileUser(user));
  const fallbackProfileRef = useRef(profileService.mapProfileUser(user));

  const activeUser = useMemo(
    () => (profile?._id ? profile : profileService.mapProfileUser(user)),
    [profile, user]
  );
  const userId = activeUser?._id || activeUser?.id || authUserId || '';

  const [form, setForm] = useState(buildInitialForm(activeUser));
  const [savedAddress, setSavedAddress] = useState(activeUser?.address || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mapLocation, setMapLocation] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });

  const initials = useMemo(
    () => activeUser?.name?.split(' ').map((word) => word[0]).slice(-2).join('').toUpperCase() || 'U',
    [activeUser?.name]
  );

  const applyStoredLocation = useCallback((userLocation, addressOverride = '') => {
    const latitude = Number(userLocation?.latitude);
    const longitude = Number(userLocation?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return false;
    }

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
    const parsedCoordinates = parseCoordinateAddress(nextAddress);
    if (parsedCoordinates) {
      setLoadingLocation(false);
      return {
        address: nextAddress,
        latitude: parsedCoordinates.latitude,
        longitude: parsedCoordinates.longitude,
        plusCode: '',
      };
    }

    if (nextAddress.length >= 4) {
      try {
        setLoadingLocation(true);
        const results = await mapService.directForwardGeocode(nextAddress, { limit: 1 });
        const bestMatch = results[0];
        if (bestMatch) {
          return {
            address: nextAddress,
            latitude: bestMatch.lat,
            longitude: bestMatch.lng,
            plusCode: bestMatch.plusCode || '',
          };
        }
      } catch {
        // Fall back to stored coordinates if direct geocode is unavailable.
      } finally {
        setLoadingLocation(false);
      }
    }

    setLoadingLocation(false);
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

  const hydrateProfileLocation = useCallback(async (profileData) => {
    const nextAddress = String(profileData?.address || '').trim();
    const resolvedLocation = await resolveAddressLocation(nextAddress, profileData?.userLocation);

    if (resolvedLocation) {
      setMapLocation(resolvedLocation);
      return;
    }

    if (applyStoredLocation(profileData?.userLocation, nextAddress)) {
      return;
    }

    setMapLocation(null);
  }, [applyStoredLocation, resolveAddressLocation]);

  useEffect(() => {
    fallbackProfileRef.current = profileService.mapProfileUser(user);
  }, [user]);

  useEffect(() => {
    if (!authUserId) {
      setProfile(fallbackProfileRef.current);
      setSavedAddress('');
      setLoadingProfile(false);
      setMapLocation(null);
      return;
    }

    let mounted = true;
    setLoadingProfile(true);

    profileService.getProfileById(authUserId)
      .then(async (nextProfile) => {
        if (!mounted) {
          return;
        }

        const resolvedProfile = nextProfile || fallbackProfileRef.current;
        setProfile(resolvedProfile);
        setSavedAddress(resolvedProfile.address || '');
        updateUser(resolvedProfile);
        hydrateProfileLocation(resolvedProfile);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setProfile(fallbackProfileRef.current);
        setNotice({
          type: 'error',
          message: error.message || 'Không thể tải hồ sơ',
        });
      })
      .finally(() => {
        if (mounted) {
          setLoadingProfile(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [authUserId, hydrateProfileLocation, updateUser]);

  useEffect(() => {
    if (!isEditing) {
      setForm({
        ...buildInitialForm(activeUser),
        address: savedAddress || activeUser?.address || '',
      });
      setAddressSuggestions([]);
      setLoadingSuggestions(false);
    }
  }, [activeUser, isEditing, savedAddress]);

  useEffect(() => {
    if (!isEditing) {
      setAddressSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    const normalizedAddress = String(form.address || '').trim();
    if (
      !normalizedAddress
      || normalizedAddress.length < 3
      || parseCoordinateAddress(normalizedAddress)
      || normalizedAddress === mapLocation?.address
    ) {
      setAddressSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingSuggestions(true);

    const timeoutId = window.setTimeout(() => {
      mapService.directAutocomplete(normalizedAddress, { limit: 5 })
        .then((items) => {
          if (!cancelled) {
            setAddressSuggestions(items || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAddressSuggestions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingSuggestions(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [form.address, isEditing, mapLocation?.address]);

  const handleChange = (field, value) => {
    if (field === 'address') {
      const parsedCoordinates = parseCoordinateAddress(value);
      setMapLocation(parsedCoordinates
        ? {
          address: value,
          latitude: parsedCoordinates.latitude,
          longitude: parsedCoordinates.longitude,
          plusCode: '',
        }
        : null);
      if (parsedCoordinates) {
        setAddressSuggestions([]);
      }
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSelectAddressSuggestion = (suggestion) => {
    if (!suggestion?.address) {
      return;
    }

    setForm((current) => ({ ...current, address: suggestion.address }));
    setAddressSuggestions([]);
    setMapLocation({
      address: suggestion.address,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      plusCode: suggestion.plusCode || '',
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice({ type: 'error', message: 'Trinh duyet khong ho tro lay vi tri hien tai.' });
      return;
    }

    setLoadingLocation(true);
    setNotice({ type: '', message: '' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const address = formatCoordinates(latitude, longitude);

        setForm((current) => ({ ...current, address }));
        setAddressSuggestions([]);
        setMapLocation({
          address,
          latitude,
          longitude,
          plusCode: '',
        });
        setLoadingLocation(false);
      },
      () => {
        setLoadingLocation(false);
        setNotice({ type: 'error', message: 'Khong the lay vi tri hien tai. Hay kiem tra quyen truy cap vi tri.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStartEdit = () => {
    setForm({
      ...buildInitialForm(activeUser),
      address: savedAddress || activeUser?.address || '',
    });
    setNotice({ type: '', message: '' });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setForm({
      ...buildInitialForm(activeUser),
      address: savedAddress || activeUser?.address || '',
    });
    setNotice({ type: '', message: '' });
    setIsEditing(false);
    hydrateProfileLocation(activeUser).catch(() => { });
  };

  const validateForm = () => {
    if (!String(form.name || '').trim()) {
      return 'Vui lòng nhập họ và tên.';
    }

    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length !== 10) {
      return 'Số điện thoại phải có đúng 10 số';
    }

    return '';
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotice({ type: 'error', message: validationError });
      return;
    }

    if (!userId) {
      setNotice({ type: 'error', message: 'Không tìm thấy thông tin để cập nhật' });
      return;
    }

    setSaving(true);
    setNotice({ type: '', message: '' });

    try {
      const trimmedName = String(form.name || '').trim();
      const normalizedPhone = String(form.phone || '').replace(/\D/g, '');
      const trimmedAddress = String(form.address || '').trim();
      const currentName = String(activeUser?.name || '').trim();
      const currentPhone = String(activeUser?.phone || '').replace(/\D/g, '');
      const currentAddress = String(activeUser?.address || '').trim();
      const currentLatitude = Number(activeUser?.userLocation?.latitude);
      const currentLongitude = Number(activeUser?.userLocation?.longitude);
      const shouldReuseCurrentCoordinates = trimmedAddress && trimmedAddress === currentAddress;
      const resolvedFormLocation = trimmedAddress
        ? (
          hasValidCoordinates(mapLocation) && mapLocation.address === trimmedAddress
            ? mapLocation
            : await resolveAddressLocation(
              trimmedAddress,
              shouldReuseCurrentCoordinates ? activeUser?.userLocation : null
            )
        )
        : null;
      const fallbackLatitude =
        shouldReuseCurrentCoordinates
          ? activeUser?.userLocation?.latitude
          : undefined;
      const fallbackLongitude =
        shouldReuseCurrentCoordinates
          ? activeUser?.userLocation?.longitude
          : undefined;
      const fallbackPlusCode =
        shouldReuseCurrentCoordinates
          ? activeUser?.userLocation?.plusCode
          : '';
      const nextLatitude = resolvedFormLocation?.latitude ?? mapLocation?.latitude ?? fallbackLatitude;
      const nextLongitude = resolvedFormLocation?.longitude ?? mapLocation?.longitude ?? fallbackLongitude;
      const nextPlusCode = resolvedFormLocation?.plusCode || mapLocation?.plusCode || fallbackPlusCode || '';
      const coordinatesChanged =
        Number.isFinite(Number(nextLatitude))
        && Number.isFinite(Number(nextLongitude))
        && (
          !Number.isFinite(currentLatitude)
          || !Number.isFinite(currentLongitude)
          || Math.abs(Number(nextLatitude) - currentLatitude) > 0.00001
          || Math.abs(Number(nextLongitude) - currentLongitude) > 0.00001
        );
      const hasSupportedChanges =
        trimmedName !== currentName
        || normalizedPhone !== currentPhone
        || trimmedAddress !== currentAddress
        || coordinatesChanged;

      if (!hasSupportedChanges) {
        setNotice({
          type: 'warning',
          message: 'Không có thay đổi nào để lưu',
        });
        return;
      }

      const updatedProfile = await profileService.updateProfile(userId, {
        name: trimmedName,
        phone: normalizedPhone,
        address: trimmedAddress,
        latitude: nextLatitude,
        longitude: nextLongitude,
        plusCode: nextPlusCode,
      });
      const hasResolvedCoordinates =
        Number.isFinite(Number(updatedProfile?.userLocation?.latitude))
        && Number.isFinite(Number(updatedProfile?.userLocation?.longitude));

      setProfile(updatedProfile);
      updateUser(updatedProfile);
      setSavedAddress(updatedProfile.address || '');

      if (hasResolvedCoordinates && updatedProfile.userLocation) {
        applyStoredLocation(updatedProfile.userLocation);
      } else if (trimmedAddress) {
        const parsedCoordinates = parseCoordinateAddress(trimmedAddress);
        setMapLocation(parsedCoordinates
          ? {
            address: trimmedAddress,
            latitude: parsedCoordinates.latitude,
            longitude: parsedCoordinates.longitude,
            plusCode: '',
          }
          : null);
      } else {
        setMapLocation(null);
      }

      setIsEditing(false);

      setNotice({
        type: trimmedAddress && !hasResolvedCoordinates ? 'warning' : 'success',
        message: trimmedAddress && !hasResolvedCoordinates
          ? 'Đã cập nhật hồ sơ. Địa chỉ đã được lưu, nhưng hệ thống chưa xác định được toạ độ chính xác để đồng bộ'
          : 'Đã cập nhật hồ sơ thành công.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message: error.message || 'Không thể cập nhật hồ sơ',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderReadonlyField = (icon, value) => (
    <div
      className="form-input"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#f9fafb',
      }}
    >
      <span style={{ color: '#6b7280' }}>{icon}</span>
      <span>{value || 'Chưa cập nhật'}</span>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Hồ sơ cá nhân</h1>
        </div>
      </div>

      {notice.message && (
        <div
          style={{
            ...(noticeStyles[notice.type] || noticeStyles.success),
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: '0.84rem',
          }}
        >
          {notice.message}
        </div>
      )}

      <div className="profile-card" style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <div
            className="profile-avatar-big"
            style={{
              width: 72,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00b14f 0%, #059669 100%)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.4rem',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
              {activeUser?.name || 'Chưa cập nhật'}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#6b7280', marginTop: 4 }}>
              {activeUser?.email || 'Chưa cập nhật'}
            </div>
            <div
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: mapLocation ? '#eff6ff' : '#f9fafb',
                border: `1px solid ${mapLocation ? '#bfdbfe' : '#e5e7eb'}`,
                borderRadius: 999,
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: mapLocation ? '#1d4ed8' : '#6b7280',
              }}
            >
              {(loadingProfile || loadingLocation) ? <FaSpinner className="animate-spin" /> : <FaMapMarkerAlt />}
              {loadingProfile
                ? 'Đang cập nhật hồ sơ'
                : (loadingLocation ? 'Đang xác định vị trí' : (mapLocation ? 'Đã xác định vị trí' : 'Chưa xác định được vị trí'))}
            </div>
          </div>
        </div>

        <div className="profile-form-grid">
          <div>
            <label className="form-label">Họ và tên</label>
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#6b7280' }}><FaUser /></span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                disabled={!isEditing || loadingProfile}
                style={FIELD_INPUT_STYLE}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Email</label>
            {renderReadonlyField(<MdAlternateEmail />, activeUser?.email || 'Chưa cập nhật')}
          </div>

          <div>
            <label className="form-label">Số điện thoại</label>
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#6b7280' }}><MdPhoneIphone /></span>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                disabled={!isEditing || loadingProfile}
                style={FIELD_INPUT_STYLE}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Vai trò</label>
            {renderReadonlyField(<MdInfoOutline />, ROLE_LABELS[activeUser?.role] || activeUser?.role || 'Chưa cập nhật')}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="form-label">Địa chỉ</label>
          <div style={{ position: 'relative' }}>
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#6b7280' }}><FaMapMarkerAlt /></span>
            <input
              type="text"
              value={form.address}
              onChange={(event) => handleChange('address', event.target.value)}
              disabled={!isEditing || loadingProfile}
              placeholder="Nhập địa chỉ để đồng bộ"
              style={FIELD_INPUT_STYLE}
            />
              {isEditing && (
                <button
                  type="button"
                  title="Lay vi tri hien tai"
                  aria-label="Lay vi tri hien tai"
                  onClick={handleUseCurrentLocation}
                  disabled={loadingLocation || loadingProfile}
                  className="rounded-md p-1.5 text-primary hover:bg-primary-light disabled:opacity-50"
                >
                  {loadingLocation ? <FaSpinner className="animate-spin" /> : <FaLocationArrow />}
                </button>
              )}
            </div>
            {isEditing && (loadingSuggestions || addressSuggestions.length > 0) && (
              <div
                className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                role="listbox"
              >
                {loadingSuggestions && (
                  <div className="flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-500">
                    <FaSpinner className="animate-spin" /> Dang tim goi y dia chi...
                  </div>
                )}
                {!loadingSuggestions && addressSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.lat}-${suggestion.lng}-${suggestion.address}`}
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="block w-full px-3 py-2 text-left text-[0.8rem] text-gray-700 hover:bg-primary-light focus:bg-primary-light focus:outline-none"
                    onClick={() => handleSelectAddressSuggestion(suggestion)}
                  >
                    {suggestion.address}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 className="profile-section-title" style={{ marginBottom: 12 }}>Vị trí của bạn</h3>
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
              <FaSpinner className="animate-spin" />
              Đang lấy địa chỉ.....
            </div>
          ) : mapLocation ? (
            <CarLocationMap
              locationText={mapLocation.address || form.address}
              lat={mapLocation.latitude}
              lng={mapLocation.longitude}
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
              Chưa có dữ liệu địa chỉ để hiển thị bản đồ
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="form-label">Mã tài khoản</label>
          {renderReadonlyField(<MdInfoOutline />, activeUser?._id || activeUser?.id || 'Chưa cập nhật')}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            marginTop: 24,
          }}
        >
          {isEditing ? (
            <>
              <button className="btn-primary" type="button" onClick={handleSave} disabled={saving || loadingProfile}>
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                Lưu
              </button>
              <button className="btn-outline" type="button" onClick={handleCancelEdit} disabled={saving || loadingProfile}>
                Hủy
              </button>
            </>
          ) : (
            <button className="btn-primary" type="button" onClick={handleStartEdit} disabled={loadingProfile}>
              <FaEdit />
              {loadingProfile ? 'Đang đồng bộ...' : 'Chỉnh sửa hồ sơ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
