import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './CarLocationMap.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { TILE_ATTRIBUTION, TILE_URL } from './mapConfig';

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

const CarLocationMap = ({
  locationText,
  lat,
  lng,
  plusCode = '',
  city = '',
  pinLabel = 'Pin',
  showOpenMapLink = true,
  openMapLabel = 'Mở trong Maps',
  mapHeight = 280,
}) => {
  const numericLat = Number(lat);
  const numericLng = Number(lng);
  const hasCoordinates = Number.isFinite(numericLat) && Number.isFinite(numericLng);
  const address = useMemo(() => {
    if (locationText?.trim()) {
      return locationText.trim();
    }

    if (plusCode?.trim()) {
      return plusCode.trim();
    }

    return city?.trim() || '';
  }, [city, locationText, plusCode]);

  if (!hasCoordinates || !address) {
    return null;
  }

  const latlng = [numericLat, numericLng];
  const googleMapsUrl = `https://www.google.com/maps?q=${latlng[0]},${latlng[1]}`;

  return (
    <div className="clm-root">
      <div className="clm-address-bar">
        <span className="clm-address-icon">{pinLabel}</span>
        <span className="clm-address-text">{address}</span>
        {showOpenMapLink && (
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="clm-open-maps-btn">
            {openMapLabel}
          </a>
        )}
      </div>

      <div className="clm-map-wrap" style={{ height: mapHeight }}>
        <MapContainer
          center={latlng}
          zoom={16}
          style={{ width: '100%', height: '100%' }}
          zoomControl
          scrollWheelZoom={false}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <FlyTo latlng={latlng} />
          <Marker position={latlng} icon={redDotIcon} />
        </MapContainer>
      </div>
    </div>
  );
};

export default CarLocationMap;