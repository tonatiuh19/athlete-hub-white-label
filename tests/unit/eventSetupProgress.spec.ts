/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  computeEventSetupProgressPct,
  eventSetupSectionDone,
  filterVisibleSetupSections,
} from "@/utils/eventSetupProgress";
import { buildEventEditPreviewData } from "@/utils/buildEventEditPreviewData";

describe("eventSetupProgress", () => {
  const baseReadiness = {
    hasTitle: true,
    hasSport: true,
    hasStartDate: true,
    hasCategory: false,
    hasHero: false,
    hasLocation: true,
    hasWaiver: false,
    hasCourse: false,
    hasSiteLegal: true,
  };

  it("computes section done for details", () => {
    expect(eventSetupSectionDone("details", baseReadiness)).toBe(true);
    expect(
      eventSetupSectionDone("details", { ...baseReadiness, hasTitle: false }),
    ).toBe(false);
  });

  it("treats site legal as required section", () => {
    expect(eventSetupSectionDone("siteLegal", baseReadiness)).toBe(true);
    expect(
      eventSetupSectionDone("siteLegal", {
        ...baseReadiness,
        hasSiteLegal: false,
      }),
    ).toBe(false);
  });

  it("treats payouts as done when not required", () => {
    expect(
      eventSetupSectionDone("payouts", {
        ...baseReadiness,
        payoutReady: undefined,
      }),
    ).toBe(true);
    expect(
      eventSetupSectionDone("payouts", {
        ...baseReadiness,
        payoutReady: null,
      }),
    ).toBe(null);
    expect(
      eventSetupSectionDone("payouts", {
        ...baseReadiness,
        payoutReady: false,
      }),
    ).toBe(false);
  });

  it("hides payouts section when unpaid and not gated", () => {
    const visible = filterVisibleSetupSections(false, undefined);
    expect(visible.some((s) => s.id === "payouts")).toBe(false);
    expect(
      filterVisibleSetupSections(true, false).some((s) => s.id === "payouts"),
    ).toBe(true);
  });

  it("returns progress percentage from required/recommended sections", () => {
    const visible = filterVisibleSetupSections(false, undefined);
    const pct = computeEventSetupProgressPct(
      { ...baseReadiness, hasCategory: true },
      visible,
    );
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(100);
  });
});

describe("buildEventEditPreviewData", () => {
  it("maps form values and gallery media into preview", () => {
    const preview = buildEventEditPreviewData({
      formValues: {
        title: "Endgame",
        sport_type_id: 1,
        start_date: "2026-08-29T07:00",
        location_city: "Lagos de Moreno",
        location_state: "Jalisco",
        short_description: "Race day",
        hero_image_url: "",
      },
      event: {
        id: 1,
        public_uuid: "x",
        organizer_id: 1,
        sport_type_id: 1,
        slug: "endgame",
        subdomain: "endgame",
        title: "Endgame",
        status: "draft",
        visibility: "public",
        featured: 0,
        start_date: "2026-08-29T12:00:00.000Z",
        location_country: "MX",
      } as never,
      categories: [
        {
          id: 1,
          name: "10K",
          price_cents: 95000,
          is_active: 1,
        } as never,
      ],
      media: [
        { asset_type: "gallery", url: "https://cdn.example/a.jpg", sort_order: 0 },
        { asset_type: "gallery", url: "https://cdn.example/b.jpg", sort_order: 1 },
      ],
      sportName: "Running",
      organizerName: "Avengers",
    });

    expect(preview.title).toBe("Endgame");
    expect(preview.subdomain).toBe("endgame");
    expect(preview.categories).toHaveLength(1);
    expect(preview.media).toHaveLength(2);
    expect(preview.sportName).toBe("Running");
  });

  it("handles empty title falling back to event", () => {
    const preview = buildEventEditPreviewData({
      formValues: {
        title: "  ",
        sport_type_id: 0,
        start_date: "",
        location_city: "",
      },
      event: {
        id: 2,
        title: "Fallback Title",
        slug: "x",
        status: "draft",
      } as never,
      categories: [],
    });
    expect(preview.title).toBe("Fallback Title");
    expect(preview.categories).toEqual([]);
  });
});
