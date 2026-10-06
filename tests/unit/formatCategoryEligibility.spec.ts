import { describe, expect, it } from "vitest";
import {
  formatCategoryEligibility,
  hasCategoryDistanceKm,
} from "../../app/utils/formatCategoryEligibility";

const t = ((key: string, opts?: Record<string, unknown>) => {
  if (key === "staffPortal.eventEdit.categoryAgeRange") {
    return `Edades ${opts?.min}—${opts?.max}`;
  }
  if (key.startsWith("staffPortal.eventEdit.categoryDifficulty.")) {
    return key.split(".").pop() ?? key;
  }
  if (key.startsWith("staffPortal.eventEdit.categoryGender.")) {
    return key.split(".").pop() ?? key;
  }
  return key;
}) as unknown as import("i18next").TFunction;

describe("hasCategoryDistanceKm", () => {
  it("hides missing and zero distances", () => {
    expect(hasCategoryDistanceKm(null)).toBe(false);
    expect(hasCategoryDistanceKm(undefined)).toBe(false);
    expect(hasCategoryDistanceKm(0)).toBe(false);
    expect(hasCategoryDistanceKm(0.0)).toBe(false);
    expect(hasCategoryDistanceKm(5)).toBe(true);
  });
});

describe("formatCategoryEligibility", () => {
  it("omits zero distance but keeps age/difficulty", () => {
    expect(
      formatCategoryEligibility(
        {
          distance_km: 0,
          min_age: 18,
          max_age: 60,
          difficulty: "intermediate",
        },
        t,
      ),
    ).toEqual(["Edades 18—60", "intermediate"]);
  });

  it("includes positive distance once", () => {
    expect(
      formatCategoryEligibility({ distance_km: 10, difficulty: "beginner" }, t),
    ).toEqual(["10 km", "beginner"]);
  });
});
