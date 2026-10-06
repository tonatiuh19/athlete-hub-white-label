import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ConsentCheckProps = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

/**
 * Branded consent control — card-style tap target with Atleita primary
 * checkmark (not a plain native checkbox).
 */
export function ConsentCheck({
  id,
  checked,
  onCheckedChange,
  children,
  className,
  disabled = false,
}: ConsentCheckProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group relative flex items-start gap-3.5 rounded-xl border p-3.5 sm:p-4 cursor-pointer select-none",
        "transition-all duration-300 ease-out",
        "bg-[linear-gradient(135deg,hsl(var(--primary)/0.06)_0%,transparent_45%,hsl(var(--accent)/0.05)_100%)]",
        checked
          ? "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_8px_24px_-12px_hsl(var(--primary)/0.45)]"
          : "border-border hover:border-primary/35 hover:bg-primary/[0.04]",
        disabled && "opacity-60 cursor-not-allowed pointer-events-none",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <span
          className={cn(
            "absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity duration-300",
            checked ? "bg-primary/20 opacity-100" : "bg-primary/10 opacity-0 group-hover:opacity-60",
          )}
        />
        <span
          className={cn(
            "absolute inset-0 opacity-[0.07]",
            "bg-[repeating-linear-gradient(-32deg,hsl(var(--primary))_0_1px,transparent_1px_10px)]",
            checked ? "opacity-[0.1]" : "opacity-[0.04]",
          )}
        />
      </span>

      <input
        id={inputId}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />

      <span
        className={cn(
          "relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-300",
          checked
            ? "border-primary bg-primary text-primary-foreground scale-100 shadow-md"
            : "border-muted-foreground/35 bg-background text-transparent group-hover:border-primary/50",
        )}
        aria-hidden
      >
        <Check
          className={cn(
            "h-3.5 w-3.5 stroke-[3] transition-all duration-300",
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </span>

      <span
        className={cn(
          "relative z-[1] text-sm leading-relaxed transition-colors duration-300",
          checked ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {children}
      </span>
    </label>
  );
}
