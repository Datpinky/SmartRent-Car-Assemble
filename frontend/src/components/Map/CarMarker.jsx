import React, { useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { formatVndPerDay } from '../../utils/currencyFormat';

const makeCarIcon = (isSelected) =>
  L.divIcon({
    html: `
      <div class="car-marker-icon ${isSelected ? 'car-marker-icon--selected' : ''}">
        <span class="car-marker-emoji">&#128663;</span>
      </div>
    `,
    className: '',
    iconSize: isSelected ? [44, 44] : [36, 36],
    iconAnchor: isSelected ? [22, 44] : [18, 36],
    popupAnchor: [0, -38],
  });

const formatPrice = (price, currency = 'VND', chargeUnit = 'day') => {
  if (!price) return null;
  return formatVndPerDay(price);
};

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
};

const CarMarker = ({ car, isSelected = false, onClick }) => {
  const markerRef = useRef(null);

  const handleClick = () => {
    onClick?.(car);
    markerRef.current?.openPopup();
  };

  return (
    <Marker
      ref={markerRef}
      position={[car.latitude, car.longitude]}
      icon={makeCarIcon(isSelected)}
      eventHandlers={{ click: handleClick }}
      zIndexOffset={isSelected ? 500 : 0}
    >
      <Popup className="map-popup car-popup" minWidth={250}>
        <div className="car-popup-inner">
          <div className="car-popup-header">
            {car.image ? (
              <img src={car.image} alt={car.name} className="car-popup-img" />
            ) : (
              <div className="car-popup-img-placeholder">&#128663;</div>
            )}

            <div className="car-popup-header-info">
              <p className="car-popup-name">{car.name}</p>
              <div className="car-popup-subline">
                {car.category && <span className="car-popup-badge">{car.category}</span>}
                {car.statusLabel && <span className="car-popup-badge car-popup-badge--muted">{car.statusLabel}</span>}
              </div>
            </div>
          </div>

          <div className="car-popup-details">
            {car.plateNumber && (
              <div className="car-popup-detail-item">
                <span>Plate</span>
                <span>{car.plateNumber}</span>
              </div>
            )}

            {car.brand || car.model ? (
              <div className="car-popup-detail-item">
                <span>Model</span>
                <span>{[car.brand, car.model].filter(Boolean).join(' ')}</span>
              </div>
            ) : null}

            {(car.seats || car.fuel) && (
              <div className="car-popup-detail-item">
                <span>Specs</span>
                <span>
                  {[car.seats ? `${car.seats} cho` : '', car.fuel].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}

            {car.address && (
              <div className="car-popup-detail-item">
                <span>Dia chi</span>
                <span>{car.address}</span>
              </div>
            )}

            {car.maxDistance && (
              <div className="car-popup-detail-item">
                <span>Gioi han</span>
                <span>{car.maxDistance}</span>
              </div>
            )}

            {formatDistance(car.distance) && (
              <div className="car-popup-detail-item car-popup-distance">
                <span>Khoang cach</span>
                <span>{formatDistance(car.distance)} tu ban</span>
              </div>
            )}
          </div>

          <div className="car-popup-footer">
            {formatPrice(car.price, car.currency, car.chargeUnit) && (
              <span className="car-popup-price">{formatPrice(car.price, car.currency, car.chargeUnit)}</span>
            )}
            <a
              href={`/xe/${car.id}`}
              className="car-popup-btn"
              target="_blank"
              rel="noreferrer"
            >
              Xem xe
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export default CarMarker;