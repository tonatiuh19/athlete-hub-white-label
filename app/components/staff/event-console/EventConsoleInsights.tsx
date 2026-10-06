import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BarChart3, ExternalLink } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import { useEventConsoleRequired } from "@/components/staff/event-console/EventConsoleContext";
import EventConsoleSectionHeader from "@/components/staff/event-console/EventConsoleSectionHeader";
import SponsorAnalyticsPanel from "@/components/staff/SponsorAnalyticsPanel";
import { Button } from "@/components/ui/button";
import { useEnsureStaffEventDetail } from "@/hooks/useEnsureStaffEventDetail";
import { useAppSelector } from "@/store/hooks";
import type { StaffRole } from "@shared/api";

export default function EventConsoleInsights() {
  const { t } = useTranslation();
  const { eventId } = useEventConsoleRequired();
  const { role } = useAppSelector((s) => s.staffAuth);
  const { event, loading } = useEnsureStaffEventDetail(eventId);
  const staffRole: StaffRole = role === "admin" ? "admin" : "organizer";

  return (
    <div className="space-y-6 animate-slide-up">
      <MetaHelmet title={t("staffPortal.eventConsole.insights.title")} />
      <EventConsoleSectionHeader
        title={t("staffPortal.eventConsole.insights.title")}
        subdomain={event?.subdomain}
        subdomainLive={
          event?.status === "published" || event?.status === "completed"
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/staff/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              {t("staffPortal.eventConsole.insights.orgAnalytics")}
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground -mt-2">
        {t("staffPortal.eventConsole.insights.subtitle")}
      </p>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 p-4 md:p-6">
          <SponsorAnalyticsPanel eventId={eventId} role={staffRole} />
        </div>
      )}
    </div>
  );
}
