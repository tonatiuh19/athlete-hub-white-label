import { describe, expect, it } from "vitest";
import {
  defaultStaffPaymentsHubTab,
  parseStaffPaymentsHubTab,
} from "@/utils/staffPaymentsHub";

describe("parseStaffPaymentsHubTab", () => {
  it("parses canonical and legacy aliases", () => {
    expect(parseStaffPaymentsHubTab("overview")).toBe("overview");
    expect(parseStaffPaymentsHubTab("resumen")).toBe("overview");
    expect(parseStaffPaymentsHubTab("activity")).toBe("activity");
    expect(parseStaffPaymentsHubTab("movimientos")).toBe("activity");
    expect(parseStaffPaymentsHubTab("setup")).toBe("setup");
    expect(parseStaffPaymentsHubTab("payouts")).toBe("setup");
    expect(parseStaffPaymentsHubTab("spei")).toBe("spei");
    expect(parseStaffPaymentsHubTab("liquidar")).toBe("spei");
    expect(parseStaffPaymentsHubTab("nope")).toBeNull();
  });
});

describe("defaultStaffPaymentsHubTab", () => {
  it("opens overview when setup incomplete", () => {
    expect(
      defaultStaffPaymentsHubTab({
        canAccessSetup: true,
        payoutsLoaded: true,
        payoutReady: false,
      }),
    ).toBe("overview");
  });

  it("opens activity when ready or setup unavailable", () => {
    expect(
      defaultStaffPaymentsHubTab({
        canAccessSetup: true,
        payoutsLoaded: true,
        payoutReady: true,
      }),
    ).toBe("activity");
    expect(
      defaultStaffPaymentsHubTab({
        canAccessSetup: false,
        payoutsLoaded: true,
        payoutReady: false,
      }),
    ).toBe("activity");
  });
});
