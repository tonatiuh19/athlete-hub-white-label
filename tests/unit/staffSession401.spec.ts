import { describe, expect, it } from "vitest";
import { shouldClearStaffSessionOn401 } from "../../app/lib/api.js";

describe("shouldClearStaffSessionOn401", () => {
  it("clears on /auth/admin/me hydration failure", () => {
    expect(shouldClearStaffSessionOn401("/auth/admin/me", "Unauthorized")).toBe(
      true,
    );
  });

  it("clears on /auth/organizer/me hydration failure", () => {
    expect(
      shouldClearStaffSessionOn401("/auth/organizer/me", "Unauthorized"),
    ).toBe(true);
  });

  it("clears when server reports session expired", () => {
    expect(
      shouldClearStaffSessionOn401("/admin/dashboard", "Session expired"),
    ).toBe(true);
    expect(
      shouldClearStaffSessionOn401("/admin/dashboard", "Sesión expirada"),
    ).toBe(true);
    expect(
      shouldClearStaffSessionOn401("/admin/dashboard", "whatever", "session_expired"),
    ).toBe(true);
  });

  it("does not clear on organizer-only 401 with admin JWT", () => {
    expect(
      shouldClearStaffSessionOn401(
        "/organizer/payouts/status",
        "Unauthorized",
      ),
    ).toBe(false);
  });

  it("does not clear on unrelated staff 401", () => {
    expect(shouldClearStaffSessionOn401("/admin/events", "Unauthorized")).toBe(
      false,
    );
  });
});
