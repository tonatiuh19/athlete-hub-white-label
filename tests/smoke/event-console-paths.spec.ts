/**
 * @vitest-environment node
 *
 * Smoke: event console path helpers + section access (no HTTP).
 */
import { describe, expect, it } from "vitest";
import {
  canAccessEventConsoleSection,
  defaultEventConsolePath,
  eventConsoleHref,
  eventConsoleOpsPath,
  eventConsolePaymentsPath,
  isStaffEventConsolePath,
} from "@/utils/eventConsoleNav";
import {
  eventSetupEditPath,
  eventSetupPath,
} from "@/utils/eventSetupSections";

describe("smoke: staff event console + edit paths", () => {
  it("keeps edit and results under console base", () => {
    expect(isStaffEventConsolePath("/staff/events/42/edit")).toBe(true);
    expect(isStaffEventConsolePath("/staff/events/42/ops")).toBe(true);
    expect(isStaffEventConsolePath("/staff/events/42/onboarding")).toBe(false);
    expect(eventSetupPath(42)).toBe("/staff/events/42/edit");
    expect(eventSetupEditPath(42, "categories")).toBe(
      "/staff/events/42/edit?tab=categories",
    );
  });

  it("draft opens edit; published opens ops; legacy tab preserved", () => {
    expect(
      defaultEventConsolePath({
        status: "draft",
        isAdmin: true,
      }),
    ).toBe("edit");
    expect(
      defaultEventConsolePath({
        status: "published",
        isAdmin: true,
      }),
    ).toBe("ops");
    expect(
      defaultEventConsolePath({
        status: "published",
        isAdmin: true,
        legacyTab: "checkin",
      }),
    ).toBe("ops?tab=checkin");
  });

  it("builds absolute deep links used by payments and console", () => {
    expect(eventConsoleOpsPath(7, "waitlist")).toBe(
      "/staff/events/7/ops?tab=waitlist",
    );
    expect(eventConsolePaymentsPath(7)).toBe("/staff/payments?eventId=7");
    expect(eventConsoleHref(7, "edit?tab=media")).toBe(
      "/staff/events/7/edit?tab=media",
    );
  });

  it("blocks sellers from edit/ops routes conceptually", () => {
    const seller = { isAdmin: false, organizerRole: "seller" };
    expect(canAccessEventConsoleSection("edit", seller)).toBe(false);
    expect(canAccessEventConsoleSection("ops", seller)).toBe(false);
    expect(canAccessEventConsoleSection("overview", seller)).toBe(true);
    expect(canAccessEventConsoleSection("cobros", seller)).toBe(true);
  });
});
