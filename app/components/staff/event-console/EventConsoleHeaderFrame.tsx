import type { ReactNode } from "react";
import { resolveApexHostname } from "@/utils/hostContext";
import { ExternalLink, Link2, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useStaffPortalOptional } from "@/components/staff/StaffPortalContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EventConsoleHeaderFrameProps = {
  title: ReactNode;
  badge?: ReactNode;
  subdomain?: string | null;
  subdomainLive?: boolean;
  actions?: ReactNode;
  /** e.g. unsaved-changes hint beside actions */
  status?: ReactNode;
  /** Mobile nav toggle — only on narrow layouts. */
  mobileMenu?: {
    open: boolean;
    onToggle: () => void;
  };
  className?: string;
  /** Sticky console chrome vs inline fallback. */
  sticky?: boolean;
};

/**
 * Single console header: title + status + subdomain + page actions + lang/theme.
 * Vista previa lives only in the event sidebar.
 */
export default function EventConsoleHeaderFrame({
  title,
  badge,
  subdomain,
  subdomainLive = false,
  actions,
  status,
  mobileMenu,
  className,
  sticky = false,
}: EventConsoleHeaderFrameProps) {
  const { t } = useTranslation();
  const portal = useStaffPortalOptional();
  const host = subdomain ? `${subdomain}.${resolveApexHostname()}` : null;
  const hint = subdomainLive
    ? t("staffPortal.eventSetup.subdomainLiveHint")
    : t("staffPortal.eventSetup.subdomainDraftHint");

  return (
    <header
      className={cn(
        "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between",
        sticky &&
          "sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6",
        className,
      )}
    >
      <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        {mobileMenu ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 lg:hidden"
            aria-label={mobileMenu.open ? "Close menu" : "Open menu"}
            onClick={mobileMenu.onToggle}
          >
            {mobileMenu.open ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        ) : null}
        <h1 className="text-lg md:text-xl font-bold tracking-tight truncate max-w-full">
          {title}
        </h1>
        {badge}
        {host ? (
          subdomainLive ? (
            <a
              href={`https://${host}`}
              target="_blank"
              rel="noopener noreferrer"
              title={hint}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border",
                "bg-muted/40 px-2 py-1 text-[11px] font-mono text-muted-foreground",
                "hover:border-primary/40 hover:text-foreground transition-colors",
              )}
            >
              <Link2 className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{host}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
              <span className="sr-only">
                {t("staffPortal.eventSetup.openSubdomain")}
              </span>
            </a>
          ) : (
            <span
              title={hint}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed border-border",
                "bg-muted/30 px-2 py-1 text-[11px] font-mono text-muted-foreground",
              )}
            >
              <Link2 className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{host}</span>
            </span>
          )
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
        {status}
        {actions}
        {portal ? (
          <>
            <LanguageSwitcher
              variant="compact"
              onLanguageChange={portal.persistLanguage}
            />
          </>
        ) : null}
      </div>
    </header>
  );
}
