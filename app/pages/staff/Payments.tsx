import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import StaffAthleteDetailSheet from "@/components/staff/StaffAthleteDetailSheet";
import StaffPaymentDetailSheet from "@/components/staff/StaffPaymentDetailSheet";
import StaffPaymentsOverview from "@/components/staff/StaffPaymentsOverview";
import StaffPaymentsPanel from "@/components/staff/StaffPaymentsPanel";
import StaffPayoutSetupWizard from "@/components/staff/StaffPayoutSetupWizard";
import StaffSpeiSettlementsPanel from "@/components/staff/StaffSpeiSettlementsPanel";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffFormSkeleton, StaffStatsCardsSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchOrganizerPayoutStatus,
  fetchSellerSalesSummary,
  syncOrganizerPayouts,
} from "@/store/slices/staffPortalSlice";
import {
  canAccessStaffPayouts,
  canRefundStaffPayments,
  canViewSellerSalesSummary,
  canViewStaffPayments,
} from "@/utils/staffNav";
import {
  defaultStaffPaymentsHubTab,
  parseStaffPaymentsHubTab,
  type StaffPaymentsHubTab,
} from "@/utils/staffPaymentsHub";
import { getNumberLocale } from "@/utils/dateLocale";

export default function StaffPayments() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdFromUrl = Number(searchParams.get("eventId"));
  const initialEventId = Number.isFinite(eventIdFromUrl)
    ? eventIdFromUrl
    : undefined;
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const {
    sellerSalesSummary,
    loadingSellerSalesSummary,
    sellerSalesSummaryError,
    payoutStatus,
    loadingPayoutStatus,
    payoutStatusError,
  } = useAppSelector((s) => s.staffPortal);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [athleteSheetOpen, setAthleteSheetOpen] = useState(false);
  const [paymentsReloadKey, setPaymentsReloadKey] = useState(0);
  const [sellerFilter, setSellerFilter] = useState("all");

  const organizerRole = user?.type === "organizer" ? user.role : undefined;
  const isAdmin = role === "admin";
  const canAccess = canViewStaffPayments(isAdmin, organizerRole);
  const canRefund = canRefundStaffPayments(isAdmin, organizerRole);
  const canSetup = canAccessStaffPayouts(isAdmin, organizerRole);
  const showSellerSummary = canViewSellerSalesSummary(isAdmin, organizerRole);
  const numLocale = getNumberLocale(i18n.language);

  useEffect(() => {
    if (showSellerSummary) {
      void dispatch(fetchSellerSalesSummary());
    }
  }, [dispatch, showSellerSummary, paymentsReloadKey]);

  useEffect(() => {
    if (!canSetup) return;
    if (!payoutStatus && !loadingPayoutStatus) {
      void dispatch(fetchOrganizerPayoutStatus());
    }
  }, [canSetup, dispatch, payoutStatus, loadingPayoutStatus]);

  useEffect(() => {
    if (!canSetup) return;
    const connect = searchParams.get("connect");
    if (connect === "return" || connect === "refresh") {
      void dispatch(syncOrganizerPayouts());
    }
  }, [canSetup, dispatch, searchParams]);

  const payoutsLoaded = payoutStatus != null;
  const payoutReady = payoutStatus?.payoutReady ?? null;

  const requestedTab = parseStaffPaymentsHubTab(searchParams.get("tab"));
  const fallbackTab = useMemo(
    () =>
      defaultStaffPaymentsHubTab({
        canAccessSetup: canSetup,
        payoutsLoaded,
        payoutReady,
      }),
    [canSetup, payoutsLoaded, payoutReady],
  );

  const tab: StaffPaymentsHubTab = (() => {
    if (isAdmin) {
      if (requestedTab === "spei") return "spei";
      return "activity";
    }
    if (!canSetup) return "activity";
    if (requestedTab === "setup" || requestedTab === "overview") return requestedTab;
    if (requestedTab === "activity") return "activity";
    return fallbackTab;
  })();

  const setTab = (next: StaffPaymentsHubTab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "activity") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", next);
    }
    // Drop Stripe return flags after landing on setup/overview.
    if (next !== "setup") {
      nextParams.delete("connect");
    }
    setSearchParams(nextParams, { replace: true });
  };

  // When setup is incomplete and no explicit tab, push overview into the URL once loaded.
  useEffect(() => {
    if (!canSetup || requestedTab) return;
    if (!payoutsLoaded) return;
    if (fallbackTab === "overview") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", "overview");
      setSearchParams(nextParams, { replace: true });
    }
  }, [canSetup, requestedTab, payoutsLoaded, fallbackTab, searchParams, setSearchParams]);

  if (!canAccess || !role) {
    return <Navigate to="/staff" replace />;
  }

  const openPayment = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
    setPaymentSheetOpen(true);
  };

  const openAthlete = (athleteId: number) => {
    setSelectedAthleteId(athleteId);
    setAthleteSheetOpen(true);
  };

  const activityPanel = (
    <div className="space-y-6">
      {showSellerSummary ? (
        <div className="card-sport p-6 space-y-4">
          <div>
            <h2 className="font-semibold">{t("staffPortal.finance.sellerSummaryTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("staffPortal.finance.sellerSummarySubtitle")}
            </p>
          </div>
          <PortalErrorAlert
            error={sellerSalesSummaryError}
            onRetry={() => dispatch(fetchSellerSalesSummary())}
          />
          {loadingSellerSalesSummary ? (
            <StaffStatsCardsSkeleton count={2} className="lg:grid-cols-2" />
          ) : sellerSalesSummary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 p-4">
                  <p className="text-xs text-muted-foreground">
                    {t("staffPortal.finance.manualSalesTotal")}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    $
                    {(sellerSalesSummary.manual_sale_total_cents / 100).toLocaleString(
                      numLocale,
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 p-4">
                  <p className="text-xs text-muted-foreground">
                    {t("staffPortal.finance.manualSalesCount")}
                  </p>
                  <p className="text-2xl font-bold">{sellerSalesSummary.manual_sale_count}</p>
                </div>
              </div>
              {sellerSalesSummary.sellers.length > 0 ? (
                <div className="overflow-x-auto">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("staffPortal.finance.sellerSummaryFilterHint")}
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="p-3 font-medium">{t("staffPortal.finance.colSeller")}</th>
                        <th className="p-3 font-medium">{t("staffPortal.finance.colSales")}</th>
                        <th className="p-3 font-medium">{t("staffPortal.finance.colAmount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerSalesSummary.sellers.map((seller) => (
                        <tr
                          key={seller.member_id}
                          className="border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => setSellerFilter(String(seller.member_id))}
                        >
                          <td className="p-3">
                            <p className="font-medium">
                              {seller.first_name} {seller.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{seller.email}</p>
                          </td>
                          <td className="p-3">{seller.sale_count}</td>
                          <td className="p-3 font-semibold text-primary">
                            ${(seller.total_cents / 100).toLocaleString(numLocale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("staffPortal.finance.sellerSummaryEmpty")}
                </p>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      <StaffPaymentsPanel
        key={`${paymentsReloadKey}-${initialEventId ?? "all"}`}
        role={role}
        sellerFilter={sellerFilter}
        onSellerFilterChange={setSellerFilter}
        onSelectPayment={openPayment}
        onSelectAthlete={isAdmin ? openAthlete : undefined}
        initialEventId={initialEventId}
      />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full min-w-0 overflow-x-clip space-y-6">
      <MetaHelmet
        title={t("staffPortal.finance.title")}
        description={t("staffPortal.finance.subtitle")}
      />
      <StaffPageHeader
        icon={CreditCard}
        title={t("staffPortal.finance.title")}
        subtitle={
          initialEventId != null ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {t("staffPortal.finance.subtitle")}
              <Badge variant="secondary">
                {t("staffPortal.eventConsole.cobros.filteredByEvent", {
                  eventId: initialEventId,
                })}
              </Badge>
            </span>
          ) : (
            t("staffPortal.finance.subtitle")
          )
        }
      />

      {isAdmin ? (
        <Tabs
          value={tab === "spei" ? "spei" : "activity"}
          onValueChange={(v) => setTab(v as StaffPaymentsHubTab)}
          className="w-full min-w-0"
        >
          <TabsList className="w-full h-auto flex flex-col md:flex-row md:flex-wrap gap-1">
            <TabsTrigger value="activity" className="w-full md:w-auto">
              {t("staffPortal.finance.tabActivity")}
            </TabsTrigger>
            <TabsTrigger value="spei" className="w-full md:w-auto">
              {t("staffPortal.finance.tabSpei")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-4">
            {activityPanel}
          </TabsContent>
          <TabsContent value="spei" className="mt-4">
            <StaffSpeiSettlementsPanel mode="admin" />
          </TabsContent>
        </Tabs>
      ) : canSetup ? (
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as StaffPaymentsHubTab)}
          className="w-full min-w-0"
        >
          <TabsList className="w-full h-auto flex flex-col md:flex-row md:flex-wrap gap-1">
            <TabsTrigger value="overview" className="w-full md:w-auto">
              {t("staffPortal.finance.tabOverview")}
            </TabsTrigger>
            <TabsTrigger value="activity" className="w-full md:w-auto">
              {t("staffPortal.finance.tabActivity")}
            </TabsTrigger>
            <TabsTrigger value="setup" className="w-full md:w-auto">
              {t("staffPortal.finance.tabSetup")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <StaffPaymentsOverview
              payoutStatus={payoutStatus}
              loading={loadingPayoutStatus}
              error={payoutStatusError}
              onRetry={() => void dispatch(fetchOrganizerPayoutStatus())}
              onOpenSetup={() => setTab("setup")}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {activityPanel}
          </TabsContent>

          <TabsContent value="setup" className="mt-4">
            <div className="max-w-3xl w-full min-w-0 space-y-4">
              {loadingPayoutStatus && !payoutStatus ? (
                <div className="card-sport p-5 sm:p-6" aria-busy="true">
                  <StaffFormSkeleton fields={5} />
                </div>
              ) : null}
              {payoutStatusError ? (
                <p className="text-sm text-destructive break-words">{payoutStatusError}</p>
              ) : null}
              {payoutStatus ? <StaffPayoutSetupWizard payoutStatus={payoutStatus} /> : null}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        activityPanel
      )}

      <StaffPaymentDetailSheet
        paymentId={selectedPaymentId}
        role={role}
        open={paymentSheetOpen}
        onOpenChange={setPaymentSheetOpen}
        onViewAthlete={isAdmin ? openAthlete : undefined}
        allowRefund={canRefund}
      />

      {isAdmin ? (
        <StaffAthleteDetailSheet
          athleteId={selectedAthleteId}
          open={athleteSheetOpen}
          onOpenChange={setAthleteSheetOpen}
        />
      ) : null}
    </div>
  );
}
