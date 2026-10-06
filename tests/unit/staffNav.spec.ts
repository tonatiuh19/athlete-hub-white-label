import { describe, expect, it } from "vitest";
import { getStaffNav } from "@/utils/staffNav";

describe("staffNav", () => {
  it("includes payments for operations (Movimientos, no Configurar)", () => {
    const paths = getStaffNav(false, "operations").map((item) => item.to);
    expect(paths).toContain("/staff/payments");
    expect(paths).toContain("/staff/events");
    expect(paths).toContain("/staff/registrations");
  });

  it("gives sellers events + payments so they can open Cobros for cash sales", () => {
    const paths = getStaffNav(false, "seller").map((item) => item.to);
    expect(paths).toContain("/staff/payments");
    expect(paths).toContain("/staff/events");
    expect(paths).not.toContain("/staff/team");
  });

  it("does not expose Triboo blog nav for admin or organizer", () => {
    for (const role of ["owner", "organizer", "marketing", "operations"] as const) {
      const paths = getStaffNav(false, role).map((item) => item.to);
      expect(paths).not.toContain("/staff/blog");
    }
    expect(getStaffNav(true).map((item) => item.to)).not.toContain("/staff/blog");
  });
});

