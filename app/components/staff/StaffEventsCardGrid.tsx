import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Calendar,
  ExternalLink,
  FlaskConical,
  LayoutDashboard,
  MapPin,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { StaffEventRow } from "@shared/api";
import StaffPaidEventPayoutAlert, {
  eventNeedsPayoutAlert,
} from "@/components/staff/StaffPaidEventPayoutAlert";
import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import { Button } from "@/components/ui/button";
import { optimizeEventMediaUrl } from "@/lib/cdn-url";
import { getDateFnsLocale, getNumberLocale } from "@/utils/dateLocale";
import { isStaffSimulationsEnabled } from "@/utils/staffFeatureFlags";
import { cn } from "@/lib/utils";

export interface StaffEventsCardGridProps {
  events: StaffEventRow[];
  isAdmin?: boolean;
  className?: string;
}

export default function StaffEventsCardGrid({
  events,
  isAdmin = false,
  className,
}: StaffEventsCardGridProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateFnsLocale(i18n.language);
  const numLocale = getNumberLocale(i18n.language);
  const showSimulationBadge = isStaffSimulationsEnabled();

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4",
        className,
      )}
    >
      {events.map((ev) => {
        const heroSrc = ev.hero_image_url
          ? optimizeEventMediaUrl(ev.hero_image_url, "card")
          : null;

        return (
          <article
            key={ev.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md min-w-0"
          >
            <Link
              to={`/staff/events/${ev.id}`}
              className="relative block aspect-[16/10] overflow-hidden bg-muted/40 shrink-0"
            >
              {heroSrc ? (
                <img
                  src={heroSrc}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-accent/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                <StaffStatusBadge status={ev.status} />
                {showSimulationBadge && ev.is_simulation ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-background/90 backdrop-blur px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground border border-border">
                    <FlaskConical className="h-3 w-3" />
                    {t("simulation.badge")}
                  </span>
                ) : null}
              </div>
              {ev.sport_name ? (
                <span className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/90">
                  {ev.sport_name}
                </span>
              ) : null}
            </Link>

            <div className="flex flex-1 flex-col p-4 gap-3 min-w-0">
              <div className="min-w-0 space-y-1">
                <Link
                  to={`/staff/events/${ev.id}`}
                  className="font-semibold text-base leading-snug line-clamp-2 hover:text-primary transition-colors"
                >
                  {ev.title}
                </Link>
                {isAdmin && ev.organizer_name ? (
                  <p className="text-xs text-muted-foreground truncate">{ev.organizer_name}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {format(new Date(ev.start_date), "d MMM yyyy", { locale: dateLocale })}
                </span>
                {ev.location_city ? (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate max-w-[8rem]">{ev.location_city}</span>
                  </span>
                ) : null}
              </div>

              <div className="flex items-end justify-between gap-3 pt-1">
                <div>
                  <p className="text-2xl font-bold text-primary tabular-nums leading-none">
                    {ev.registration_count.toLocaleString(numLocale)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {t("staffPortal.dashboard.registered")}
                  </p>
                </div>
                <Users className="h-5 w-5 text-muted-foreground/40 shrink-0" aria-hidden />
              </div>

              {eventNeedsPayoutAlert(ev) ? (
                <StaffPaidEventPayoutAlert isAdmin={isAdmin} organizerId={ev.organizer_id} compact />
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1 mt-auto border-t border-border/80">
                {!ev.is_simulation && ev.status === "published" ? (
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                    <Link to={`/events/${ev.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      {t("staffPortal.events.viewPublic")}
                    </Link>
                  </Button>
                ) : null}
                <Button asChild size="sm" className="h-8 text-xs btn-primary">
                  <Link to={`/staff/events/${ev.id}`}>
                    <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
                    {t("staffPortal.events.enter")}
                  </Link>
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
