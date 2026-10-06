import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { optimizeEventMediaUrl } from "@/lib/cdn-url";

interface EventOrganizerHostProps {
  name: string;
  logoUrl?: string | null;
  /** Compact strip for page header */
  variant?: "header" | "hostedBy";
  className?: string;
}

function OrganizerAvatar({
  name,
  logoUrl,
  size,
}: {
  name: string;
  logoUrl?: string | null;
  size: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "h-12 w-12" : size === "md" ? "h-9 w-9" : "h-8 w-8";
  const textClass =
    size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-xs";
  const src = logoUrl ? optimizeEventMediaUrl(logoUrl, "thumb") : null;
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn(
          sizeClass,
          "rounded-full object-cover border border-border bg-card shrink-0 shadow-sm",
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizeClass,
        textClass,
        "rounded-full bg-primary/15 text-primary border border-primary/25",
        "inline-flex items-center justify-center font-bold shrink-0",
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export default function EventOrganizerHost({
  name,
  logoUrl,
  variant = "hostedBy",
  className,
}: EventOrganizerHostProps) {
  const { t } = useTranslation();

  if (variant === "header") {
    return (
      <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
        <OrganizerAvatar name={name} logoUrl={logoUrl} size="sm" />
        <span className="font-semibold text-foreground text-sm truncate">
          {name}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1.5", className)}>
      <span className="text-sm text-muted-foreground">
        {t("eventDetail.hostedBy")}
      </span>
      <span className="inline-flex items-center gap-2.5 min-w-0 max-w-full">
        <OrganizerAvatar name={name} logoUrl={logoUrl} size="md" />
        <span className="font-semibold text-foreground text-base truncate underline underline-offset-4 decoration-border">
          {name}
        </span>
      </span>
    </div>
  );
}
