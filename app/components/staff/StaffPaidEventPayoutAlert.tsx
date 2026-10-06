import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { staffPayoutSetupPath } from "@/utils/staffNav";

export interface StaffPaidEventPayoutAlertProps {
  isAdmin?: boolean;
  organizerId?: number | null;
  className?: string;
  compact?: boolean;
  eventEditPath?: string;
}

/** Shown when a published event has paid categories but organizer payout is not ready. */
export default function StaffPaidEventPayoutAlert({
  isAdmin = false,
  organizerId,
  className,
  compact = false,
  eventEditPath,
}: StaffPaidEventPayoutAlertProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 flex gap-3 w-full min-w-0 max-w-full",
        compact ? "px-3 py-2 items-start" : "p-4 items-start",
        className,
      )}
      role="alert"
    >
      <AlertTriangle
        className={cn("text-destructive shrink-0", compact ? "w-4 h-4 mt-0.5" : "w-5 h-5 mt-0.5")}
      />
      <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
        <p
          className={cn(
            "text-destructive whitespace-normal break-words",
            compact ? "text-xs leading-snug" : "text-sm",
          )}
        >
          {isAdmin
            ? t("staffPortal.payouts.paymentsUnavailableBannerAdmin")
            : t("staffPortal.payouts.paymentsUnavailableBanner")}
        </p>
        {!compact ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="border-destructive/40">
              <Link to={staffPayoutSetupPath(isAdmin, organizerId)}>
                {isAdmin
                  ? t("staffPortal.payouts.publishBlockedCtaAdmin")
                  : t("staffPortal.payouts.publishBlockedCta")}
              </Link>
            </Button>
            {eventEditPath ? (
              <Button asChild variant="ghost" size="sm" className="text-destructive">
                <Link to={eventEditPath}>{t("staffPortal.payouts.paymentsUnavailableEditEvent")}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function eventNeedsPayoutAlert(input: {
  status?: string;
  has_paid_categories?: boolean;
  payments_available?: boolean;
}): boolean {
  return (
    input.status === "published" &&
    Boolean(input.has_paid_categories) &&
    input.payments_available === false
  );
}
