import { describe, it, expect } from "vitest";
import type { Pool } from "mysql2/promise";
import type Stripe from "stripe";
import { computeCheckoutBreakdown, calcServiceFeeCents } from "@shared/checkoutBreakdown";
import {
  buildPlatformPayoutChecklist,
  deriveStripeConnectStatusFromCapabilities,
  isOrganizerPayoutReady,
} from "@shared/stripeConnect";
import {
  persistOrganizerConnectFromStripeAccount,
  resolveCheckoutConnectMode,
} from "../../server/stripeConnect";

describe("checkout breakdown", () => {
  it("computes 11% service fee with IVA-inclusive totals", () => {
    const b = computeCheckoutBreakdown({ inscriptionCents: 100_000, serviceFeePercent: 11 });
    expect(b.serviceFeeCents).toBe(11_000);
    expect(b.totalCents).toBe(111_000);
    expect(b.organizerReceivesCents).toBe(100_000);
    expect(b.platformFeeCents).toBe(11_000);
  });

  it("calcServiceFeeCents matches breakdown helper", () => {
    expect(calcServiceFeeCents(80_000, 11)).toBe(8_800);
  });

  it("handles zero inscription without fee", () => {
    const b = computeCheckoutBreakdown({ inscriptionCents: 0, serviceFeePercent: 11 });
    expect(b.totalCents).toBe(0);
    expect(b.serviceFeeCents).toBe(0);
  });
});

describe("deriveStripeConnectStatusFromCapabilities", () => {
  it("maps fully enabled recipient account to ready without charges_enabled", () => {
    expect(
      deriveStripeConnectStatusFromCapabilities({
        disabled: false,
        charges_enabled: false,
        payouts_enabled: true,
        details_submitted: true,
        currently_due: [],
        disabled_reason: null,
        has_account: true,
        transfers_active: true,
      }),
    ).toBe("ready");
  });

  it("maps admin disabled to disabled regardless of capabilities", () => {
    expect(
      deriveStripeConnectStatusFromCapabilities({
        disabled: true,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        currently_due: [],
        disabled_reason: null,
        has_account: true,
      }),
    ).toBe("disabled");
  });

  it("maps outstanding requirements to action_required", () => {
    expect(
      deriveStripeConnectStatusFromCapabilities({
        disabled: false,
        charges_enabled: false,
        payouts_enabled: true,
        details_submitted: true,
        currently_due: ["individual.verification.document"],
        disabled_reason: null,
        has_account: true,
        transfers_active: true,
      }),
    ).toBe("action_required");
  });

  it("maps requirements.past_due to action_required not restricted", () => {
    expect(
      deriveStripeConnectStatusFromCapabilities({
        disabled: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        currently_due: ["external_account"],
        disabled_reason: "requirements.past_due",
        has_account: true,
      }),
    ).toBe("action_required");
  });

  it("maps rejected.* disabled_reason to restricted", () => {
    expect(
      deriveStripeConnectStatusFromCapabilities({
        disabled: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: true,
        currently_due: [],
        disabled_reason: "rejected.fraud",
        has_account: true,
      }),
    ).toBe("restricted");
  });
});

describe("payout readiness", () => {
  it("requires platform profile and stripe ready", () => {
    const profile = {
      legal_name: "Trail MX SA",
      rfc: "TRM123456ABC",
      billing_email: "billing@trail.mx",
      payout_terms_accepted_at: "2026-01-01",
      payout_fee_acknowledged_at: "2026-01-01",
    };
    expect(buildPlatformPayoutChecklist(profile).complete).toBe(true);
    const withoutRfc = buildPlatformPayoutChecklist({
      legal_name: "Trail MX SA",
      rfc: null,
      billing_email: "billing@trail.mx",
      payout_terms_accepted_at: "2026-01-01",
      payout_fee_acknowledged_at: "2026-01-01",
    });
    expect(withoutRfc.complete).toBe(true);
    expect(withoutRfc.items.find((i) => i.key === "rfc")?.required).toBe(false);
    expect(
      buildPlatformPayoutChecklist({
        legal_name: "Trail MX SA",
        billing_email: "billing@trail.mx",
        payout_terms_accepted_at: null,
        payout_fee_acknowledged_at: "2026-01-01",
      }).complete,
    ).toBe(false);
    expect(
      buildPlatformPayoutChecklist({
        legal_name: "",
        billing_email: "billing@trail.mx",
        payout_terms_accepted_at: "2026-01-01",
        payout_fee_acknowledged_at: "2026-01-01",
      }).complete,
    ).toBe(false);
    expect(
      isOrganizerPayoutReady({
        stripe_connect_status: "ready",
        stripe_account_id: "acct_test",
        stripe_charges_enabled: false,
        stripe_payouts_enabled: true,
        requirements_currently_due: [],
        platform_profile_complete: true,
      }),
    ).toBe(true);
    expect(
      isOrganizerPayoutReady({
        stripe_connect_status: "pending",
        stripe_account_id: "acct_test",
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        platform_profile_complete: true,
      }),
    ).toBe(false);
  });

  it("rejects ready stripe when platform checklist incomplete", () => {
    expect(
      isOrganizerPayoutReady({
        stripe_connect_status: "ready",
        stripe_account_id: "acct_test",
        stripe_charges_enabled: false,
        stripe_payouts_enabled: true,
        requirements_currently_due: [],
        platform_profile_complete: false,
      }),
    ).toBe(false);
  });

  it("rejects restricted or disabled connect status even when capabilities look fine", () => {
    expect(
      isOrganizerPayoutReady({
        stripe_connect_status: "restricted",
        stripe_account_id: "acct_test",
        stripe_charges_enabled: false,
        stripe_payouts_enabled: true,
        requirements_currently_due: [],
        platform_profile_complete: true,
      }),
    ).toBe(false);
  });
});

describe("paid category mutation gate", () => {
  it("blocks paid category changes on published events when payout is not ready", async () => {
    const pool = {
      query: async (sql: string, params?: unknown[]) => {
        const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
        if (q.includes("select status, organizer_id from events")) {
          return [[{ status: "published", organizer_id: 7 }], []];
        }
        if (q.includes("from organizers o") && q.includes("where o.id = ?")) {
          return [
            [
              {
                organizer_id: 7,
                email: "org@test.com",
                legal_name: null,
                billing_email: null,
                rfc: null,
                tax_regime: null,
                service_fee_percent: 11,
                stripe_account_id: null,
                stripe_onboarding_complete: 0,
                stripe_connect_status: "not_started",
                stripe_charges_enabled: 0,
                stripe_payouts_enabled: 0,
                stripe_details_submitted: 0,
                stripe_connect_onboarded_at: null,
                stripe_connect_last_synced_at: null,
                stripe_connect_onboarding_mode: null,
                payout_terms_accepted_at: null,
                payout_fee_acknowledged_at: null,
                status: "active",
              },
            ],
            [],
          ];
        }
        if (q.includes("from organizer_payout_accounts")) {
          return [[], []];
        }
        throw new Error(`unexpected query: ${q} ${JSON.stringify(params)}`);
      },
    };

    const { assertPaidCategoryMutationAllowed } = await import("../../server/stripeConnect.js");
    const err = await assertPaidCategoryMutationAllowed(
      pool as never,
      42,
      150000,
      null,
    );
    expect(err?.status).toBe(403);
    expect(err?.code).toBe("organizer_payouts_not_ready");
  });

  it("allows paid category changes on draft events without payout", async () => {
    const pool = {
      query: async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
        if (q.includes("select status, organizer_id from events")) {
          return [[{ status: "draft", organizer_id: 7 }], []];
        }
        throw new Error(`unexpected query: ${q}`);
      },
    };

    const { assertPaidCategoryMutationAllowed } = await import("../../server/stripeConnect.js");
    const err = await assertPaidCategoryMutationAllowed(pool as never, 42, 150000, null);
    expect(err).toBeNull();
  });
});

describe("resolveCheckoutConnectMode", () => {
  function mockOrganizerPool(row: Record<string, unknown>) {
    return {
      query: async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
        if (q.includes("from organizers o") && q.includes("where o.id = ?")) {
          return [[row], []];
        }
        if (q.includes("from organizer_payout_accounts")) {
          return [[], []];
        }
        throw new Error(`unexpected query: ${q}`);
      },
    };
  }

  it("blocks checkout when organizer payout is not ready", async () => {
    const pool = mockOrganizerPool({
      organizer_id: 7,
      email: "org@test.com",
      legal_name: "Trail MX",
      billing_email: "billing@trail.mx",
      rfc: "TRM123456ABC",
      tax_regime: null,
      service_fee_percent: 11,
      fee_presentation: "pass_through",
      payout_rail: "stripe",
      stripe_account_id: null,
      stripe_onboarding_complete: 0,
      stripe_connect_status: "not_started",
      stripe_charges_enabled: 0,
      stripe_payouts_enabled: 0,
      stripe_details_submitted: 0,
      stripe_connect_onboarded_at: null,
      stripe_connect_last_synced_at: null,
      stripe_connect_onboarding_mode: null,
      payout_terms_accepted_at: "2026-01-01",
      payout_fee_acknowledged_at: "2026-01-01",
      status: "active",
    });

    const mode = await resolveCheckoutConnectMode(pool as never, 7, null);
    expect(mode).toEqual({
      mode: "blocked",
      code: "organizer_payouts_not_ready",
      message: "Organizer payout setup is not complete",
    });
  });

  it("returns platform mode when manual rail is ready", async () => {
    const pool = {
      query: async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
        if (q.includes("from organizers o") && q.includes("where o.id = ?")) {
          return [
            [
              {
                organizer_id: 7,
                email: "org@test.com",
                legal_name: "Trail MX",
                billing_email: "billing@trail.mx",
                rfc: "TRM123456ABC",
                tax_regime: null,
                service_fee_percent: 11,
                fee_presentation: "pass_through",
                payout_rail: "manual",
                stripe_account_id: null,
                stripe_onboarding_complete: 0,
                stripe_connect_status: "not_started",
                stripe_charges_enabled: 0,
                stripe_payouts_enabled: 0,
                stripe_details_submitted: 0,
                stripe_connect_onboarded_at: null,
                stripe_connect_last_synced_at: null,
                stripe_connect_onboarding_mode: null,
                payout_terms_accepted_at: "2026-01-01",
                payout_fee_acknowledged_at: "2026-01-01",
                status: "active",
              },
            ],
            [],
          ];
        }
        if (
          q.includes("from organizer_payout_accounts") &&
          q.includes("status = 'verified'") &&
          q.includes("is_default = 1")
        ) {
          return [[{ id: 1 }], []];
        }
        if (q.includes("from organizer_payout_accounts")) {
          return [
            [
              {
                id: 1,
                organizer_id: 7,
                nickname: "Main",
                holder_name: "Trail MX",
                clabe_last4: "7890",
                bank_name: "BBVA México",
                person_type: "persona_moral",
                legal_name: "Trail MX",
                tax_regime: "601",
                rfc: "TRM123456ABC",
                curp: null,
                fiscal_street: "Calle 1",
                fiscal_ext_number: "10",
                fiscal_int_number: null,
                fiscal_neighborhood: "Centro",
                fiscal_city: "CDMX",
                fiscal_municipality: "Cuauhtémoc",
                fiscal_state: "Ciudad de México",
                fiscal_postal_code: "06000",
                phone: "5512345678",
                invoice_email: "billing@trail.mx",
                constancia_url: "https://cdn.example/c.pdf",
                bank_statement_url: "https://cdn.example/b.pdf",
                is_default: 1,
                status: "verified",
                rejection_reason: null,
                locked_at: "2026-01-02",
                submitted_at: "2026-01-02",
                verified_at: "2026-01-03",
                created_at: "2026-01-01",
                updated_at: "2026-01-03",
              },
            ],
            [],
          ];
        }
        throw new Error(`unexpected query: ${q}`);
      },
    };

    const mode = await resolveCheckoutConnectMode(pool as never, 7, null);
    expect(mode).toEqual({ mode: "platform" });
  });

  it("blocks checkout when Stripe is disabled and manual rail is not ready", async () => {
    const { resolveOrganizerCheckoutDestination } = await import(
      "../../server/stripeConnect.js"
    );
    const pool = mockOrganizerPool({
      organizer_id: 7,
      email: "org@test.com",
      legal_name: "Trail MX",
      billing_email: "billing@trail.mx",
      rfc: "TRM123456ABC",
      tax_regime: null,
      service_fee_percent: 11,
      fee_presentation: "pass_through",
      payout_rail: "stripe",
      stripe_account_id: null,
      stripe_onboarding_complete: 0,
      stripe_connect_status: "disabled",
      stripe_charges_enabled: 0,
      stripe_payouts_enabled: 0,
      stripe_details_submitted: 0,
      stripe_connect_onboarded_at: null,
      stripe_connect_last_synced_at: null,
      stripe_connect_onboarding_mode: null,
      payout_terms_accepted_at: "2026-01-01",
      payout_fee_acknowledged_at: "2026-01-01",
      status: "active",
    });

    const dest = await resolveOrganizerCheckoutDestination(pool as never, 7, null);
    expect(dest.ok).toBe(false);
    if (dest.ok === false) {
      expect(["organizer_payouts_disabled", "organizer_payouts_not_ready"]).toContain(
        dest.code,
      );
    }
  });
});

describe("persistOrganizerConnectFromStripeAccount", () => {
  it("skips capability overwrite when organizer is admin-disabled", async () => {
    const calls: string[] = [];
    const pool = {
      query: async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
        calls.push(q);
        if (q.includes("select stripe_connect_status")) {
          return [[{ stripe_connect_status: "disabled" }], []];
        }
        if (
          q.startsWith("update organizers set stripe_connect_last_synced_at") &&
          !q.includes("stripe_account_id")
        ) {
          return [{ affectedRows: 1 }, []];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      },
    } as unknown as Pool;

    await persistOrganizerConnectFromStripeAccount(
      pool,
      7,
      {
        id: "acct_disabled",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: { currently_due: [], disabled_reason: null },
      } as Stripe.Account,
    );

    expect(calls.some((c) => c.includes("last_synced_at"))).toBe(true);
    expect(calls.some((c) => c.includes("stripe_connect_status ="))).toBe(false);
  });

  it("forceWhileDisabled allows persist overwrite after admin enable", async () => {
    const calls: string[] = [];
    const pool = {
      query: async (sql: string) => {
        const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
        calls.push(q);
        if (q.includes("select stripe_connect_status")) {
          return [[{ stripe_connect_status: "disabled" }], []];
        }
        if (q.startsWith("update organizers set")) {
          return [{ affectedRows: 1 }, []];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      },
    } as unknown as Pool;

    await persistOrganizerConnectFromStripeAccount(
      pool,
      7,
      {
        id: "acct_reenable",
        charges_enabled: false,
        payouts_enabled: true,
        details_submitted: true,
        capabilities: { transfers: "active" },
        requirements: { currently_due: [], disabled_reason: null },
      } as Stripe.Account,
      null,
      { forceWhileDisabled: true },
    );

    expect(calls.some((c) => c.includes("stripe_connect_status ="))).toBe(true);
  });
});

describe("Connect account helpers", () => {
  it("resolveMxEntityType maps RFC length to company vs individual", async () => {
    const { resolveMxEntityType } = await import("../../server/stripeConnect.js");
    expect(resolveMxEntityType("ABC123456XXX")).toBe("company"); // 12
    expect(resolveMxEntityType("ABCD123456XXX")).toBe("individual"); // 13
    expect(resolveMxEntityType(null)).toBe("individual");
  });

  it("accountAllowsDisableStripeAuth only for application-collected / dashboard none", async () => {
    const {
      accountAllowsDisableStripeAuth,
      resolveConnectDashboardKind,
      isEmbeddedPreferredForAccount,
    } = await import("../../server/stripeConnect.js");

    const whiteLabel = {
      type: "custom",
      controller: {
        requirement_collection: "application",
        stripe_dashboard: { type: "none" },
      },
    } as Stripe.Account;
    expect(accountAllowsDisableStripeAuth(whiteLabel)).toBe(true);
    expect(resolveConnectDashboardKind(whiteLabel)).toBe("none");
    expect(isEmbeddedPreferredForAccount(whiteLabel)).toBe(true);

    const express = {
      type: "express",
      controller: {
        requirement_collection: "stripe",
        stripe_dashboard: { type: "express" },
      },
    } as Stripe.Account;
    expect(accountAllowsDisableStripeAuth(express)).toBe(false);
    expect(resolveConnectDashboardKind(express)).toBe("express");
    expect(isEmbeddedPreferredForAccount(express)).toBe(true);
  });

  it("createOrganizerAccountSession omits disable auth for Express", async () => {
    const { createOrganizerAccountSession } = await import(
      "../../server/stripeConnect.js"
    );
    const calls: Array<{
      components: { account_onboarding?: { features?: unknown } };
    }> = [];
    const stripe = {
      accounts: {
        retrieve: async () =>
          ({
            id: "acct_express",
            type: "express",
            controller: {
              requirement_collection: "stripe",
              stripe_dashboard: { type: "express" },
            },
          }) as Stripe.Account,
      },
      accountSessions: {
        create: async (params: {
          components: { account_onboarding?: { features?: unknown } };
        }) => {
          calls.push(params);
          return { client_secret: "cs_test_express" };
        },
      },
    };

    const result = await createOrganizerAccountSession(
      stripe as unknown as Stripe,
      "acct_express",
    );
    expect(result.clientSecret).toBe("cs_test_express");
    expect(result.dashboard).toBe("express");
    expect(result.disableStripeAuth).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.components.account_onboarding?.features).toBeUndefined();
  });

  it("createOrganizerAccountSession retries when disable auth is rejected", async () => {
    const { createOrganizerAccountSession } = await import(
      "../../server/stripeConnect.js"
    );
    const calls: unknown[] = [];
    const stripe = {
      accounts: {
        retrieve: async () =>
          ({
            id: "acct_wl",
            type: "custom",
            controller: {
              requirement_collection: "application",
              stripe_dashboard: { type: "none" },
            },
          }) as Stripe.Account,
      },
      accountSessions: {
        create: async (params: {
          components: { account_onboarding?: { features?: unknown } };
        }) => {
          calls.push(params);
          const disabled =
            params.components.account_onboarding?.features != null;
          if (disabled) {
            throw new Error("disable_stripe_user_authentication not permitted");
          }
          return { client_secret: "cs_test_ok" };
        },
      },
    };

    const result = await createOrganizerAccountSession(
      stripe as unknown as Stripe,
      "acct_wl",
    );
    expect(result.clientSecret).toBe("cs_test_ok");
    expect(result.disableStripeAuth).toBe(false);
    expect(calls).toHaveLength(2);
  });
});

describe("applyConnectToPaymentIntent transfers-only destination", () => {
  it("sets transfer_data and application_fee without on_behalf_of", async () => {
    const { applyConnectToPaymentIntent } = await import(
      "../../server/stripeConnect.js"
    );
    const params = applyConnectToPaymentIntent(
      {
        amount: 111_000,
        currency: "mxn",
        automatic_payment_methods: { enabled: true },
      },
      { destinationAccountId: "acct_dest", applicationFeeCents: 11_000 },
    );
    expect(params.transfer_data).toEqual({ destination: "acct_dest" });
    expect(params.application_fee_amount).toBe(11_000);
    expect((params as { on_behalf_of?: string }).on_behalf_of).toBeUndefined();
  });
});
