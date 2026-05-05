export const LOCATIONIQ_API_KEY =
  process.env.REACT_APP_LOCATIONIQ_API_KEY || 'pk.ad7f3a1c34b60bf9ea1390d5e66edb1d';

const LOCATIONIQ_TILE_URL =
  `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_API_KEY}`;
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const USE_LOCATIONIQ_TILES = process.env.REACT_APP_MAP_TILE_PROVIDER === 'locationiq';

export const TILE_URL = USE_LOCATIONIQ_TILES && LOCATIONIQ_API_KEY
  ? LOCATIONIQ_TILE_URL
  : OSM_TILE_URL;

export const TILE_ATTRIBUTION = USE_LOCATIONIQ_TILES && LOCATIONIQ_API_KEY
  ? '&copy; <a href="https://locationiq.com" target="_blank">LocationIQ</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

export const DEFAULT_CENTER = [21.0278, 105.8342];
export const DEFAULT_ZOOM = 13;
export const RADIUS_OPTIONS = [1, 3, 5, 10, 20, 50];
