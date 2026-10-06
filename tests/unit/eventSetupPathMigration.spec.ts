/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  eventAdvancedEditPath,
  eventSetupEditPath,
  eventSetupPath,
  eventSetupSectionPath,
} from "@/utils/eventSetupSections";

describe("event setup path migration (no breaking bookmarks)", () => {
  it("setup hub path resolves to edit overview", () => {
    expect(eventSetupPath(9)).toBe("/staff/events/9/edit");
  });

  it("legacy section paths resolve to edit tabs (not /setup/:section)", () => {
    expect(eventSetupSectionPath(9, "media")).toBe(
      "/staff/events/9/edit?tab=images",
    );
    expect(eventSetupEditPath(9, "waiver")).toBe(
      "/staff/events/9/edit?tab=waiver",
    );
  });

  it("advanced edit stays on /edit", () => {
    expect(eventAdvancedEditPath(9)).toBe("/staff/events/9/edit");
    expect(eventAdvancedEditPath(9, "categories")).toBe(
      "/staff/events/9/edit?tab=categories",
    );
  });

  it("legacy hub registration tab maps to ops path helper shape", async () => {
    const { eventConsoleOpsPath } = await import("@/utils/eventConsoleNav");
    expect(eventConsoleOpsPath(9, "registrations")).toBe(
      "/staff/events/9/ops",
    );
  });

  it("payouts still external", () => {
    expect(eventSetupEditPath(9, "payouts")).toBe("/staff/payments?tab=setup");
    expect(eventSetupSectionPath(9, "payouts")).toBe("/staff/payments?tab=setup");
  });
});
