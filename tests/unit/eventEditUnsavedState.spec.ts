import { describe, expect, it } from "vitest";
import {
  categoryPatchFromRow,
  hasPendingDescriptionImages,
  isCategoryEditDirty,
  isCoursePayloadDirty,
  isNewCategoryDirty,
  areWaiverDraftsEqual,
  isActiveEventWaiver,
  stableJson,
} from "@/utils/eventEditUnsavedState";
import type { StaffEventCategory, StaffEventCoursePayload } from "@shared/api";

describe("eventEditUnsavedState", () => {
  it("stableJson sorts object keys for comparison", () => {
    expect(stableJson({ b: 1, a: 2 })).toBe(stableJson({ a: 2, b: 1 }));
  });

  it("detects course draft changes", () => {
    const saved: StaffEventCoursePayload = {
      distanceKm: 10,
      routeGeojson: { type: "LineString", coordinates: [[-99.1, 19.4], [-99.2, 19.5]] },
      points: [],
    };
    const draft = { ...saved, distanceKm: 12 };
    expect(isCoursePayloadDirty(draft, saved)).toBe(true);
    expect(isCoursePayloadDirty(saved, saved)).toBe(false);
  });

  it("does not flag course dirty while draft is still hydrating", () => {
    const saved: StaffEventCoursePayload = {
      distanceKm: 10,
      routeGeojson: { type: "LineString", coordinates: [[-99.1, 19.4], [-99.2, 19.5]] },
      points: [],
    };
    expect(isCoursePayloadDirty(null, saved)).toBe(false);
    expect(isCoursePayloadDirty(null, null)).toBe(false);
    expect(isCoursePayloadDirty(saved, null)).toBe(true);
  });

  it("detects pending description images", () => {
    expect(hasPendingDescriptionImages(new Map())).toBe(false);
    expect(hasPendingDescriptionImages(new Map([["blob:x", new File([], "x")]]))).toBe(true);
  });

  it("does not flag category edit mode without changes", () => {
    const category: StaffEventCategory = {
      id: 1,
      public_uuid: "cat-1",
      name: "5K",
      sold_count: 0,
      price_cents: 50000,
      gender_restriction: "any",
      is_active: 1,
      waitlist_enabled: 0,
      sort_order: 0,
    };
    expect(isCategoryEditDirty(categoryPatchFromRow(category), category)).toBe(false);
  });

  it("detects new category draft", () => {
    expect(isNewCategoryDirty({ name: "", price_cents: 0, gender_restriction: "any", waitlist_enabled: false }, "")).toBe(false);
    expect(isNewCategoryDirty({ name: "10K", price_cents: 0, gender_restriction: "any", waitlist_enabled: false }, "")).toBe(true);
  });

  it("treats equivalent waiver drafts as clean (audience defaults, empty html, category order)", () => {
    const a = [
      {
        id: 1,
        title: "Adult",
        content_html: "",
        pdf_url: null,
        content_type: "pdf",
        audience: undefined,
        category_ids: [2, 1],
        sort_order: 0,
      },
    ];
    const b = [
      {
        id: 1,
        title: "Adult",
        content_html: "<p></p>",
        pdf_url: null,
        content_type: "pdf",
        audience: "all",
        category_ids: [1, 2],
        sort_order: "0" as unknown as number,
      },
    ];
    expect(areWaiverDraftsEqual(a, b)).toBe(true);
    expect(isActiveEventWaiver({ is_active: 1 })).toBe(true);
    expect(isActiveEventWaiver({ is_active: 0 })).toBe(false);
  });
});
