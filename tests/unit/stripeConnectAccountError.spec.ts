import { describe, expect, it } from "vitest";
import { isUnrecoverableStripeConnectAccountError } from "../../server/stripeConnect";

describe("isUnrecoverableStripeConnectAccountError", () => {
  it("detects platform key mismatch / revoked access", () => {
    expect(
      isUnrecoverableStripeConnectAccountError(
        new Error(
          "The provided key 'sk_live_xxx' does not have access to account 'acct_1TsD71K5fVNYiBce' (or that account does not exist). Application access may have been revoked.",
        ),
      ),
    ).toBe(true);
  });

  it("detects Stripe error codes for missing/invalid accounts", () => {
    expect(
      isUnrecoverableStripeConnectAccountError({ code: "resource_missing" }),
    ).toBe(true);
    expect(
      isUnrecoverableStripeConnectAccountError({ code: "account_invalid" }),
    ).toBe(true);
  });

  it("ignores transient / unrelated failures", () => {
    expect(
      isUnrecoverableStripeConnectAccountError(new Error("ECONNRESET")),
    ).toBe(false);
    expect(
      isUnrecoverableStripeConnectAccountError(new Error("Rate limit exceeded")),
    ).toBe(false);
    expect(isUnrecoverableStripeConnectAccountError(null)).toBe(false);
  });
});

describe("stripeConnect sync must not wipe account ids", () => {
  it("sync failure keeps stripe_account_id and does not auto-restrict", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "server/stripeConnect.ts"),
      "utf8",
    );
    expect(src).toContain("markOrganizerStripeConnectRestricted");
    // Must not auto-NULL account ids on sync/retrieve failures.
    expect(src).not.toMatch(
      /clearing inaccessible Connect account for organizer/,
    );
    const syncFn = src.slice(
      src.indexOf("async function syncOrganizerConnectFromStripe"),
      src.indexOf("async function retrieveConnectAccountSafe"),
    );
    expect(syncFn).not.toMatch(/stripe_account_id = NULL/);
    // account_invalid / key mismatch must not poison ready organizers.
    expect(syncFn).not.toContain("markOrganizerStripeConnectRestricted");
    expect(syncFn).toMatch(/not auto-restricting/);
  });
});
