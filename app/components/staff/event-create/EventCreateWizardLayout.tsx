import type { ReactNode } from "react";
import { CheckCircle2, FlaskConical, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import EventCreateWizardStepper from "@/components/staff/event-create/EventCreateWizardStepper";
import EventCreateLivePreview from "@/components/staff/event-create/EventCreateLivePreview";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  EventCreatePreviewData,
  EventCreateWizardStep,
} from "@/components/staff/event-create/types";
import { ORGANIZER_CREATE_WIZARD_STEPS } from "@/components/staff/event-create/types";
import { cn } from "@/lib/utils";

export interface EventCreateWizardLayoutProps {
  step: EventCreateWizardStep;
  steps?: EventCreateWizardStep[];
  preview: EventCreatePreviewData;
  saving?: boolean;
  autoSaved?: boolean;
  children: ReactNode;
  footer: ReactNode;
  backHref?: string;
  title?: string;
  subtitle?: string;
  /** Local Vite DEV only — fills the current wizard step with test data. */
  onFillTestData?: () => void;
  fillTestDataBusy?: boolean;
}

export default function EventCreateWizardLayout({
  step,
  steps = ORGANIZER_CREATE_WIZARD_STEPS,
  preview,
  saving = false,
  autoSaved = false,
  children,
  footer,
  backHref = "/staff/events",
  title,
  subtitle,
  onFillTestData,
  fillTestDataBusy = false,
}: EventCreateWizardLayoutProps) {
  const { t } = useTranslation();
  const stepIndex = Math.max(0, steps.indexOf(step)) + 1;
  const progress = Math.round((stepIndex / steps.length) * 100);
  const showDevFill = Boolean(import.meta.env.DEV && onFillTestData);

  return (
    <div className="w-full min-w-0 -mx-2 sm:mx-0 max-w-[1600px] sm:mx-auto space-y-5 animate-slide-up">
      <StaffPageHeader
        back={{ to: backHref, label: t("staffPortal.eventEdit.back") }}
        title={title ?? t(`staffPortal.eventCreate.wizardSteps.${step}.heading`)}
        subtitle={subtitle ?? t(`staffPortal.eventCreate.wizardSteps.${step}.subtitle`)}
        showUtilities
        status={
          saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("staffPortal.eventCreate.saving")}
            </>
          ) : autoSaved ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              {t("staffPortal.eventCreate.autoSaved")}
            </>
          ) : undefined
        }
      />

      <EventCreateWizardStepper current={step} steps={steps} />

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground min-w-0">
          <span className="min-w-0">
            {t("staffPortal.eventCreate.stepLabel", {
              current: stepIndex,
              total: steps.length,
            })}
          </span>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {showDevFill ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={saving || fillTestDataBusy}
                onClick={onFillTestData}
              >
                {fillTestDataBusy ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FlaskConical className="mr-2 h-3.5 w-3.5" />
                )}
                {t("staffPortal.eventCreate.fillTestData")}
              </Button>
            ) : null}
            <span>{progress}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-6 xl:gap-8 items-start">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 p-5 md:p-6 space-y-5 min-w-0 overflow-x-clip">
            {children}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">{footer}</div>
        </div>

        <aside className="xl:sticky xl:top-6 space-y-4 min-w-0">
          <EventCreateLivePreview data={preview} />
          <div className="rounded-xl border border-border bg-muted/30 p-4 hidden xl:block">
            <p className="text-xs font-semibold mb-2">
              {t("staffPortal.eventCreate.tips.title")}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(`staffPortal.eventCreate.tips.${step}`)}
            </p>
          </div>
        </aside>
      </div>

      <div className="xl:hidden rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold mb-1">{t("staffPortal.eventCreate.tips.title")}</p>
        <p className="text-xs text-muted-foreground">{t(`staffPortal.eventCreate.tips.${step}`)}</p>
      </div>
    </div>
  );
}

/** Skip block link for optional customize sections */
export function EventCreateSkipBlock({
  onSkip,
  className,
}: {
  onSkip: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("text-muted-foreground h-8 px-2", className)}
      onClick={onSkip}
    >
      {t("staffPortal.eventCreate.fillLater")}
    </Button>
  );
}
