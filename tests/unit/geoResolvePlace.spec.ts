import { describe, expect, it } from "vitest";
import { buildPlaceResolveKey } from "@/store/slices/geoSlice";

describe("buildPlaceResolveKey", () => {
  it("normalizes city/state for cache keys", () => {
    expect(
      buildPlaceResolveKey({
        city: " Coatepec ",
        state: "Veracruz",
        country: "mx",
      }),
    ).toBe("mx|coatepec|veracruz|||");
  });

  it("includes explicit coordinates when present", () => {
    expect(
      buildPlaceResolveKey({
        city: "Coatepec",
        lat: 19.45,
        lng: -96.96,
      }),
    ).toContain("19.45");
  });
});
