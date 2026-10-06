import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getCountdownParts } from "@/utils/eventCountdown";

interface EventCountdownProps {
  targetIso: string;
  className?: string;
  /** Compact row for mobile */
  compact?: boolean;
}

function FlipDigit({
  digit,
  compact,
}: {
  digit: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden shrink-0",
        "rounded-md bg-foreground text-background font-bold tabular-nums select-none",
        "shadow-[0_2px_0_0_hsl(var(--foreground)/0.35),0_3px_8px_-2px_hsl(var(--foreground)/0.3)]",
        "animate-in fade-in zoom-in-95 duration-200",
        compact
          ? "h-7 w-5 text-[13px]"
          : "h-8 w-5 text-base sm:h-10 sm:w-7 sm:text-xl",
      )}
      aria-hidden
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-background/15 to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/50 to-transparent opacity-40"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px -translate-y-px bg-background/25"
        aria-hidden
      />
      <span className="relative z-[1] leading-none tracking-tight">{digit}</span>
    </span>
  );
}

function FlipGroup({
  value,
  label,
  showColon,
  compact,
}: {
  value: number;
  label: string;
  showColon?: boolean;
  compact?: boolean;
}) {
  const digits = String(Math.max(0, Math.floor(value)))
    .padStart(2, "0")
    .split("");

  return (
    <div className="relative flex min-w-0 flex-col items-center gap-1">
      {showColon ? (
        <span
          className={cn(
            "pointer-events-none absolute top-[1.35rem] -left-1.5 sm:-left-2 z-10",
            "flex flex-col items-center justify-center gap-1 text-foreground/45",
            compact ? "top-[1.15rem] -left-1" : "sm:top-[1.55rem]",
          )}
          aria-hidden
        >
          <span className="block h-1 w-1 rounded-full bg-current" />
          <span className="block h-1 w-1 rounded-full bg-current" />
        </span>
      ) : null}
      <p
        className={cn(
          "h-3 w-full truncate text-center uppercase leading-none",
          "text-muted-foreground font-semibold tracking-wide",
          compact ? "text-[8px]" : "text-[9px] sm:text-[10px]",
        )}
      >
        {label}
      </p>
      <div className="flex items-center justify-center gap-0.5 sm:gap-1" aria-hidden>
        {digits.map((d, i) => (
          <FlipDigit key={`${label}-${i}-${d}`} digit={d} compact={compact} />
        ))}
      </div>
    </div>
  );
}

export default function EventCountdown({
  targetIso,
  className,
  compact = false,
}: EventCountdownProps) {
  const { t } = useTranslation();
  const [parts, setParts] = useState(() => getCountdownParts(targetIso));

  useEffect(() => {
    const tick = () => setParts(getCountdownParts(targetIso));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  if (parts.isPast) return null;

  // Short labels keep 4 columns aligned in the sticky sidebar / mobile width.
  const groups = [
    { value: parts.days, label: t("eventDetail.countdownDaysShort") },
    { value: parts.hours, label: t("eventDetail.countdownHoursShort") },
    { value: parts.minutes, label: t("eventDetail.countdownMin") },
    { value: parts.seconds, label: t("eventDetail.countdownSec") },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/80 overflow-hidden",
        className,
      )}
      aria-live="polite"
      aria-label={t("eventDetail.eventStartsIn")}
    >
      <p
        className={cn(
          "font-semibold text-primary text-center tracking-wide px-3",
          compact ? "text-[11px] pt-2.5 pb-1.5" : "text-xs pt-3 pb-2",
        )}
      >
        {t("eventDetail.eventStartsIn")}
      </p>
      <div
        className={cn(
          "grid grid-cols-4 items-start",
          compact ? "gap-x-2 px-2.5 pb-3" : "gap-x-3 sm:gap-x-4 px-3 sm:px-4 pb-3.5",
        )}
      >
        {groups.map((group, i) => (
          <FlipGroup
            key={group.label}
            value={group.value}
            label={group.label}
            showColon={i > 0}
            compact={compact}
          />
        ))}
      </div>
      <span className="sr-only">
        {t("eventDetail.eventStartsIn")}: {parts.days}{" "}
        {t("eventDetail.countdownDays")}, {parts.hours}{" "}
        {t("eventDetail.countdownHours")}, {parts.minutes}{" "}
        {t("eventDetail.countdownMinutes")}, {parts.seconds}{" "}
        {t("eventDetail.countdownSeconds")}
      </span>
    </div>
  );
}
