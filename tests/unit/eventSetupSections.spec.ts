/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  EVENT_SETUP_SECTIONS,
  eventSetupEditPath,
  eventSetupPath,
  eventSetupSectionPath,
  isEventSetupSectionId,
} from "@/utils/eventSetupSections";

describe("eventSetupSections", () => {
  it("includes required create-to-setup cards in order", () => {
    const ids = EVENT_SETUP_SECTIONS.map((s) => s.id);
    expect(ids[0]).toBe("details");
    expect(ids[1]).toBe("categories");
    expect(ids).toContain("payouts");
    expect(ids).toContain("sponsors");
  });

  it("builds setup and section edit paths", () => {
    expect(eventSetupPath(42)).toBe("/staff/events/42/edit");
    expect(eventSetupEditPath(42, "categories")).toBe(
      "/staff/events/42/edit?tab=categories",
    );
    expect(eventSetupSectionPath(42, "waiver")).toBe(
      "/staff/events/42/edit?tab=waiver",
    );
    expect(eventSetupEditPath(42, "payouts")).toBe("/staff/payments?tab=setup");
  });

  it("validates section ids", () => {
    expect(isEventSetupSectionId("waiver")).toBe(true);
    expect(isEventSetupSectionId("nope")).toBe(false);
  });
});
