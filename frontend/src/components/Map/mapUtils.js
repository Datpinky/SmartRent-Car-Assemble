/**
 * mapUtils.js – pure helper functions for map calculations
 */

/**
 * Calculate distance between two geo-coordinates using Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in kilometres (rounded to 2 dp)
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Attach a `distance` field (km) to each car relative to userLocation.
 * Returns a new array; original array is not mutated.
 * @param {Array}  cars
 * @param {{ lat: number, lng: number } | null} userLocation
 * @returns {Array}
 */
export function enrichCarsWithDistance(cars, userLocation) {
  if (!userLocation) return cars.map((c) => ({ ...c, distance: null }));

  return cars.map((car) => ({
    ...car,
    distance: haversineDistance(
      userLocation.lat,
      userLocation.lng,
      car.latitude,
      car.longitude
    ),
  }));
}

/**
 * Filter cars to those within `radiusKm` of userLocation.
 * If userLocation is null, returns all cars unchanged.
 * @param {Array}  carsWithDistance  – output of enrichCarsWithDistance
 * @param {number} radiusKm
 * @returns {Array}
 */
export function filterByRadius(carsWithDistance, radiusKm) {
  return carsWithDistance.filter(
    (car) => car.distance === null || car.distance <= radiusKm
  );
}
