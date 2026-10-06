import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FieldHelpTipProps = {
  /** Helper copy shown on hover / focus. */
  content: ReactNode;
  className?: string;
  /** Icon button class overrides. */
  triggerClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

/**
 * Compact (?) help control for form labels — keeps helper copy off the layout.
 * Tooltip is portaled (see TooltipContent) so it is not clipped by overflow panels.
 */
export default function FieldHelpTip({
  content,
  className,
  triggerClassName,
  /** Prefer bottom so tips under section headers are not clipped by sticky chrome. */
  side = "bottom",
  align = "start",
}: FieldHelpTipProps) {
  const { t } = useTranslation();
  if (content == null || content === false || content === "") return null;

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center rounded-full",
            "text-muted-foreground/80 transition-colors",
            "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "touch-manipulation",
            triggerClassName,
          )}
          aria-label={t("common.fieldHelp")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <CircleHelp className="size-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className={cn(
          "max-w-[min(20rem,calc(100vw-2rem))] px-2.5 py-2 text-xs leading-snug font-normal normal-case tracking-normal break-words",
          className,
        )}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
