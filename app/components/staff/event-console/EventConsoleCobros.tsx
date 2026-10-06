import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import StaffManualSaleDialog from "@/components/staff/StaffManualSaleDialog";
import { useEventConsoleRequired } from "@/components/staff/event-console/EventConsoleContext";
import EventConsoleSectionHeader from "@/components/staff/event-console/EventConsoleSectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminOrganizerConnect,
  fetchEventHubSummary,
  fetchOrganizerPayoutStatus,
} from "@/store/slices/staffPortalSlice";
import { useEnsureStaffEventDetail } from "@/hooks/useEnsureStaffEventDetail";
import { eventConsolePaymentsPath } from "@/utils/eventConsoleNav";
import {
  canOrganizerRecordManualSale,
  canShowCobrosPayoutSetupCta,
  staffPayoutSetupPath,
} from "@/utils/staffNav";
import { getNumberLocale } from "@/utils/dateLocale";
import type { StaffRole } from "@shared/api";

export default function EventConsoleCobros() {
  const { t, i18n } = useTranslation();
  const { eventId } = useEventConsoleRequired();
  const dispatch = useAppDispatch();
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const {
    payoutStatus,
    loadingPayoutStatus,
    payoutStatusError,
    adminOrganizerConnect,
    loadingAdminOrganizerConnect,
    adminOrganizerConnectError,
    eventHubSummary,
    loadingEventHubSummary,
  } = useAppSelector((s) => s.staffPortal);
  const { event } = useEnsureStaffEventDetail(eventId);
  const staffRole: StaffRole = role === "admin" ? "admin" : "organizer";
  const numLocale = getNumberLocale(i18n.language);
  const isOrganizer = role === "organizer";
  const isAdmin = role === "admin";
  const organizerId = event?.organizer_id;
  const organizerRole = user?.type === "organizer" ? user.role : undefined;
  const canRecordManualSale =
    isOrganizer &&
    canOrganizerRecordManualSale(organizerRole ?? "") &&
    Number(event?.manual_sales_enabled) === 1;
  const canOpenPayoutSetup = canShowCobrosPayoutSetupCta(isAdmin, organizerRole);

  useEffect(() => {
    if (!role) return;
    void dispatch(fetchEventHubSummary({ eventId, role: staffRole }));
    if (isOrganizer) {
      void dispatch(fetchOrganizerPayoutStatus());
    }
  }, [dispatch, eventId, staffRole, role, isOrganizer]);

  useEffect(() => {
    if (!isAdmin || !organizerId) return;
    void dispatch(fetchAdminOrganizerConnect({ organizerId }));
  }, [dispatch, isAdmin, organizerId]);

  const paymentsReady = event?.payments_available === true;
  const payoutReady = isAdmin
    ? adminOrganizerConnect?.payoutReady === true
    : payoutStatus?.payoutReady === true;
  const payoutLoading = isAdmin
    ? loadingAdminOrganizerConnect && !adminOrganizerConnect
    : loadingPayoutStatus && isOrganizer;
  const payoutError = isAdmin ? adminOrganizerConnectError : payoutStatusError;
  const payoutSetupPath = staffPayoutSetupPath(isAdmin, organizerId);

  const refreshAfterSale = () => {
    void dispatch(fetchEventHubSummary({ eventId, role: staffRole }));
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      <MetaHelmet title={t("staffPortal.eventConsole.cobros.title")} />
      <EventConsoleSectionHeader
        title={t("staffPortal.eventConsole.cobros.title")}
        subdomain={event?.subdomain}
        subdomainLive={
          event?.status === "published" || event?.status === "completed"
        }
        badge={
          event ? (
            <>
              <Badge variant={paymentsReady ? "default" : "secondary"}>
                {paymentsReady
                  ? t("staffPortal.eventConsole.cobros.paymentsReady")
                  : t("staffPortal.eventConsole.cobros.paymentsBlocked")}
              </Badge>
              <Badge variant={payoutReady ? "default" : "secondary"}>
                {payoutReady
                  ? t("staffPortal.eventConsole.cobros.payoutReady")
                  : t("staffPortal.eventConsole.cobros.payoutPending")}
              </Badge>
            </>
          ) : undefined
        }
      />
      <p className="text-sm text-muted-foreground -mt-2">
        {t("staffPortal.eventConsole.cobros.subtitle")}
      </p>

      <PortalErrorAlert
        error={payoutError}
        onRetry={() => {
          if (isOrganizer) void dispatch(fetchOrganizerPayoutStatus());
          if (isAdmin && organizerId) {
            void dispatch(fetchAdminOrganizerConnect({ organizerId }));
          }
        }}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">
            {t("staffPortal.eventHub.statRevenue")}
          </p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {loadingEventHubSummary && !eventHubSummary
              ? "—"
              : `$${((eventHubSummary?.revenue_cents ?? 0) / 100).toLocaleString(numLocale)}`}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">
            {t("staffPortal.eventHub.statConfirmed")}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {loadingEventHubSummary && !eventHubSummary
              ? "—"
              : (eventHubSummary?.confirmed_count ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">
            {t("staffPortal.eventConsole.cobros.eventFilter")}
          </p>
          <p className="mt-1 text-sm font-semibold truncate">
            {event?.title ?? `#${eventId}`}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {payoutReady ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <h2 className="font-semibold">
            {t("staffPortal.eventConsole.cobros.payoutsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {payoutLoading
              ? t("staffPortal.payouts.loading")
              : isAdmin
                ? t("staffPortal.eventConsole.cobros.payoutsHintAdmin")
                : t("staffPortal.eventConsole.cobros.payoutsHint")}
          </p>
          {canOpenPayoutSetup ? (
            <Button asChild variant="outline" size="sm">
              <Link to={payoutSetupPath}>
                <Banknote className="mr-2 h-3.5 w-3.5" />
                {isAdmin
                  ? t("staffPortal.eventConsole.cobros.openPayoutsAdmin")
                  : t("staffPortal.eventConsole.cobros.openPayouts")}
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <CreditCard className="h-5 w-5" />
          </div>
          <h2 className="font-semibold">
            {t("staffPortal.eventConsole.cobros.paymentsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("staffPortal.eventConsole.cobros.paymentsHintScoped")}
          </p>
          <div className="flex flex-wrap gap-2">
            {canRecordManualSale ? (
              <StaffManualSaleDialog
                role="organizer"
                eventId={eventId}
                onCreated={refreshAfterSale}
                triggerLabel={t("staffPortal.eventConsole.cobros.recordSaleCta")}
                triggerSize="sm"
              />
            ) : null}
            <Button asChild size="sm" variant={canRecordManualSale ? "outline" : "default"}>
              <Link to={eventConsolePaymentsPath(eventId)}>
                {t("staffPortal.eventConsole.cobros.openPaymentsFiltered")}
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
