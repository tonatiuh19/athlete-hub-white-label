import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  athleteNeedsProfileCompletion,
  athletePostAuthPath,
} from "@/utils/athleteProfileCompletion";
import type { AthleteUser } from "@shared/api";

const baseUser: AthleteUser = {
  id: 1,
  firstName: "Test",
  lastName: "Athlete",
  dateOfBirth: "1990-01-15",
  gender: "male",
};

describe("smoke: athlete profile completion", () => {
  it("requires both date of birth and gender", () => {
    expect(athleteNeedsProfileCompletion({ ...baseUser, gender: null })).toBe(true);
    expect(athleteNeedsProfileCompletion({ ...baseUser, dateOfBirth: null })).toBe(true);
    expect(athleteNeedsProfileCompletion(baseUser)).toBe(false);
    expect(
      athleteNeedsProfileCompletion({
        ...baseUser,
        gender: "prefer_not_to_say",
      }),
    ).toBe(false);
  });

  const store = new Map<string, string>();

  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    store.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    store.clear();
  });

  it("returns event page when registration session pending auth", () => {
    store.set(
      "atleita_registration_checkout",
      JSON.stringify({
        eventSlug: "trail-nevado-toluca-2026",
        categoryId: 3,
        idempotencyKey: "k",
        step: "auth",
        savedAt: Date.now(),
      }),
    );
    expect(
      athletePostAuthPath(
        { ...baseUser, dateOfBirth: null, gender: null },
        "/events/trail-nevado-toluca-2026",
      ),
    ).toBe("/events/trail-nevado-toluca-2026");
  });

  it("returns event page when group OAuth session is pending", () => {
    store.set(
      "atleita_group_registration_oauth",
      JSON.stringify({
        eventSlug: "trail-nevado-toluca-2026",
        simulationToken: null,
        savedAt: Date.now(),
      }),
    );
    expect(
      athletePostAuthPath(baseUser, "/events/trail-nevado-toluca-2026"),
    ).toBe("/events/trail-nevado-toluca-2026");
    expect(athletePostAuthPath(baseUser, "/portal")).toBe(
      "/events/trail-nevado-toluca-2026",
    );
  });
});
