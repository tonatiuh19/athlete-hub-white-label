/** Adult age for waiver audience (matches group registration minor logic). */
export const WAIVER_ADULT_AGE = 18;

export type WaiverAudience = "all" | "adult" | "minor";

export type WaiverTargetingFields = {
  audience?: WaiverAudience | null;
  /** NULL / empty = all categories */
  category_ids?: number[] | null;
};

export function normalizeWaiverAudience(raw: unknown): WaiverAudience {
  const v = String(raw ?? "all").trim().toLowerCase();
  if (v === "adult" || v === "minor" || v === "all") return v;
  return "all";
}

export function parseWaiverCategoryIds(raw: unknown): number[] | null {
  if (raw == null) return null;
  let arr: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "null") return null;
    try {
      arr = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr)) return null;
  const ids = arr
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.trunc(n));
  const unique = [...new Set(ids)];
  return unique.length > 0 ? unique : null;
}

export function waiverMatchesAudience(
  audience: WaiverAudience | null | undefined,
  isMinor: boolean,
): boolean {
  const a = audience ?? "all";
  if (a === "all") return true;
  if (a === "minor") return isMinor;
  return !isMinor;
}

export function waiverMatchesCategory(
  categoryIds: number[] | null | undefined,
  categoryId: number,
): boolean {
  if (!categoryIds || categoryIds.length === 0) return true;
  return categoryIds.includes(categoryId);
}

export function waiverAppliesToRegistrant(
  waiver: WaiverTargetingFields,
  opts: { isMinor: boolean; categoryId: number },
): boolean {
  return (
    waiverMatchesAudience(waiver.audience ?? "all", opts.isMinor) &&
    waiverMatchesCategory(waiver.category_ids ?? null, opts.categoryId)
  );
}

/** Filter active waivers for a registrant (age + category rules). */
export function selectApplicableWaivers<T extends WaiverTargetingFields & { id: number }>(
  waivers: T[],
  opts: { isMinor: boolean; categoryId: number },
): T[] {
  return waivers.filter((w) => waiverAppliesToRegistrant(w, opts));
}
