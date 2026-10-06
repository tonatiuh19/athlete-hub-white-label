import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { checkEventSubdomainAvailable } from "@/store/slices/staffPortalSlice";
import { resolveApexHostname } from "@/utils/hostContext";
import {
  buildEventSubdomainSuggestions,
  normalizeEventSubdomain,
  primaryEventSubdomainFromTitle,
  validateEventSubdomainFormat,
} from "@shared/eventSubdomain";

type Availability = "idle" | "checking" | "available" | "unavailable";

export interface EventSubdomainAvailabilityState {
  status: Availability;
  subdomain: string;
}

export interface EventSubdomainPickerProps {
  title: string;
  startDate?: string | null;
  city?: string | null;
  value: string;
  onChange: (subdomain: string) => void;
  onAvailabilityChange?: (state: EventSubdomainAvailabilityState) => void;
  error?: string | null;
  id?: string;
}

export default function EventSubdomainPicker({
  title,
  startDate,
  city,
  value,
  onChange,
  onAvailabilityChange,
  error,
  id = "event-subdomain",
}: EventSubdomainPickerProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [availability, setAvailability] = useState<Availability>("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  /** Subdomain the current availability status applies to (prevents stale “available”). */
  const confirmedForRef = useRef("");

  const normalizedValue = normalizeEventSubdomain(value);
  const primary = primaryEventSubdomainFromTitle(title);

  const displayStatus: Availability =
    availability === "available" && confirmedForRef.current === normalizedValue
      ? "available"
      : availability === "unavailable" &&
          confirmedForRef.current === normalizedValue
        ? "unavailable"
        : normalizedValue
          ? "checking"
          : "idle";

  const titleNorm = normalizeEventSubdomain(title);

  // Alternates (year/city) only when the current name is unavailable
  const showSuggestions =
    displayStatus === "unavailable" &&
    (apiError === "taken" || apiError === "reserved");

  const suggestions = showSuggestions
    ? buildEventSubdomainSuggestions({
        title,
        startDate,
        city,
        includeAlternates: true,
      }).filter((s) => s !== normalizedValue)
    : [];

  const placeholderPrimary =
    primary ??
    (titleNorm.length >= 3
      ? buildEventSubdomainSuggestions({
          title,
          startDate,
          city,
          includeAlternates: true,
        })[0]
      : null);

  useEffect(() => {
    onAvailabilityChange?.({
      status:
        availability === "available" && confirmedForRef.current === normalizedValue
          ? "available"
          : availability === "unavailable" &&
              confirmedForRef.current === normalizedValue
            ? "unavailable"
            : normalizedValue
              ? "checking"
              : "idle",
      subdomain: normalizedValue,
    });
  }, [availability, normalizedValue, onAvailabilityChange]);

  useEffect(() => {
    if (!normalizedValue) {
      confirmedForRef.current = "";
      setAvailability("idle");
      setApiError(null);
      return;
    }
    const formatErr = validateEventSubdomainFormat(normalizedValue);
    if (formatErr) {
      confirmedForRef.current = normalizedValue;
      setAvailability("unavailable");
      setApiError(formatErr);
      return;
    }

    let cancelled = false;
    confirmedForRef.current = "";
    setAvailability("checking");
    setApiError(null);
    const timer = window.setTimeout(() => {
      void dispatch(checkEventSubdomainAvailable(normalizedValue)).then(
        (result) => {
          if (cancelled) return;
          confirmedForRef.current = normalizedValue;
          if (checkEventSubdomainAvailable.fulfilled.match(result)) {
            if (result.payload.available) {
              setAvailability("available");
              setApiError(null);
            } else {
              setAvailability("unavailable");
              setApiError(result.payload.error ?? "taken");
            }
          } else {
            setAvailability("unavailable");
            setApiError("network");
          }
        },
      );
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedValue, dispatch]);

  const statusLabel =
    displayStatus === "checking"
      ? t("staffPortal.eventCreate.subdomain.checking")
      : displayStatus === "available"
        ? t("staffPortal.eventCreate.subdomain.available")
        : displayStatus === "unavailable"
          ? t(`staffPortal.eventCreate.subdomain.errors.${apiError ?? "taken"}`, {
              defaultValue: t("staffPortal.eventCreate.subdomain.errors.taken"),
            })
          : null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={id}>{t("staffPortal.eventCreate.subdomain.label")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("staffPortal.eventCreate.subdomain.hint")}
        </p>
        <div className="flex items-stretch min-w-0 rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
          <Input
            id={id}
            className="h-12 min-w-0 flex-1 border-0 rounded-none shadow-none focus-visible:ring-0"
            value={value}
            onChange={(e) => {
              confirmedForRef.current = "";
              setAvailability("checking");
              onChange(normalizeEventSubdomain(e.target.value));
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder={
              placeholderPrimary ??
              t("staffPortal.eventCreate.subdomain.placeholder")
            }
            aria-invalid={Boolean(error) || displayStatus === "unavailable"}
          />
          <span className="inline-flex items-center px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground bg-muted/40 border-l border-border shrink-0">
            .{resolveApexHostname()}
          </span>
        </div>
        {error ? (
          <p className="text-xs text-destructive pt-0.5">{error}</p>
        ) : null}
        {statusLabel || displayStatus === "checking" ? (
          <div className="flex items-center gap-1.5" aria-live="polite">
            {displayStatus === "checking" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : displayStatus === "available" ? (
              <Check className="h-3.5 w-3.5 text-accent" />
            ) : displayStatus === "unavailable" ? (
              <X className="h-3.5 w-3.5 text-destructive" />
            ) : null}
            {statusLabel ? (
              <span
                className={cn(
                  "text-xs",
                  displayStatus === "available" && "text-accent",
                  displayStatus === "unavailable" && "text-destructive",
                  displayStatus === "checking" && "text-muted-foreground",
                )}
              >
                {statusLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {suggestions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("staffPortal.eventCreate.subdomain.suggestions")}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const selected = value === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    confirmedForRef.current = "";
                    setAvailability("checking");
                    onChange(s);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Format-valid only — pair with live availability before create. */
export function isEventSubdomainFormatValid(value: string): boolean {
  return validateEventSubdomainFormat(value) == null;
}

/** True when live check confirms this exact label is free. */
export function isEventSubdomainLiveAvailable(
  value: string,
  state: EventSubdomainAvailabilityState,
): boolean {
  const normalized = normalizeEventSubdomain(value);
  return (
    Boolean(normalized) &&
    state.status === "available" &&
    state.subdomain === normalized
  );
}

/** @deprecated use isEventSubdomainFormatValid */
export function isEventSubdomainReady(value: string): boolean {
  return isEventSubdomainFormatValid(value);
}
