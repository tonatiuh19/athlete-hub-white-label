import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import StaffEventCategoryFormFields from "@/components/staff/StaffEventCategoryFormFields";
import StaffFormMissingChips from "@/components/staff/StaffFormMissingChips";
import { FieldGroup, SectionShell } from "@/components/staff/event-edit/primitives";
import { Button } from "@/components/ui/button";
import { useFormikDirtyReport } from "@/hooks/use-formik-dirty-report";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addEventCategory,
  deleteEventCategory,
  updateEventCategory,
} from "@/store/slices/staffPortalSlice";
import {
  EVENT_CATEGORY_TEMPLATES,
} from "@/utils/eventCategoryTemplates";
import {
  isCategoryEditDirty,
  isNewCategoryDirty,
} from "@/utils/eventEditUnsavedState";
import {
  validateCategoryDraft,
  validateNewCategory,
} from "@/utils/eventEditDraftSchemas";
import { formatCategoryEligibility } from "@/utils/formatCategoryEligibility";
import { getNumberLocale } from "@/utils/dateLocale";
import {
  athleteFacingCategoryTotalCents,
} from "@/utils/staffFeePresentation";
import type { FeePresentation } from "@shared/checkoutBreakdown";
import { fromDatetimeLocal, toDatetimeLocal } from "@/utils/datetimeLocal";
import { getCategoryFormMissing } from "@/utils/staffFormMissing";
import type {
  StaffEventCategory,
  StaffEventCategoryInput,
  StaffEventCategoryPatch,
  StaffRole,
} from "@shared/api";

const EMPTY_NEW: StaffEventCategoryInput = {
  name: "",
  price_cents: 0,
  gender_restriction: "any",
  waitlist_enabled: false,
};

export interface StaffEventCategoriesSectionProps {
  eventId: number;
  categories: StaffEventCategory[];
  canManage: boolean;
  staffRole: StaffRole;
  feePresentation?: FeePresentation;
  serviceFeePercent?: number;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function StaffEventCategoriesSection({
  eventId,
  categories,
  canManage,
  staffRole,
  feePresentation = "pass_through",
  serviceFeePercent = 11,
  onDirtyChange,
}: StaffEventCategoriesSectionProps) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { savingCategory, categoryError } = useAppSelector((s) => s.staffPortal);
  const numLocale = getNumberLocale(i18n.language);

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<StaffEventCategoryPatch>({});
  const [newCategory, setNewCategory] = useState<StaffEventCategoryInput>({
    ...EMPTY_NEW,
  });
  const [newPriceMxn, setNewPriceMxn] = useState("");
  const [newCategoryYupErrors, setNewCategoryYupErrors] = useState<
    Record<string, string>
  >({});
  const [editCategoryYupErrors, setEditCategoryYupErrors] = useState<
    Record<string, string>
  >({});

  const editingCategory =
    editingCategoryId != null
      ? categories.find((c) => c.id === editingCategoryId)
      : undefined;

  const categoriesDirty =
    (editingCategoryId != null &&
      editingCategory != null &&
      isCategoryEditDirty(categoryDraft, editingCategory)) ||
    isNewCategoryDirty(newCategory, newPriceMxn);

  useFormikDirtyReport(categoriesDirty, onDirtyChange);

  const startEditCategory = (c: StaffEventCategory) => {
    setEditingCategoryId(c.id);
    setEditCategoryYupErrors({});
    setCategoryDraft({
      name: c.name,
      description: c.description ?? null,
      price_cents: c.price_cents,
      capacity: c.capacity ?? null,
      distance_km: c.distance_km ?? null,
      gender_restriction: c.gender_restriction ?? "any",
      min_age: c.min_age ?? null,
      max_age: c.max_age ?? null,
      difficulty: c.difficulty ?? null,
      waitlist_enabled: Boolean(c.waitlist_enabled),
      registration_opens_at: c.registration_opens_at
        ? toDatetimeLocal(c.registration_opens_at)
        : null,
      registration_closes_at: c.registration_closes_at
        ? toDatetimeLocal(c.registration_closes_at)
        : null,
    });
  };

  const handleSaveCategoryEdit = async () => {
    if (editingCategoryId == null) return;
    const yupErrors = validateCategoryDraft({
      ...categoryDraft,
      name: categoryDraft.name ?? "",
      price_cents: categoryDraft.price_cents ?? 0,
    });
    if (Object.keys(yupErrors).length > 0) {
      setEditCategoryYupErrors(yupErrors);
      return;
    }
    setEditCategoryYupErrors({});
    const opensLocal =
      typeof categoryDraft.registration_opens_at === "string"
        ? categoryDraft.registration_opens_at
        : "";
    const closesLocal =
      typeof categoryDraft.registration_closes_at === "string"
        ? categoryDraft.registration_closes_at
        : "";

    await dispatch(
      updateEventCategory({
        eventId,
        categoryId: editingCategoryId,
        role: staffRole,
        body: {
          ...categoryDraft,
          registration_opens_at: opensLocal
            ? fromDatetimeLocal(opensLocal)
            : null,
          registration_closes_at: closesLocal
            ? fromDatetimeLocal(closesLocal)
            : null,
        },
      }),
    );
    setEditingCategoryId(null);
  };

  const handleAddCategory = async () => {
    const priceRaw = newPriceMxn.trim();
    const price_cents =
      priceRaw === "" ? Number.NaN : Math.round(Number(priceRaw) * 100);
    const candidate: StaffEventCategoryInput = {
      ...newCategory,
      name: newCategory.name.trim(),
      price_cents: Number.isFinite(price_cents) ? price_cents : Number.NaN,
      description: newCategory.description?.trim() || undefined,
    };
    const yupErrors = validateNewCategory(candidate);
    if (Object.keys(yupErrors).length > 0) {
      setNewCategoryYupErrors(yupErrors);
      return;
    }
    setNewCategoryYupErrors({});

    await dispatch(
      addEventCategory({
        eventId,
        role: staffRole,
        body: {
          ...candidate,
          price_cents: price_cents as number,
        },
      }),
    );
    setNewCategory({ ...EMPTY_NEW });
    setNewPriceMxn("");
  };

  const applyTemplate = (templateId: (typeof EVENT_CATEGORY_TEMPLATES)[number]["id"]) => {
    const template = EVENT_CATEGORY_TEMPLATES.find((tpl) => tpl.id === templateId);
    if (!template) return;
    const name = t(`staffPortal.eventEdit.categoryTemplates.${template.nameKey}`);
    setNewCategory((prev) => ({
      ...prev,
      name,
      ...template.defaults,
    }));
  };

  const absorbAll = feePresentation === "absorb_all";

  const formatCategoryPriceLine = (priceCents: number) => {
    const listMxn = (priceCents / 100).toLocaleString(numLocale);
    if (absorbAll) {
      return t("staffPortal.eventEdit.categoryListPriceAbsorb", { price: listMxn });
    }
    const athleteTotal = athleteFacingCategoryTotalCents(
      priceCents,
      serviceFeePercent,
      feePresentation,
    );
    return t("staffPortal.eventEdit.categoryListPricePassThrough", {
      inscription: listMxn,
      total: (athleteTotal / 100).toLocaleString(numLocale),
    });
  };
  const canAdd =
    Boolean(newCategory.name.trim()) &&
    newPriceMxn !== "" &&
    Number.isFinite(Number(newPriceMxn)) &&
    Number(newPriceMxn) >= 0;

  const newCategoryMissing = getCategoryFormMissing(newCategory, newPriceMxn, {
    idPrefix: "cat-new",
  });
  const editCategoryMissing =
    editingCategoryId != null
      ? getCategoryFormMissing(
          { ...categoryDraft, price_cents: categoryDraft.price_cents },
          categoryDraft.price_cents != null ? categoryDraft.price_cents / 100 : undefined,
          { idPrefix: `cat-edit-${editingCategoryId}` },
        )
      : [];

  return (
    <SectionShell
      title={t("staffPortal.eventEdit.categoriesTitle")}
      hint={t("staffPortal.eventEdit.categoriesSubtitle")}
    >
      {categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("staffPortal.eventEdit.noCategories")}
        </p>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => {
            const eligibility = formatCategoryEligibility(c, t);
            return (
              <div
                key={c.id}
                className="rounded-md border border-border p-2.5 space-y-2.5"
              >
                {editingCategoryId === c.id ? (
                  <>
                    <StaffEventCategoryFormFields
                      idPrefix={`cat-edit-${c.id}`}
                      values={categoryDraft}
                      feePresentation={feePresentation}
                      onChange={(patch) =>
                        setCategoryDraft((d) => ({ ...d, ...patch }))
                      }
                    />
                    <StaffFormMissingChips items={editCategoryMissing} />
                    {Object.keys(editCategoryYupErrors).length > 0 ? (
                      <div className="space-y-0.5">
                        {Object.entries(editCategoryYupErrors).map(([k, msg]) => (
                          <p key={k} className="text-[11px] text-destructive">
                            {t(msg)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex gap-2 pt-0.5">
                      <Button size="sm" onClick={() => void handleSaveCategoryEdit()}>
                        {t("staffPortal.eventEdit.save")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCategoryId(null)}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-tight">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {formatCategoryPriceLine(c.price_cents)} ·{" "}
                        {c.sold_count}
                        {c.capacity != null ? ` / ${c.capacity}` : ""}{" "}
                        {t("staffPortal.dashboard.registered").toLowerCase()}
                        {Boolean(c.waitlist_enabled)
                          ? ` · ${t("staffPortal.eventEdit.waitlistOn")}`
                          : ""}
                      </p>
                      {eligibility.length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {eligibility.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {c.description ? (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {c.description}
                        </p>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEditCategory(c)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() =>
                            dispatch(
                              deleteEventCategory({
                                eventId,
                                categoryId: c.id,
                                role: staffRole,
                              }),
                            )
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canManage ? (
        <>
          <FieldGroup
            title={t("staffPortal.eventEdit.categoryTemplatesTitle")}
            hint={t("staffPortal.eventEdit.categoryTemplatesHint")}
          >
            <div className="flex flex-wrap gap-1.5">
              {EVENT_CATEGORY_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => applyTemplate(tpl.id)}
                >
                  {t(`staffPortal.eventEdit.categoryTemplates.${tpl.nameKey}`)}
                </Button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup title={t("staffPortal.eventEdit.addCategory")}>
            {categoryError ? (
              <p className="text-xs text-destructive">{categoryError}</p>
            ) : null}
            <div className="space-y-2.5">
              <StaffEventCategoryFormFields
                idPrefix="cat-new"
                values={newCategory}
                feePresentation={feePresentation}
                onChange={(patch) =>
                  setNewCategory((prev) => ({ ...prev, ...patch }))
                }
                priceDisplay={newPriceMxn ? Number(newPriceMxn) : undefined}
                onPriceChange={(mxn) => setNewPriceMxn(String(mxn))}
              />
              <StaffFormMissingChips
                items={newCategoryMissing}
                showCompleteState={canAdd}
              />
              {Object.keys(newCategoryYupErrors).length > 0 ? (
                <div className="space-y-0.5">
                  {Object.entries(newCategoryYupErrors).map(([k, msg]) => (
                    <p key={k} className="text-[11px] text-destructive">
                      {t(msg)}
                    </p>
                  ))}
                </div>
              ) : null}
              <Button
                type="button"
                onClick={() => void handleAddCategory()}
                disabled={savingCategory || !canAdd}
                className="w-full sm:w-auto"
              >
                {savingCategory ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {t("staffPortal.eventEdit.addCategorySubmit")}
              </Button>
            </div>
          </FieldGroup>
        </>
      ) : null}
    </SectionShell>
  );
}
