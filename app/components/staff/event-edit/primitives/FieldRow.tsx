import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import FieldHelpTip from "@/components/ui/field-help-tip";
import { cn } from "@/lib/utils";

export type FieldRowProps = {
  id?: string;
  label: ReactNode;
  children: ReactNode;
  error?: ReactNode;
  /** Shown as a hover (?) icon after the label — not as body text under the control. */
  hint?: ReactNode;
  /**
   * Where to place the help icon. Default `label`.
   * Use `control` to sit the tip beside the input row (e.g. after a trailing control).
   */
  hintPlacement?: "label" | "control";
  /** Span full width in a 2-col grid parent. */
  fullWidth?: boolean;
  className?: string;
  required?: boolean;
  /** Stack label above control (default). Use `inline` for label|control on sm+. */
  layout?: "stack" | "inline";
};

/**
 * Compact labeled control — text-xs label, h-9-friendly controls, tight gaps.
 * Helpers use {@link FieldHelpTip} after the label (or control) on hover.
 */
export default function FieldRow({
  id,
  label,
  children,
  error,
  hint,
  hintPlacement = "label",
  fullWidth,
  className,
  required,
  layout = "stack",
}: FieldRowProps) {
  const help = hint ? <FieldHelpTip content={hint} /> : null;

  return (
    <div
      className={cn(
        layout === "inline"
          ? "grid gap-1.5 sm:grid-cols-[minmax(7.5rem,10rem)_minmax(0,1fr)] sm:items-start sm:gap-3"
          : "space-y-1",
        fullWidth && "sm:col-span-2",
        className,
      )}
    >
      <Label
        htmlFor={id}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground leading-none pt-0.5"
      >
        <span className="min-w-0">{label}</span>
        {required ? <span className="text-destructive">*</span> : null}
        {hintPlacement === "label" ? help : null}
      </Label>
      <div className="min-w-0 space-y-1">
        {hintPlacement === "control" && help ? (
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">{children}</div>
            <div className="pt-2.5">{help}</div>
          </div>
        ) : (
          children
        )}
        {error ? (
          <p className="text-[11px] text-destructive leading-snug">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
