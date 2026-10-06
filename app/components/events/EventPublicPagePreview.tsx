import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Calendar,
  Eye,
  MapPin,
  Sparkles,
} from "lucide-react";
import EventDetailHeroGallery from "@/components/events/EventDetailHeroGallery";
import EventOrganizerHost from "@/components/events/EventOrganizerHost";
import EventRegisterSidebar from "@/components/events/EventRegisterSidebar";
import EventLocationMiniMap from "@/components/events/EventLocationMiniMap";
import EventCountdown from "@/components/events/EventCountdown";
import { Button } from "@/components/ui/button";
import type { EventCreatePreviewData } from "@/components/staff/event-create/types";
import type { EventCreatePreviewDevice } from "@/components/staff/event-create/types";
import {
  formatEventDateBadge,
  formatEventDateTimeRange,
} from "@/utils/eventDateDisplay";
import { formatEventDate, formatPriceMxn } from "@/utils/eventFormat";
import {
  eventDescriptionHasContent,
  eventDescriptionIsHtml,
} from "@/utils/eventDescriptionHtml";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { cn } from "@/lib/utils";

export interface EventPublicPagePreviewProps {
  data: EventCreatePreviewData;
  /** Layout bucket — must NOT rely on viewport breakpoints (preview runs inside staff UI). */
  device?: EventCreatePreviewDevice;
  /** When true, registration actions are disabled and a preview ribbon is shown */
  previewMode?: boolean;
  /** Hide fixed mobile CTA bar (embedded sidebar clip) */
  showMobileBar?: boolean;
  className?: string;
}

function slugifySport(name?: string): string {
  if (!name?.trim()) return "event";
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

export default function EventPublicPagePreview({
  data,
  device = "phone",
  previewMode = true,
  showMobileBar = true,
  className,
}: EventPublicPagePreviewProps) {
  const { t, i18n } = useTranslation();
  const isDesktopLayout = device === "desktop";

  const title =
    data.title.trim() || t("staffPortal.eventCreate.preview.placeholderTitle");
  const sport =
    data.sportName || t("staffPortal.eventCreate.preview.placeholderSport");
  const organizerName =
    data.organizerName?.trim() ||
    t("staffPortal.eventCreate.preview.placeholderOrganizer");

  const startDate = data.startDate ?? new Date().toISOString();
  const dateBadge = formatEventDateBadge(startDate, i18n.language);
  const dateTimeLabel = formatEventDateTimeRange(
    startDate,
    data.endDate,
    i18n.language,
  );

  const locationPrimary = [data.locationCity, data.locationState]
    .filter(Boolean)
    .join(", ");
  const locationSecondary = data.locationName?.trim() || null;

  const minPrice = useMemo(() => {
    const prices = data.categories
      .map((c) => c.price_cents)
      .filter((p) => p > 0);
    if (prices.length === 0) return Infinity;
    return Math.min(...prices);
  }, [data.categories]);

  const minPriceLabel =
    Number.isFinite(minPrice) && minPrice !== Infinity
      ? formatPriceMxn(minPrice, i18n.language)
      : data.categories.length > 0
        ? t("eventDetail.freeOrTbd")
        : t("staffPortal.eventCreate.preview.priceTbd");

  const fromLabelVisible =
    Number.isFinite(minPrice) && minPrice !== Infinity && minPrice > 0;

  const hasCategories = data.categories.length > 0;

  const titleClass = isDesktopLayout
    ? "text-3xl sm:text-4xl md:text-5xl"
    : device === "tablet"
      ? "text-3xl sm:text-4xl"
      : "text-2xl sm:text-3xl";

  const sportClass = isDesktopLayout
    ? "tracking-widest"
    : "tracking-wide";

  const categoryGridClass = isDesktopLayout
    ? "grid gap-4 sm:grid-cols-2"
    : "grid gap-3 grid-cols-1";

  const useContainedMobileChrome = !isDesktopLayout && showMobileBar;

  const mobileRegisterBar = !isDesktopLayout && showMobileBar ? (
    <EventRegisterSidebar
      layout="mobileBar"
      contained={previewMode}
      startDate={startDate}
      minPriceLabel={minPriceLabel}
      fromLabelVisible={fromLabelVisible}
      canRegister={false}
      canGroupRegister={false}
      isRegistered={false}
      registrationLabel={t("eventDetail.registerCta")}
      registerDisabled
      registerDisabledTitle={t("staffPortal.eventCreate.preview.registerDisabled")}
      onRegister={() => undefined}
    />
  ) : null;

  const pageBody = (
    <div
      className={cn(
        "mx-auto w-full min-w-0 px-3 py-4 sm:px-4 sm:py-6",
        isDesktopLayout ? "max-w-6xl md:px-6 md:py-10 pb-10" : "pb-6",
        useContainedMobileChrome && "pb-4",
        previewMode && !isDesktopLayout && "px-2.5 py-3",
      )}
    >
        <div
          className={cn(
            isDesktopLayout
              ? "grid grid-cols-[minmax(0,1fr)_minmax(260px,320px)] gap-8 items-start"
              : "space-y-5",
          )}
        >
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <EventDetailHeroGallery
              title={title}
              bannerUrl={data.bannerUrl}
              heroUrl={data.heroUrl}
              media={data.media}
            />

            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-primary text-xs font-bold uppercase",
                    sportClass,
                  )}
                >
                  {sport}
                </span>
                {previewMode ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    <Sparkles className="h-3 w-3" />
                    {t("staffPortal.eventCreate.preview.draftBadge")}
                  </span>
                ) : null}
              </div>

              <h1
                className={cn(
                  "font-bold text-foreground tracking-tight leading-[1.15] break-words",
                  titleClass,
                )}
              >
                {title}
              </h1>

              <EventOrganizerHost
                name={organizerName}
                logoUrl={data.organizerLogo}
                variant="hostedBy"
              />

              {data.shortDescription ? (
                <p className="text-muted-foreground text-sm sm:text-base max-w-2xl break-words">
                  {data.shortDescription}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl border border-border bg-card flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-[9px] font-bold uppercase text-primary leading-none">
                      {dateBadge.month}
                    </span>
                    <span className="text-sm font-bold text-foreground leading-none mt-0.5 tabular-nums">
                      {dateBadge.day}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground break-words">
                      {dateTimeLabel}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatEventDate(startDate, i18n.language)}
                    </p>
                  </div>
                </div>

                {locationPrimary ? (
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl border border-border bg-card flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground break-words">
                        {locationPrimary}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">
                        {locationSecondary ||
                          t("eventDetail.registerForLocation")}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {!isDesktopLayout ? (
              <div className="space-y-3">
                <EventCountdown targetIso={startDate} compact />
                {locationPrimary ? (
                  <EventLocationMiniMap
                    city={data.locationCity}
                    state={data.locationState}
                    country={data.locationCountry ?? "MX"}
                    locationName={data.locationName}
                    lat={data.locationLat}
                    lng={data.locationLng}
                    sportSlug={data.sportSlug ?? slugifySport(data.sportName)}
                    sportName={data.sportName}
                    height={device === "tablet" ? 200 : 160}
                  />
                ) : null}
              </div>
            ) : null}

            {hasCategories ? (
              <section className="space-y-3 sm:space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {t("eventDetail.tabPricing")}
                </h2>
                <div className={categoryGridClass}>
                  {data.categories.map((cat) => (
                    <div
                      key={cat.id ?? cat.name}
                      className="flex flex-col rounded-2xl border border-border bg-card/60 p-4 sm:p-5 shadow-sm min-w-0"
                    >
                      <div className="mb-2 min-w-0">
                        <p className="font-bold text-foreground break-words">
                          {cat.name}
                        </p>
                        {cat.distance_km ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {cat.distance_km} km
                          </p>
                        ) : null}
                      </div>
                      {cat.description?.trim() ? (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 break-words">
                          {cat.description}
                        </p>
                      ) : null}
                      <div className="mt-auto">
                        <div className="flex justify-between items-center gap-2 text-sm border-t border-border pt-3">
                          <span className="text-muted-foreground shrink-0">
                            {t("eventDetail.inscription")}
                          </span>
                          <span className="font-bold text-primary text-base shrink-0">
                            {cat.price_cents > 0
                              ? formatPriceMxn(cat.price_cents, i18n.language)
                              : t("staffPortal.eventCreate.preview.free")}
                          </span>
                        </div>
                        <Button
                          type="button"
                          disabled
                          className="w-full mt-4 btn-primary font-bold opacity-80"
                        >
                          {t("eventDetail.selectCategory")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {t("eventDetail.about")}
              </h2>
              {eventDescriptionHasContent(data.description) ? (
                eventDescriptionIsHtml(data.description) ? (
                  <div
                    className="rich-prose text-sm sm:text-base"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(data.description!.trim()),
                    }}
                  />
                ) : (
                  <div className="space-y-4 text-muted-foreground leading-relaxed whitespace-pre-wrap break-words text-sm sm:text-base">
                    {data.description!.trim()}
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border px-4 py-6 text-center">
                  {t("staffPortal.eventCreate.preview.noDescription")}
                </p>
              )}
            </section>
          </div>

          {isDesktopLayout ? (
            <div className="min-w-0 space-y-4">
              <EventRegisterSidebar
                startDate={startDate}
                minPriceLabel={minPriceLabel}
                fromLabelVisible={fromLabelVisible}
                canRegister={false}
                canGroupRegister={false}
                isRegistered={false}
                registrationLabel={t("eventDetail.registerCta")}
                registerDisabled
                registerDisabledTitle={t(
                  "staffPortal.eventCreate.preview.registerDisabled",
                )}
                onRegister={() => undefined}
              />
              {locationPrimary ? (
                <EventLocationMiniMap
                  city={data.locationCity}
                  state={data.locationState}
                  country={data.locationCountry ?? "MX"}
                  locationName={data.locationName}
                  lat={data.locationLat}
                  lng={data.locationLng}
                  sportSlug={data.sportSlug ?? slugifySport(data.sportName)}
                  sportName={data.sportName}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col w-full min-w-0 bg-background text-foreground",
        useContainedMobileChrome && "h-full min-h-0",
        className,
      )}
    >
      {previewMode ? (
        <div className="shrink-0 border-b border-primary/20 bg-primary/10 px-3 py-2 flex items-center justify-center gap-2 text-[11px] font-medium text-primary text-center">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          {t("staffPortal.eventCreate.preview.athleteBanner")}
        </div>
      ) : null}

      <header className="shrink-0 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div
          className={cn(
            "mx-auto w-full min-w-0 px-4 py-2.5 flex items-center gap-2 sm:gap-3",
            isDesktopLayout ? "max-w-6xl md:px-6" : "max-w-full",
          )}
        >
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground shrink-0"
            aria-hidden
          >
            <ArrowLeft className="w-4 h-4" />
          </span>
          <EventOrganizerHost
            name={organizerName}
            logoUrl={data.organizerLogo}
            variant="header"
            className="flex-1 min-w-0"
          />
          <span className="inline-flex h-8 items-center rounded-full border border-border px-2.5 text-[10px] sm:text-xs text-muted-foreground shrink-0 whitespace-nowrap">
            {t("staffPortal.eventCreate.preview.authPlaceholder")}
          </span>
        </div>
      </header>

      {useContainedMobileChrome ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            {pageBody}
          </div>
          {mobileRegisterBar}
        </>
      ) : (
        <>
          {pageBody}
          {mobileRegisterBar}
        </>
      )}
    </div>
  );
}
