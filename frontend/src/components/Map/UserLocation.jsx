import React from 'react';
import { Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const userIcon = L.divIcon({
  html: `
    <div class="user-location-icon">
      <div class="user-location-pulse"></div>
      <div class="user-location-dot"></div>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

const UserLocation = ({
  position,
  radiusKm = null,
  title = 'Vị trí của bạn',
  subtitle = '',
}) => {
  if (!position) {
    return null;
  }

  return (
    <>
      {radiusKm && (
        <Circle
          center={[position.lat, position.lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#00b14f',
            fillColor: '#00b14f',
            fillOpacity: 0.07,
            weight: 1.5,
            dashArray: '6 4',
          }}
        />
      )}

      <Marker position={[position.lat, position.lng]} icon={userIcon} zIndexOffset={1000}>
        <Popup className="map-popup user-popup">
          <div className="map-popup-inner">
            <div>
              <p className="map-popup-title">{title}</p>
              <p className="map-popup-sub">
                {subtitle || `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`}
              </p>
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
};

export default UserLocation;