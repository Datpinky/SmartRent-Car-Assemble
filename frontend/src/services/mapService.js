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

/** Có số nhà ở đầu chuỗi (vd. 130, 12A) — autocomplete thuần thường chỉ trả cấp phường/thành phố. */
const leadingHouseToken = (query) => {
  const m = String(query || '').trim().match(/^(\d+[a-zA-Z]*)\b/);
  return m ? m[1] : '';
};

/** Ưu tiên kết quả có số nhà/trùng từ khoá với câu tìm (OSM thiếu số nhà là chuyện thường gặp ở VN). */
const scoreSuggestion = (displayName, query) => {
  const q = normalizeQuery(query).toLowerCase();
  const a = String(displayName || '').toLowerCase();
  let score = 0;
  const house = leadingHouseToken(q);
  if (house) {
    const re = new RegExp(`(?:^|[,\\s])${house}(?:[,\\s]|$)`, 'i');
    if (re.test(a)) score += 220;
  }
  const tokens = q.split(/[,]+|\s+/).filter((t) => t.length > 1);
  for (const t of tokens) {
    if (a.includes(t)) score += Math.min(12, 4 + t.length);
  }
  return score;
};

const mergeDedupeAndRank = (items, query, limit) => {
  const seen = new Set();
  const merged = [];
  for (const item of items) {
    if (!item?.address || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) continue;
    const key = `${item.address.toLowerCase()}|${item.lat.toFixed(4)}|${item.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...item, _rank: scoreSuggestion(item.address, query) });
  }
  merged.sort((x, y) => y._rank - x._rank);
  return merged.slice(0, limit).map(({ _rank, ...rest }) => rest);
};

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

    const hasHouse = Boolean(leadingHouseToken(trimmedQuery));
    const iqDedupe = hasHouse ? 0 : dedupe;
    const iqNormCity = hasHouse ? 0 : normalizecity;

    const cacheKey = `${trimmedQuery.toLowerCase()}|${limit}|${countrycodes}|${iqDedupe}|${iqNormCity}|v2`;
    if (directAutocompleteCache.has(cacheKey)) {
      return directAutocompleteCache.get(cacheKey);
    }

    const encodedQuery = encodeURIComponent(trimmedQuery);
    const normalizedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 5;
    const locationIqKey = String(LOCATIONIQ_API_KEY || '').trim();

    const providerUrls = [];
    if (locationIqKey) {
      providerUrls.push(
        `https://api.locationiq.com/v1/autocomplete?key=${encodeURIComponent(locationIqKey)}&q=${encodedQuery}&accept-language=vi&format=json&limit=${normalizedLimit}&countrycodes=${encodeURIComponent(countrycodes)}&dedupe=${encodeURIComponent(iqDedupe)}&normalizecity=${encodeURIComponent(iqNormCity)}`
      );
    }

    providerUrls.push(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodedQuery}&accept-language=vi&limit=${normalizedLimit}&countrycodes=${encodeURIComponent(countrycodes)}&addressdetails=1`
    );

    const collectFromUrl = async (url) => {
      const payload = await fetchJson(url);
      const data = Array.isArray(payload) ? payload : [];
      return data
        .map(normalizeResult)
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng) && item.address);
    };

    const autoLists = await Promise.all(
      providerUrls.map((url) =>
        collectFromUrl(url).catch(() => [])
      )
    );

    let combined = autoLists.flat();

    if (hasHouse && trimmedQuery.length >= 5) {
      try {
        const forward = await this.directForwardGeocode(trimmedQuery, {
          limit: normalizedLimit,
          countrycodes,
        });
        combined = combined.concat(forward);
      } catch {
        /* noop */
      }
    }

    const results = mergeDedupeAndRank(combined, trimmedQuery, normalizedLimit);
    directAutocompleteCache.set(cacheKey, results);
    return results;
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
        return null;
      }

      throw new Error(error.message || 'Khong the doi toa do thanh dia chi luc nay.');
    }
  },
};

export default mapService;
