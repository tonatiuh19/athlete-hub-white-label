import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  navLayout = "around",
  fixedWeeks = true,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();
  const navBtn = cn(
    buttonVariants({ variant: "ghost" }),
    "relative z-10 shrink-0 p-0 pointer-events-auto",
    "inline-flex items-center justify-center text-foreground",
    "opacity-90 hover:bg-primary/10 hover:text-primary hover:opacity-100",
    "focus-visible:ring-1 focus-visible:ring-primary/40",
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      navLayout={navLayout}
      fixedWeeks={fixedWeeks}
      className={cn(
        "p-3 [--cell-size:2.25rem] [--calendar-nav-size:2rem]",
        "w-[calc(var(--cell-size)*7+1.5rem)] max-w-full",
        className,
      )}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn(
          "relative flex w-full flex-col gap-3",
          defaultClassNames.months,
        ),
        /*
         * Header = 3 equal-edge columns so the month label is truly centered
         * between prev/next (RDP absolute "around" layout was off-center).
         */
        month: cn(
          "grid w-full grid-cols-[var(--calendar-nav-size)_minmax(0,1fr)_var(--calendar-nav-size)] gap-y-3",
          defaultClassNames.month,
        ),
        month_caption: cn(
          "col-start-2 row-start-1 flex h-[var(--calendar-nav-size)] min-w-0 items-center justify-center",
          defaultClassNames.month_caption,
        ),
        nav: cn(
          "col-span-3 row-start-1 flex h-[var(--calendar-nav-size)] items-center justify-between pointer-events-none",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          navBtn,
          "col-start-1 row-start-1 size-[var(--calendar-nav-size)] justify-self-center touch-manipulation",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          navBtn,
          "col-start-3 row-start-1 size-[var(--calendar-nav-size)] justify-self-center touch-manipulation",
          defaultClassNames.button_next,
        ),
        month_grid: cn(
          "col-span-3 row-start-2 w-full",
          defaultClassNames.month_grid,
        ),
        dropdowns: cn(
          "flex w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-lg border border-input bg-card shadow-sm",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 cursor-pointer opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "block w-full truncate text-center text-sm font-semibold capitalize leading-none",
          defaultClassNames.caption_label,
        ),
        weekdays: cn("flex w-full", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 text-center text-[0.7rem] font-medium uppercase tracking-wide",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        day: cn(
          "relative flex-1 p-0 text-center aspect-square",
          defaultClassNames.day,
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-full max-h-[var(--cell-size)] max-w-[var(--cell-size)] mx-auto p-0 font-normal transition-colors rounded-md touch-manipulation",
          "hover:bg-primary/10 hover:text-foreground",
          "aria-selected:bg-primary aria-selected:text-primary-foreground",
          "aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground",
          "aria-selected:focus:bg-primary aria-selected:focus:text-primary-foreground",
          "aria-selected:font-semibold aria-selected:shadow-[0_0_10px_hsl(var(--primary)/0.35)]",
          defaultClassNames.day_button,
        ),
        selected: cn(
          "[&_.rdp-day_button]:bg-primary [&_.rdp-day_button]:text-primary-foreground",
          defaultClassNames.selected,
        ),
        today: cn(
          "[&_.rdp-day_button]:text-primary [&_.rdp-day_button]:font-medium",
          "[&_.rdp-day_button]:ring-1 [&_.rdp-day_button]:ring-primary/45",
          "rdp-today:not(.rdp-selected) [&_.rdp-day_button]:bg-primary/10",
          defaultClassNames.today,
        ),
        outside: cn("text-muted-foreground/35", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-35", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
                ? ChevronRight
                : ChevronDown;
          return (
            <Icon
              className="h-4 w-4 shrink-0 fill-none stroke-current text-foreground"
              aria-hidden
            />
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
