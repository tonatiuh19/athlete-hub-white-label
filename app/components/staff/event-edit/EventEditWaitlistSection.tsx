import { Loader2 } from "lucide-react";
import { SectionShell } from "@/components/staff/event-edit/primitives";
import { StaffTableSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { Button } from "@/components/ui/button";
import type { StaffWaitlistEntry } from "@shared/api";

export type EventEditWaitlistTranslate = (
  key: string,
  opts?: Record<string, unknown>,
) => string;

export interface EventEditWaitlistSectionProps {
  waitlistEntries: StaffWaitlistEntry[];
  waitlistError: string | null;
  loadingWaitlist: boolean;
  offeringWaitlist: boolean;
  onOffer: (waitlistEntryId: number) => void;
  onRevoke: (waitlistEntryId: number) => void;
  t: EventEditWaitlistTranslate;
}

export default function EventEditWaitlistSection({
  waitlistEntries,
  waitlistError,
  loadingWaitlist,
  offeringWaitlist,
  onOffer,
  onRevoke,
  t,
}: EventEditWaitlistSectionProps) {
  return (
    <SectionShell
      title={t("staffPortal.eventEdit.waitlistTitle")}
      hint={t("staffPortal.eventEdit.waitlistSubtitle")}
    >
      {waitlistError ? <p className="text-xs text-destructive">{waitlistError}</p> : null}

      {loadingWaitlist ? (
        <StaffTableSkeleton rows={4} columns={3} />
      ) : waitlistEntries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("staffPortal.eventEdit.waitlistEmpty")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {waitlistEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {entry.athlete_first_name} {entry.athlete_last_name}
                </p>
                <p className="text-[11px] text-muted-foreground">{entry.athlete_email}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {entry.category_name} · #{entry.position} ·{" "}
                  {t(`staffPortal.eventEdit.waitlistStatus.${entry.status}`, {
                    defaultValue: entry.status,
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {entry.status === "waiting" ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    disabled={offeringWaitlist}
                    onClick={() => onOffer(entry.id)}
                  >
                    {offeringWaitlist ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : null}
                    {t("staffPortal.eventEdit.waitlistOffer")}
                  </Button>
                ) : null}
                {entry.status === "waiting" || entry.status === "offered" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={offeringWaitlist}
                    className="h-8 text-destructive border-destructive/40"
                    onClick={() => onRevoke(entry.id)}
                  >
                    {t("staffPortal.eventEdit.waitlistRevoke")}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
