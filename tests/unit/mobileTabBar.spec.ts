import { describe, expect, it } from "vitest";
import { shouldHidePublicSiteNavbar } from "@/utils/mobileTabBar";

describe("shouldHidePublicSiteNavbar", () => {
  it("keeps Atleita navbar on marketplace list and home", () => {
    expect(shouldHidePublicSiteNavbar("/")).toBe(false);
    expect(shouldHidePublicSiteNavbar("/events")).toBe(false);
    expect(shouldHidePublicSiteNavbar("/events/")).toBe(false);
    expect(shouldHidePublicSiteNavbar("/about")).toBe(false);
  });

  it("hides Atleita navbar on event entry and simulation", () => {
    expect(shouldHidePublicSiteNavbar("/events/cofre-de-perote")).toBe(true);
    expect(shouldHidePublicSiteNavbar("/events/sim/token123")).toBe(true);
  });
});
