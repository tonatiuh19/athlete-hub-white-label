import { describe, expect, it } from "vitest";
import { buildOrganizerNavAttention } from "@/utils/staffNavAttention";

describe("buildOrganizerNavAttention", () => {
  it("flags draft site and incomplete legal when site is loaded", () => {
    const attention = buildOrganizerNavAttention({
      organizerRole: "owner",
      siteLoaded: true,
      siteStatus: "draft",
      siteLegal: [
        { documentKey: "terms", locale: "es", bodyHtml: "<p>ok</p>" },
        { documentKey: "privacy", locale: "es", bodyHtml: "<p></p>" },
        { documentKey: "refund", locale: "es", bodyHtml: "<p>ok</p>" },
      ],
      payoutsLoaded: false,
    });

    expect(attention["/staff/site"]).toBe("site");
    expect(attention["/staff/legal"]).toBe("legal");
    expect(attention["/staff/payouts"]).toBeUndefined();
    expect(attention["/staff/payments"]).toBeUndefined();
  });

  it("clears site/legal when published and docs complete", () => {
    const attention = buildOrganizerNavAttention({
      organizerRole: "owner",
      siteLoaded: true,
      siteStatus: "published",
      siteLegal: [
        { documentKey: "terms", locale: "es", bodyHtml: "<p>Terms</p>" },
        { documentKey: "privacy", locale: "es", bodyHtml: "<p>Privacy</p>" },
        { documentKey: "refund", locale: "es", bodyHtml: "<p>Refunds</p>" },
      ],
      payoutsLoaded: true,
      payoutReady: true,
    });

    expect(attention).toEqual({});
  });

  it("flags payments nav when payouts loaded and not ready for roles with payout access", () => {
    const attention = buildOrganizerNavAttention({
      organizerRole: "owner",
      siteLoaded: false,
      payoutsLoaded: true,
      payoutReady: false,
    });
    expect(attention["/staff/payments"]).toBe("payouts");
    expect(attention["/staff/payouts"]).toBeUndefined();
  });

  it("does not flag payouts for roles without payout access", () => {
    const attention = buildOrganizerNavAttention({
      organizerRole: "timing",
      siteLoaded: false,
      payoutsLoaded: true,
      payoutReady: false,
    });
    expect(attention["/staff/payments"]).toBeUndefined();
  });
});
