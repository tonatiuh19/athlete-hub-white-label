import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DraftListRowProps = {
  children: ReactNode;
  className?: string;
  /** Optional left rail meta (status, #). */
  leading?: ReactNode;
  actions?: ReactNode;
};

/**
 * Compact list/editor row for discounts, waves, sponsors, media.
 */
export default function DraftListRow({
  children,
  className,
  leading,
  actions,
}: DraftListRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border/70 bg-background/40 px-2.5 py-2 sm:flex-row sm:items-end",
        className,
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-12 sm:gap-2 items-end">
        {children}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-1.5 sm:pb-0.5">{actions}</div>
      ) : null}
    </div>
  );
}
