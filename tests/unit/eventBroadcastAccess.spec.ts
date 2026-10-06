import { describe, expect, it } from "vitest";
import { canOrganizerEditEvents } from "@shared/staffRoles";
import { canAccessEventConsoleSection } from "@/utils/eventConsoleNav";

describe("event broadcast access", () => {
  it("allows comunicacion for event editors with event scope roles", () => {
    for (const role of ["owner", "organizer", "operations", "marketing"]) {
      expect(canOrganizerEditEvents(role)).toBe(true);
      expect(
        canAccessEventConsoleSection("comunicacion", {
          isAdmin: false,
          organizerRole: role,
        }),
      ).toBe(true);
    }
  });

  it("blocks comunicacion for timing finance seller sponsor", () => {
    for (const role of ["timing", "finance", "seller", "sponsor"]) {
      expect(canOrganizerEditEvents(role)).toBe(false);
      expect(
        canAccessEventConsoleSection("comunicacion", {
          isAdmin: false,
          organizerRole: role,
        }),
      ).toBe(false);
    }
  });

  it("allows admin comunicacion regardless of organizer role", () => {
    expect(
      canAccessEventConsoleSection("comunicacion", {
        isAdmin: true,
        organizerRole: "seller",
      }),
    ).toBe(true);
  });
});
