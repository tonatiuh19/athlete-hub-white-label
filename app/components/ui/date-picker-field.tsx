import { useMemo, useState, type ReactNode } from "react";
import { format, startOfDay, subYears } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Matcher } from "react-day-picker";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDateFnsLocale } from "@/utils/dateLocale";
import { parseIsoDate, toIsoDate } from "@/utils/datePickerValue";
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

export type DatePickerVariant = "default" | "birthDate";

export interface DatePickerFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  variant?: DatePickerVariant;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  triggerClassName?: string;
  /** Show calendar icon inside trigger */
  showIcon?: boolean;
  /** Highlight trigger as invalid */
  invalid?: boolean;
  clearable?: boolean;
}

export default function DatePickerField({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  variant = "default",
  minDate,
  maxDate,
  className,
  triggerClassName,
  showIcon = true,
  invalid = false,
  clearable = true,
}: DatePickerFieldProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const locale = getDateFnsLocale(i18n.language);
  const [open, setOpen] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const birthMin = useMemo(() => subYears(today, 100), [today]);
  const defaultBirthMonth = useMemo(() => subYears(today, 28), [today]);

  const selected = parseIsoDate(value);
  const isBirthDate = variant === "birthDate";

  const effectiveMin = isBirthDate ? (minDate ?? birthMin) : minDate;
  const effectiveMax = isBirthDate ? (maxDate ?? today) : maxDate;

  const disabledMatcher = useMemo(() => {
    const matchers: Matcher[] = [];
    if (effectiveMin) matchers.push({ before: effectiveMin });
    if (effectiveMax) matchers.push({ after: effectiveMax });
    return matchers.length ? matchers : undefined;
  }, [effectiveMin, effectiveMax]);

  const displayLabel =
    selected != null
      ? format(selected, "PP", { locale })
      : (placeholder ??
        (isBirthDate
          ? t("common.datePicker.birthPlaceholder")
          : t("common.datePicker.placeholder")));

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onBlur?.();
  };

  const trigger = (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-expanded={open}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-xl border border-input bg-card/80 text-left text-sm transition-all touch-manipulation",
        "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:pointer-events-none disabled:opacity-50",
        showIcon ? "min-h-12 h-12 pl-10 pr-3" : "min-h-11 h-11 px-3 sm:min-h-10 sm:h-10",
        invalid && "border-destructive focus-visible:ring-destructive/30",
        !selected && "text-muted-foreground",
        triggerClassName,
        className,
      )}
    >
      {showIcon ? (
        <CalendarDays className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
      ) : null}
      <span className="flex-1 truncate">{displayLabel}</span>
      {clearable && selected && !disabled ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={t("common.datePicker.clear")}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
          <X className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </button>
  );

  const panelBody: ReactNode = (
    <>
      <div className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent px-3 py-3 sm:py-2.5">
        <p className="text-xs font-medium text-muted-foreground">
          {isBirthDate ? t("auth.athlete.dobLabel") : t("common.datePicker.pickDate")}
        </p>
      </div>
      <Calendar
        mode="single"
        locale={locale}
        selected={selected}
        onSelect={(date) => {
          onChange(toIsoDate(date));
          setOpen(false);
          onBlur?.();
        }}
        defaultMonth={selected ?? (isBirthDate ? defaultBirthMonth : today)}
        captionLayout={isBirthDate ? "dropdown" : "label"}
        reverseYears={isBirthDate}
        startMonth={isBirthDate ? birthMin : effectiveMin}
        endMonth={isBirthDate ? today : effectiveMax}
        disabled={disabledMatcher}
        initialFocus={!isMobile}
        className="mx-auto w-full max-w-[22rem] [--cell-size:2.75rem] [--calendar-nav-size:2.75rem] sm:max-w-none sm:[--cell-size:2.25rem] sm:[--calendar-nav-size:2rem] sm:w-[calc(var(--cell-size)*7+1.5rem)]"
      />
      {clearable && value ? (
        <div className="border-t border-border/50 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 w-full touch-manipulation text-muted-foreground sm:h-8"
            onClick={() => {
              onChange("");
              setOpen(false);
              onBlur?.();
            }}
          >
            {t("common.datePicker.clear")}
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
              {isBirthDate ? t("auth.athlete.dobLabel") : t("common.datePicker.pickDate")}
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
