import { CheckCircle2, Circle, LayoutDashboard, Loader2, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EventPublishReadiness } from "@/components/staff/StaffEventPublishChecklist";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { EventSetupSectionDef } from "@/utils/eventSetupSections";
import {
  eventSetupCardStatus,
  filterVisibleSetupSections,
} from "@/utils/eventSetupProgress";
import { cn } from "@/lib/utils";

export type EventEditNavTab = "overview" | string;

export interface EventEditGuidedNavProps {
  activeTab: EventEditNavTab;
  onNavigate: (tab: EventEditNavTab) => void;
  readiness: EventPublishReadiness;
  hasPaidCategories: boolean;
  /** Tabs the user can access (permission-gated) */
  visibleTabIds: Set<string>;
  variant?: "all" | "mobile" | "desktop";
  className?: string;
}

function NavItem({
  active,
  done,
  loading,
  label,
  step,
  onClick,
  compact,
}: {
  active: boolean;
  done: boolean;
  loading?: boolean;
  label: string;
  step?: number;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full text-left rounded-xl transition-colors",
        compact ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-sm",
        active
          ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 opacity-40" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {step != null ? (
        <span className="text-[10px] tabular-nums opacity-60 shrink-0">{step}</span>
      ) : null}
    </button>
  );
}

function sectionToTab(section: EventSetupSectionDef): string | null {
  return section.tab;
}

export default function EventEditGuidedNav({
  activeTab,
  onNavigate,
  readiness,
  hasPaidCategories,
  visibleTabIds,
  variant = "all",
  className,
}: EventEditGuidedNavProps) {
  const { t } = useTranslation();

  const sections = filterVisibleSetupSections(
    hasPaidCategories,
    readiness.payoutReady,
  ).filter((s) => {
    if (s.externalPath) return false;
    const tab = sectionToTab(s);
    return tab != null && visibleTabIds.has(tab);
  });

  const renderNavList = (compact: boolean) => (
    <nav className="space-y-1" aria-label={t("staffPortal.eventEdit.sectionsLabel")}>
      <NavItem
        active={activeTab === "overview"}
        done={false}
        label={t("staffPortal.eventEdit.tabOverview")}
        onClick={() => onNavigate("overview")}
        compact={compact}
      />
      {sections.map((section) => {
        const tab = sectionToTab(section)!;
        const status = eventSetupCardStatus(section, readiness);
        return (
          <NavItem
            key={section.id}
            active={activeTab === tab}
            done={status === "done"}
            loading={status === "loading"}
            label={t(`staffPortal.eventSetup.cards.${section.id}.title`)}
            step={section.order}
            onClick={() => onNavigate(tab)}
            compact={compact}
          />
        );
      })}
    </nav>
  );

  const mobilePills = (
    <div className="xl:hidden sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 overflow-x-auto flex gap-1.5 pb-0.5 [scrollbar-width:none]">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "overview" ? "default" : "outline"}
            className="h-8 shrink-0 rounded-full text-xs"
            onClick={() => onNavigate("overview")}
          >
            <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
            {t("staffPortal.eventEdit.tabOverview")}
          </Button>
          {sections.slice(0, 4).map((section) => {
            const tab = sectionToTab(section)!;
            const status = eventSetupCardStatus(section, readiness);
            return (
              <Button
                key={section.id}
                type="button"
                size="sm"
                variant={activeTab === tab ? "default" : "outline"}
                className="h-8 shrink-0 rounded-full text-xs"
                onClick={() => onNavigate(tab)}
              >
                {status === "done" ? (
                  <CheckCircle2 className="h-3 w-3 mr-1 text-accent" />
                ) : null}
                {t(`staffPortal.eventSetup.cards.${section.id}.title`)}
              </Button>
            );
          })}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0">
              <Menu className="h-4 w-4" />
              <span className="sr-only">{t("staffPortal.eventEdit.allSections")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{t("staffPortal.eventEdit.allSections")}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 pb-6 overflow-y-auto">{renderNavList(true)}</div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );

  return (
    <>
      {variant !== "desktop" ? mobilePills : null}
      {variant !== "mobile" ? (
        <aside
          className={cn(
            "w-full shrink-0",
            "sticky top-4 self-start max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-y-contain",
            className,
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            {t("staffPortal.eventEdit.guideLabel")}
          </p>
          {renderNavList(false)}
        </aside>
      ) : null}
    </>
  );
}

/** Tab ids that exist in EventEdit beyond setup sections */
export function buildEventEditVisibleTabs(options: {
  isNew: boolean;
  canManageCategories: boolean;
  canManageSponsors: boolean;
  isAdmin?: boolean;
}): Set<string> {
  const tabs = new Set<string>([
    "details",
    "location",
    "checkin",
    "registration",
    "description",
    "images",
  ]);
  if (!options.isNew) tabs.add("categories");
  if (options.isAdmin && !options.isNew) tabs.add("policies");
  if (options.canManageCategories) {
    for (const id of [
      "discounts",
      "folios",
      "waiver",
      "course",
      "media",
      "fields",
      "waves",
      "waitlist",
      "extras",
    ]) {
      tabs.add(id);
    }
  }
  if (options.canManageSponsors) tabs.add("sponsors");
  return tabs;
}
