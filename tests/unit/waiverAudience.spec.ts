import { describe, it, expect } from "vitest";
import {
  normalizeWaiverAudience,
  parseWaiverCategoryIds,
  selectApplicableWaivers,
  waiverAppliesToRegistrant,
} from "../../shared/waiverAudience";
import { buildWaiverAcceptanceCertificatePdf } from "../../server/waiverAcceptancePdf";

describe("waiverAudience targeting", () => {
  const waivers = [
    { id: 1, audience: "adult" as const, category_ids: null },
    { id: 2, audience: "minor" as const, category_ids: null },
    { id: 3, audience: "all" as const, category_ids: [10] },
  ];

  it("normalizes audience and category_ids", () => {
    expect(normalizeWaiverAudience("MINOR")).toBe("minor");
    expect(parseWaiverCategoryIds("[1,2,2]")).toEqual([1, 2]);
    expect(parseWaiverCategoryIds(null)).toBeNull();
  });

  it("selects adult vs minor by age", () => {
    expect(
      selectApplicableWaivers(waivers, { isMinor: false, categoryId: 99 }).map((w) => w.id),
    ).toEqual([1]);
    expect(
      selectApplicableWaivers(waivers, { isMinor: true, categoryId: 99 }).map((w) => w.id),
    ).toEqual([2]);
  });

  it("applies category filter with age", () => {
    expect(
      waiverAppliesToRegistrant(
        { audience: "all", category_ids: [10] },
        { isMinor: false, categoryId: 10 },
      ),
    ).toBe(true);
    expect(
      waiverAppliesToRegistrant(
        { audience: "all", category_ids: [10] },
        { isMinor: false, categoryId: 11 },
      ),
    ).toBe(false);
  });
});

describe("waiver acceptance certificate PDF", () => {
  it("builds a non-empty PDF buffer with disclaimer", async () => {
    const bytes = await buildWaiverAcceptanceCertificatePdf({
      locale: "es",
      athleteFullName: "Ana Gomez",
      eventTitle: "Medio Maratón San Ramón 2027",
      categoryName: "21K",
      registrationNumber: "SR-1001",
      waiverTitle: "Carta Responsiva Adultos",
      waiverVersion: 1,
      waiverPdfUrl: "https://cdn.example/responsiva.pdf",
      acceptedAtIso: "2026-09-28T16:00:00.000Z",
      clientIp: "1.2.3.4",
      organizerName: "Comité San Ramón",
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(bytes[0]).toBe(0x25); // %PDF
  });
});
