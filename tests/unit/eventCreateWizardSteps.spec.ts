import { describe, expect, it } from "vitest";
import {
  eventCreateWizardSteps,
  parseEventCreateWizardStep,
} from "@/components/staff/event-create/types";

describe("event create wizard steps", () => {
  it("gives admins an organizer pre-step", () => {
    expect(eventCreateWizardSteps(true)[0]).toBe("organizer");
    expect(eventCreateWizardSteps(true)).toEqual([
      "organizer",
      "info",
      "tickets",
      "customize",
      "publish",
    ]);
    expect(eventCreateWizardSteps(false)[0]).toBe("info");
    expect(eventCreateWizardSteps(false)).not.toContain("organizer");
  });

  it("parses step query against the active step list", () => {
    const admin = eventCreateWizardSteps(true);
    expect(parseEventCreateWizardStep(null, admin)).toBe("organizer");
    expect(parseEventCreateWizardStep("tickets", admin)).toBe("tickets");
    expect(parseEventCreateWizardStep("nope", admin)).toBe("organizer");

    const org = eventCreateWizardSteps(false);
    expect(parseEventCreateWizardStep(null, org)).toBe("info");
    expect(parseEventCreateWizardStep("organizer", org)).toBe("info");
  });
});
