import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaLocationArrow, FaMapMarkerAlt, FaSave, FaSpinner, FaStore, FaUser } from 'react-icons/fa';
import { MdAlternateEmail, MdInfoOutline, MdPhoneIphone } from 'react-icons/md';
import CarLocationMap from '../../../components/Map/CarLocationMap';
import BecomeShowroomModal from '../../../components/common/BecomeShowroomModal';
import SavedCardManager from '../../../components/common/SavedCardManager';
import { useAuth } from '../../../contexts/AuthContext';
import mapService from '../../../services/mapService';
import profileService from '../../../services/profileService';
import userLocationService from '../../../services/userLocationService';
import DriverLicenseSection from './components/DriverLicenseSection';
import {
  buildInitialForm,
  FIELD_INPUT_STYLE,
  formatCoordinates,
  hasValidCoordinates,
  noticeStyles,
  parseCoordinateAddress,
  ROLE_LABELS,
} from './profile.helpers';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const authUserId = user?._id || user?.id || '';
  const [profile, setProfile] = useState(() => profileService.mapProfileUser(user));
  const fallbackProfileRef = useRef(profileService.mapProfileUser(user));

  const activeUser = useMemo(() => (profile?._id ? profile : profileService.mapProfileUser(user)), [profile, user]);
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
  const [showBecomeShowroom, setShowBecomeShowroom] = useState(false);

  const initials = useMemo(
    () =>
      activeUser?.name
        ?.split(' ')
        .map((word) => word[0])
        .slice(-2)
        .join('')
        .toUpperCase() || 'U',
    [activeUser?.name],
  );

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
        // fall through
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

  const resolveAddressFromCoordinates = useCallback(async (latitude, longitude) => {
    try {
      const result = await mapService.reverseGeocode(latitude, longitude);
      return result?.address || formatCoordinates(latitude, longitude);
    } catch {
      return formatCoordinates(latitude, longitude);
    }
  }, []);

  const hydrateProfileLocation = useCallback(
    async (profileData) => {
      const nextAddress = String(profileData?.address || '').trim();
      const resolvedLocation = await resolveAddressLocation(nextAddress, profileData?.userLocation);
      if (resolvedLocation) {
        setMapLocation(resolvedLocation);
        return;
      }

      // If there is a stored userLocation, only display it automatically
      // when the browser already granted geolocation permission. This
      // prevents the app from appearing to "take" the user's current
      // device location without an explicit consent prompt.
      const stored = profileData?.userLocation;
      if (stored) {
        let allowed = false;
        try {
          if (navigator.permissions && navigator.permissions.query) {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            allowed = status.state === 'granted';
          }
        } catch (e) {
          // If Permissions API is not available, default to not auto-showing
          allowed = false;
        }

        if (allowed) {
          applyStoredLocation(stored, nextAddress);
          return;
        }

        // Do not auto-show stored location — require user action (button).
        setMapLocation(null);
        return;
      }

      setMapLocation(null);
    },
    [applyStoredLocation, resolveAddressLocation],
  );

  useEffect(() => {
    fallbackProfileRef.current = profileService.mapProfileUser(user);
  }, [user?._id]);

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
    profileService
      .getProfileById(authUserId, { fetchUserLocation: false })
      .then(async (nextProfile) => {
        if (!mounted) return;
        const resolvedProfile = nextProfile || fallbackProfileRef.current;

        // Only fetch stored userLocation from the server when the browser
        // geolocation permission is already granted. This avoids making a
        // backend request that would expose a stored location without
        // explicit client-side permission.
        try {
          if (navigator.permissions && navigator.permissions.query) {
            try {
              const status = await navigator.permissions.query({ name: 'geolocation' });
              if (status.state === 'granted') {
                const stored = await userLocationService.getByUserId(authUserId);
                if (stored) resolvedProfile.userLocation = stored;
              }
            } catch (e) {
              // ignore permission check or fetch errors and do not auto-show
            }
          }
        } catch (e) {
          // ignore
        }

        setProfile(resolvedProfile);
        setSavedAddress(resolvedProfile.address || '');
        updateUser(resolvedProfile);
        hydrateProfileLocation(resolvedProfile);
      })
      .catch((error) => {
        if (!mounted) return;
        setProfile(fallbackProfileRef.current);
        setNotice({ type: 'error', message: error.message || 'Khong the tai ho so' });
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });
    return () => {
      mounted = false;
    };
  }, [authUserId, hydrateProfileLocation, updateUser]);

  useEffect(() => {
    if (!isEditing) {
      setForm({ ...buildInitialForm(activeUser), address: savedAddress || activeUser?.address || '' });
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
      !normalizedAddress ||
      normalizedAddress.length < 3 ||
      parseCoordinateAddress(normalizedAddress) ||
      normalizedAddress === mapLocation?.address
    ) {
      setAddressSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    const timeoutId = window.setTimeout(() => {
      mapService
        .directAutocomplete(normalizedAddress, { limit: 5 })
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
      window.clearTimeout(timeoutId);
    };
  }, [form.address, isEditing, mapLocation?.address]);

  const handleChange = (field, value) => {
    if (field === 'address') {
      const parsedCoordinates = parseCoordinateAddress(value);
      setMapLocation(
        parsedCoordinates
          ? {
              address: value,
              latitude: parsedCoordinates.latitude,
              longitude: parsedCoordinates.longitude,
              plusCode: '',
            }
          : null,
      );
      if (parsedCoordinates) setAddressSuggestions([]);
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSelectAddressSuggestion = (suggestion) => {
    if (!suggestion?.address) return;
    setForm((current) => ({ ...current, address: suggestion.address }));
    setAddressSuggestions([]);
    setMapLocation({
      address: suggestion.address,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      plusCode: suggestion.plusCode || '',
    });
  };

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setNotice({ type: 'error', message: 'Trinh duyet khong ho tro lay vi tri.' });
      return;
    }
    setLoadingLocation(true);
    setNotice({ type: '', message: '' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await resolveAddressFromCoordinates(latitude, longitude);
        setForm((current) => ({ ...current, address }));
        setAddressSuggestions([]);
        setMapLocation({ address, latitude, longitude, plusCode: '' });
        setLoadingLocation(false);
      },
      () => {
        setLoadingLocation(false);
        setNotice({ type: 'error', message: 'Khong the lay vi tri. Hay kiem tra quyen truy cap.' });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [resolveAddressFromCoordinates]);

  // show current location without touching the form (viewer action)
  const getCurrentPositionAsync = (options = { enableHighAccuracy: true, timeout: 10000 }) =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Trinh duyet khong ho tro lay vi tri.'));
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const showCurrentLocation = async () => {
    setNotice({ type: '', message: '' });
    try {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'denied') {
            setNotice({ type: 'error', message: 'Truy cập vị trí đã bị từ chối — bật lại trong cài đặt trình duyệt.' });
            return;
          }
        } catch {
          // ignore permission check failures and fall through to prompting
        }
      }
      setLoadingLocation(true);
      const position = await getCurrentPositionAsync();
      const { latitude, longitude } = position.coords;
      const address = await resolveAddressFromCoordinates(latitude, longitude);
      setAddressSuggestions([]);
      setMapLocation({ address, latitude, longitude, plusCode: '' });
    } catch (err) {
      const message = err?.message || 'Khong the lay vi tri. Hay kiem tra quyen truy cap.';
      setNotice({ type: 'error', message });
    } finally {
      setLoadingLocation(false);
    }
  };

  // get current location and save it to backend (updates user's address + userLocation)
  const saveCurrentLocation = async () => {
    setNotice({ type: '', message: '' });
    try {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'denied') {
            setNotice({ type: 'error', message: 'Truy cập vị trí đã bị từ chối — bật lại trong cài đặt trình duyệt.' });
            return;
          }
        } catch {
          // ignore
        }
      }
      setLoadingLocation(true);
      const position = await getCurrentPositionAsync();
      const { latitude, longitude } = position.coords;
      const address = await resolveAddressFromCoordinates(latitude, longitude);
      const updatedProfile = await profileService.updateProfile(userId, {
        address,
        latitude,
        longitude,
        plusCode: '',
      });
      setProfile(updatedProfile);
      updateUser(updatedProfile);
      setSavedAddress(updatedProfile.address || '');
      if (updatedProfile?.userLocation) applyStoredLocation(updatedProfile.userLocation, updatedProfile.address || '');
      setNotice({ type: 'success', message: 'Đã lưu vị trí hiện tại.' });
    } catch (err) {
      const message = err?.message || 'Khong the lay vi tri. Hay kiem tra quyen truy cap.';
      setNotice({ type: 'error', message });
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleStartEdit = () => {
    setForm({ ...buildInitialForm(activeUser), address: savedAddress || activeUser?.address || '' });
    setNotice({ type: '', message: '' });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setForm({ ...buildInitialForm(activeUser), address: savedAddress || activeUser?.address || '' });
    setNotice({ type: '', message: '' });
    setIsEditing(false);
    hydrateProfileLocation(activeUser).catch(() => {});
  };

  const validateForm = () => {
    if (!String(form.name || '').trim()) return 'Vui long nhap ho va ten.';
    const phoneDigits = String(form.phone || '').replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length !== 10) return 'So dien thoai phai co dung 10 so';
    return '';
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotice({ type: 'error', message: validationError });
      return;
    }
    if (!userId) {
      setNotice({ type: 'error', message: 'Khong tim thay thong tin de cap nhat' });
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
      const shouldReuseCurrentCoordinates = trimmedAddress && trimmedAddress === currentAddress;
      const resolvedFormLocation = trimmedAddress
        ? hasValidCoordinates(mapLocation) && mapLocation.address === trimmedAddress
          ? mapLocation
          : await resolveAddressLocation(
              trimmedAddress,
              shouldReuseCurrentCoordinates ? activeUser?.userLocation : null,
            )
        : null;
      const nextLatitude =
        resolvedFormLocation?.latitude ??
        mapLocation?.latitude ??
        (shouldReuseCurrentCoordinates ? activeUser?.userLocation?.latitude : undefined);
      const nextLongitude =
        resolvedFormLocation?.longitude ??
        mapLocation?.longitude ??
        (shouldReuseCurrentCoordinates ? activeUser?.userLocation?.longitude : undefined);
      const nextPlusCode =
        resolvedFormLocation?.plusCode ||
        mapLocation?.plusCode ||
        (shouldReuseCurrentCoordinates ? activeUser?.userLocation?.plusCode : '') ||
        '';
      const currentLatitude = Number(activeUser?.userLocation?.latitude);
      const currentLongitude = Number(activeUser?.userLocation?.longitude);
      const coordinatesChanged =
        Number.isFinite(Number(nextLatitude)) &&
        Number.isFinite(Number(nextLongitude)) &&
        (!Number.isFinite(currentLatitude) ||
          !Number.isFinite(currentLongitude) ||
          Math.abs(Number(nextLatitude) - currentLatitude) > 0.00001 ||
          Math.abs(Number(nextLongitude) - currentLongitude) > 0.00001);
      const hasSupportedChanges =
        trimmedName !== currentName ||
        normalizedPhone !== currentPhone ||
        trimmedAddress !== currentAddress ||
        coordinatesChanged;
      if (!hasSupportedChanges) {
        setNotice({ type: 'warning', message: 'Khong co thay doi nao de luu' });
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
        Number.isFinite(Number(updatedProfile?.userLocation?.latitude)) &&
        Number.isFinite(Number(updatedProfile?.userLocation?.longitude));
      setProfile(updatedProfile);
      updateUser(updatedProfile);
      setSavedAddress(updatedProfile.address || '');
      if (hasResolvedCoordinates && updatedProfile.userLocation) {
        applyStoredLocation(updatedProfile.userLocation);
      } else if (trimmedAddress) {
        const parsedCoordinates = parseCoordinateAddress(trimmedAddress);
        setMapLocation(
          parsedCoordinates
            ? {
                address: trimmedAddress,
                latitude: parsedCoordinates.latitude,
                longitude: parsedCoordinates.longitude,
                plusCode: '',
              }
            : null,
        );
      } else {
        setMapLocation(null);
      }
      setIsEditing(false);
      setNotice({
        type: trimmedAddress && !hasResolvedCoordinates ? 'warning' : 'success',
        message:
          trimmedAddress && !hasResolvedCoordinates
            ? 'Da cap nhat ho so. Dia chi da duoc luu, nhung he thong chua xac dinh duoc toa do chinh xac.'
            : 'Da cap nhat ho so thanh cong.',
      });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Khong the cap nhat ho so' });
    } finally {
      setSaving(false);
    }
  };

  const renderReadonlyField = (icon, value) => (
    <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb' }}>
      <span style={{ color: '#6b7280' }}>{icon}</span>
      <span>{value || 'Chua cap nhat'}</span>
    </div>
  );

  return (
    <>
      <div className="profile-page">
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="page-title">Ho so ca nhan</h1>
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
          {/* Avatar + identity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, flexWrap: 'wrap' }}>
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
                {activeUser?.name || 'Chua cap nhat'}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#6b7280', marginTop: 4 }}>
                {activeUser?.email || 'Chua cap nhat'}
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
                {loadingProfile || loadingLocation ? <FaSpinner className="animate-spin" /> : <FaMapMarkerAlt />}
                {loadingProfile
                  ? 'Dang cap nhat ho so'
                  : loadingLocation
                    ? 'Dang xac dinh vi tri'
                    : mapLocation
                      ? 'Da xac dinh vi tri'
                      : 'Chua xac dinh duoc vi tri'}
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="profile-form-grid">
            <div>
              <label className="form-label">Ho va ten</label>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#6b7280' }}>
                  <FaUser />
                </span>
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
              {renderReadonlyField(<MdAlternateEmail />, activeUser?.email || 'Chua cap nhat')}
            </div>
            <div>
              <label className="form-label">So dien thoai</label>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#6b7280' }}>
                  <MdPhoneIphone />
                </span>
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
              <label className="form-label">Vai tro</label>
              {renderReadonlyField(
                <MdInfoOutline />,
                ROLE_LABELS[activeUser?.role] || activeUser?.role || 'Chua cap nhat',
              )}
            </div>
          </div>

          {/* Address field */}
          <div style={{ marginTop: 16 }}>
            <label className="form-label">Dia chi</label>
            <div style={{ position: 'relative' }}>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#6b7280' }}>
                  <FaMapMarkerAlt />
                </span>
                <input
                  type="text"
                  value={form.address}
                  onChange={(event) => handleChange('address', event.target.value)}
                  disabled={!isEditing || loadingProfile}
                  placeholder="Nhap dia chi de dong bo"
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
                      <FaSpinner className="animate-spin" /> Dang tim goi y...
                    </div>
                  )}
                  {!loadingSuggestions &&
                    addressSuggestions.map((suggestion) => (
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

          {/* Driver license section (renter only) */}
          {activeUser?.role === 'renter' && (
            <DriverLicenseSection
              userId={userId}
              profile={activeUser}
              onSaved={(updated) => {
                setProfile(updated);
                updateUser(updated);
              }}
            />
          )}

          {/* Saved cards (renter only) */}
          {activeUser?.role === 'renter' && (
            <div className="mt-6 px-5 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <SavedCardManager />
            </div>
          )}

          {/* Become showroom CTA (renter only) */}
          {activeUser?.role === 'renter' && (
            <div className="mt-6 px-5 py-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-bold text-green-800 flex items-center gap-2 mb-1">
                    <FaStore /> Muốn cho thuê xe?
                  </h4>
                  <p className="text-xs text-green-800 m-0">
                    Đăng ký trở thành Showroom để đăng xe và quản lý hợp đồng.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBecomeShowroom(true)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#00b14f] border-none rounded-lg text-white font-bold cursor-pointer text-sm whitespace-nowrap hover:bg-[#009f45] transition-colors"
                >
                  <FaStore /> Đăng ký Showroom
                </button>
              </div>
            </div>
          )}

          {/* Map section */}
          <div style={{ marginTop: 24 }}>
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
                  gap: 8,
                  color: '#6b7280',
                  fontSize: '0.84rem',
                }}
              >
                <FaSpinner className="animate-spin" /> Đang xác định vị trí...
              </div>
            ) : mapLocation ? (
              <CarLocationMap
                latitude={mapLocation.latitude}
                longitude={mapLocation.longitude}
                address={mapLocation.address}
                style={{ borderRadius: 16, minHeight: 280, border: '1px solid #e5e7eb' }}
              />
            ) : (
              <div
                style={{
                  minHeight: 200,
                  borderRadius: 16,
                  border: '1px dashed #e5e7eb',
                  background: '#f9fafb',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: '#9ca3af',
                  fontSize: '0.84rem',
                  padding: 24,
                }}
              >
                <FaMapMarkerAlt style={{ fontSize: '2rem' }} />
                <span>Chưa xác định được vị trí</span>
                {isEditing && <span style={{ fontSize: '0.78rem' }}>Nhập địa chỉ ở trên hoặc dùng nút lấy vị trí</span>}
                {!isEditing && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={showCurrentLocation}
                      className="btn-outline"
                      disabled={loadingLocation}
                      style={{ fontSize: '0.86rem', padding: '8px 12px' }}
                    >
                      {loadingLocation ? <FaSpinner className="animate-spin" /> : <FaLocationArrow />} Hiện vị trí
                    </button>
                    <button
                      type="button"
                      onClick={saveCurrentLocation}
                      className="btn-primary"
                      disabled={loadingLocation}
                      style={{ fontSize: '0.86rem', padding: '8px 12px' }}
                    >
                      {loadingLocation ? <FaSpinner className="animate-spin" /> : <FaLocationArrow />} Lưu vị trí hiện
                      tại
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit/Save/Cancel buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {isEditing ? (
              <>
                <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || loadingProfile}>
                  {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Lưu thay đổi
                </button>
                <button type="button" className="btn-outline" onClick={handleCancelEdit} disabled={saving}>
                  Hủy bỏ
                </button>
              </>
            ) : (
              <button type="button" className="btn-outline" onClick={handleStartEdit} disabled={loadingProfile}>
                Chỉnh sửa hồ sơ
              </button>
            )}
          </div>
        </div>
      </div>

      {showBecomeShowroom && <BecomeShowroomModal onClose={() => setShowBecomeShowroom(false)} />}
    </>
  );
};

export default Profile;
