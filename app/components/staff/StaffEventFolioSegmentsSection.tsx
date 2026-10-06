import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import StaffFolioRuleWizardSheet from "@/components/staff/StaffFolioRuleWizardSheet";
import { SectionShell } from "@/components/staff/event-edit/primitives";
import { Button } from "@/components/ui/button";
import { useFormikDirtyReport } from "@/hooks/use-formik-dirty-report";
import { cn } from "@/lib/utils";
export { createEmptyFolioSegmentDraft } from "@/utils/folioSegmentDraft";
import type {
  StaffDiscountCodeRow,
  StaffEventCategory,
  StaffFolioSegmentInput,
  StaffFolioSegmentRow,
} from "@shared/api";
import {
  findOverlappingFolioBlocks,
  findShadowedFolioSegmentIds,
  folioBlockSize,
  folioPatternPreview,
  normalizeFolioEndNumber,
  normalizeFolioPatternParts,
  normalizeFolioStartNumber,
} from "@shared/folioSegments";
import { stableJson } from "@/utils/eventEditUnsavedState";

function segmentRowToDraft(row: StaffFolioSegmentRow): StaffFolioSegmentInput {
  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order,
    is_active: row.is_active,
    category_scope: row.category_scope,
    category_ids: row.category_ids ?? [],
    coupon_scope: row.coupon_scope,
    discount_code_id: row.discount_code_id ?? null,
    counter_scope: row.counter_scope,
    prefix_value: row.prefix_value,
    category_code: row.category_code,
    pattern_tokens: normalizeFolioPatternParts(row.pattern_tokens),
    seq_padding: row.seq_padding,
    start_number: row.start_number,
    end_number: row.end_number ?? null,
  };
}

function moveSegment(
  segments: StaffFolioSegmentInput[],
  index: number,
  direction: -1 | 1,
): StaffFolioSegmentInput[] {
  const next = [...segments];
  const target = index + direction;
  if (target < 0 || target >= next.length) return segments;
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((segment, sort_order) => ({ ...segment, sort_order }));
}

function couponLabel(
  segment: StaffFolioSegmentInput,
  discountCodes: StaffDiscountCodeRow[],
  t: (key: string) => string,
): string {
  switch (segment.coupon_scope) {
    case "none":
      return t("staffPortal.folioSegments.couponNone");
    case "any_coupon":
      return t("staffPortal.folioSegments.couponAnyUsed");
    case "specific_coupon": {
      const code = discountCodes.find((c) => c.id === segment.discount_code_id);
      return code?.code ?? t("staffPortal.folioSegments.couponSpecific");
    }
    case "any":
    default:
      return t("staffPortal.folioSegments.couponAny");
  }
}

function ticketScopeLabel(
  segment: StaffFolioSegmentInput,
  categories: StaffEventCategory[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (segment.category_scope !== "selected_categories") {
    return t("staffPortal.folioSegments.scopeAll");
  }
  const ids = new Set(segment.category_ids ?? []);
  const names = categories
    .filter((c) => ids.has(c.id))
    .map((c) => c.name);
  if (names.length === 0) {
    return t("staffPortal.folioSegments.scopeSelected");
  }
  if (names.length <= 2) return names.join(", ");
  return t("staffPortal.folioSegments.scopeSelectedCount", {
    count: names.length,
  });
}

export interface StaffEventFolioSegmentsSectionProps {
  segments: StaffFolioSegmentRow[];
  eventId: number;
  categories: StaffEventCategory[];
  discountCodes: StaffDiscountCodeRow[];
  saving?: boolean;
  error?: string | null;
  onSave: (segments: StaffFolioSegmentInput[]) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function StaffEventFolioSegmentsSection({
  segments,
  eventId,
  categories,
  discountCodes,
  saving = false,
  error,
  onSave,
  t,
  onDirtyChange,
}: StaffEventFolioSegmentsSectionProps) {
  const [drafts, setDrafts] = useState<StaffFolioSegmentInput[]>(() =>
    segments.length > 0 ? segments.map(segmentRowToDraft) : [],
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    setDrafts(segments.length > 0 ? segments.map(segmentRowToDraft) : []);
  }, [segments]);

  const savedDrafts = useMemo(
    () => (segments.length > 0 ? segments.map(segmentRowToDraft) : []),
    [segments],
  );

  const foliosDirty = useMemo(
    () => stableJson(drafts) !== stableJson(savedDrafts),
    [drafts, savedDrafts],
  );

  useFormikDirtyReport(foliosDirty, onDirtyChange);

  const shadowedIds = useMemo(
    () =>
      new Set(
        findShadowedFolioSegmentIds(
          drafts.map((segment, index) => ({
            id: segment.id ?? -(index + 1),
            sort_order: segment.sort_order,
            is_active: segment.is_active,
            category_scope: segment.category_scope ?? "all_categories",
            category_ids: segment.category_ids,
            coupon_scope: segment.coupon_scope,
            discount_code_id: segment.discount_code_id,
          })),
        ),
      ),
    [drafts],
  );

  const rangeOverlaps = useMemo(
    () => findOverlappingFolioBlocks(drafts),
    [drafts],
  );

  const canSave =
    drafts.length > 0 &&
    rangeOverlaps.length === 0 &&
    drafts.every((segment) => {
      const start = normalizeFolioStartNumber(segment.start_number);
      const end = normalizeFolioEndNumber(segment.end_number);
      return (
        segment.name.trim() &&
        segment.counter_scope &&
        (end == null || end >= start) &&
        (segment.coupon_scope !== "specific_coupon" || segment.discount_code_id) &&
        (segment.category_scope !== "selected_categories" ||
          (segment.category_ids?.length ?? 0) > 0)
      );
    });

  const openCreate = () => {
    setEditingIndex(null);
    setWizardOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setWizardOpen(true);
  };

  const handleRemove = (index: number) => {
    setDrafts((current) =>
      current
        .filter((_, i) => i !== index)
        .map((segment, sort_order) => ({ ...segment, sort_order })),
    );
  };

  const handleWizardApply = (segment: StaffFolioSegmentInput) => {
    setDrafts((current) => {
      if (editingIndex == null) {
        return [
          ...current,
          { ...segment, sort_order: current.length },
        ];
      }
      return current.map((row, i) =>
        i === editingIndex ? { ...segment, sort_order: i } : row,
      );
    });
  };

  const wizardInitial =
    editingIndex != null ? (drafts[editingIndex] ?? null) : null;

  return (
    <SectionShell
      title={t("staffPortal.folioSegments.title")}
      hint={t("staffPortal.folioSegments.subtitle")}
    >
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {rangeOverlaps.length > 0 ? (
        <p className="text-xs text-destructive leading-snug">
          {t("staffPortal.folioSegments.overlapError", {
            a: rangeOverlaps[0].aName,
            b: rangeOverlaps[0].bName,
          })}
        </p>
      ) : null}

      {drafts.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground leading-snug">
            {t("staffPortal.folioSegments.empty")}
          </p>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {t("staffPortal.folioSegments.addRule")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((segment, index) => {
            const isShadowed = segment.id != null && shadowedIds.has(segment.id);
            const start = normalizeFolioStartNumber(segment.start_number);
            const end = normalizeFolioEndNumber(segment.end_number);
            const size = folioBlockSize(start, end);
            const remaining =
              segment.id != null
                ? (segments.find((s) => s.id === segment.id)?.folios_remaining ??
                  null)
                : size;
            const sample = folioPatternPreview(
              {
                prefix_value: segment.prefix_value ?? "",
                category_code: segment.category_code ?? "",
                pattern_tokens: normalizeFolioPatternParts(
                  segment.pattern_tokens,
                ),
                seq_padding: segment.seq_padding ?? 5,
              },
              { sequence: start },
            );
            return (
              <div
                key={segment.id ?? `draft-${index}`}
                className={cn(
                  "rounded-md border border-border/70 bg-card/40 px-2.5 py-2",
                  isShadowed && "border-destructive/40",
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-muted-foreground w-5 pt-0.5">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium truncate leading-tight">
                        {segment.name.trim() ||
                          t("staffPortal.folioSegments.unnamed")}
                      </p>
                      {segment.is_active === false ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {t("staffPortal.folioSegments.inactive")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug truncate">
                      {ticketScopeLabel(segment, categories, t)}
                      {" · "}
                      {couponLabel(segment, discountCodes, t)}
                    </p>
                    <p className="text-[11px] font-medium text-foreground/90">
                      {end == null
                        ? t("staffPortal.folioSegments.blockRangeOpen", {
                            start,
                          })
                        : t("staffPortal.folioSegments.blockRange", {
                            start,
                            end,
                          })}
                      {remaining != null
                        ? ` · ${t("staffPortal.folioSegments.remaining", {
                            count: remaining,
                          })}`
                        : null}
                    </p>
                    <p className="font-mono text-xs font-semibold tracking-wide text-foreground">
                      {sample || "—"}
                    </p>
                    {isShadowed ? (
                      <p className="text-[11px] text-destructive leading-snug">
                        {t("staffPortal.folioSegments.shadowedWarning")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => setDrafts(moveSegment(drafts, index, -1))}
                      aria-label={t("staffPortal.folioSegments.moveUp")}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={index === drafts.length - 1}
                      onClick={() => setDrafts(moveSegment(drafts, index, 1))}
                      aria-label={t("staffPortal.folioSegments.moveDown")}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(index)}
                      aria-label={t("staffPortal.folioSegments.editRule")}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleRemove(index)}
                      aria-label={t("staffPortal.folioSegments.deleteRule")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {drafts.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {t("staffPortal.folioSegments.addRule")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(drafts)}
          disabled={saving || !canSave || drafts.length === 0}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          {t("staffPortal.folioSegments.save")}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        {t("staffPortal.folioSegments.fallbackNote")}
      </p>

      <StaffFolioRuleWizardSheet
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initial={wizardInitial}
        nextSortOrder={drafts.length}
        eventId={eventId}
        categories={categories}
        discountCodes={discountCodes}
        onApply={handleWizardApply}
        t={t}
      />
    </SectionShell>
  );
}
