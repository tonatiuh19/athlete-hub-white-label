import { describe, expect, it } from "vitest";
import {
  canAccessStaffPayouts,
  canShowCobrosPayoutSetupCta,
  staffPayoutSetupPath,
} from "@/utils/staffNav";

describe("canAccessStaffPayouts", () => {
  it("denies admins (organizer-only JWT routes)", () => {
    expect(canAccessStaffPayouts(true, "owner")).toBe(false);
  });

  it("allows owner / organizer / finance", () => {
    expect(canAccessStaffPayouts(false, "owner")).toBe(true);
    expect(canAccessStaffPayouts(false, "organizer")).toBe(true);
    expect(canAccessStaffPayouts(false, "finance")).toBe(true);
  });

  it("denies sellers and missing roles", () => {
    expect(canAccessStaffPayouts(false, "seller")).toBe(false);
    expect(canAccessStaffPayouts(false, undefined)).toBe(false);
  });
});

describe("canShowCobrosPayoutSetupCta", () => {
  it("shows setup CTA for admins (People Connect panel)", () => {
    expect(canShowCobrosPayoutSetupCta(true)).toBe(true);
    expect(canShowCobrosPayoutSetupCta(true, "seller")).toBe(true);
  });

  it("shows setup CTA for organizer payout roles", () => {
    expect(canShowCobrosPayoutSetupCta(false, "owner")).toBe(true);
    expect(canShowCobrosPayoutSetupCta(false, "finance")).toBe(true);
  });

  it("hides setup CTA for sellers / ops", () => {
    expect(canShowCobrosPayoutSetupCta(false, "seller")).toBe(false);
    expect(canShowCobrosPayoutSetupCta(false, "operations")).toBe(false);
    expect(canShowCobrosPayoutSetupCta(false, undefined)).toBe(false);
  });
});

describe("staffPayoutSetupPath", () => {
  it("sends admins to organizers (avoids /staff/payouts 401 cascade)", () => {
    expect(staffPayoutSetupPath(true)).toBe("/staff/people?tab=organizers");
  });

  it("deep-links admins to a specific organizer when id is known", () => {
    expect(staffPayoutSetupPath(true, 42)).toBe(
      "/staff/people?tab=organizers&organizerId=42",
    );
  });

  it("sends organizers to Pagos → Configurar", () => {
    expect(staffPayoutSetupPath(false)).toBe("/staff/payments?tab=setup");
    expect(staffPayoutSetupPath(false, 42)).toBe("/staff/payments?tab=setup");
  });
});
