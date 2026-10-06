import { Label } from "@/components/ui/label";
import type { EventBibMode } from "@shared/bibMode";
import { cn } from "@/lib/utils";

interface StaffEventBibModePickerProps {
  value: EventBibMode;
  onChange: (mode: EventBibMode) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  /** When true, show the “these numbers ARE dorsales” strong note for folio mode. */
  strongFolioNote?: boolean;
  className?: string;
  /** When true, picker is read-only display (mirror). */
  readOnly?: boolean;
  /** Unique radio group name when multiple pickers exist in the DOM. */
  groupName?: string;
}

/** Event policy: folio number is also the race bib (dorsal), or kept separate. */
export default function StaffEventBibModePicker({
  value,
  onChange,
  t,
  strongFolioNote = false,
  className,
  readOnly = false,
  groupName = "event-bib-mode",
}: StaffEventBibModePickerProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-md border border-border/70 bg-card/60 p-2.5",
        className,
      )}
      role="group"
      aria-label={t("staffPortal.eventEdit.bibMode.title")}
    >
      <div>
        <Label className="text-xs font-semibold">
          {t("staffPortal.eventEdit.bibMode.title")}
        </Label>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {t("staffPortal.eventEdit.bibMode.subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className={cn(
            "flex items-start gap-2 rounded-md border py-1.5 px-2.5 text-sm transition-colors",
            value === "folio"
              ? "border-primary/40 bg-primary/10"
              : "border-border/70 bg-background",
            readOnly
              ? "cursor-default opacity-90 pointer-events-none"
              : "cursor-pointer",
          )}
        >
          <input
            type="radio"
            name={groupName}
            className="mt-0.5 accent-primary"
            checked={value === "folio"}
            disabled={readOnly}
            onChange={() => {
              if (!readOnly) onChange("folio");
            }}
          />
          <span>
            <span className="font-medium block text-xs">
              {t("staffPortal.eventEdit.bibMode.folioOption")}
            </span>
            <span className="text-[11px] text-muted-foreground leading-snug">
              {t("staffPortal.eventEdit.bibMode.folioHint")}
            </span>
          </span>
        </label>

        <label
          className={cn(
            "flex items-start gap-2 rounded-md border py-1.5 px-2.5 text-sm transition-colors",
            value === "separate"
              ? "border-primary/40 bg-primary/10"
              : "border-border/70 bg-background",
            readOnly
              ? "cursor-default opacity-90 pointer-events-none"
              : "cursor-pointer",
          )}
        >
          <input
            type="radio"
            name={groupName}
            className="mt-0.5 accent-primary"
            checked={value === "separate"}
            disabled={readOnly}
            onChange={() => {
              if (!readOnly) onChange("separate");
            }}
          />
          <span>
            <span className="font-medium block text-xs">
              {t("staffPortal.eventEdit.bibMode.separateOption")}
            </span>
            <span className="text-[11px] text-muted-foreground leading-snug">
              {t("staffPortal.eventEdit.bibMode.separateHint")}
            </span>
          </span>
        </label>
      </div>

      {value === "folio" && strongFolioNote ? (
        <p className="text-[11px] rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1.5 leading-snug text-foreground">
          {t("staffPortal.eventEdit.bibMode.folioStrongNote")}
        </p>
      ) : null}

      {value === "separate" ? (
        <p className="text-[11px] rounded-md border border-border/70 bg-muted/30 px-2.5 py-1.5 leading-snug text-muted-foreground">
          {t("staffPortal.eventEdit.bibMode.separateNudge")}
        </p>
      ) : null}

      {readOnly ? (
        <p className="text-[11px] text-muted-foreground">
          {t("staffPortal.eventEdit.bibMode.changeInDetails")}
        </p>
      ) : null}
    </div>
  );
}
