import type { ReactNode } from "react";
import FieldHelpTip from "@/components/ui/field-help-tip";
import { cn } from "@/lib/utils";

export type ToggleRowProps = {
  id?: string;
  label: ReactNode;
  /** Shown as hover (?) after the label. */
  description?: ReactNode;
  control: ReactNode;
  className?: string;
};

/**
 * Single-line policy toggle: label left, control right.
 */
export default function ToggleRow({
  id,
  label,
  description,
  control,
  className,
}: ToggleRowProps) {
  return (
    <div
      id={id}
      className={cn(
        "flex items-start justify-between gap-3 rounded-md border border-border/60 bg-muted/15 px-2.5 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
          <span className="min-w-0">{label}</span>
          {description ? <FieldHelpTip content={description} /> : null}
        </p>
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}
