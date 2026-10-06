import { describe, expect, it } from "vitest";
import type { GeoCity, GeoState } from "@shared/api";
import {
  buildDevEventCreateFillValues,
  buildDevTicketCategoryBodies,
  DEV_EVENT_SHORT_DESCRIPTION,
  pickDevGeoCity,
  pickDevGeoState,
  pickDevSportTypeId,
} from "@/utils/eventCreateDevFill";

describe("eventCreateDevFill", () => {
  it("prefers running sport type when present", () => {
    expect(
      pickDevSportTypeId([
        { id: 2, slug: "cycling" },
        { id: 9, slug: "running" },
      ]),
    ).toBe("9");
  });

  it("falls back to first sport type", () => {
    expect(pickDevSportTypeId([{ id: 3, slug: "trail" }])).toBe("3");
    expect(pickDevSportTypeId([])).toBe("");
  });

  it("builds unique title/subdomain and future dates", () => {
    const now = new Date("2026-10-05T15:30:00");
    const fill = buildDevEventCreateFillValues({
      sportTypes: [{ id: 1, slug: "running" }],
      now,
      stamp: "261005153000",
    });

    expect(fill.title).toBe("Carrera de prueba 261005153000");
    expect(fill.subdomain).toBe("test-261005153000");
    expect(fill.sport_type_id).toBe("1");
    expect(fill.location_name).toBe("Parque Central");
    expect(fill.short_description).toBe(DEV_EVENT_SHORT_DESCRIPTION);
    expect(fill.start_date).toMatch(/^2026-11-04T07:00$/);
    expect(fill.end_date).toMatch(/^2026-11-04T11:00$/);
  });

  it("builds free ticket categories for publish-friendly DEV flow", () => {
    const bodies = buildDevTicketCategoryBodies();
    expect(bodies).toHaveLength(2);
    expect(bodies.every((b) => b.price_cents === 0)).toBe(true);
    expect(bodies.map((b) => b.name)).toEqual(["5K Prueba", "10K Prueba"]);
    expect(bodies[0].distance_km).toBe(5);
    expect(bodies[1].distance_km).toBe(10);
  });

  it("picks CDMX/NL geo state when available", () => {
    const states: GeoState[] = [
      { id: 1, country: "MX", name: "Jalisco", code: "JAL" },
      { id: 2, country: "MX", name: "Ciudad de México", code: "CMX" },
    ];
    expect(pickDevGeoState(states)?.id).toBe(2);
    expect(pickDevGeoState([])).toBeNull();
  });

  it("picks a recognizable city when available", () => {
    const cities: GeoCity[] = [
      {
        id: 10,
        state_id: 2,
        name: "Álvaro Obregón",
        state_name: "Ciudad de México",
        state_code: "CMX",
      },
      {
        id: 11,
        state_id: 2,
        name: "Ciudad de México",
        state_name: "Ciudad de México",
        state_code: "CMX",
        lat: 19.43,
        lng: -99.13,
      },
    ];
    expect(pickDevGeoCity(cities)?.id).toBe(11);
  });
});
