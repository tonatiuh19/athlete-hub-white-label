import type {
  StaffEventCategory,
  StaffEventCategoryInput,
  StaffEventCategoryPatch,
  StaffEventCoursePayload,
  StaffEventExtra,
  StaffEventExtraInput,
  StaffEventExtraPatch,
} from "@shared/api";
import { toDatetimeLocal } from "@/utils/datetimeLocal";

/** Stable JSON for draft-vs-saved comparisons in the event editor. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (v as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return v;
  });
}

export function isCoursePayloadDirty(
  draft: StaffEventCoursePayload | null | undefined,
  saved: StaffEventCoursePayload | null | undefined,
): boolean {
  if (draft == null && saved == null) return false;
  // Draft not hydrated yet — avoid false "unsaved" while course loads.
  if (draft == null) return false;
  if (saved == null) return true;
  return stableJson(draft) !== stableJson(saved);
}

export function hasPendingDescriptionImages(
  pendingByUrl: Map<string, File> | { size: number },
): boolean {
  return pendingByUrl.size > 0;
}

export function categoryPatchFromRow(
  category: StaffEventCategory,
): StaffEventCategoryPatch {
  return {
    name: category.name,
    description: category.description ?? null,
    price_cents: category.price_cents,
    capacity: category.capacity ?? null,
    distance_km: category.distance_km ?? null,
    gender_restriction: category.gender_restriction ?? "any",
    min_age: category.min_age ?? null,
    max_age: category.max_age ?? null,
    difficulty: category.difficulty ?? null,
    waitlist_enabled: Boolean(category.waitlist_enabled),
    registration_opens_at: category.registration_opens_at
      ? toDatetimeLocal(category.registration_opens_at)
      : null,
    registration_closes_at: category.registration_closes_at
      ? toDatetimeLocal(category.registration_closes_at)
      : null,
  };
}

export function isCategoryEditDirty(
  draft: StaffEventCategoryPatch,
  original: StaffEventCategory,
): boolean {
  return stableJson(draft) !== stableJson(categoryPatchFromRow(original));
}

export function isNewCategoryDirty(
  draft: StaffEventCategoryInput,
  priceMxn: string,
): boolean {
  return (
    draft.name.trim() !== "" ||
    priceMxn.trim() !== "" ||
    Boolean(draft.description?.trim()) ||
    (draft.price_cents ?? 0) > 0
  );
}

export function extraPatchFromRow(extra: StaffEventExtra): StaffEventExtraPatch {
  return {
    name: extra.name,
    description: extra.description ?? null,
    price_cents: extra.price_cents,
    extra_type: extra.extra_type,
    max_per_athlete: extra.max_per_athlete,
    capacity: extra.capacity ?? null,
    image_url: extra.image_url ?? null,
    is_free: extra.price_cents === 0,
    scope_type: extra.scope_type ?? "all_categories",
    category_ids: extra.category_ids ?? [],
    sales_closes_at: extra.sales_closes_at ?? null,
    fields: extra.fields ?? [],
  };
}

export function isExtraEditDirty(
  draft: StaffEventExtraPatch,
  editPriceMxn: string,
  original: StaffEventExtra,
  hasPendingImage: boolean,
): boolean {
  if (hasPendingImage) return true;
  const savedPriceMxn =
    original.price_cents === 0
      ? ""
      : (original.price_cents / 100).toFixed(2).replace(/\.00$/, "");
  if (editPriceMxn.trim() !== savedPriceMxn) return true;
  return stableJson(draft) !== stableJson(extraPatchFromRow(original));
}

export function isNewExtraDirty(
  draft: StaffEventExtraInput,
  priceMxn: string,
  hasPendingImage: boolean,
): boolean {
  return (
    hasPendingImage ||
    draft.name.trim() !== "" ||
    priceMxn.trim() !== "" ||
    Boolean(draft.description?.trim())
  );
}

import { normalizeRichHtmlForCompare } from "@/utils/normalizeRichHtml";

/** TipTap / empty HTML variants that should compare as blank. */
export function normalizeWaiverHtmlForCompare(
  html: string | null | undefined,
): string {
  return normalizeRichHtmlForCompare(html);
}

export type WaiverDraftComparable = {
  id?: number;
  title: string;
  content_html?: string;
  pdf_url?: string | null;
  content_type?: string;
  audience?: string;
  category_ids?: number[] | null;
  sort_order?: number;
};

/** Normalize waiver drafts so load ↔ editor noise does not trip unsaved-changes. */
export function normalizeWaiverDraftForCompare(
  draft: WaiverDraftComparable,
): Record<string, unknown> {
  const categoryIds = draft.category_ids?.length
    ? [...draft.category_ids]
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
    : null;
  return {
    id: draft.id ?? null,
    title: String(draft.title ?? "").trim(),
    content_html: normalizeWaiverHtmlForCompare(draft.content_html),
    pdf_url: draft.pdf_url?.trim() ? draft.pdf_url.trim() : null,
    content_type: draft.content_type ?? "html",
    audience: draft.audience ?? "all",
    category_ids: categoryIds,
    sort_order: Number(draft.sort_order) || 0,
  };
}

export function areWaiverDraftsEqual(
  a: WaiverDraftComparable[],
  b: WaiverDraftComparable[],
): boolean {
  return (
    stableJson(a.map(normalizeWaiverDraftForCompare)) ===
    stableJson(b.map(normalizeWaiverDraftForCompare))
  );
}

export function isActiveEventWaiver(row: { is_active?: number | boolean | null }): boolean {
  return Number(row.is_active) === 1 || row.is_active === true;
}
