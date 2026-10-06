import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, useMap } from "react-leaflet";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import "leaflet/dist/leaflet.css";
import {
  buildPlaceResolveKey,
  resolvePlaceCoordinates,
} from "@/store/slices/geoSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getEventPinIcon,
  isValidLatLngPair,
  parseCoord,
} from "@/lib/leafletSetup";
import BasemapTileLayer from "@/components/maps/BasemapTileLayer";
import { MapInvalidateSize } from "@/components/maps/LeafletMapHelpers";
import { cn } from "@/lib/utils";

interface EventLocationMiniMapProps {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  locationName?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  sportSlug?: string;
  sportName?: string;
  className?: string;
  height?: number;
}

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: false });
  }, [map, lat, lng, zoom]);
  return null;
}

export default function EventLocationMiniMap({
  city,
  state,
  country = "MX",
  locationName,
  lat,
  lng,
  sportSlug,
  sportName,
  className,
  height = 180,
}: EventLocationMiniMapProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  const resolveInput = useMemo(
    () => ({
      city,
      state,
      country,
      name: locationName,
      lat,
      lng,
    }),
    [city, state, country, locationName, lat, lng],
  );
  const placeKey = buildPlaceResolveKey(resolveInput);
  const place = useAppSelector((s) => s.geo.placeByKey[placeKey]);
  const loading = useAppSelector((s) => Boolean(s.geo.loadingPlaceKeys[placeKey]));

  const hasDirectCoords = useMemo(() => {
    const la = parseCoord(lat);
    const ln = parseCoord(lng);
    return la != null && ln != null && isValidLatLngPair(la, ln);
  }, [lat, lng]);

  const canResolve = hasDirectCoords || Boolean(city?.trim() || locationName?.trim());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!canResolve) return;
    if (place !== undefined || loading) return;
    void dispatch(resolvePlaceCoordinates(resolveInput));
  }, [canResolve, place, loading, dispatch, resolveInput]);

  const label =
    place?.label ||
    [city, state].filter(Boolean).join(", ") ||
    locationName ||
    null;

  if (!canResolve) return null;

  if (!mounted || loading || place === undefined) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border overflow-hidden bg-card",
          className,
        )}
      >
        <div className="px-3 pt-3 pb-2 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("eventDetail.mapLocation")}
          </p>
        </div>
        <div
          className="mx-3 mb-3 rounded-xl bg-muted/60 animate-pulse"
          style={{ height }}
          aria-hidden
        />
      </div>
    );
  }

  if (!place) return null;

  const pinIcon = getEventPinIcon({
    selected: true,
    sportSlug,
    sportName,
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-border overflow-hidden bg-card shadow-sm",
        className,
      )}
    >
      <div className="px-3 pt-3 pb-2 flex items-start gap-1.5 min-w-0">
        <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("eventDetail.mapLocation")}
          </p>
          {label ? (
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">
              {label}
            </p>
          ) : null}
        </div>
      </div>
      <div className="px-3 pb-3">
        <div
          className="overflow-hidden rounded-xl border border-border"
          style={{ height }}
        >
          <MapContainer
            center={[place.lat, place.lng]}
            zoom={12}
            scrollWheelZoom={false}
            dragging
            touchZoom
            doubleClickZoom={false}
            boxZoom={false}
            keyboard={false}
            zoomControl={false}
            className="events-leaflet-map z-0 h-full w-full"
            style={{ height, width: "100%" }}
          >
            <BasemapTileLayer traceLabel="event-detail-location" />
            <MapInvalidateSize />
            <Recenter lat={place.lat} lng={place.lng} zoom={12} />
            <Marker position={[place.lat, place.lng]} icon={pinIcon} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
