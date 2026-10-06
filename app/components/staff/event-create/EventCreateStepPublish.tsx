import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Circle, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  computeEventPublishReadiness,
  type EventPublishReadiness,
} from "@/components/staff/StaffEventPublishChecklist";
import type { StaffEventCategory, StaffEventDetail } from "@shared/api";
import { cn } from "@/lib/utils";

export interface EventCreateStepPublishProps {
  event: StaffEventDetail;
  categories: StaffEventCategory[];
  payoutReady?: boolean | null;
  waiverCount: number;
  hasCourse: boolean;
  publishing: boolean;
  publishError?: string | null;
  onPublish: () => void;
  advancedEditPath: string;
}

function readinessRows(readiness: EventPublishReadiness, t: (k: string) => string) {
  const rows: { ok: boolean; label: string }[] = [
    {
      ok: readiness.hasTitle && readiness.hasSport && readiness.hasStartDate,
      label: t("staffPortal.eventCreate.publish.checkDetails"),
    },
    {
      ok: readiness.hasLocation,
      label: t("staffPortal.eventCreate.publish.checkLocation"),
    },
    {
      ok: readiness.hasCategory,
      label: t("staffPortal.eventCreate.publish.checkCategories"),
    },
    {
      ok: readiness.hasSiteLegal,
      label: t("staffPortal.eventCreate.publish.checkSiteLegal"),
    },
  ];
  if (readiness.payoutReady !== undefined && readiness.payoutReady !== null) {
    rows.push({
      ok: readiness.payoutReady,
      label: t("staffPortal.eventCreate.publish.checkPayouts"),
    });
  }
  return rows;
}

export default function EventCreateStepPublish({
  event,
  categories,
  payoutReady,
  waiverCount,
  hasCourse,
  publishing,
  publishError,
  onPublish,
  advancedEditPath,
}: EventCreateStepPublishProps) {
  const { t } = useTranslation();

  const readiness = computeEventPublishReadiness({
    title: event.title,
    sportTypeId: event.sport_type_id,
    startDate: event.start_date,
    categoryCount: categories.filter((c) => c.is_active !== 0).length,
    heroUrl: event.hero_image_url,
    locationLat: event.location_lat,
    locationLng: event.location_lng,
    hasWaiver: waiverCount > 0 || Boolean(event.requires_waiver),
    hasCourse,
    hasSiteLegal: Boolean(Number(event.site_legal_ready)),
    hasPaidCategories: categories.some((c) => c.price_cents > 0),
    payoutReady,
  });

  const rows = readinessRows(readiness, t);
  const allRequired = rows.every((r) => r.ok);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {t("staffPortal.eventCreate.wizardSteps.publish.formTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("staffPortal.eventCreate.wizardSteps.publish.formHint")}
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              row.ok ? "bg-accent/10 text-foreground" : "bg-muted/50 text-muted-foreground",
            )}
          >
            {row.ok ? (
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" />
            )}
            {row.label}
          </li>
        ))}
      </ul>

      {!allRequired ? (
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 flex gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <p>{t("staffPortal.eventCreate.publish.notReady")}</p>
        </div>
      ) : null}

      {publishError ? (
        <p className="text-sm text-destructive" role="alert">
          {t(publishError, { defaultValue: publishError })}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          className="flex-1 h-12"
          disabled={!allRequired || publishing}
          onClick={onPublish}
        >
          <Rocket className="h-4 w-4 mr-2" />
          {publishing
            ? t("staffPortal.eventEdit.submittingApproval")
            : t("staffPortal.eventEdit.submitForApproval")}
        </Button>
        <Button type="button" variant="outline" className="h-12" asChild>
          <Link to={advancedEditPath}>{t("staffPortal.eventSetup.advancedEdit")}</Link>
        </Button>
      </div>
    </div>
  );
}
