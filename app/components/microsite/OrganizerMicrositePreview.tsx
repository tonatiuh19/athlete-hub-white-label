import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatEventDate } from "@/utils/eventFormat";
import type {
  OrganizerMicrositeEvent,
  OrganizerSiteSection,
  OrganizerSiteTheme,
} from "@/store/slices/organizerSiteSlice";

export type OrganizerMicrositePreviewProps = {
  organizerName: string;
  theme: OrganizerSiteTheme;
  sections: OrganizerSiteSection[];
  events?: OrganizerMicrositeEvent[];
  /**
   * Editor live preview: show draft/pending badges and non-navigating CTAs.
   * Public vanity host should leave this false.
   */
  showUnpublishedEvents?: boolean;
  /** When true, CTAs / event links navigate (public microsite). */
  interactive?: boolean;
  className?: string;
  poweredByHref?: string;
};

function eventStatusLabelKey(status: string): string {
  if (status === "draft") return "microsite.eventStatus.draft";
  if (status === "pending_approval") return "microsite.eventStatus.pending";
  if (status === "published") return "microsite.eventStatus.published";
  return "microsite.eventStatus.other";
}

/**
 * Presentational organizer microsite chrome — used by the public vanity host
 * and the staff site-editor live preview.
 */
export default function OrganizerMicrositePreview({
  organizerName,
  theme,
  sections,
  events = [],
  showUnpublishedEvents = false,
  interactive = true,
  className,
  poweredByHref,
}: OrganizerMicrositePreviewProps) {
  const { t, i18n } = useTranslation();
  const radius = `${theme.buttonRadiusPx}px`;
  const byKey = (key: string) => sections.find((s) => s.sectionKey === key);
  const heroEnabled = byKey("hero")?.enabled !== false;
  const about = byKey("about");
  const eventsSec = byKey("upcoming_events");
  const sponsorsSec = byKey("sponsors");
  const faqSec = byKey("faq");
  const footerSec = byKey("footer_links");

  const Cta = ({
    children,
    className: ctaClass,
  }: {
    children: ReactNode;
    className?: string;
  }) => {
    const style = {
      backgroundColor: theme.accentColor,
      color: theme.secondaryColor,
      borderRadius: radius,
    } as const;
    if (!interactive) {
      return (
        <span
          className={cn(
            "h-11 px-4 inline-flex items-center justify-center text-sm font-semibold shrink-0",
            ctaClass,
          )}
          style={style}
        >
          {children}
        </span>
      );
    }
    return (
      <a
        href="/login"
        className={cn(
          "h-11 px-4 inline-flex items-center justify-center text-sm font-semibold shrink-0",
          ctaClass,
        )}
        style={style}
      >
        {children}
      </a>
    );
  };

  return (
    <div
      className={cn(
        "w-full max-w-full min-w-0 overflow-x-clip flex flex-col",
        className,
      )}
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <header
        className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b min-w-0"
        style={{ borderColor: `${theme.primaryColor}22` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {theme.logoUrl ? (
            <img
              src={theme.logoUrl}
              alt={organizerName}
              className="h-9 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <span
              className="font-bold text-lg truncate"
              style={{ color: theme.primaryColor }}
            >
              {organizerName}
            </span>
          )}
        </div>
        <Cta>{t("microsite.enter")}</Cta>
      </header>

      {heroEnabled ? (
        <section className="relative min-h-[42vh] sm:min-h-[52vh] flex items-end">
          {theme.heroImageUrl ? (
            <img
              src={theme.heroImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`,
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.1))",
            }}
          />
          <div className="relative z-10 px-4 sm:px-8 pb-10 pt-24 max-w-3xl min-w-0">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white break-words">
              {organizerName}
            </h1>
            {theme.tagline ? (
              <p className="mt-3 text-white/90 text-base sm:text-lg max-w-xl break-words">
                {theme.tagline}
              </p>
            ) : null}
            <Cta className="mt-6 h-12 px-5">{t("microsite.athleteLogin")}</Cta>
          </div>
        </section>
      ) : null}

      {about?.enabled ? (
        <section className="px-4 sm:px-8 py-12 max-w-3xl min-w-0">
          <h2
            className="text-xl font-semibold mb-3"
            style={{ color: theme.primaryColor }}
          >
            {t("microsite.about")}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed opacity-80 break-words">
            {String(
              about.contentJson.body ||
                t("microsite.aboutFallback", { name: organizerName }),
            )}
          </p>
        </section>
      ) : null}

      {eventsSec?.enabled ? (
        <section className="px-4 sm:px-8 pb-12 max-w-3xl min-w-0">
          <h2
            className="text-xl font-semibold mb-3"
            style={{ color: theme.primaryColor }}
          >
            {t("microsite.upcomingEvents")}
          </h2>
          {showUnpublishedEvents ? (
            <p className="text-xs opacity-60 mb-3 break-words">
              {t("microsite.eventsPreviewNote")}
            </p>
          ) : null}
          {events.length === 0 ? (
            <p className="text-sm opacity-70">
              {showUnpublishedEvents
                ? t("microsite.eventsEmptyEditor")
                : t("microsite.eventsSoon")}
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => {
                const href = `/events/${encodeURIComponent(event.slug)}`;
                const body = (
                  <>
                    <div
                      className="h-16 w-20 sm:h-20 sm:w-28 shrink-0 overflow-hidden"
                      style={{
                        borderRadius: radius,
                        background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`,
                      }}
                    >
                      {event.heroImageUrl ? (
                        <img
                          src={event.heroImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <p className="font-semibold text-sm sm:text-base break-words">
                          {event.title}
                        </p>
                        {showUnpublishedEvents || event.status !== "published" ? (
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${theme.accentColor}55`,
                              color: theme.secondaryColor,
                            }}
                          >
                            {t(eventStatusLabelKey(event.status))}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs sm:text-sm opacity-70 break-words">
                        {formatEventDate(event.startDate, i18n.language)}
                        {event.locationCity ? ` · ${event.locationCity}` : ""}
                        {event.sportName ? ` · ${event.sportName}` : ""}
                      </p>
                    </div>
                  </>
                );

                const rowClass =
                  "flex gap-3 items-stretch min-w-0 p-3 border transition-opacity";
                const rowStyle = {
                  borderColor: `${theme.primaryColor}22`,
                  borderRadius: radius,
                } as const;

                if (!interactive) {
                  return (
                    <li key={event.id} className={rowClass} style={rowStyle}>
                      {body}
                    </li>
                  );
                }

                return (
                  <li key={event.id}>
                    <a
                      href={href}
                      className={cn(rowClass, "hover:opacity-90")}
                      style={rowStyle}
                    >
                      {body}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {sponsorsSec?.enabled ? (
        <section className="px-4 sm:px-8 pb-12 max-w-3xl min-w-0">
          <h2
            className="text-xl font-semibold mb-3"
            style={{ color: theme.primaryColor }}
          >
            {t("microsite.sponsors")}
          </h2>
          <p className="text-sm opacity-70">{t("microsite.sponsorsSoon")}</p>
        </section>
      ) : null}

      {faqSec?.enabled ? (
        <section className="px-4 sm:px-8 pb-12 max-w-3xl min-w-0">
          <h2
            className="text-xl font-semibold mb-3"
            style={{ color: theme.primaryColor }}
          >
            {t("microsite.faq")}
          </h2>
          <p className="text-sm opacity-70">{t("microsite.faqSoon")}</p>
        </section>
      ) : null}

      {footerSec?.enabled !== false ? (
        <footer
          className="mt-auto px-4 sm:px-8 py-8 border-t text-sm opacity-70"
          style={{ borderColor: `${theme.primaryColor}18` }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <p className="break-words min-w-0">
              {t("microsite.poweredBy")}{" "}
              {poweredByHref ? (
                <a
                  href={poweredByHref}
                  className="font-semibold underline-offset-2 hover:underline"
                  style={{ color: theme.primaryColor }}
                >
                  Atleita
                </a>
              ) : (
                <span
                  className="font-semibold"
                  style={{ color: theme.primaryColor }}
                >
                  Atleita
                </span>
              )}
            </p>
            <nav className="flex flex-wrap gap-x-3 gap-y-1 text-xs min-w-0">
              {(
                [
                  ["terms", "microsite.legalTitles.terms"],
                  ["privacy", "microsite.legalTitles.privacy"],
                  ["refund", "microsite.legalTitles.refund"],
                ] as const
              ).map(([key, labelKey]) =>
                interactive ? (
                  <a
                    key={key}
                    href={`/legal/${key}`}
                    className="hover:underline underline-offset-2"
                    style={{ color: theme.primaryColor }}
                  >
                    {t(labelKey)}
                  </a>
                ) : (
                  <span key={key}>{t(labelKey)}</span>
                ),
              )}
            </nav>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
