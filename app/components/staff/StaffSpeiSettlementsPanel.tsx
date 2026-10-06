import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import { StaffFormSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminSpeiSettlements,
  fetchOrganizerSpeiSettlements,
  markAdminSpeiSettlementSent,
} from "@/store/slices/staffPortalSlice";
import type { SpeiSettlementStatus } from "@shared/api";
import { getNumberLocale } from "@/utils/dateLocale";

type Props = {
  mode: "admin" | "organizer";
  /** When organizer overview embeds a compact list. */
  compact?: boolean;
};

export default function StaffSpeiSettlementsPanel({ mode, compact = false }: Props) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const numLocale = getNumberLocale(i18n.language);
  const {
    speiSettlements,
    speiSettlementsPendingTotalCents,
    speiSettlementsSentTotalCents,
    loadingSpeiSettlements,
    speiSettlementsError,
    markingSpeiSettlementId,
  } = useAppSelector((s) => s.staffPortal);

  const [statusFilter, setStatusFilter] = useState<SpeiSettlementStatus | "all">(
    mode === "admin" ? "pending" : "all",
  );

  useEffect(() => {
    if (mode === "admin") {
      void dispatch(fetchAdminSpeiSettlements({ status: statusFilter }));
    } else {
      void dispatch(fetchOrganizerSpeiSettlements({ status: statusFilter }));
    }
  }, [dispatch, mode, statusFilter]);

  const formatMoney = (cents: number, currency = "MXN") =>
    `$${(cents / 100).toLocaleString(numLocale)} ${currency}`;

  const onMarkSent = (id: number) => {
    if (mode !== "admin") return;
    void dispatch(markAdminSpeiSettlementSent({ id }));
  };

  const filters: Array<{ value: SpeiSettlementStatus | "all"; label: string }> = [
    { value: "pending", label: t("staffPortal.finance.spei.filterPending") },
    { value: "sent", label: t("staffPortal.finance.spei.filterSent") },
    { value: "all", label: t("staffPortal.finance.spei.filterAll") },
  ];

  return (
    <div className="card-sport p-5 sm:p-6 space-y-4 w-full min-w-0">
      <div className="flex flex-col gap-2 min-w-0">
        <h2 className="font-semibold text-base">
          {mode === "admin"
            ? t("staffPortal.finance.spei.adminTitle")
            : t("staffPortal.finance.spei.organizerTitle")}
        </h2>
        <p className="text-sm text-muted-foreground break-words">
          {mode === "admin"
            ? t("staffPortal.finance.spei.adminSubtitle")
            : t("staffPortal.finance.spei.organizerSubtitle")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 p-4 min-w-0">
          <p className="text-xs text-muted-foreground">
            {t("staffPortal.finance.spei.pendingTotal")}
          </p>
          <p className="text-2xl font-bold text-primary break-words">
            {formatMoney(speiSettlementsPendingTotalCents)}
          </p>
        </div>
        {!compact ? (
          <div className="rounded-xl border border-border/70 p-4 min-w-0">
            <p className="text-xs text-muted-foreground">
              {t("staffPortal.finance.spei.sentTotal")}
            </p>
            <p className="text-2xl font-bold break-words">
              {formatMoney(speiSettlementsSentTotalCents)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {filters.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={statusFilter === f.value ? "default" : "outline"}
            className="h-10 w-full sm:w-auto"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <PortalErrorAlert
        error={speiSettlementsError}
        onRetry={() => {
          if (mode === "admin") {
            void dispatch(fetchAdminSpeiSettlements({ status: statusFilter }));
          } else {
            void dispatch(fetchOrganizerSpeiSettlements({ status: statusFilter }));
          }
        }}
      />

      {loadingSpeiSettlements && speiSettlements.length === 0 ? (
        <StaffFormSkeleton fields={3} />
      ) : speiSettlements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("staffPortal.finance.spei.empty")}
        </p>
      ) : (
        <div className="table-scroll min-w-0">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {mode === "admin" ? (
                  <th className="p-3 font-medium">
                    {t("staffPortal.finance.colOrganizer")}
                  </th>
                ) : null}
                <th className="p-3 font-medium">
                  {t("staffPortal.finance.spei.colEvent")}
                </th>
                <th className="p-3 font-medium">
                  {t("staffPortal.finance.colAmount")}
                </th>
                <th className="p-3 font-medium">
                  {t("staffPortal.finance.spei.colClabe")}
                </th>
                <th className="p-3 font-medium">
                  {t("staffPortal.finance.colStatus")}
                </th>
                <th className="p-3 font-medium">
                  {t("staffPortal.finance.spei.colPayment")}
                </th>
                {mode === "admin" ? (
                  <th className="p-3 font-medium">
                    {t("staffPortal.finance.spei.colActions")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {speiSettlements.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  {mode === "admin" ? (
                    <td className="p-3 min-w-0">
                      <p className="font-medium break-words">
                        {row.organizer_name || `#${row.organizer_id}`}
                      </p>
                    </td>
                  ) : null}
                  <td className="p-3 min-w-0">
                    <p className="break-words">
                      {row.event_title ||
                        (row.event_id != null
                          ? `#${row.event_id}`
                          : t("staffPortal.finance.spei.noEvent"))}
                    </p>
                  </td>
                  <td className="p-3 font-semibold text-primary whitespace-nowrap">
                    {formatMoney(row.amount_cents, row.currency)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {row.clabe_last4
                      ? `•••• ${row.clabe_last4}`
                      : t("staffPortal.finance.spei.noClabe")}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={row.status === "pending" ? "secondary" : "default"}
                    >
                      {t(`staffPortal.finance.spei.status.${row.status}`)}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">#{row.payment_id}</td>
                  {mode === "admin" ? (
                    <td className="p-3">
                      {row.status === "pending" ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-10"
                          disabled={markingSpeiSettlementId === row.id}
                          onClick={() => onMarkSent(row.id)}
                        >
                          {markingSpeiSettlementId === row.id
                            ? t("staffPortal.finance.spei.markingSent")
                            : t("staffPortal.finance.spei.markSent")}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
