/** Pure basemap tile URL helpers (no Leaflet — safe for unit tests). */

export const CARTO_DARK_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

/** Brighter basemap for staff course editing (streets/labels easier to trace). */
export const CARTO_VOYAGER_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export const CARTO_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export type BasemapProvider = "osm" | "carto";

export type BasemapTileConfig = {
  provider: BasemapProvider;
  url: string;
  attribution: string;
  subdomains: string;
  maxZoom: number;
};

/** Append CARTO `key` query param (required since watermarked anonymous tiles). */
export function withCartoApiKey(tileUrl: string, apiKey: string): string {
  const key = apiKey.trim();
  if (!key) return tileUrl;
  const sep = tileUrl.includes("?") ? "&" : "?";
  return `${tileUrl}${sep}key=${encodeURIComponent(key)}`;
}

/**
 * Resolve Leaflet basemap tiles.
 * - Default: OpenStreetMap (no API key).
 * - Optional: CARTO Voyager / dark when `VITE_CARTO_API_KEY` is set (free key from carto.com/basemaps/apikey).
 */
export function resolveBasemapTileConfig(opts: {
  isDark: boolean;
  cartoApiKey?: string | null;
}): BasemapTileConfig {
  const cartoKey = (opts.cartoApiKey ?? "").trim();
  if (cartoKey) {
    const base = opts.isDark ? CARTO_DARK_TILE_URL : CARTO_VOYAGER_TILE_URL;
    return {
      provider: "carto",
      url: withCartoApiKey(base, cartoKey),
      attribution: CARTO_TILE_ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 20,
    };
  }
  return {
    provider: "osm",
    url: OSM_TILE_URL,
    attribution: OSM_TILE_ATTRIBUTION,
    subdomains: "abc",
    maxZoom: 19,
  };
}

export function readCartoApiKeyFromEnv(): string {
  return String(import.meta.env.VITE_CARTO_API_KEY ?? "").trim();
}
