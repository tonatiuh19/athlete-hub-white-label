import type { FormEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionShellProps = {
  title?: ReactNode;
  /** Always-visible subsection intro — not a hover tip. */
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  /** Compact ops density (default). */
  density?: "compact" | "comfortable";
  as?: "div" | "form" | "section";
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

/**
 * Dense staff editor panel — flat border, no marketing hover glow.
 * Replaces `card-sport p-6` for Boletópolis-like edit density.
 * Section helpers render as visible muted copy under the title.
 */
export default function SectionShell({
  title,
  hint,
  actions,
  children,
  className,
  id,
  density = "compact",
  as = "div",
  onSubmit,
}: SectionShellProps) {
  const pad = density === "compact" ? "p-3 md:p-4" : "p-4 md:p-5";
  const shellClassName = cn(
    "staff-panel rounded-lg border border-border bg-card/60",
    pad,
    "space-y-3",
    className,
  );

  const header =
    title || hint || actions ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {title ? (
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          ) : null}
          {hint ? (
            <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    ) : null;

  if (as === "form") {
    return (
      <form id={id} onSubmit={onSubmit} className={shellClassName}>
        {header}
        {children}
      </form>
    );
  }

  if (as === "section") {
    return (
      <section id={id} className={shellClassName}>
        {header}
        {children}
      </section>
    );
  }

  return (
    <div id={id} className={shellClassName}>
      {header}
      {children}
    </div>
  );
}
