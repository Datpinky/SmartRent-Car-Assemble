import apiClient from './apiClient';
import { LOCATIONIQ_API_KEY } from '../components/Map/mapConfig';

const geocodeCache = new Map();
const directGeocodeCache = new Map();
const autocompleteCache = new Map();
const directAutocompleteCache = new Map();
const reverseCache = new Map();

const normalizeQuery = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const normalizeResult = (item = {}) => ({
  lat: Number(item.lat),
  lng: Number(item.lon),
  address: item.display_name || '',
  plusCode: item.place_id ? String(item.place_id) : '',
  raw: item,
});

const normalizeReverseResult = (payload = {}) => normalizeResult({
  ...payload,
  display_name: payload.display_name || payload.name || '',
  lat: payload.lat,
  lon: payload.lon,
});

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Map provider failed with ${response.status}`);
  }
  return response.json();
};

export const mapService = {
  async directReverseGeocode(lat, lon) {
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const cacheKey = `${latitude.toFixed(6)}|${longitude.toFixed(6)}|direct`;
    if (reverseCache.has(cacheKey)) {
      return reverseCache.get(cacheKey);
    }

    const locationIqKey = String(LOCATIONIQ_API_KEY || '').trim();
    const providerUrls = [];

    if (locationIqKey) {
      providerUrls.push(
        `https://api.locationiq.com/v1/reverse?key=${encodeURIComponent(locationIqKey)}&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=vi&format=json`
      );
    }

    providerUrls.push(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=vi`
    );

    for (const url of providerUrls) {
      try {
        const payload = await fetchJson(url);
        const result = payload ? normalizeReverseResult(payload) : null;
        if (result?.address) {
          reverseCache.set(cacheKey, result);
          return result;
        }
      } catch {
        // Try the next public map provider.
      }
    }

    reverseCache.set(cacheKey, null);
    return null;
  },

  async forwardGeocode(query, { limit = 5, countrycodes = 'vn' } = {}) {
    const trimmedQuery = normalizeQuery(query);
    if (!trimmedQuery || trimmedQuery.length < 6) {
      return [];
    }

    const cacheKey = `${trimmedQuery.toLowerCase()}|${limit}|${countrycodes}`;
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey);
    }

    try {
      const response = await apiClient.get('/api/map/forwardGeocode', {
        params: {
          address: trimmedQuery,
          limit,
          countrycodes,
        },
      });

      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      const results = data
        .map(normalizeResult)
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

      geocodeCache.set(cacheKey, results);
      return results;
    } catch (error) {
      if (error.status === 404) {
        return [];
      }

      throw new Error(error.message || 'Khong the geocode dia chi luc nay.');
    }
  },

  async directForwardGeocode(query, { limit = 1, countrycodes = 'vn' } = {}) {
    const trimmedQuery = normalizeQuery(query);
    if (!trimmedQuery || trimmedQuery.length < 4) {
      return [];
    }

    const cacheKey = `${trimmedQuery.toLowerCase()}|${limit}|${countrycodes}|direct`;
    if (directGeocodeCache.has(cacheKey)) {
      return directGeocodeCache.get(cacheKey);
    }

    const encodedQuery = encodeURIComponent(trimmedQuery);
    const normalizedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 1;
    const locationIqKey = String(LOCATIONIQ_API_KEY || '').trim();

    const providerUrls = [];
    if (locationIqKey) {
      providerUrls.push(
        `https://api.locationiq.com/v1/search?key=${encodeURIComponent(locationIqKey)}&q=${encodedQuery}&accept-language=vi&format=json&limit=${normalizedLimit}&countrycodes=${encodeURIComponent(countrycodes)}`
      );
    }

    providerUrls.push(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodedQuery}&accept-language=vi&limit=${normalizedLimit}&countrycodes=${encodeURIComponent(countrycodes)}`
    );

    for (const url of providerUrls) {
      try {
        const payload = await fetchJson(url);
        const data = Array.isArray(payload) ? payload : [];
        const results = data
          .map(normalizeResult)
          .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

        if (results.length > 0) {
          directGeocodeCache.set(cacheKey, results);
          return results;
        }
      } catch {
        // Try the next public map provider.
      }
    }

    directGeocodeCache.set(cacheKey, []);
    return [];
  },

  async directAutocomplete(query, { limit = 5, countrycodes = 'vn', dedupe = 1, normalizecity = 1 } = {}) {
    const trimmedQuery = normalizeQuery(query);
    if (!trimmedQuery || trimmedQuery.length < 3) {
      return [];
    }

    const cacheKey = `${trimmedQuery.toLowerCase()}|${limit}|${countrycodes}|${dedupe}|${normalizecity}|direct`;
    if (directAutocompleteCache.has(cacheKey)) {
      return directAutocompleteCache.get(cacheKey);
    }

    const encodedQuery = encodeURIComponent(trimmedQuery);
    const normalizedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 5;
    const locationIqKey = String(LOCATIONIQ_API_KEY || '').trim();

    const providerUrls = [];
    if (locationIqKey) {
      providerUrls.push(
        `https://api.locationiq.com/v1/autocomplete?key=${encodeURIComponent(locationIqKey)}&q=${encodedQuery}&accept-language=vi&format=json&limit=${normalizedLimit}&countrycodes=${encodeURIComponent(countrycodes)}&dedupe=${encodeURIComponent(dedupe)}&normalizecity=${encodeURIComponent(normalizecity)}`
      );
    }

    providerUrls.push(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodedQuery}&accept-language=vi&limit=${normalizedLimit}&countrycodes=${encodeURIComponent(countrycodes)}&addressdetails=1`
    );

    for (const url of providerUrls) {
      try {
        const payload = await fetchJson(url);
        const data = Array.isArray(payload) ? payload : [];
        const seenAddresses = new Set();
        const results = data
          .map(normalizeResult)
          .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng) && item.address)
          .filter((item) => {
            const key = item.address.toLowerCase();
            if (seenAddresses.has(key)) {
              return false;
            }
            seenAddresses.add(key);
            return true;
          });

        if (results.length > 0) {
          directAutocompleteCache.set(cacheKey, results);
          return results;
        }
      } catch {
        // Try the next public map provider.
      }
    }

    directAutocompleteCache.set(cacheKey, []);
    return [];
  },

  async autocomplete(query, { limit = 5, countrycodes = 'vn', dedupe = 1, normalizecity = 1 } = {}) {
    const trimmedQuery = normalizeQuery(query);
    if (!trimmedQuery || trimmedQuery.length < 3) {
      return [];
    }

    const cacheKey = `${trimmedQuery.toLowerCase()}|${limit}|${countrycodes}|${dedupe}|${normalizecity}`;
    if (autocompleteCache.has(cacheKey)) {
      return autocompleteCache.get(cacheKey);
    }

    try {
      const response = await apiClient.get('/api/map/placeAutocomplete', {
        params: {
          input: trimmedQuery,
          limit,
          countrycodes,
          dedupe,
          normalizecity,
        },
      });

      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      const results = data
        .map(normalizeResult)
        .filter((item) => item.address);

      autocompleteCache.set(cacheKey, results);
      return results;
    } catch (error) {
      if (error.status === 404) {
        return [];
      }

      throw new Error(error.message || 'Khong the lay goi y dia chi luc nay.');
    }
  },

  async reverseGeocode(lat, lon) {
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const cacheKey = `${latitude.toFixed(6)}|${longitude.toFixed(6)}`;
    if (reverseCache.has(cacheKey)) {
      return reverseCache.get(cacheKey);
    }

    try {
      const response = await apiClient.get('/api/map/reverseGeocode', {
        params: {
          lat: latitude,
          lon: longitude,
        },
      });

      const rawData = response.data?.data;
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      const result = data ? normalizeReverseResult(data) : null;

      reverseCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error.status === 404) {
        const fallback = await this.directReverseGeocode(latitude, longitude);
        reverseCache.set(cacheKey, fallback);
        return fallback;
      }

      const fallback = await this.directReverseGeocode(latitude, longitude);
      if (fallback) {
        reverseCache.set(cacheKey, fallback);
        return fallback;
      }

      throw new Error(error.message || 'Khong the doi toa do thanh dia chi luc nay.');
    }
  },
};

export default mapService;
