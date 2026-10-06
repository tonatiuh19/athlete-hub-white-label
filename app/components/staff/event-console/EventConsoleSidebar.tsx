import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useGuardedConsoleNavClick } from "@/hooks/use-guarded-console-nav-click";
import EventConsoleVistaPreviaButton from "@/components/staff/event-console/EventConsoleVistaPreviaButton";
import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  eventConsoleHref,
  getVisibleEventConsoleTree,
  isEventConsoleBranchActive,
  isEventConsoleNavActive,
  type EventConsoleNavNode,
} from "@/utils/eventConsoleNav";

type Props = {
  eventId: number;
  eventTitle?: string;
  eventStatus?: string;
  isAdmin: boolean;
  organizerRole?: string;
  mobile?: boolean;
  onNavigate?: () => void;
};

function parentClass(branchActive: boolean) {
  return cn(
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors border",
    branchActive
      ? "border-primary/50 bg-primary/10 text-primary"
      : "border-transparent text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );
}

function childClass(active: boolean) {
  return cn(
    "block rounded-md py-1.5 pl-3 pr-2 text-[13px] leading-snug transition-colors border-l-2",
    active
      ? "border-primary text-primary font-medium bg-primary/5"
      : "border-transparent text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
  );
}

function TreeBranch({
  node,
  eventId,
  onNavigate,
}: {
  node: EventConsoleNavNode;
  eventId: number;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const guardedNavClick = useGuardedConsoleNavClick();
  const to = eventConsoleHref(eventId, node.path);
  const exactActive = isEventConsoleNavActive(
    node,
    location.pathname,
    location.search,
  );
  const branchActive = isEventConsoleBranchActive(
    node,
    location.pathname,
    location.search,
  );
  const Icon = node.icon;
  const hasChildren = Boolean(node.children?.length);

  /** null = follow route; boolean = user override */
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = hasChildren ? (userOpen ?? branchActive) : false;

  useEffect(() => {
    // Re-sync with route when entering/leaving this branch
    setUserOpen(null);
  }, [branchActive]);

  if (!hasChildren) {
    return (
      <li className="border-b border-sidebar-border/60 last:border-b-0">
        <NavLink
          to={to}
          end={node.path === "overview"}
          onClick={(e) => {
            guardedNavClick(to, onNavigate)(e);
          }}
          className={parentClass(branchActive)}
          aria-current={exactActive ? "page" : undefined}
        >
          {Icon ? <Icon className="w-4 h-4 shrink-0 opacity-90" /> : null}
          <span className="truncate">{t(node.labelKey)}</span>
        </NavLink>
      </li>
    );
  }

  return (
    <li className="border-b border-sidebar-border/60 last:border-b-0">
      <Collapsible
        open={open}
        onOpenChange={(next) => setUserOpen(next)}
      >
        <div className="flex items-center gap-0.5">
          <NavLink
            to={to}
            onClick={(e) => {
              setUserOpen(true);
              guardedNavClick(to, onNavigate)(e);
            }}
            className={parentClass(branchActive)}
            aria-current={exactActive ? "page" : undefined}
          >
            {Icon ? <Icon className="w-4 h-4 shrink-0 opacity-90" /> : null}
            <span className="truncate">{t(node.labelKey)}</span>
          </NavLink>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-9 w-8 shrink-0 items-center justify-center rounded-md",
                "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label={
                open
                  ? t("staffPortal.eventConsole.collapseSection", {
                      section: t(node.labelKey),
                    })
                  : t("staffPortal.eventConsole.expandSection", {
                      section: t(node.labelKey),
                    })
              }
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <ul className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l border-sidebar-border/70 pl-2">
            {node.children!.map((child) => {
              const childTo = eventConsoleHref(eventId, child.path);
              const childActive = isEventConsoleNavActive(
                child,
                location.pathname,
                location.search,
              );
              return (
                <li key={child.id}>
                  <NavLink
                    to={childTo}
                    onClick={(e) => guardedNavClick(childTo, onNavigate)(e)}
                    className={childClass(childActive)}
                  >
                    <span className="truncate">{t(child.labelKey)}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export default function EventConsoleSidebar({
  eventId,
  eventTitle,
  eventStatus,
  isAdmin,
  organizerRole,
  mobile = false,
  onNavigate,
}: Props) {
  const { t } = useTranslation();
  const guardedNavClick = useGuardedConsoleNavClick();
  const tree = getVisibleEventConsoleTree({ isAdmin, organizerRole });

  return (
    <div className={cn("flex h-full flex-col", mobile && "pb-6")}>
      <div className="shrink-0 space-y-3 border-b border-sidebar-border p-4">
        <Link
          to="/staff/events"
          onClick={(e) => guardedNavClick("/staff/events", onNavigate)(e)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("staffPortal.eventConsole.backToEvents")}
        </Link>
        <div className="min-w-0 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {t("staffPortal.eventConsole.shellLabel")}
          </p>
          <h2 className="text-sm font-bold leading-snug text-sidebar-foreground line-clamp-2">
            {eventTitle ?? t("staffPortal.eventConsole.loadingTitle")}
          </h2>
          {eventStatus ? <StaffStatusBadge status={eventStatus} /> : null}
        </div>
        <EventConsoleVistaPreviaButton
          variant="sidebar"
          size="sm"
          className="w-full justify-center"
        />
      </div>

      <nav
        className="flex-1 overflow-y-auto px-2 py-2"
        aria-label={t("staffPortal.eventConsole.shellLabel")}
      >
        <ul className="space-y-0">
          {tree.map((node) => (
            <TreeBranch
              key={node.id}
              node={node}
              eventId={eventId}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}
