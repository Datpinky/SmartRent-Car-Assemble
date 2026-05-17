export const LOCATIONIQ_API_KEY =
  process.env.REACT_APP_LOCATIONIQ_API_KEY || 'pk.ad7f3a1c34b60bf9ea1390d5e66edb1d';

const LOCATIONIQ_TILE_URL = `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_API_KEY}`;

/**
 * OSM trực tiếp (một host — khớp hướng dẫn hiện tại).
 * Lưu ý: vẫn có thể bị giới hạn tần suất; nhiều môi trường tốt hơn với Carto CDN.
 */
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Carto Voyager — CDN ổn định, dữ liệu OSM (tránh lỗi “lưới xanh” khi tile OSM không tải được). */
const CARTO_VOYAGER_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const USE_LOCATIONIQ_TILES = process.env.REACT_APP_MAP_TILE_PROVIDER === 'locationiq';

/**
 * Khi không dùng LocationIQ:
 * - carto (mặc định) — khuyến nghị
 * - osm — ép dùng tile.openstreetmap.org
 */
const TILE_STYLE = (process.env.REACT_APP_MAP_TILE_STYLE || 'carto').toLowerCase();

function buildTileConfig() {
  if (USE_LOCATIONIQ_TILES && LOCATIONIQ_API_KEY) {
    return {
      url: LOCATIONIQ_TILE_URL,
      attribution:
        '&copy; <a href="https://locationiq.com" target="_blank" rel="noreferrer">LocationIQ</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      subdomains: 'abc',
    };
  }
  if (TILE_STYLE === 'osm') {
    return {
      url: OSM_TILE_URL,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      subdomains: undefined,
    };
  }
  return {
    url: CARTO_VOYAGER_TILE_URL,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    subdomains: 'abcd',
  };
}

const tileConfig = buildTileConfig();

export const TILE_URL = tileConfig.url;
export const TILE_ATTRIBUTION = tileConfig.attribution;
/** Chuỗi subdomains cho URL có {s}, ví dụ 'abcd'. undefined = Leaflet mặc định. */
export const TILE_SUBDOMAINS = tileConfig.subdomains;

export const DEFAULT_CENTER = [21.0278, 105.8342];
export const DEFAULT_ZOOM = 13;
export const RADIUS_OPTIONS = [1, 3, 5, 10, 20, 50];
