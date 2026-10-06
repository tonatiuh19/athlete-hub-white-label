import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ORGANIZER_CREATE_WIZARD_STEPS,
  type EventCreateWizardStep,
} from "@/components/staff/event-create/types";
import { cn } from "@/lib/utils";

export interface EventCreateWizardStepperProps {
  current: EventCreateWizardStep;
  steps?: EventCreateWizardStep[];
  className?: string;
}

export default function EventCreateWizardStepper({
  current,
  steps = ORGANIZER_CREATE_WIZARD_STEPS,
  className,
}: EventCreateWizardStepperProps) {
  const { t } = useTranslation();
  const currentIndex = steps.indexOf(current);

  return (
    <nav
      className={cn("w-full min-w-0", className)}
      aria-label={t("staffPortal.eventCreate.stepperLabel")}
    >
      <ol className="flex items-start gap-0 sm:gap-2">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = step === current;
          const stepNum = index + 1;
          return (
            <li
              key={step}
              className={cn(
                "flex flex-1 min-w-0 flex-col items-center text-center",
                index < steps.length - 1 &&
                  "relative after:absolute after:top-4 after:left-[calc(50%+1rem)] after:h-px after:w-[calc(100%-2rem)] after:bg-border sm:after:top-5",
              )}
            >
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 text-xs sm:text-sm font-bold transition-colors",
                  done && "border-accent bg-accent text-accent-foreground",
                  active && !done && "border-primary bg-primary text-primary-foreground",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : stepNum}
              </div>
              <p
                className={cn(
                  "mt-2 text-[10px] sm:text-xs font-semibold leading-tight px-1",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(`staffPortal.eventCreate.wizardSteps.${step}.label`)}
              </p>
              <p className="hidden sm:block text-[10px] text-muted-foreground mt-0.5 px-1 leading-snug">
                {t(`staffPortal.eventCreate.wizardSteps.${step}.hint`)}
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
