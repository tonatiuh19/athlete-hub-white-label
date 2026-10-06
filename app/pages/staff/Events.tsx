import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { StaffEventRow } from "@shared/api";
import MetaHelmet from "@/components/MetaHelmet";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import StaffPaidEventPayoutAlert, {
  eventNeedsPayoutAlert,
} from "@/components/staff/StaffPaidEventPayoutAlert";
import StaffEventsCalendarView from "@/components/staff/StaffEventsCalendarView";
import StaffEventsCardGrid from "@/components/staff/StaffEventsCardGrid";
import StaffCreateSimulationDialog from "@/components/staff/StaffCreateSimulationDialog";
import StaffEventsEmptyState from "@/components/staff/StaffEventsEmptyState";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import { StaffCalendarSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearEventDetail,
  fetchAdminEvents,
  fetchOrganizerEvents,
} from "@/store/slices/staffPortalSlice";
import { useGridListState } from "@/hooks/useGridListState";
import { getDateFnsLocale, getNumberLocale } from "@/utils/dateLocale";
import {
  canOrganizerCreateEvents,
  canOrganizerManageSimulations,
} from "@/utils/staffNav";
import { isStaffSimulationsEnabled } from "@/utils/staffFeatureFlags";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS_LIMIT = 100;
const CALENDAR_LIMIT = 100;

type EventKindFilter = "all" | "0" | "1";
type EventsViewMode = "cards" | "list" | "calendar";

const simulationsEnabled = isStaffSimulationsEnabled();

function parseEventKindFilter(raw: string | null): EventKindFilter {
  if (raw === "0" || raw === "1" || raw === "all") return raw;
  return "0";
}

export default function StaffEvents() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const { events, eventsPagination, loadingEvents, eventsError } = useAppSelector(
    (s) => s.staffPortal,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(() => searchParams.get("status") || "all");
  const [kind, setKind] = useState<EventKindFilter>(() =>
    simulationsEnabled
      ? parseEventKindFilter(searchParams.get("simulation"))
      : "0",
  );
  const [viewMode, setViewMode] = useState<EventsViewMode>("cards");
  const [debounced, setDebounced] = useState("");
  const [simDialogOpen, setSimDialogOpen] = useState(false);

  /** Drop stale ?simulation= when feature is off (e.g. /staff/simulations bookmark). */
  useEffect(() => {
    if (simulationsEnabled) return;
    if (!searchParams.has("simulation")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("simulation");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const { page, setPage, sortBy, sortDir, onSort, gridParams } = useGridListState(
    "start_date",
    20,
  );
  const dateLocale = getDateFnsLocale(i18n.language);
  const numLocale = getNumberLocale(i18n.language);
  const isAdmin = role === "admin";
  const canCreate =
    isAdmin ||
    (user?.type === "organizer" && canOrganizerCreateEvents(user.role));
  const canCreateSim =
    simulationsEnabled &&
    !isAdmin &&
    user?.type === "organizer" &&
    canOrganizerManageSimulations(user.role);

  const effectiveKind: EventKindFilter = simulationsEnabled ? kind : "0";

  useEffect(() => {
    dispatch(clearEventDetail());
  }, [dispatch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, setPage]);

  useEffect(() => {
    setPage(1);
  }, [status, effectiveKind, setPage]);

  const listFilters = useMemo(
    () => ({
      q: debounced || undefined,
      status: status === "all" ? undefined : status,
      simulation: effectiveKind === "all" ? undefined : effectiveKind,
    }),
    [debounced, status, effectiveKind],
  );

  useEffect(() => {
    if (role !== "admin" && role !== "organizer") return;

    if (viewMode === "calendar") {
      const calendarParams = {
        ...listFilters,
        page: 1,
        limit: CALENDAR_LIMIT,
        sortBy: "start_date" as const,
        sortDir: "ASC" as const,
      };
      if (role === "admin") {
        void dispatch(fetchAdminEvents(calendarParams));
      } else {
        void dispatch(fetchOrganizerEvents(calendarParams));
      }
      return;
    }

    const params = {
      ...listFilters,
      ...gridParams,
    };
    if (role === "admin") {
      void dispatch(fetchAdminEvents(params));
    } else {
      void dispatch(fetchOrganizerEvents(params));
    }
  }, [dispatch, role, viewMode, listFilters, gridParams]);

  const reload = useCallback(() => {
    if (isAdmin) {
      void dispatch(
        fetchAdminEvents({
          ...listFilters,
          ...(viewMode === "calendar"
            ? { page: 1, limit: CALENDAR_LIMIT, sortBy: "start_date", sortDir: "ASC" as const }
            : gridParams),
        }),
      );
    } else {
      void dispatch(
        fetchOrganizerEvents({
          ...listFilters,
          ...(viewMode === "calendar"
            ? { page: 1, limit: CALENDAR_LIMIT, sortBy: "start_date", sortDir: "ASC" as const }
            : gridParams),
        }),
      );
    }
  }, [dispatch, isAdmin, listFilters, viewMode, gridParams]);

  const list = events;
  const blockedPaymentEvents = list.filter((ev) => eventNeedsPayoutAlert(ev));
  const hasActiveFilters = Boolean(debounced.trim()) || status !== "all";
  const emptyKind =
    effectiveKind === "1"
      ? ("simulation" as const)
      : hasActiveFilters
        ? ("filtered" as const)
        : ("live" as const);
  const emptyMessage =
    emptyKind === "simulation"
      ? t("staffPortal.events.emptySimulation")
      : emptyKind === "filtered"
        ? t("staffPortal.events.empty")
        : t("staffPortal.events.emptyLive");

  const emptyState = (
    <StaffEventsEmptyState
      kind={emptyKind}
      canCreate={canCreate}
      canCreateSim={canCreateSim}
      createHref="/staff/events/new"
      onCreateSimulation={
        canCreateSim ? () => setSimDialogOpen(true) : undefined
      }
    />
  );

  const setKindFilter = (next: EventKindFilter) => {
    if (!simulationsEnabled) return;
    setKind(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === "0") nextParams.delete("simulation");
    else nextParams.set("simulation", next);
    setSearchParams(nextParams, { replace: true });
  };

  const columns = useMemo((): DataGridColumn<StaffEventRow>[] => {
    const cols: DataGridColumn<StaffEventRow>[] = [
      {
        key: "title",
        label: t("staffPortal.events.colTitle"),
        sortable: true,
        sticky: true,
        wrap: true,
        className: "min-w-[14rem] max-w-[22rem]",
        render: (ev) => (
          <div className="min-w-0 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{ev.title}</span>
              <StaffStatusBadge status={ev.status} />
              {simulationsEnabled && ev.is_simulation ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                  <FlaskConical className="h-3 w-3" />
                  {t("simulation.badge")}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {ev.sport_name}
              {isAdmin && ev.organizer_name ? ` · ${ev.organizer_name}` : ""}
            </p>
            {eventNeedsPayoutAlert(ev) ? (
              <StaffPaidEventPayoutAlert
                isAdmin={isAdmin}
                organizerId={ev.organizer_id}
                compact
                className="mt-2"
              />
            ) : null}
          </div>
        ),
      },
      {
        key: "start_date",
        label: t("staffPortal.events.colDate"),
        sortable: true,
        render: (ev) => (
          <span className="text-sm tabular-nums whitespace-nowrap">
            {format(new Date(ev.start_date), "d MMM yyyy", { locale: dateLocale })}
          </span>
        ),
      },
      {
        key: "location_city",
        label: t("staffPortal.events.colCity"),
        sortable: true,
        render: (ev) =>
          ev.location_city ? (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[8rem]">{ev.location_city}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: "registration_count",
        label: t("staffPortal.events.colRegistrations"),
        sortable: true,
        render: (ev) => (
          <span className="font-bold text-primary tabular-nums">
            {ev.registration_count.toLocaleString(numLocale)}
          </span>
        ),
      },
      {
        key: "actions",
        label: t("staffPortal.events.colActions"),
        shrink: true,
        render: (ev) => (
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {simulationsEnabled && ev.is_simulation ? (
              <Link
                to={`/staff/events/${ev.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <FlaskConical className="w-3 h-3" />
                {t("simulation.manageInHub")}
              </Link>
            ) : ev.status === "published" ? (
              <Link
                to={`/events/${ev.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {t("staffPortal.events.viewPublic")}
                <ExternalLink className="w-3 h-3" />
              </Link>
            ) : null}
            <Link
              to={`/staff/events/${ev.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <LayoutDashboard className="w-3 h-3" />
              {t("staffPortal.events.enter")}
            </Link>
          </div>
        ),
      },
    ];

    if (isAdmin) {
      cols.splice(1, 0, {
        key: "organizer_name",
        label: t("staffPortal.events.colOrganizer"),
        sortable: true,
        render: (ev) => (
          <span className="text-sm truncate max-w-[10rem] block">
            {ev.organizer_name || "—"}
          </span>
        ),
      });
    }

    return cols;
  }, [t, isAdmin, dateLocale, numLocale]);

  return (
    <div className="max-w-6xl mx-auto w-full min-w-0 overflow-x-clip space-y-6">
      <MetaHelmet
        title={isAdmin ? t("staffPortal.events.titleAdmin") : t("staffPortal.events.titleOrganizer")}
        description={t("staffPortal.events.subtitle")}
      />
      <StaffPageHeader
        icon={Calendar}
        title={isAdmin ? t("staffPortal.events.titleAdmin") : t("staffPortal.events.titleOrganizer")}
        subtitle={
          isAdmin
            ? t("staffPortal.events.subtitle")
            : simulationsEnabled
              ? t("staffPortal.events.subtitleOrganizer")
              : t("staffPortal.events.subtitleOrganizerSimple")
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0 sm:min-w-[12rem] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("staffPortal.events.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-44 shrink-0">
                <SelectValue placeholder={t("staffPortal.events.statusFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("staffPortal.events.statusAll")}</SelectItem>
                <SelectItem value="draft">{t("staffPortal.events.statusDraft")}</SelectItem>
                <SelectItem value="pending_approval">
                  {t("staffPortal.events.statusPendingApproval")}
                </SelectItem>
                <SelectItem value="published">{t("staffPortal.events.statusPublished")}</SelectItem>
                <SelectItem value="completed">{t("staffPortal.events.statusCompleted")}</SelectItem>
                <SelectItem value="cancelled">{t("staffPortal.events.statusCancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAdmin ? (
            <Button asChild type="button" className="w-full sm:w-auto shrink-0">
              <Link to="/staff/events/new">
                <Plus className="w-4 h-4 mr-2" />
                {t("staffPortal.events.createAdmin")}
              </Link>
            </Button>
          ) : null}
          {!isAdmin && canCreate ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-2 w-full lg:w-auto shrink-0">
              <Button asChild className="w-full lg:w-auto">
                <Link to="/staff/events/new">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("staffPortal.events.create")}
                </Link>
              </Button>
              {canCreateSim ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full lg:w-auto"
                  onClick={() => setSimDialogOpen(true)}
                >
                  <FlaskConical className="w-4 h-4 mr-2" />
                  {t("staffPortal.events.createSimulation")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          {simulationsEnabled ? (
            <div className="inline-flex rounded-xl border border-border p-0.5 bg-card/50 w-full sm:w-auto min-w-0 overflow-x-auto">
              <Button
                type="button"
                size="sm"
                variant={effectiveKind === "0" ? "default" : "ghost"}
                className="h-9 flex-1 sm:flex-none px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm whitespace-nowrap"
                onClick={() => setKindFilter("0")}
                aria-pressed={effectiveKind === "0"}
              >
                {t("staffPortal.events.kindLive")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={effectiveKind === "1" ? "default" : "ghost"}
                className="h-9 flex-1 sm:flex-none px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm whitespace-nowrap"
                onClick={() => setKindFilter("1")}
                aria-pressed={effectiveKind === "1"}
              >
                <FlaskConical className="w-3.5 h-3.5 mr-1 sm:mr-1.5 shrink-0" />
                {t("staffPortal.events.kindSimulation")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={effectiveKind === "all" ? "default" : "ghost"}
                className="h-9 flex-1 sm:flex-none px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm whitespace-nowrap"
                onClick={() => setKindFilter("all")}
                aria-pressed={effectiveKind === "all"}
              >
                {t("staffPortal.events.kindAll")}
              </Button>
            </div>
          ) : null}
          <div className="inline-flex rounded-xl border border-border p-0.5 bg-card/50 shrink-0 self-start sm:self-auto">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "cards" ? "default" : "ghost"}
              className="h-9 px-3 rounded-lg"
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("staffPortal.events.viewCards")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-9 px-3 rounded-lg"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
            >
              <List className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("staffPortal.events.viewList")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              className="h-9 px-3 rounded-lg"
              onClick={() => setViewMode("calendar")}
              aria-pressed={viewMode === "calendar"}
            >
              <CalendarDays className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("staffPortal.events.viewCalendar")}</span>
            </Button>
          </div>
        </div>
      </div>

      {canCreateSim ? (
        <StaffCreateSimulationDialog
          open={simDialogOpen}
          onOpenChange={setSimDialogOpen}
          onCreated={() => {
            setKindFilter("1");
          }}
        />
      ) : null}

      <PortalErrorAlert error={eventsError} onRetry={reload} />

      {blockedPaymentEvents.length > 0 ? (
        <StaffPaidEventPayoutAlert
          isAdmin={isAdmin}
          organizerId={blockedPaymentEvents[0]?.organizer_id}
        />
      ) : null}

      {viewMode === "calendar" ? (
        loadingEvents && list.length === 0 ? (
          <StaffCalendarSkeleton />
        ) : eventsError ? null : list.length === 0 ? (
          emptyState
        ) : (
          <div className="space-y-2">
            {(eventsPagination?.total ?? 0) > CALENDAR_LIMIT ? (
              <p className="text-xs text-muted-foreground">
                {t("staffPortal.events.calendarCapHint", { limit: CALENDAR_LIMIT })}
              </p>
            ) : null}
            <StaffEventsCalendarView events={list} isAdmin={isAdmin} />
          </div>
        )
      ) : viewMode === "cards" ? (
        loadingEvents && list.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : eventsError ? null : list.length === 0 ? (
          emptyState
        ) : (
          <div className="space-y-4">
            <StaffEventsCardGrid events={list} isAdmin={isAdmin} />
            {eventsPagination && eventsPagination.totalPages > 1 ? (
              <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
                <span>
                  {t("staffPortal.events.paginationShowing", {
                    from: (eventsPagination.page - 1) * eventsPagination.limit + 1,
                    to: Math.min(
                      eventsPagination.page * eventsPagination.limit,
                      eventsPagination.total,
                    ),
                    total: eventsPagination.total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(eventsPagination.page - 1)}
                    disabled={eventsPagination.page <= 1}
                    aria-label={t("staffPortal.events.paginationPrev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs">
                    {t("staffPortal.events.paginationPage", {
                      page: eventsPagination.page,
                      totalPages: eventsPagination.totalPages,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(eventsPagination.page + 1)}
                    disabled={eventsPagination.page >= eventsPagination.totalPages}
                    aria-label={t("staffPortal.events.paginationNext")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )
      ) : loadingEvents && list.length === 0 ? (
        <DataGrid<StaffEventRow>
          data={[]}
          columns={columns}
          rowKey={(ev) => ev.id}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          onPageChange={setPage}
          isLoading
          emptyMessage={emptyMessage}
        />
      ) : eventsError ? null : list.length === 0 ? (
        emptyState
      ) : (
        <DataGrid<StaffEventRow>
          data={list}
          columns={columns}
          rowKey={(ev) => ev.id}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          pagination={eventsPagination}
          onPageChange={setPage}
          isLoading={loadingEvents}
          emptyMessage={emptyMessage}
          mobileCard={(ev) => (
            <div className="card-sport p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold truncate">{ev.title}</h2>
                    <StaffStatusBadge status={ev.status} />
                    {simulationsEnabled && ev.is_simulation ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                        <FlaskConical className="h-3 w-3" />
                        {t("simulation.badge")}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ev.sport_name}
                    {isAdmin && ev.organizer_name ? ` · ${ev.organizer_name}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-primary tabular-nums">
                    {ev.registration_count.toLocaleString(numLocale)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {t("staffPortal.dashboard.registered")}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(ev.start_date), "d MMM yyyy", { locale: dateLocale })}
                </span>
                {ev.location_city ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {ev.location_city}
                  </span>
                ) : null}
              </p>
              {eventNeedsPayoutAlert(ev) ? (
                <StaffPaidEventPayoutAlert
                  isAdmin={isAdmin}
                  organizerId={ev.organizer_id}
                  compact
                />
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                {ev.status === "published" ? (
                  <Link
                    to={`/events/${ev.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary"
                  >
                    {t("staffPortal.events.viewPublic")}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : null}
                <Link
                  to={`/staff/events/${ev.id}`}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-semibold text-primary",
                  )}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {t("staffPortal.events.enter")}
                </Link>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}

/** Prefer this limit when loading events for filter dropdowns in other staff panels. */
export const STAFF_EVENT_FILTER_OPTIONS_LIMIT = FILTER_OPTIONS_LIMIT;
