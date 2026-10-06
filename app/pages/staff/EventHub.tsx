import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Link,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Banknote,
  Calendar,
  MapPin,
  Pencil,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import { useEventConsole } from "@/components/staff/event-console/EventConsoleContext";
import EventConsoleSectionHeader from "@/components/staff/event-console/EventConsoleSectionHeader";
import { SectionShell } from "@/components/staff/event-edit/primitives";
import StaffCheckInPanel from "@/components/staff/StaffCheckInPanel";
import StaffEventRegistrationsPanel from "@/components/staff/StaffEventRegistrationsPanel";
import StaffPaidEventPayoutAlert, {
  eventNeedsPayoutAlert,
} from "@/components/staff/StaffPaidEventPayoutAlert";
import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import {
  StaffStatsCardsSkeleton,
  StaffTableSkeleton,
} from "@/components/staff/skeletons/StaffSkeletons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ScrollableTabsList,
  ScrollableTabsTrigger,
} from "@/components/ui/scrollable-tabs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchEventHubSummary,
  fetchEventWaitlist,
  offerWaitlistSpot,
  revokeWaitlistEntry,
} from "@/store/slices/staffPortalSlice";
import { useEnsureStaffEventDetail } from "@/hooks/useEnsureStaffEventDetail";
import { getDateFnsLocale, getNumberLocale } from "@/utils/dateLocale";
import {
  canAccessEventConsoleSection,
  eventConsoleHref,
} from "@/utils/eventConsoleNav";
import { isStaffSimulationsEnabled } from "@/utils/staffFeatureFlags";
import type { StaffRole } from "@shared/api";
import { cn } from "@/lib/utils";

const simulationsEnabled = isStaffSimulationsEnabled();
const OPS_TABS = new Set(["registrations", "waitlist", "checkin"]);

export default function StaffEventHub() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = Number(eventIdParam);
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const consoleCtx = useEventConsole();
  const inConsole = Boolean(consoleCtx);

  const isOverviewRoute = /\/overview\/?$/.test(location.pathname);
  const isOpsRoute = /\/ops\/?$/.test(location.pathname);
  const mode: "overview" | "ops" = isOpsRoute ? "ops" : "overview";

  const { role, user } = useAppSelector((s) => s.staffAuth);
  const staffRole: StaffRole = role === "admin" ? "admin" : "organizer";
  const isAdmin = role === "admin";
  const organizerRole =
    user?.type === "organizer" ? user.role : undefined;
  const accessCtx = { isAdmin, organizerRole };

  const { event, eventDetail, loading: loadingDetail } =
    useEnsureStaffEventDetail(eventId);
  const {
    eventHubSummary,
    waitlistEntries,
    loadingEventHubSummary,
    loadingWaitlist,
    eventHubSummaryError,
    waitlistError,
    offeringWaitlist,
    eventDetailError,
  } = useAppSelector((s) => s.staffPortal);

  const tabFromUrl = searchParams.get("tab");
  const tab = useMemo(() => {
    if (mode === "overview") return "overview";
    if (tabFromUrl && OPS_TABS.has(tabFromUrl)) return tabFromUrl;
    return "registrations";
  }, [mode, tabFromUrl]);

  const setTab = (next: string) => {
    if (mode !== "ops") return;
    const nextParams = new URLSearchParams(searchParams);
    if (next === "registrations") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

  const dateLocale = getDateFnsLocale(i18n.language);
  const numLocale = getNumberLocale(i18n.language);

  useEffect(() => {
    if (!Number.isFinite(eventId) || !role) return;
    void dispatch(fetchEventHubSummary({ eventId, role: staffRole }));
  }, [dispatch, eventId, staffRole, role]);

  useEffect(() => {
    if (tab === "waitlist" && Number.isFinite(eventId)) {
      void dispatch(fetchEventWaitlist({ eventId, role: staffRole }));
    }
  }, [dispatch, tab, eventId, staffRole]);

  if (!role || (role !== "admin" && role !== "organizer")) {
    return <Navigate to="/staff" replace />;
  }

  if (!Number.isFinite(eventId)) {
    return <Navigate to="/staff/events" replace />;
  }

  if (!isOverviewRoute && !isOpsRoute) {
    return <Navigate to={`/staff/events/${eventId}/overview`} replace />;
  }

  const summary = eventHubSummary;
  const isLoading = loadingDetail && !event;
  const showPaymentsUnavailableAlert = eventNeedsPayoutAlert({
    status: event?.status,
    has_paid_categories:
      event?.has_paid_categories ?? eventHubSummary?.has_paid_categories,
    payments_available:
      event?.payments_available ?? eventHubSummary?.payments_available,
  });
  const loadError = eventDetailError || eventHubSummaryError;

  const reload = () => {
    void dispatch(fetchEventHubSummary({ eventId, role: staffRole }));
  };

  const quickLinks = [
    canAccessEventConsoleSection("ops", accessCtx)
      ? {
          to: eventConsoleHref(eventId, "ops"),
          label: t("staffPortal.eventConsole.nav.ops"),
          icon: Users,
        }
      : null,
    canAccessEventConsoleSection("edit", accessCtx)
      ? {
          to: eventConsoleHref(eventId, "edit"),
          label: t("staffPortal.eventConsole.nav.edit"),
          icon: Pencil,
        }
      : null,
    canAccessEventConsoleSection("results", accessCtx)
      ? {
          to: eventConsoleHref(eventId, "results"),
          label: t("staffPortal.eventConsole.nav.results"),
          icon: Trophy,
        }
      : null,
    canAccessEventConsoleSection("cobros", accessCtx)
      ? {
          to: eventConsoleHref(eventId, "cobros"),
          label: t("staffPortal.eventConsole.nav.cobros"),
          icon: Banknote,
        }
      : null,
    canAccessEventConsoleSection("insights", accessCtx)
      ? {
          to: eventConsoleHref(eventId, "insights"),
          label: t("staffPortal.eventConsole.nav.insights"),
          icon: TrendingUp,
        }
      : null,
  ].filter(Boolean) as {
    to: string;
    label: string;
    icon: typeof Users;
  }[];

  const overviewBody =
    loadingEventHubSummary && !summary ? (
      <StaffStatsCardsSkeleton />
    ) : summary ? (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: t("staffPortal.eventHub.statConfirmed"),
              value: summary.confirmed_count,
              accent: "text-primary",
            },
            {
              label: t("staffPortal.eventHub.statPending"),
              value: summary.pending_count,
              accent: "text-blue-electric",
            },
            {
              label: t("staffPortal.eventHub.statCheckedIn"),
              value: summary.checked_in_count,
              accent: "text-success",
            },
            {
              label: t("staffPortal.eventHub.statRevenue"),
              value: `$${(summary.revenue_cents / 100).toLocaleString(numLocale)}`,
              accent: "text-primary",
            },
          ].map(({ label, value, accent }) => (
            <div key={label} className="card-sport p-4">
              <div className={`text-2xl font-bold ${accent}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="card-sport p-4">
            <div className="text-lg font-bold">{summary.cancelled_count}</div>
            <div className="text-xs text-muted-foreground">
              {t("staffPortal.eventHub.statCancelled")}
            </div>
          </div>
          <div className="card-sport p-4">
            <div className="text-lg font-bold">{summary.waitlist_count}</div>
            <div className="text-xs text-muted-foreground">
              {t("staffPortal.eventHub.statWaitlist")}
            </div>
          </div>
        </div>

        {summary.categories.length > 0 ? (
          <SectionShell title={t("staffPortal.eventHub.categoriesTitle")}>
            <div className="space-y-1.5">
              {summary.categories.map((cat) => {
                const pct =
                  cat.capacity != null && cat.capacity > 0
                    ? Math.min(
                        100,
                        Math.round((cat.sold_count / cat.capacity) * 100),
                      )
                    : null;
                return (
                  <div
                    key={cat.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border/70 px-2.5 py-2"
                  >
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat.sold_count}
                        {cat.capacity != null ? ` / ${cat.capacity}` : ""}{" "}
                        {t("staffPortal.dashboard.registered")}
                      </p>
                    </div>
                    {pct != null ? (
                      <div className="w-full sm:w-32">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </SectionShell>
        ) : null}

        {event?.max_registrations ? (
          <p className="text-sm text-muted-foreground">
            {t("staffPortal.eventHub.eventCapacity", {
              current: event.registration_count,
              max: event.max_registrations,
            })}
          </p>
        ) : null}

        {inConsole && quickLinks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 pt-1">
            {quickLinks.map(({ to, label, icon: Icon }) => (
              <Button
                key={to}
                asChild
                type="button"
                variant="outline"
                className="h-auto justify-start gap-2 px-3 py-3"
              >
                <Link to={to}>
                  <Icon className="w-4 h-4 shrink-0 text-primary" />
                  <span className="text-left text-xs font-semibold leading-tight">
                    {label}
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
      </>
    ) : null;

  const waitlistBody = (
    <SectionShell
      title={t("staffPortal.eventEdit.waitlistTitle")}
      hint={t("staffPortal.eventEdit.waitlistSubtitle")}
    >
      {waitlistError ? (
        <p className="text-xs text-destructive">{waitlistError}</p>
      ) : null}
      {loadingWaitlist ? (
        <StaffTableSkeleton rows={4} columns={3} />
      ) : waitlistEntries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("staffPortal.eventEdit.waitlistEmpty")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {waitlistEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border/70 px-2.5 py-2"
            >
              <div>
                <p className="font-medium">
                  {entry.athlete_first_name} {entry.athlete_last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.athlete_email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {entry.category_name} · #{entry.position} ·{" "}
                  {t(`staffPortal.eventEdit.waitlistStatus.${entry.status}`, {
                    defaultValue: entry.status,
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {entry.status === "waiting" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={offeringWaitlist}
                    onClick={() =>
                      dispatch(
                        offerWaitlistSpot({
                          eventId,
                          role: staffRole,
                          waitlistEntryId: entry.id,
                        }),
                      )
                    }
                  >
                    {t("staffPortal.eventEdit.waitlistOffer")}
                  </Button>
                ) : null}
                {entry.status === "waiting" || entry.status === "offered" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={offeringWaitlist}
                    className="text-destructive border-destructive/40"
                    onClick={() =>
                      dispatch(
                        revokeWaitlistEntry({
                          eventId,
                          role: staffRole,
                          waitlistEntryId: entry.id,
                        }),
                      )
                    }
                  >
                    {t("staffPortal.eventEdit.waitlistRevoke")}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );

  return (
    <div className={cn("w-full min-w-0 overflow-x-clip space-y-6 animate-slide-up")}>
      <MetaHelmet
        title={
          mode === "ops"
            ? t("staffPortal.eventConsole.nav.ops")
            : event?.title ?? t("staffPortal.eventHub.title")
        }
        description={t("staffPortal.eventHub.subtitle")}
      />

      <EventConsoleSectionHeader
        title={
          mode === "ops"
            ? t("staffPortal.eventConsole.nav.ops")
            : t("staffPortal.eventConsole.nav.overview")
        }
        badge={
          <>
            {event ? <StaffStatusBadge status={event.status} /> : null}
            {simulationsEnabled &&
            event &&
            Number(event.is_simulation) === 1 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                {t("simulation.badge")}
              </span>
            ) : null}
          </>
        }
        subdomain={event?.subdomain}
        subdomainLive={
          event?.status === "published" || event?.status === "completed"
        }
      />
      {event ? (
        <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 -mt-2">
          {event.sport_name ? <span>{event.sport_name}</span> : null}
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(event.start_date), "d MMM yyyy", {
              locale: dateLocale,
            })}
          </span>
          {event.location_city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {event.location_city}
            </span>
          ) : null}
        </p>
      ) : isLoading ? (
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      ) : null}

      <PortalErrorAlert error={loadError} onRetry={reload} />

      {showPaymentsUnavailableAlert ? (
        <StaffPaidEventPayoutAlert
          isAdmin={isAdmin}
          organizerId={event?.organizer_id}
          eventEditPath={`/staff/events/${eventId}/edit`}
        />
      ) : null}

      {!loadError && event && mode === "overview" ? (
        <div className="space-y-4">{overviewBody}</div>
      ) : null}

      {!loadError && event && mode === "ops" ? (
        <Tabs value={tab} onValueChange={setTab}>
          <ScrollableTabsList>
            <ScrollableTabsTrigger value="registrations">
              <Users className="w-4 h-4 mr-1.5 hidden sm:inline" />
              {t("staffPortal.people.titleRegistrations")}
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="waitlist">
              {t("staffPortal.eventHub.tabWaitlist")}
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="checkin">
              {t("staffPortal.eventHub.tabCheckIn")}
            </ScrollableTabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="registrations" className="mt-4">
            <StaffEventRegistrationsPanel
              eventId={eventId}
              role={staffRole}
              categories={eventDetail?.categories ?? []}
            />
          </TabsContent>
          <TabsContent value="waitlist" className="mt-4">
            {waitlistBody}
          </TabsContent>
          <TabsContent value="checkin" className="mt-4">
            <StaffCheckInPanel eventId={eventId} role={staffRole} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
