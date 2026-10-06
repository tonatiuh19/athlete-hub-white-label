import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type StaffSetupDependencyEmptyProps = {
  message: string;
  actionLabel: string;
  to: string;
  /** Called when navigating away (e.g. close a sheet). */
  onNavigate?: () => void;
  className?: string;
};

/**
 * Empty-state callout when a picker depends on another setup surface
 * (coupons, ticket types, etc.) — links the user there instead of an empty Select.
 */
export default function StaffSetupDependencyEmpty({
  message,
  actionLabel,
  to,
  onNavigate,
  className,
}: StaffSetupDependencyEmptyProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed border-border/70 bg-muted/15 px-2.5 py-2 space-y-1.5",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground leading-snug">{message}</p>
      <Link
        to={to}
        onClick={onNavigate}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {actionLabel}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
