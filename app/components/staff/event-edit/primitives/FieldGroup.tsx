import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FieldGroupProps = {
  title: ReactNode;
  /** Always-visible group intro — not a hover tip. */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional trailing actions (Save, etc.) */
  actions?: ReactNode;
};

/**
 * Labeled group with top border — no nested card padding tax.
 * Group helpers render as visible muted copy under the title.
 */
export default function FieldGroup({
  title,
  hint,
  children,
  className,
  actions,
}: FieldGroupProps) {
  return (
    <div
      className={cn(
        "space-y-2.5 border-t border-border/70 pt-3 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
            {title}
          </p>
          {hint ? (
            <p className="text-xs font-normal normal-case tracking-normal leading-snug text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
