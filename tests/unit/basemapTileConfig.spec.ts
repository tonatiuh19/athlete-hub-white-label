import { describe, it, expect } from "vitest";
import {
  CARTO_DARK_TILE_URL,
  CARTO_VOYAGER_TILE_URL,
  OSM_TILE_URL,
  resolveBasemapTileConfig,
  withCartoApiKey,
} from "@/utils/basemapTiles";

describe("resolveBasemapTileConfig", () => {
  it("defaults to OpenStreetMap when no CARTO key", () => {
    const light = resolveBasemapTileConfig({ isDark: false });
    expect(light.provider).toBe("osm");
    expect(light.url).toBe(OSM_TILE_URL);

    const dark = resolveBasemapTileConfig({ isDark: true, cartoApiKey: "  " });
    expect(dark.provider).toBe("osm");
  });

  it("uses CARTO voyager/dark with key query when API key is set", () => {
    const light = resolveBasemapTileConfig({
      isDark: false,
      cartoApiKey: "test-key",
    });
    expect(light.provider).toBe("carto");
    expect(light.url).toBe(`${CARTO_VOYAGER_TILE_URL}?key=test-key`);

    const dark = resolveBasemapTileConfig({
      isDark: true,
      cartoApiKey: "test-key",
    });
    expect(dark.url).toBe(`${CARTO_DARK_TILE_URL}?key=test-key`);
  });

  it("withCartoApiKey encodes and appends key", () => {
    expect(withCartoApiKey("https://example.com/t.png", "a b")).toBe(
      "https://example.com/t.png?key=a%20b",
    );
    expect(withCartoApiKey("https://example.com/t.png?x=1", "k")).toBe(
      "https://example.com/t.png?x=1&key=k",
    );
  });
});
