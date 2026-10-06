import { describe, expect, it } from "vitest";
import { getCountdownParts } from "@/utils/eventCountdown";
import { formatEventDateBadge } from "@/utils/eventDateDisplay";

describe("getCountdownParts", () => {
  it("returns zeros when target is in the past", () => {
    const parts = getCountdownParts("2020-01-01T00:00:00.000Z", Date.parse("2024-01-01T00:00:00.000Z"));
    expect(parts.isPast).toBe(true);
    expect(parts.days).toBe(0);
    expect(parts.totalMs).toBe(0);
  });

  it("splits remaining time into days/hours/min/sec", () => {
    const now = Date.parse("2026-08-12T12:00:00.000Z");
    const target = Date.parse("2026-08-15T15:30:45.000Z");
    const parts = getCountdownParts(new Date(target).toISOString(), now);
    expect(parts.isPast).toBe(false);
    expect(parts.days).toBe(3);
    expect(parts.hours).toBe(3);
    expect(parts.minutes).toBe(30);
    expect(parts.seconds).toBe(45);
  });

  it("handles invalid ISO as past", () => {
    expect(getCountdownParts("not-a-date").isPast).toBe(true);
  });
});

describe("formatEventDateBadge", () => {
  it("returns month and day parts", () => {
    const badge = formatEventDateBadge("2026-08-16T12:00:00.000Z", "en", "UTC");
    expect(badge.month).toMatch(/AUG/i);
    expect(badge.day).toBe("16");
  });
});
