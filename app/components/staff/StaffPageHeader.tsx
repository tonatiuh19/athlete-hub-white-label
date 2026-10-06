import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { StaffPageHeaderSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { useStaffPortalOptional } from "@/components/staff/StaffPortalContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StaffPageHeaderBackLink {
  to: string;
  label: string;
  /** Intercept navigation when there are unsaved changes. */
  guardedNavigate?: (proceed: () => void) => void;
}

export interface StaffPageHeaderProps {
  /** Small label above the title (e.g. site settings eyebrow). */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  back?: StaffPageHeaderBackLink;
  /** `link` = text link (default); `button` = ghost button row */
  backAs?: "link" | "button";
  icon?: LucideIcon;
  badge?: ReactNode;
  /** Page-specific actions (buttons). Theme + language follow on desktop. */
  actions?: ReactNode;
  /** Small status text (saving, unsaved changes). */
  status?: ReactNode;
  /** Block below subtitle (e.g. subdomain card). */
  trailing?: ReactNode;
  loading?: boolean;
  className?: string;
  titleClassName?: string;
  /** Dashboard-style larger title */
  titleSize?: "default" | "large";
  /** Show theme + language on lg+ (mobile uses layout bar). Default true. */
  showUtilities?: boolean;
}

export default function StaffPageHeader({
  eyebrow,
  title,
  subtitle,
  back,
  backAs = "link",
  icon: Icon,
  badge,
  actions,
  status,
  trailing,
  loading = false,
  className,
  titleClassName,
  titleSize = "default",
  showUtilities = true,
}: StaffPageHeaderProps) {
  const portal = useStaffPortalOptional();
  const navigate = useNavigate();

  const handleBackClick = (
    event: MouseEvent<HTMLAnchorElement>,
    to: string,
    guardedNavigate?: (proceed: () => void) => void,
  ) => {
    if (!guardedNavigate) return;
    event.preventDefault();
    guardedNavigate(() => navigate(to));
  };

  const utilities =
    showUtilities && portal ? (
      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
        <LanguageSwitcher
          variant="ghost"
          className="pace-header-lang"
          onLanguageChange={portal.persistLanguage}
        />
      </div>
    ) : null;

  const rightColumn = actions || status || utilities;

  return (
    <header className={cn("space-y-0", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {back ? (
            backAs === "button" ? (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="mb-2 -ml-2 h-8 px-2 text-muted-foreground"
              >
                <Link to={back.to} onClick={(e) => handleBackClick(e, back.to, back.guardedNavigate)}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  {back.label}
                </Link>
              </Button>
            ) : (
              <Link
                to={back.to}
                onClick={(e) => handleBackClick(e, back.to, back.guardedNavigate)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {back.label}
              </Link>
            )
          ) : null}

          {loading ? (
            <StaffPageHeaderSkeleton withIcon={Boolean(Icon)} />
          ) : (
            <>
              {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {Icon ? <Icon className="w-7 h-7 text-primary shrink-0" /> : null}
                <h1
                  className={cn(
                    "font-bold min-w-0",
                    titleSize === "large" ? "text-3xl" : "text-xl sm:text-2xl",
                    titleClassName,
                  )}
                >
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle ? (
                <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
              ) : null}
            </>
          )}
        </div>

        {rightColumn ? (
          <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
            {status ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
                {status}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {actions}
              {utilities}
            </div>
          </div>
        ) : null}
      </div>

      {!loading && trailing ? <div className="mt-3">{trailing}</div> : null}
    </header>
  );
}
