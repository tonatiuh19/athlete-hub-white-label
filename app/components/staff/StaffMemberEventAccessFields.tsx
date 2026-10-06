import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type MemberEventAccessScope = "organization" | "events";

export interface StaffMemberEventAccessFieldsProps {
  role: string;
  scope: MemberEventAccessScope;
  eventIds: number[];
  events: Array<{ id: number; title: string }>;
  loadingEvents?: boolean;
  onScopeChange: (scope: MemberEventAccessScope) => void;
  onEventIdsChange: (eventIds: number[]) => void;
  /** Compact layout for table cells */
  compact?: boolean;
  className?: string;
}

/** Owner/organizer are always org-wide — no picker. */
export function memberRoleSupportsEventScope(role: string): boolean {
  return role !== "owner" && role !== "organizer";
}

/**
 * Event access controls for sellers and other scoped staff.
 * Sellers typically use Selected events; Organization = sell on any org event.
 */
export default function StaffMemberEventAccessFields({
  role,
  scope,
  eventIds,
  events,
  loadingEvents = false,
  onScopeChange,
  onEventIdsChange,
  compact = false,
  className,
}: StaffMemberEventAccessFieldsProps) {
  const { t } = useTranslation();

  if (!memberRoleSupportsEventScope(role)) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {t("staffPortal.team.accessAllEvents")}
      </p>
    );
  }

  const toggleEvent = (eventId: number, checked: boolean) => {
    const next = new Set(eventIds);
    if (checked) next.add(eventId);
    else next.delete(eventId);
    onEventIdsChange([...next]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("space-y-1.5", compact && "space-y-1")}>
        {!compact ? (
          <Label>{t("staffPortal.team.eventAccess")}</Label>
        ) : null}
        <Select
          value={scope}
          onValueChange={(v) => onScopeChange(v as MemberEventAccessScope)}
        >
          <SelectTrigger className={cn(compact ? "h-8 w-full min-w-[9rem]" : undefined)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="organization">
              {t("staffPortal.team.accessAllEvents")}
            </SelectItem>
            <SelectItem value="events">
              {t("staffPortal.team.accessSelectedEvents")}
            </SelectItem>
          </SelectContent>
        </Select>
        {role === "seller" ? (
          <p className="text-xs text-muted-foreground">
            {scope === "organization"
              ? t("staffPortal.team.sellerAccessOrgHint")
              : t("staffPortal.team.sellerAccessEventsHint")}
          </p>
        ) : null}
      </div>

      {scope === "events" ? (
        <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-lg border border-border/70 p-2">
          {loadingEvents ? (
            <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("staffPortal.team.noEventsForAccess")}
            </p>
          ) : (
            events.map((e) => {
              const checked = eventIds.includes(e.id);
              return (
                <label
                  key={e.id}
                  className="flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => toggleEvent(e.id, v === true)}
                  />
                  <span className="truncate">{e.title}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
