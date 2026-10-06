import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import StaffStripeConnectEmbedded from "@/components/staff/StaffStripeConnectEmbedded";
import StaffSpeiSettlementsPanel from "@/components/staff/StaffSpeiSettlementsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StaffFormSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import type { OrganizerPayoutStatusResponse } from "@shared/api";
import { STAFF_PAYMENTS_SETUP_PATH } from "@/utils/staffPaymentsHub";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOrganizerSpeiSettlements } from "@/store/slices/staffPortalSlice";

type Props = {
  payoutStatus: OrganizerPayoutStatusResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenSetup: () => void;
};

export default function StaffPaymentsOverview({
  payoutStatus,
  loading,
  error,
  onRetry,
  onOpenSetup,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    speiSettlements,
    speiSettlementsPendingTotalCents,
    loadingSpeiSettlements,
  } = useAppSelector((s) => s.staffPortal);

  useEffect(() => {
    void dispatch(fetchOrganizerSpeiSettlements({ status: "all" }));
  }, [dispatch]);

  if (loading && !payoutStatus) {
    return (
      <div className="card-sport p-5 sm:p-6" aria-busy="true">
        <StaffFormSkeleton fields={4} />
      </div>
    );
  }

  if (error && !payoutStatus) {
    return (
      <div className="card-sport p-5 space-y-3">
        <p className="text-sm text-destructive break-words">{error}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (!payoutStatus) return null;

  const payoutReady = Boolean(payoutStatus.payoutReady);
  const stripeReady = Boolean(payoutStatus.stripeReady);
  const manualReady = Boolean(payoutStatus.manualReady);
  const rail = payoutStatus.organizer?.payout_rail ?? "stripe";
  const showConnectPayouts =
    stripeReady &&
    Boolean(payoutStatus.embeddedPreferred) &&
    Boolean(payoutStatus.stripePublishableKey);
  const showSpeiSection =
    manualReady ||
    (!loadingSpeiSettlements &&
      (speiSettlements.length > 0 || speiSettlementsPendingTotalCents > 0));

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="card-sport p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="font-semibold text-base">
              {t("staffPortal.finance.overview.statusTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("staffPortal.finance.overview.statusSubtitle")}
            </p>
          </div>
          <Badge
            variant={payoutReady ? "default" : "secondary"}
            className="shrink-0 gap-1.5 self-start"
          >
            {payoutReady ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {payoutReady
              ? t("staffPortal.payouts.statusReady")
              : t("staffPortal.payouts.statusNotReady")}
          </Badge>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-xl border border-border/70 p-3 min-w-0">
            <dt className="text-xs text-muted-foreground">
              {t("staffPortal.finance.overview.preferredRail")}
            </dt>
            <dd className="font-medium mt-0.5 truncate">
              {rail === "manual"
                ? t("staffPortal.payouts.railManual")
                : t("staffPortal.payouts.railStripe")}
            </dd>
          </div>
          <div className="rounded-xl border border-border/70 p-3 min-w-0">
            <dt className="text-xs text-muted-foreground">
              {t("staffPortal.finance.overview.railsReady")}
            </dt>
            <dd className="font-medium mt-0.5 break-words">
              {[
                stripeReady ? t("staffPortal.payouts.railStripe") : null,
                manualReady ? t("staffPortal.payouts.railManual") : null,
              ]
                .filter(Boolean)
                .join(" · ") || t("staffPortal.finance.overview.noRailReady")}
            </dd>
          </div>
        </dl>

        {!payoutReady ? (
          <Button type="button" className="h-11 w-full sm:w-auto" onClick={onOpenSetup}>
            {t("staffPortal.finance.overview.continueSetup")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:w-auto"
            onClick={onOpenSetup}
          >
            {t("staffPortal.finance.overview.openSetup")}
          </Button>
        )}
      </div>

      {showConnectPayouts ? (
        <div className="space-y-2">
          <h2 className="font-semibold text-base px-0.5">
            {t("staffPortal.finance.overview.stripePayoutsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground px-0.5">
            {t("staffPortal.finance.overview.stripePayoutsSubtitle")}
          </p>
          <StaffStripeConnectEmbedded
            publishableKey={payoutStatus.stripePublishableKey}
            payoutReady
            variant="payoutsOnly"
          />
        </div>
      ) : null}

      {showSpeiSection ? <StaffSpeiSettlementsPanel mode="organizer" compact /> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild variant="secondary" className="h-11">
          <Link to="/staff/payments?tab=activity">
            {t("staffPortal.finance.overview.viewActivity")}
          </Link>
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link to={STAFF_PAYMENTS_SETUP_PATH}>
            {t("staffPortal.finance.tabSetup")}
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
