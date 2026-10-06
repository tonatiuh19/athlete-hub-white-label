import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardProgressStep = {
  key: string;
  label: string;
};

interface WizardProgressProps {
  steps: WizardProgressStep[];
  currentIndex: number;
  stepOfLabel: string;
  /** e.g. "Next: Payment" — optional peek at the following step */
  nextStepHint?: string | null;
  className?: string;
}

/**
 * Single modern stepper — current title as hero, one connected track of steps.
 * (No separate progress bar + dots; that felt like two competing meters.)
 */
export default function WizardProgress({
  steps,
  currentIndex,
  stepOfLabel,
  nextStepHint,
  className,
}: WizardProgressProps) {
  const safeIndex = Math.min(Math.max(currentIndex, 0), Math.max(steps.length - 1, 0));
  const current = steps[safeIndex];
  const trackPct =
    steps.length <= 1 ? 100 : Math.round((safeIndex / (steps.length - 1)) * 100);

  return (
    <div className={cn("space-y-5", className)} aria-label={stepOfLabel}>
      <div className="min-w-0 space-y-1 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground tabular-nums">
          {stepOfLabel}
        </p>
        <p
          key={current?.key ?? safeIndex}
          className="text-2xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        >
          {current?.label}
        </p>
        {nextStepHint ? (
          <p
            key={`next-${current?.key ?? safeIndex}`}
            className="text-sm sm:text-xs text-muted-foreground animate-in fade-in-0 duration-300"
          >
            {nextStepHint}
          </p>
        ) : null}
      </div>

      <nav aria-label={stepOfLabel} className="w-full">
        <ol
          className="relative mx-auto grid w-full max-w-md"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {/* Track behind nodes — inset to node centers so the bar looks balanced */}
          <div
            className="pointer-events-none absolute top-4 h-0.5 -translate-y-1/2 rounded-full bg-border sm:top-[1.125rem]"
            style={{
              left: `calc(100% / ${steps.length * 2})`,
              right: `calc(100% / ${steps.length * 2})`,
            }}
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${trackPct}%` }}
            />
          </div>

          {steps.map((step, i) => {
            const done = i < safeIndex;
            const active = i === safeIndex;
            return (
              <li
                key={step.key}
                className="relative z-[1] flex flex-col items-center gap-2 text-center px-0.5"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                    done &&
                      "bg-accent text-accent-foreground shadow-sm shadow-accent/20",
                    active &&
                      "bg-primary text-primary-foreground ring-4 ring-primary/15 scale-110 shadow-md shadow-primary/20",
                    !done &&
                      !active &&
                      "border-2 border-border bg-card text-muted-foreground",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={2.75} />
                  ) : (
                    <span className="tabular-nums">{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "max-w-[5.5rem] text-[11px] sm:text-[11px] font-medium leading-snug transition-colors duration-300",
                    active && "text-foreground",
                    done && "text-accent",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
