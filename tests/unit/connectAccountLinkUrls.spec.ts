import { describe, expect, it } from "vitest";
import { buildConnectAccountLinkUrls } from "@shared/stripeConnect";

describe("buildConnectAccountLinkUrls", () => {
  const appUrl = "https://app.atleita.test";

  it("sends organizers to Pagos setup with connect flags", () => {
    expect(buildConnectAccountLinkUrls(appUrl, { actor: "organizer" })).toEqual({
      returnUrl: "https://app.atleita.test/staff/payments?tab=setup&connect=return",
      refreshUrl: "https://app.atleita.test/staff/payments?tab=setup&connect=refresh",
    });
  });

  it("sends admins to People organizer Connect panel", () => {
    expect(
      buildConnectAccountLinkUrls(appUrl, { actor: "admin", organizerId: 42 }),
    ).toEqual({
      returnUrl:
        "https://app.atleita.test/staff/people?tab=organizers&organizerId=42&connect=return",
      refreshUrl:
        "https://app.atleita.test/staff/people?tab=organizers&organizerId=42&connect=refresh",
    });
  });

  it("strips trailing slash from appUrl", () => {
    const urls = buildConnectAccountLinkUrls("https://app.atleita.test/", {
      actor: "organizer",
    });
    expect(urls.returnUrl.startsWith("https://app.atleita.test/staff/")).toBe(true);
    expect(urls.returnUrl.includes("://app.atleita.test//")).toBe(false);
  });
});
