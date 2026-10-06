import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { TileLayer, useMap } from "react-leaflet";
import { logger } from "@/utils/logger";
import {
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_URL,
  readCartoApiKeyFromEnv,
  resolveBasemapTileConfig,
} from "@/utils/basemapTiles";

interface BasemapTileLayerProps {
  /** Label for dev console traces */
  traceLabel?: string;
}

/** Theme-aware basemap: OSM by default; CARTO when `VITE_CARTO_API_KEY` is set. */
export default function BasemapTileLayer({ traceLabel = "map" }: BasemapTileLayerProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [forceOsmFallback, setForceOsmFallback] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark =
    !mounted ||
    resolvedTheme === "dark" ||
    (resolvedTheme == null &&
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const config = useMemo(() => {
    if (forceOsmFallback) {
      return {
        provider: "osm" as const,
        url: OSM_TILE_URL,
        attribution: OSM_TILE_ATTRIBUTION,
        subdomains: "abc",
        maxZoom: 19,
      };
    }
    return resolveBasemapTileConfig({
      isDark,
      cartoApiKey: readCartoApiKeyFromEnv(),
    });
  }, [forceOsmFallback, isDark]);

  return (
    <TileLayer
      key={`${config.provider}-${config.url}-${isDark ? "dark" : "light"}`}
      attribution={config.attribution}
      url={config.url}
      subdomains={config.subdomains}
      maxZoom={config.maxZoom}
      eventHandlers={{
        tileerror: (e) => {
          logger.warn(`[Map:${traceLabel}] tile error`, {
            url: "url" in e.tile ? String((e.tile as HTMLImageElement).src) : undefined,
            provider: config.provider,
            forceOsmFallback,
          });
          if (config.provider === "carto" && !forceOsmFallback) {
            logger.info(`[Map:${traceLabel}] switching to OSM fallback`);
            setForceOsmFallback(true);
          }
        },
        tileload: () => {
          logger.debug(`[Map:${traceLabel}] tile loaded (${config.provider})`);
        },
        loading: () => logger.debug(`[Map:${traceLabel}] tiles loading…`),
        load: () => logger.info(`[Map:${traceLabel}] all visible tiles loaded`),
      }}
    />
  );
}

/** Dev diagnostics: container size, transform ancestors, map events. */
export function MapDiagnostics({
  traceLabel = "map",
  active = true,
}: {
  traceLabel?: string;
  active?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;

    const container = map.getContainer();
    const logLayout = (reason: string) => {
      const rect = container.getBoundingClientRect();
      const tileImages = container.querySelectorAll("img.leaflet-tile");
      let loadedTiles = 0;
      tileImages.forEach((node) => {
        const img = node as HTMLImageElement;
        if (img.complete && img.naturalWidth > 0) loadedTiles += 1;
      });

      logger.info(`[Map:${traceLabel}] layout (${reason})`, {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        zoom: map.getZoom(),
        center: map.getCenter(),
        tileDomCount: tileImages.length,
        tilesWithImageData: loadedTiles,
      });

      let el: HTMLElement | null = container.parentElement;
      while (el && el !== document.body) {
        const { transform, filter, perspective } = window.getComputedStyle(el);
        if (
          (transform && transform !== "none") ||
          (filter && filter !== "none") ||
          (perspective && perspective !== "none")
        ) {
          logger.warn(`[Map:${traceLabel}] broken ancestor (transform/filter)`, {
            tag: el.tagName,
            className: el.className,
            transform,
            filter,
            perspective,
          });
        }
        el = el.parentElement;
      }
    };

    logLayout("mount");
    const timers = [100, 500, 1500].map((ms) =>
      window.setTimeout(() => logLayout(`t+${ms}ms`), ms),
    );

    const onResize = () => logLayout("resize");
    window.addEventListener("resize", onResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
    };
  }, [map, traceLabel, active]);

  return null;
}
