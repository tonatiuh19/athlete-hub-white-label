import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { CalendarClock, ChevronLeft, Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Matcher } from "react-day-picker";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDateFnsLocale } from "@/utils/dateLocale";
import {
  buildMinuteOptions,
  combineDateWithTime,
  parseDatetimeLocalValue,
  parseDefaultTime,
  snapMinute,
  toDatetimeLocalValue,
} from "@/utils/datetimePickerValue";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DateTimeMinuteStep = 5 | 10 | 15 | 30;

export interface DateTimePickerFieldProps {
  id?: string;
  /** `YYYY-MM-DDTHH:mm` or empty */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  invalid?: boolean;
  /** When picking a fresh date, seed this clock time (default `08:00`). */
  defaultTime?: string;
  minuteStep?: DateTimeMinuteStep;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  triggerClassName?: string;
  showIcon?: boolean;
}

type Panel = "date" | "time";

/**
 * Staff-friendly datetime picker: pick a date, then auto-advance to interval time.
 * Desktop = popover; mobile = bottom drawer with larger touch targets.
 * Wire format stays `datetime-local` compatible for Formik + existing serializers.
 */
export default function DateTimePickerField({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  clearable = true,
  invalid = false,
  defaultTime = "08:00",
  minuteStep = 15,
  minDate,
  maxDate,
  className,
  triggerClassName,
  showIcon = true,
}: DateTimePickerFieldProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const locale = getDateFnsLocale(i18n.language);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("date");
  const [draftDate, setDraftDate] = useState<Date | null>(null);

  const selected = parseDatetimeLocalValue(value);
  const defaultClock = useMemo(
    () => parseDefaultTime(defaultTime),
    [defaultTime],
  );
  const minuteOptions = useMemo(
    () => buildMinuteOptions(minuteStep),
    [minuteStep],
  );

  const disabledMatcher = useMemo(() => {
    const matchers: Matcher[] = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length ? matchers : undefined;
  }, [minDate, maxDate]);

  const displayLabel =
    selected != null
      ? format(selected, "PPp", { locale })
      : (placeholder ?? t("common.dateTimePicker.placeholder"));

  const activeDate = draftDate ?? selected;
  const activeHours = selected?.getHours() ?? defaultClock.hours;
  const activeMinutes = snapMinute(
    selected?.getMinutes() ?? defaultClock.minutes,
    minuteStep,
  );

  useEffect(() => {
    if (!open) return;
    setPanel(selected ? "time" : "date");
    setDraftDate(selected);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- reset panel only when opening

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPanel("date");
      setDraftDate(null);
      onBlur?.();
    }
  };

  const commit = (next: string, close = false) => {
    onChange(next);
    if (close) {
      setOpen(false);
      setPanel("date");
      setDraftDate(null);
      onBlur?.();
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setDraftDate(date);
    const hours = selected?.getHours() ?? defaultClock.hours;
    const minutes = snapMinute(
      selected?.getMinutes() ?? defaultClock.minutes,
      minuteStep,
    );
    const next = combineDateWithTime(date, hours, minutes);
    onChange(next);
    setPanel("time");
  };

  const handleTimePick = (hours: number, minutes: number, close: boolean) => {
    const base = draftDate ?? selected ?? new Date();
    const next = combineDateWithTime(base, hours, minutes);
    if (close) commit(next, true);
    else onChange(next);
  };

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, h) => h),
    [],
  );

  const trigger = (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-expanded={open}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-md border border-input bg-card/80 text-left text-sm transition-all touch-manipulation",
        "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:pointer-events-none disabled:opacity-50",
        // 44px-friendly on phones; compact on desktop staff forms
        showIcon ? "min-h-11 h-11 pl-10 pr-2 sm:min-h-9 sm:h-9 sm:pl-9" : "min-h-11 h-11 px-3 sm:min-h-9 sm:h-9",
        invalid && "border-destructive focus-visible:ring-destructive/30",
        !selected && "text-muted-foreground",
        triggerClassName,
        className,
      )}
    >
      {showIcon ? (
        <CalendarClock className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground sm:left-2.5 sm:h-3.5 sm:w-3.5" />
      ) : null}
      <span className="flex-1 truncate">{displayLabel}</span>
      {clearable && selected && !disabled ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={t("common.dateTimePicker.clear")}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:size-7"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onChange("");
            }
          }}
        >
          <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </span>
      ) : null}
    </button>
  );

  const panelBody: ReactNode = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent px-3 py-3 sm:py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {panel === "date"
              ? t("common.dateTimePicker.pickDate")
              : t("common.dateTimePicker.pickTime")}
          </p>
          {activeDate ? (
            <p className="text-sm font-semibold truncate sm:text-sm">
              {format(activeDate, panel === "date" ? "PPP" : "PPp", {
                locale,
              })}
            </p>
          ) : null}
        </div>
        {panel === "time" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 shrink-0 touch-manipulation text-xs sm:h-8"
            onClick={() => setPanel("date")}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            {t("common.dateTimePicker.changeDate")}
          </Button>
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {panel === "date" ? (
        <Calendar
          mode="single"
          locale={locale}
          selected={activeDate ?? undefined}
          onSelect={handleDateSelect}
          defaultMonth={activeDate ?? new Date()}
          disabled={disabledMatcher}
          initialFocus={!isMobile}
          className="mx-auto w-full max-w-[22rem] [--cell-size:2.75rem] [--calendar-nav-size:2.75rem] sm:max-w-none sm:[--cell-size:2.25rem] sm:[--calendar-nav-size:2rem] sm:w-[calc(var(--cell-size)*7+1.5rem)]"
        />
      ) : (
        <div className="space-y-4 p-3 sm:space-y-3">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-1.5">
              {t("common.dateTimePicker.hour")}
            </p>
            <div className="grid max-h-40 grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-28 sm:gap-1">
              {hourOptions.map((h) => {
                const active = h === activeHours;
                return (
                  <button
                    key={h}
                    type="button"
                    className={cn(
                      "min-h-11 rounded-md text-sm font-medium tabular-nums transition-colors touch-manipulation sm:min-h-8 sm:h-8 sm:text-xs",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground hover:bg-muted active:bg-muted",
                    )}
                    onClick={() => handleTimePick(h, activeMinutes, false)}
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-1.5">
              {t("common.dateTimePicker.minute", { step: minuteStep })}
            </p>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-1">
              {minuteOptions.map((m) => {
                const active = m === activeMinutes;
                return (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      "min-h-12 rounded-md text-base font-semibold tabular-nums transition-colors touch-manipulation sm:min-h-9 sm:h-9 sm:text-sm",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground hover:bg-muted active:bg-muted",
                    )}
                    onClick={() => handleTimePick(activeHours, m, true)}
                  >
                    :{String(m).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 w-full touch-manipulation sm:h-9"
            onClick={() => {
              const now = new Date();
              const snapped = snapMinute(now.getMinutes(), minuteStep);
              commit(
                toDatetimeLocalValue(
                  new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    now.getHours(),
                    snapped,
                    0,
                    0,
                  ),
                ),
                true,
              );
            }}
          >
            {t("common.dateTimePicker.useNow")}
          </Button>
        </div>
      )}

      {clearable && value ? (
        <div className="border-t border-border/50 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 w-full touch-manipulation text-muted-foreground sm:h-8"
            onClick={() => commit("", true)}
          >
            {t("common.dateTimePicker.clear")}
          </Button>
        </div>
      ) : null}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[min(92dvh,40rem)] gap-0 border-border/60 p-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {panel === "date"
                ? t("common.dateTimePicker.pickDate")
                : t("common.dateTimePicker.pickTime")}
            </DrawerTitle>
          </DrawerHeader>
          <div className="mx-auto w-full max-w-md overflow-y-auto overscroll-contain">
            {panelBody}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-[calc(2.25rem*7+1.5rem)] max-w-[calc(100vw-1.5rem)] overflow-hidden border-border/60 bg-card p-0 shadow-xl"
        align="start"
        sideOffset={6}
        collisionPadding={12}
      >
        {panelBody}
      </PopoverContent>
    </Popover>
  );
}
