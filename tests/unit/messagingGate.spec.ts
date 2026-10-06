import { describe, expect, it } from "vitest";
import { canOrganizerEditEvents } from "@shared/staffRoles";

describe("messaging role gate", () => {
  it("allows event editors to bulk message", () => {
    for (const role of ["owner", "organizer", "operations", "marketing"]) {
      expect(canOrganizerEditEvents(role)).toBe(true);
    }
  });

  it("blocks timing finance seller from messaging", () => {
    for (const role of ["timing", "finance", "seller", "sponsor"]) {
      expect(canOrganizerEditEvents(role)).toBe(false);
    }
  });
});
