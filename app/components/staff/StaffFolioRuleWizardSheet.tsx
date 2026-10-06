import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import StaffCategoryScopePicker from "@/components/staff/StaffCategoryScopePicker";
import StaffFolioPatternBuilder from "@/components/staff/StaffFolioPatternBuilder";
import StaffSetupDependencyEmpty from "@/components/staff/StaffSetupDependencyEmpty";
import { FieldRow } from "@/components/staff/event-edit/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type {
  FolioCounterScope,
  FolioCouponScope,
  StaffDiscountCodeRow,
  StaffEventCategory,
  StaffFolioSegmentInput,
} from "@shared/api";
import {
  folioBlockSize,
  folioPatternPreview,
  normalizeFolioEndNumber,
  normalizeFolioPatternParts,
  normalizeFolioStartNumber,
} from "@shared/folioSegments";
import { createEmptyFolioSegmentDraft } from "@/utils/folioSegmentDraft";

const FOLIO_SCOPE_LABEL_KEYS = {
  title: "staffPortal.folioSegments.scopeTitle",
  all: "staffPortal.folioSegments.scopeAll",
  selected: "staffPortal.folioSegments.scopeSelected",
  empty: "staffPortal.folioSegments.scopeEmpty",
} as const;

const STEPS = ["who", "look", "numbers"] as const;
type WizardStep = (typeof STEPS)[number];

function isActiveDiscount(code: StaffDiscountCodeRow): boolean {
  return code.is_active !== 0 && code.is_active !== false;
}

export type StaffFolioRuleWizardSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing draft when editing; null when creating. */
  initial: StaffFolioSegmentInput | null;
  /** sort_order for new rules */
  nextSortOrder: number;
  /** Event id for setup deep-links (coupons / ticket types). */
  eventId: number;
  categories: StaffEventCategory[];
  discountCodes: StaffDiscountCodeRow[];
  onApply: (segment: StaffFolioSegmentInput) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

function isStepValid(step: WizardStep, draft: StaffFolioSegmentInput): boolean {
  if (step === "who") {
    if (!draft.name.trim()) return false;
    if (
      draft.category_scope === "selected_categories" &&
      (draft.category_ids?.length ?? 0) === 0
    ) {
      return false;
    }
    if (draft.coupon_scope === "specific_coupon" && !draft.discount_code_id) {
      return false;
    }
    return true;
  }
  if (step === "look") {
    return normalizeFolioPatternParts(draft.pattern_tokens).length > 0;
  }
  const start = normalizeFolioStartNumber(draft.start_number);
  const end = normalizeFolioEndNumber(draft.end_number);
  if (end != null && end < start) return false;
  return Number(draft.seq_padding) >= 1 && Boolean(draft.counter_scope);
}

export default function StaffFolioRuleWizardSheet({
  open,
  onOpenChange,
  initial,
  nextSortOrder,
  eventId,
  categories,
  discountCodes,
  onApply,
  t,
}: StaffFolioRuleWizardSheetProps) {
  const isEdit = initial != null;
  const activeDiscountCodes = useMemo(
    () => discountCodes.filter(isActiveDiscount),
    [discountCodes],
  );
  const discountsHref = `/staff/events/${eventId}/edit?tab=discounts`;
  const ticketTypesHref = `/staff/events/${eventId}/edit?tab=categories`;
  const closeForSetup = () => onOpenChange(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<StaffFolioSegmentInput>(() =>
    initial
      ? {
          ...initial,
          pattern_tokens: normalizeFolioPatternParts(initial.pattern_tokens),
        }
      : createEmptyFolioSegmentDraft(nextSortOrder),
  );

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setDraft(
      initial
        ? {
            ...initial,
            pattern_tokens: normalizeFolioPatternParts(initial.pattern_tokens),
          }
        : createEmptyFolioSegmentDraft(nextSortOrder),
    );
  }, [open, initial, nextSortOrder]);

  const step = STEPS[stepIndex] ?? "who";
  const preview = useMemo(
    () =>
      folioPatternPreview(
        {
          prefix_value: draft.prefix_value ?? "",
          category_code: draft.category_code ?? "",
          pattern_tokens: normalizeFolioPatternParts(draft.pattern_tokens),
          seq_padding: draft.seq_padding ?? 5,
        },
        { sequence: draft.start_number ?? 1 },
      ),
    [draft],
  );

  const patchDraft = (patch: Partial<StaffFolioSegmentInput>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const canContinue = isStepValid(step, draft);
  const isLast = stepIndex === STEPS.length - 1;

  const handleApply = () => {
    if (!STEPS.every((s) => isStepValid(s, draft))) return;
    onApply({
      ...draft,
      name: draft.name.trim(),
      pattern_tokens: normalizeFolioPatternParts(draft.pattern_tokens),
      category_ids: draft.category_ids ?? [],
      prefix_value: draft.prefix_value ?? "",
      category_code: draft.category_code ?? "",
      seq_padding: draft.seq_padding ?? 5,
      start_number: normalizeFolioStartNumber(draft.start_number),
      end_number: normalizeFolioEndNumber(draft.end_number),
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="space-y-2 border-b border-border/70 px-4 py-3 text-left sm:px-5">
          <SheetTitle>
            {t(
              isEdit
                ? "staffPortal.folioSegments.wizard.editTitle"
                : "staffPortal.folioSegments.wizard.addTitle",
            )}
          </SheetTitle>
          <SheetDescription>
            {t(`staffPortal.folioSegments.wizard.stepHint.${step}`)}
          </SheetDescription>
          <ol className="flex items-center gap-1.5 pt-1" aria-label={t("staffPortal.folioSegments.wizard.stepsAria")}>
            {STEPS.map((id, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <li key={id} className="flex flex-1 items-center gap-1.5">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      active && "bg-primary text-primary-foreground",
                      done && "bg-accent text-accent-foreground",
                      !active && !done && "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-[11px] sm:inline",
                      active ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t(`staffPortal.folioSegments.wizard.steps.${id}`)}
                  </span>
                </li>
              );
            })}
          </ol>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
          {step === "who" ? (
            <>
              <FieldRow label={t("staffPortal.folioSegments.ruleName")} required>
                <Input
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder={t("staffPortal.folioSegments.ruleNamePlaceholder")}
                  className="h-9"
                />
              </FieldRow>

              <StaffCategoryScopePicker
                groupName="folio-rule-wizard-scope"
                scopeType={draft.category_scope ?? "all_categories"}
                categoryIds={draft.category_ids ?? []}
                categories={categories}
                labelKeys={FOLIO_SCOPE_LABEL_KEYS}
                t={t}
                emptyAction={
                  <StaffSetupDependencyEmpty
                    message={t("staffPortal.folioSegments.scopeEmpty")}
                    actionLabel={t("staffPortal.folioSegments.goToTicketTypes")}
                    to={ticketTypesHref}
                    onNavigate={closeForSetup}
                  />
                }
                onChange={(patch) =>
                  patchDraft({
                    category_scope: patch.scope_type,
                    ...(patch.category_ids !== undefined
                      ? { category_ids: patch.category_ids }
                      : {}),
                  })
                }
              />

              <div className="grid gap-2.5 sm:grid-cols-2">
                <FieldRow label={t("staffPortal.folioSegments.couponScope")}>
                  <Select
                    value={draft.coupon_scope}
                    onValueChange={(value) =>
                      patchDraft({
                        coupon_scope: value as FolioCouponScope,
                        discount_code_id:
                          value === "specific_coupon"
                            ? draft.discount_code_id
                            : null,
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">
                        {t("staffPortal.folioSegments.couponAny")}
                      </SelectItem>
                      <SelectItem value="none">
                        {t("staffPortal.folioSegments.couponNone")}
                      </SelectItem>
                      <SelectItem value="any_coupon">
                        {t("staffPortal.folioSegments.couponAnyUsed")}
                      </SelectItem>
                      <SelectItem value="specific_coupon">
                        {t("staffPortal.folioSegments.couponSpecific")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                {draft.coupon_scope === "specific_coupon" ? (
                  <FieldRow label={t("staffPortal.folioSegments.couponCode")}>
                    {activeDiscountCodes.length === 0 ? (
                      <StaffSetupDependencyEmpty
                        message={t("staffPortal.folioSegments.noCouponsEmpty")}
                        actionLabel={t("staffPortal.folioSegments.goToCoupons")}
                        to={discountsHref}
                        onNavigate={closeForSetup}
                      />
                    ) : (
                      <Select
                        value={
                          draft.discount_code_id
                            ? String(draft.discount_code_id)
                            : ""
                        }
                        onValueChange={(value) =>
                          patchDraft({ discount_code_id: Number(value) })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue
                            placeholder={t(
                              "staffPortal.folioSegments.selectCoupon",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {activeDiscountCodes.map((code) => (
                            <SelectItem key={code.id} value={String(code.id)}>
                              {code.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FieldRow>
                ) : null}
              </div>
            </>
          ) : null}

          {step === "look" ? (
            <StaffFolioPatternBuilder
              mode="presets"
              prefixValue={draft.prefix_value ?? ""}
              categoryCode={draft.category_code ?? ""}
              patternTokens={normalizeFolioPatternParts(draft.pattern_tokens)}
              seqPadding={draft.seq_padding ?? 5}
              previewSequence={draft.start_number ?? 1}
              onPrefixChange={(value) => patchDraft({ prefix_value: value })}
              onCategoryCodeChange={(value) =>
                patchDraft({ category_code: value })
              }
              onPatternChange={(parts) => patchDraft({ pattern_tokens: parts })}
              onSeqPaddingChange={(value) => patchDraft({ seq_padding: value })}
              t={t}
            />
          ) : null}

          {step === "numbers" ? (
            <>
              <div className="rounded-md border border-primary/25 bg-primary/10 px-3 py-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  {t("staffPortal.folioSegments.wizard.sampleFolio")}
                </p>
                <p className="font-mono text-lg font-semibold tracking-wide text-foreground">
                  {preview || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {(() => {
                    const start = normalizeFolioStartNumber(draft.start_number);
                    const end = normalizeFolioEndNumber(draft.end_number);
                    const size = folioBlockSize(start, end);
                    if (size == null) {
                      return t("staffPortal.folioSegments.wizard.blockUnlimited", {
                        start,
                      });
                    }
                    return t("staffPortal.folioSegments.wizard.blockSummary", {
                      start,
                      end,
                      size,
                    });
                  })()}
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <FieldRow
                  label={t("staffPortal.folioSegments.startNumber")}
                  hint={t("staffPortal.folioSegments.wizard.startHint")}
                >
                  <Input
                    type="number"
                    min={1}
                    className="h-9"
                    value={draft.start_number ?? 1}
                    onChange={(e) =>
                      patchDraft({
                        start_number: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </FieldRow>
                <FieldRow
                  label={t("staffPortal.folioSegments.endNumber")}
                  hint={t("staffPortal.folioSegments.wizard.endHint")}
                >
                  <Input
                    type="number"
                    min={1}
                    className="h-9"
                    placeholder={t("staffPortal.folioSegments.endNumberUnlimited")}
                    value={draft.end_number ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) {
                        patchDraft({ end_number: null });
                        return;
                      }
                      patchDraft({
                        end_number: Math.max(1, Number(raw) || 1),
                      });
                    }}
                  />
                </FieldRow>
                <FieldRow label={t("staffPortal.folioSegments.seqPadding")}>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    className="h-9"
                    value={draft.seq_padding ?? 5}
                    onChange={(e) =>
                      patchDraft({
                        seq_padding: Math.min(
                          10,
                          Math.max(1, Number(e.target.value) || 5),
                        ),
                      })
                    }
                  />
                </FieldRow>
              </div>

              {normalizeFolioEndNumber(draft.end_number) != null &&
              normalizeFolioEndNumber(draft.end_number)! <
                normalizeFolioStartNumber(draft.start_number) ? (
                <p className="text-xs text-destructive">
                  {t("staffPortal.folioSegments.wizard.endBeforeStart")}
                </p>
              ) : null}

              <details className="rounded-md border border-border/60">
                <summary className="cursor-pointer px-2.5 py-2 text-xs font-medium text-muted-foreground">
                  {t("staffPortal.folioSegments.wizard.advancedCounters")}
                </summary>
                <div className="border-t border-border/60 p-2.5 space-y-2">
                  <FieldRow label={t("staffPortal.folioSegments.counterScope")}>
                    <Select
                      value={draft.counter_scope}
                      onValueChange={(value) =>
                        patchDraft({
                          counter_scope: value as FolioCounterScope,
                        })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="segment">
                          {t("staffPortal.folioSegments.counterSegment")}
                        </SelectItem>
                        <SelectItem value="event">
                          {t("staffPortal.folioSegments.counterEvent")}
                        </SelectItem>
                        <SelectItem value="category">
                          {t("staffPortal.folioSegments.counterCategory")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                      {t("staffPortal.folioSegments.wizard.counterHint")}
                    </p>
                  </FieldRow>
                </div>
              </details>

              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/15 px-2.5 py-2">
                <Checkbox
                  id="folio-wizard-active"
                  checked={draft.is_active !== false}
                  onCheckedChange={(checked) =>
                    patchDraft({ is_active: checked === true })
                  }
                />
                <Label
                  htmlFor="folio-wizard-active"
                  className="text-xs font-normal"
                >
                  {t("staffPortal.folioSegments.active")}
                </Label>
              </div>
            </>
          ) : null}
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border/70 px-4 py-3 sm:px-5 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="size-4 mr-1" />
            {t("staffPortal.folioSegments.wizard.back")}
          </Button>
          {isLast ? (
            <Button
              type="button"
              size="sm"
              disabled={!STEPS.every((s) => isStepValid(s, draft))}
              onClick={handleApply}
            >
              {t(
                isEdit
                  ? "staffPortal.folioSegments.wizard.applyEdit"
                  : "staffPortal.folioSegments.wizard.applyAdd",
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!canContinue}
              onClick={() =>
                setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))
              }
            >
              {t("staffPortal.folioSegments.wizard.next")}
              <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
