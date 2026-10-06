import type { ReactNode } from "react";
import type { EventPreviewColorScheme } from "@shared/themePreference";
import { cn } from "@/lib/utils";

export type { EventPreviewColorScheme };

export interface EventPreviewColorSchemeRootProps {
  scheme: EventPreviewColorScheme;
  className?: string;
  children: ReactNode;
}

/** Isolated light/dark scope for athlete page preview (does not change staff portal theme). */
export function EventPreviewColorSchemeRoot({
  scheme,
  className,
  children,
}: EventPreviewColorSchemeRootProps) {
  return (
    <div
      className={cn(
        scheme === "dark" && "dark",
        "bg-background text-foreground min-w-0",
        className,
      )}
      data-preview-theme={scheme}
    >
      {children}
    </div>
  );
}
