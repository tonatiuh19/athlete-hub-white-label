import { useState } from "react";
import { CheckCircle2, ChevronDown, Info, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function PillList({ items, tone }: { items: string[]; tone: "accent" | "muted" | "primary" }) {
  const toneClass =
    tone === "accent"
      ? "border-accent/30 bg-accent/10 text-foreground"
      : tone === "primary"
        ? "border-primary/30 bg-primary/10 text-foreground"
        : "border-border bg-muted/40 text-muted-foreground";

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            toneClass,
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Guide for staff custom registration fields — built-ins + multi-person orders. Collapsed by default. */
export default function StaffRegistrationFieldsGuide() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const alwaysItems = t("staffPortal.eventEdit.builtinFields.alwaysItems", {
    returnObjects: true,
  }) as string[];
  const groupItems = t("staffPortal.eventEdit.builtinFields.groupItems", {
    returnObjects: true,
  }) as string[];
  const optionalItems = t("staffPortal.eventEdit.builtinFields.optionalItems", {
    returnObjects: true,
  }) as string[];
  const goodExamples = t("staffPortal.eventEdit.builtinFields.goodExamples", {
    returnObjects: true,
  }) as string[];

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="space-y-2"
      role="region"
      aria-label={t("staffPortal.eventEdit.builtinFields.regionLabel")}
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between gap-2 px-2.5 text-xs font-medium"
        >
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
            <span className="truncate">
              {open
                ? t("staffPortal.eventEdit.builtinFields.hideGuide")
                : t("staffPortal.eventEdit.builtinFields.showGuide")}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 data-[state=closed]:animate-none">
        <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2 leading-snug">
            <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
            <span>{t("staffPortal.eventEdit.fieldsSectionLegend")}</span>
          </p>
        </div>

        <div className="rounded-md border border-border bg-card/80 p-2.5 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" aria-hidden />
              {t("staffPortal.eventEdit.builtinFields.alwaysTitle")}
            </p>
            <p className="text-[11px] text-muted-foreground mb-1.5 leading-snug">
              {t("staffPortal.eventEdit.builtinFields.alwaysHint")}
            </p>
            <PillList items={Array.isArray(alwaysItems) ? alwaysItems : []} tone="accent" />
          </div>

          <div className="border-t border-border/70 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
              <Users className="w-3 h-3" aria-hidden />
              {t("staffPortal.eventEdit.builtinFields.groupTitle")}
            </p>
            <p className="text-[11px] text-muted-foreground mb-1.5 leading-snug">
              {t("staffPortal.eventEdit.builtinFields.groupHint")}
            </p>
            <PillList items={Array.isArray(groupItems) ? groupItems : []} tone="primary" />
          </div>

          <div className="border-t border-border/70 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              {t("staffPortal.eventEdit.builtinFields.optionalTitle")}
            </p>
            <p className="text-[11px] text-muted-foreground mb-1.5 leading-snug">
              {t("staffPortal.eventEdit.builtinFields.optionalHint")}
            </p>
            <PillList items={Array.isArray(optionalItems) ? optionalItems : []} tone="muted" />
          </div>

          <div className="border-t border-border/70 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-1">
              {t("staffPortal.eventEdit.builtinFields.goodTitle")}
            </p>
            <p className="text-[11px] text-muted-foreground mb-1.5 leading-snug">
              {t("staffPortal.eventEdit.builtinFields.goodHint")}
            </p>
            <PillList items={Array.isArray(goodExamples) ? goodExamples : []} tone="primary" />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
