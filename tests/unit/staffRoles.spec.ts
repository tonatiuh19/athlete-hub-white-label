import { describe, expect, it } from "vitest";
import {
  canOrganizerRecordManualSale,
  canOrganizerViewAllPayments,
  canOrganizerViewAnalytics,
  canOrganizerViewPayments,
} from "@shared/staffRoles";

describe("staffRoles manual sales", () => {
  it("allows seller to record manual sales", () => {
    expect(canOrganizerRecordManualSale("seller")).toBe(true);
  });

  it("allows seller to view payments but not all-team view", () => {
    expect(canOrganizerViewPayments("seller")).toBe(true);
    expect(canOrganizerViewAllPayments("seller")).toBe(false);
  });

  it("allows owner to view all payments", () => {
    expect(canOrganizerViewAllPayments("owner")).toBe(true);
  });

  it("allows operations to view Pagos / all Movimientos", () => {
    expect(canOrganizerViewPayments("operations")).toBe(true);
    expect(canOrganizerViewAllPayments("operations")).toBe(true);
    expect(canOrganizerRecordManualSale("operations")).toBe(true);
  });
});

describe("staffRoles analytics", () => {
  it("allows owner organizer marketing finance", () => {
    for (const role of ["owner", "organizer", "marketing", "finance"]) {
      expect(canOrganizerViewAnalytics(role)).toBe(true);
    }
  });

  it("blocks timing seller operations sponsor", () => {
    for (const role of ["timing", "seller", "operations", "sponsor"]) {
      expect(canOrganizerViewAnalytics(role)).toBe(false);
    }
  });
});
