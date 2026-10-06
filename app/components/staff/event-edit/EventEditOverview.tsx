import { Link } from "react-router-dom";
import { resolveApexHostname } from "@/utils/hostContext";
import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  CreditCard,
  ExternalLink,
  Loader2,
  Rocket,
  Ticket,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EventPublishReadiness } from "@/components/staff/StaffEventPublishChecklist";
import type { StaffEventCategory, StaffEventDetail } from "@shared/api";
import EventEditProgressRing from "@/components/staff/event-edit/EventEditProgressRing";
import { Button } from "@/components/ui/button";
import { getDateFnsLocale, getNumberLocale } from "@/utils/dateLocale";
import { type EventSetupSectionDef } from "@/utils/eventSetupSections";
import {
  eventSetupCardStatus,
  filterVisibleSetupSections,
} from "@/utils/eventSetupProgress";
import { cn } from "@/lib/utils";

export interface EventEditOverviewProps {
  event: StaffEventDetail;
  categories: StaffEventCategory[];
  readiness: EventPublishReadiness;
  hasPaidCategories: boolean;
  progressPct: number;
  requiredDone: boolean;
  publishingEvent?: boolean;
  canEdit: boolean;
  publishLabel?: string;
  onNavigate: (tab: string) => void;
  onPublish: () => void;
  onPayoutSetup: () => void;
  onSiteLegalSetup?: () => void;
  onOpenOpsHub?: () => void;
}

function OverviewSectionCard({
  section,
  status,
  onClick,
}: {
  section: EventSetupSectionDef;
  status: ReturnType<typeof eventSetupCardStatus>;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const Icon = section.icon;
  const levelLabel =
    section.level === "required"
      ? t("staffPortal.eventEdit.setupGuide.legendRequired")
      : section.level === "recommended"
        ? t("staffPortal.eventEdit.setupGuide.legendRecommended")
        : t("staffPortal.eventEdit.setupGuide.legendOptional");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-2xl border p-4 transition-all h-full w-full flex flex-col",
        "hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        status === "done" ? "border-accent/30 bg-accent/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className={cn(
            "rounded-xl p-2",
            status === "done" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        {status === "done" ? (
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
        ) : status === "loading" ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
        )}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {levelLabel}
      </p>
      <h3 className="font-semibold text-sm">
        {t(`staffPortal.eventSetup.cards.${section.id}.title`)}
      </h3>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">
        {t(`staffPortal.eventSetup.cards.${section.id}.body`)}
      </p>
      <span className="inline-flex items-center text-xs font-medium text-primary mt-3">
        {status === "done"
          ? t("staffPortal.eventSetup.review")
          : t("staffPortal.eventSetup.continue")}
        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
      </span>
    </button>
  );
}

export default function EventEditOverview({
  event,
  categories,
  readiness,
  hasPaidCategories,
  progressPct,
  requiredDone,
  publishingEvent,
  canEdit,
  publishLabel,
  onNavigate,
  onPublish,
  onPayoutSetup,
  onSiteLegalSetup,
  onOpenOpsHub,
}: EventEditOverviewProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateFnsLocale(i18n.language);
  const numLocale = getNumberLocale(i18n.language);

  const visibleSections = filterVisibleSetupSections(
    hasPaidCategories,
    readiness.payoutReady,
  );

  const requiredSections = visibleSections.filter((s) => s.level === "required");
  const optionalSections = visibleSections.filter((s) => s.level === "optional");
  const recommendedSections = visibleSections.filter((s) => s.level === "recommended");

  const activeCategories = categories.filter(
    (c) => c.is_active !== 0 && c.is_active !== false,
  );

  const nextSection = visibleSections.find((s) => {
    if (s.externalPath || !s.tab) return false;
    return eventSetupCardStatus(s, readiness) !== "done";
  });

  const openSection = (section: EventSetupSectionDef) => {
    if (section.externalPath) return;
    if (section.tab) onNavigate(section.tab);
  };

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* Progress hero — full width */}
      <div className="w-full rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          <EventEditProgressRing
            value={progressPct}
            size={112}
            label={t("staffPortal.eventSetup.progressLabel")}
          />
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">
                {t("staffPortal.eventEdit.overview.progressTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {requiredDone
                  ? t("staffPortal.eventSetup.progressReady")
                  : t("staffPortal.eventEdit.overview.progressHint")}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                {t("staffPortal.eventEdit.overview.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {nextSection?.tab ? (
                <Button type="button" onClick={() => openSection(nextSection)}>
                  {t("staffPortal.eventEdit.overview.continueSetup")}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : null}
              {canEdit && event.status === "draft" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!requiredDone || publishingEvent}
                  onClick={onPublish}
                >
                  {publishingEvent ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4 mr-2" />
                  )}
                  {publishLabel ?? t("staffPortal.eventEdit.submitForApproval")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-5 grid gap-2",
            requiredSections.length <= 3
              ? "grid-cols-1 sm:grid-cols-3"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {requiredSections.map((section) => {
            const status = eventSetupCardStatus(section, readiness);
            const content = (
              <>
                {status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                ) : status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 opacity-40 shrink-0" />
                )}
                <span className="truncate">
                  {t(`staffPortal.eventSetup.cards.${section.id}.title`)}
                </span>
              </>
            );
            if (section.externalPath) {
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    if (section.id === "siteLegal") {
                      onSiteLegalSetup?.();
                    } else {
                      onPayoutSetup();
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-xs hover:border-primary/30 bg-background/60"
                >
                  {content}
                </button>
              );
            }
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => openSection(section)}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-xs hover:border-primary/30 bg-background/60"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mid row — equal columns, stretch full width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 min-h-[11rem]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums leading-none">
                {activeCategories.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("staffPortal.eventEdit.overview.categoriesLabel")}
              </p>
            </div>
          </div>
          {activeCategories.length > 0 ? (
            <ul className="space-y-1.5 text-sm flex-1">
              {activeCategories.slice(0, 4).map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between gap-3 text-muted-foreground"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 tabular-nums font-medium text-foreground">
                    {(c.price_cents / 100).toLocaleString(numLocale, {
                      style: "currency",
                      currency: "MXN",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground flex-1">
              {t("staffPortal.eventEdit.overview.noCategories")}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto self-start"
            onClick={() => onNavigate("categories")}
          >
            {t("staffPortal.eventEdit.overview.manageCategories")}
          </Button>
        </div>

        {hasPaidCategories ? (
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 min-h-[11rem]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">
                  {t("staffPortal.eventEdit.overview.payoutsTitle")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {readiness.payoutReady
                    ? t("staffPortal.eventEdit.overview.payoutsReady")
                    : t("staffPortal.eventEdit.overview.payoutsPending")}
                </p>
              </div>
            </div>
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto self-start"
              onClick={onPayoutSetup}
            >
              {t("staffPortal.eventEdit.overview.openPayouts")}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2 min-h-[11rem]">
            <p className="font-semibold text-sm">{event.title}</p>
            <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              {event.start_date ? (
                <span>
                  {format(new Date(event.start_date), "PP", { locale: dateLocale })}
                </span>
              ) : null}
              {event.location_city ? <span>{event.location_city}</span> : null}
            </p>
            {event.subdomain ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary font-mono mt-auto">
                {`${event.subdomain}.${resolveApexHostname()}`}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {recommendedSections.length > 0 ? (
        <div className="w-full">
          <h3 className="text-sm font-semibold mb-3">
            {t("staffPortal.eventEdit.overview.recommendedTitle")}
          </h3>
          <div
            className={cn(
              "grid gap-3 w-full",
              recommendedSections.length === 1 && "grid-cols-1",
              recommendedSections.length === 2 && "grid-cols-1 sm:grid-cols-2",
              recommendedSections.length >= 3 &&
                "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
            )}
          >
            {recommendedSections.map((section) => (
              <OverviewSectionCard
                key={section.id}
                section={section}
                status={eventSetupCardStatus(section, readiness)}
                onClick={() => openSection(section)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {optionalSections.length > 0 ? (
        <div className="w-full rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
              {t("staffPortal.eventEdit.setupGuide.legendOptional")}
            </span>
            <h3 className="text-sm font-semibold">
              {t("staffPortal.eventEdit.overview.advancedTitle")}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("staffPortal.eventEdit.overview.advancedHint")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 w-full">
            {optionalSections.map((section) => (
              <OverviewSectionCard
                key={section.id}
                section={section}
                status={eventSetupCardStatus(section, readiness)}
                onClick={() => openSection(section)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        {onOpenOpsHub ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={onOpenOpsHub}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            {t("staffPortal.eventSetup.openOpsHub")}
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link to={`/staff/events/${event.id}`}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              {t("staffPortal.eventSetup.openOpsHub")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
