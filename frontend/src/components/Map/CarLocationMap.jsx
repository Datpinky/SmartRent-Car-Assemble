import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import { MdLocationOn } from 'react-icons/md';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import mapService from '../../services/mapService';
import './CarLocationMap.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { TILE_ATTRIBUTION, TILE_SUBDOMAINS, TILE_URL } from './mapConfig';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const redDotIcon = L.divIcon({
  html: '<div class="clm-red-dot"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const FlyTo = ({ latlng }) => {
  const map = useMap();

  useEffect(() => {
    if (latlng) {
      map.flyTo(latlng, 16, { duration: 1.2 });
    }
  }, [latlng, map]);

  return null;
};

/**
 * Checkout / layout có overflow-hidden hoặc flex chưa đo xong — Leaflet hay bị "lưới xanh"
 * nếu không gọi invalidateSize sau khi container có kích thước thật.
 */
const InvalidateMapSize = () => {
  const map = useMap();

  useEffect(() => {
    const run = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* ignore */
      }
    };

    run();
    const t1 = window.setTimeout(run, 80);
    const t2 = window.setTimeout(run, 320);
    window.addEventListener('resize', run);
    window.addEventListener('orientationchange', run);

    let ro;
    try {
      const el = map.getContainer();
      if (el && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => run());
        ro.observe(el);
      }
    } catch {
      /* ignore */
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', run);
      window.removeEventListener('orientationchange', run);
      ro?.disconnect();
    };
  }, [map]);

  return null;
};

/** Ưu tiên prop thứ nhất; bỏ qua null/undefined/'' để tránh Number(null) === 0 */
function pickCoord(primary, secondary) {
  const v = primary !== undefined && primary !== null && primary !== '' ? primary : secondary;
  if (v === undefined || v === null || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const CarLocationMap = ({
  // support multiple prop names used across the app: lat/lng/locationText OR latitude/longitude/address
  locationText,
  lat,
  lng,
  latitude,
  longitude,
  address,
  plusCode = '',
  city = '',
  showOpenMapLink = true,
  openMapLabel = 'Mở trong Maps',
  mapHeight = 280,
  /** Khi không có lat/lng từ ngoài, thử geocode theo địa chỉ (Leaflet giống trang Hồ sơ) */
  autoGeocode = true,
}) => {
  const [resolvedCoords, setResolvedCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const displayAddress = useMemo(() => {
    if ((locationText ?? address)?.trim()) {
      return (locationText ?? address).trim();
    }

    if (plusCode?.trim()) {
      return plusCode.trim();
    }

    return city?.trim() || '';
  }, [city, locationText, plusCode, address]);

  const propLat = pickCoord(lat, latitude);
  const propLng = pickCoord(lng, longitude);
  const hasPropCoords = Number.isFinite(propLat) && Number.isFinite(propLng);

  useEffect(() => {
    if (!autoGeocode || hasPropCoords) {
      setResolvedCoords(null);
      return;
    }
    const q = displayAddress.trim();
    if (q.length < 4) {
      setResolvedCoords(null);
      return;
    }
    let cancelled = false;
    setGeoLoading(true);
    mapService
      .directForwardGeocode(q, { limit: 1 })
      .then((results) => {
        if (cancelled) return;
        const best = results?.[0];
        if (best && Number.isFinite(best.lat) && Number.isFinite(best.lng)) {
          setResolvedCoords({ lat: best.lat, lng: best.lng });
        } else {
          setResolvedCoords(null);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedCoords(null);
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [autoGeocode, hasPropCoords, displayAddress]);

  const numericLat = hasPropCoords ? propLat : resolvedCoords?.lat;
  const numericLng = hasPropCoords ? propLng : resolvedCoords?.lng;
  const hasCoordinates = Number.isFinite(numericLat) && Number.isFinite(numericLng);

  if (!displayAddress) {
    return null;
  }

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${numericLat},${numericLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`;

  return (
    <div className="clm-root">
      <div className="clm-address-bar">
        <MdLocationOn
          className="clm-address-icon"
          style={{ color: '#00b14f', fontSize: '1.15rem', flexShrink: 0 }}
          aria-hidden
        />
        <span className="clm-address-text">{displayAddress}</span>
        {showOpenMapLink && (
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="clm-open-maps-btn">
            {openMapLabel}
          </a>
        )}
      </div>

      <div className="clm-map-wrap" style={{ height: mapHeight, position: 'relative' }}>
        {hasCoordinates ? (
          <MapContainer
            center={[numericLat, numericLng]}
            zoom={16}
            style={{ width: '100%', height: '100%' }}
            zoomControl
            scrollWheelZoom={false}
          >
            <TileLayer
              url={TILE_URL}
              attribution={TILE_ATTRIBUTION}
              {...(TILE_SUBDOMAINS ? { subdomains: TILE_SUBDOMAINS } : {})}
            />
            <InvalidateMapSize />
            <FlyTo latlng={[numericLat, numericLng]} />
            <Marker position={[numericLat, numericLng]} icon={redDotIcon} />
          </MapContainer>
        ) : (
          <div className="clm-overlay">
            {geoLoading ? (
              <>
                <div className="clm-spinner" />
                <p className="clm-overlay-text">Đang tìm vị trí trên bản đồ…</p>
              </>
            ) : (
              <>
                <p className="clm-overlay-text">Chưa xác định được tọa độ từ địa chỉ.</p>
                <p style={{ fontSize: '0.72rem', color: '#718096', textAlign: 'center', maxWidth: '90%', margin: 0 }}>
                  Dùng nút {openMapLabel} để xem trên bản đồ hoặc nhập địa chỉ đầy đủ hơn.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarLocationMap;
