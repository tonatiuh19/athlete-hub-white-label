/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import type { EventDetailResponse, EventWaiverPublic } from "@shared/api";
import { getApplicableRegistrationWaivers } from "../../app/utils/eventRegistrationWaivers";

function waiver(
  partial: Partial<EventWaiverPublic> & Pick<EventWaiverPublic, "id" | "title">,
): EventWaiverPublic {
  return {
    content_html: "",
    content_type: "html",
    version: 1,
    audience: "all",
    category_ids: null,
    ...partial,
  };
}

function detail(waivers: EventWaiverPublic[], startDate = "2026-06-15"): EventDetailResponse {
  return {
    event: {
      id: 1,
      slug: "test",
      title: "Test",
      start_date: startDate,
      requires_waiver: true,
    },
    waivers,
  } as EventDetailResponse;
}

describe("getApplicableRegistrationWaivers", () => {
  const adult = waiver({ id: 1, title: "Adult", audience: "adult" });
  const minor = waiver({ id: 2, title: "Minor", audience: "minor" });
  const catOnly = waiver({
    id: 3,
    title: "Cat 10",
    audience: "all",
    category_ids: [10],
  });

  it("returns all waivers when DOB is missing", () => {
    const result = getApplicableRegistrationWaivers(detail([adult, minor]), {
      categoryId: 10,
      dateOfBirth: null,
      eventStartDate: "2026-06-15",
    });
    expect(result.map((w) => w.id)).toEqual([1, 2]);
  });

  it("filters by adult vs minor audience using event start date", () => {
    const forAdult = getApplicableRegistrationWaivers(detail([adult, minor]), {
      categoryId: 10,
      dateOfBirth: "2000-01-01",
      eventStartDate: "2026-06-15",
    });
    expect(forAdult.map((w) => w.id)).toEqual([1]);

    const forMinor = getApplicableRegistrationWaivers(detail([adult, minor]), {
      categoryId: 10,
      dateOfBirth: "2015-01-01",
      eventStartDate: "2026-06-15",
    });
    expect(forMinor.map((w) => w.id)).toEqual([2]);
  });

  it("filters by category_ids (empty/null = all categories)", () => {
    const match = getApplicableRegistrationWaivers(detail([catOnly, adult]), {
      categoryId: 10,
      dateOfBirth: "2000-01-01",
      eventStartDate: "2026-06-15",
    });
    expect(match.map((w) => w.id)).toEqual([3, 1]);

    const noMatch = getApplicableRegistrationWaivers(detail([catOnly, adult]), {
      categoryId: 99,
      dateOfBirth: "2000-01-01",
      eventStartDate: "2026-06-15",
    });
    expect(noMatch.map((w) => w.id)).toEqual([1]);
  });
});
