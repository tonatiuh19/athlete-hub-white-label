import { Link } from "react-router-dom";
import { resolveApexHostname } from "@/utils/hostContext";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import { useEventConsoleRequired } from "@/components/staff/event-console/EventConsoleContext";
import EventConsoleSectionHeader from "@/components/staff/event-console/EventConsoleSectionHeader";
import StaffEventLifecycleActions from "@/components/staff/StaffEventLifecycleActions";
import StaffSimulationEventPanel from "@/components/staff/StaffSimulationEventPanel";
import { Button } from "@/components/ui/button";
import { useEnsureStaffEventDetail } from "@/hooks/useEnsureStaffEventDetail";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchStaffEventDetail } from "@/store/slices/staffPortalSlice";
import { canOrganizerEditEvents } from "@/utils/staffNav";
import { isStaffSimulationsEnabled } from "@/utils/staffFeatureFlags";
import type { StaffRole } from "@shared/api";

const simulationsEnabled = isStaffSimulationsEnabled();

export default function EventConsoleAdvanced() {
  const { t } = useTranslation();
  const { eventId } = useEventConsoleRequired();
  const dispatch = useAppDispatch();
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const { eventDetailError } = useAppSelector((s) => s.staffPortal);
  const { event, loading } = useEnsureStaffEventDetail(eventId);
  const staffRole: StaffRole = role === "admin" ? "admin" : "organizer";
  const isAdmin = role === "admin";
  const canDeactivate =
    isAdmin ||
    (user?.type === "organizer" && canOrganizerEditEvents(user.role));
  const canDeleteEvent =
    isAdmin ||
    (user?.type === "organizer" &&
      (user.role === "owner" || user.role === "organizer"));

  const reload = () => {
    void dispatch(fetchStaffEventDetail({ eventId, role: staffRole }));
  };

  const vanityHost = event?.subdomain
    ? `${event.subdomain}.${resolveApexHostname()}`
    : null;

  return (
    <div className="space-y-6 animate-slide-up max-w-3xl">
      <MetaHelmet title={t("staffPortal.eventConsole.advanced.title")} />
      <EventConsoleSectionHeader
        title={t("staffPortal.eventConsole.advanced.title")}
        subdomain={event?.subdomain}
        subdomainLive={
          event?.status === "published" || event?.status === "completed"
        }
      />
      <p className="text-sm text-muted-foreground -mt-2">
        {t("staffPortal.eventConsole.advanced.subtitle")}
      </p>

      <PortalErrorAlert error={eventDetailError} onRetry={reload} />

      {loading && !event ? (
        <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />
      ) : null}

      {event ? (
        <>
          <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-3">
            <h2 className="text-sm font-semibold">
              {t("staffPortal.eventConsole.advanced.publicLinks")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {(event.status === "published" || event.status === "completed") &&
              Number(event.is_simulation) !== 1 ? (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to={`/events/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("staffPortal.events.viewPublic")}
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {vanityHost ? (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`https://${vanityHost}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("staffPortal.events.viewSubdomain", {
                          host: vanityHost,
                        })}
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("staffPortal.eventConsole.advanced.publicLinksDraft")}
                </p>
              )}
            </div>
          </div>

          {Number(event.is_simulation) !== 1 &&
          (canDeactivate || canDeleteEvent) ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t("staffPortal.eventHub.lifecycleTitle")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("staffPortal.eventHub.lifecycleHint")}
                </p>
              </div>
              <StaffEventLifecycleActions
                eventId={event.id}
                eventTitle={event.title}
                role={staffRole}
                visibility={event.visibility}
                status={event.status}
                canDeactivate={canDeactivate}
                canDelete={canDeleteEvent}
                onDone={reload}
              />
            </div>
          ) : null}

          {simulationsEnabled ? (
            <StaffSimulationEventPanel
              eventId={eventId}
              staffRole={staffRole}
              isSimulation={Number(event.is_simulation) === 1}
              accessToken={event.simulation_access_token}
              expiresAt={event.simulation_expires_at}
            />
          ) : null}

          <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-2">
            <h2 className="text-sm font-semibold">
              {t("staffPortal.eventConsole.advanced.sponsorsTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("staffPortal.eventConsole.advanced.sponsorsHint")}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={`/staff/events/${eventId}/edit?tab=sponsors`}>
                {t("staffPortal.eventConsole.advanced.openSponsors")}
              </Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
