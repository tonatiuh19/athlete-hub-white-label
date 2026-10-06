import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isPayoutRail,
  resolveCheckoutRail,
  resolveServiceFeePercentForRail,
} from "../../shared/payoutRail";
import {
  computeCheckoutBreakdown,
  validateCheckoutBreakdown,
} from "../../shared/checkoutBreakdown";
import {
  ageOnReferenceDate,
  evaluateCategoryEligibility,
} from "../../shared/categoryEligibility";
import {
  decryptSecret,
  encryptSecret,
  isMercadoPagoConfigured,
  organizerMpReady,
  type OrganizerMpRow,
} from "../../server/mercadoPago";
import { registrationCheckoutIsReady } from "@/utils/registrationCheckoutPayment";

describe("payout rail matrix (stripe|manual)", () => {
  const cases: Array<{
    name: string;
    preferred: "stripe" | "manual";
    stripeReady: boolean;
    manualReady: boolean;
    expectOk: boolean;
    rail?: "stripe" | "manual";
    fallback?: boolean;
  }> = [
    {
      name: "stripe preferred + both ready",
      preferred: "stripe",
      stripeReady: true,
      manualReady: true,
      expectOk: true,
      rail: "stripe",
      fallback: false,
    },
    {
      name: "manual preferred + both ready",
      preferred: "manual",
      stripeReady: true,
      manualReady: true,
      expectOk: true,
      rail: "manual",
      fallback: false,
    },
    {
      name: "stripe preferred, only manual ready → fallback manual",
      preferred: "stripe",
      stripeReady: false,
      manualReady: true,
      expectOk: true,
      rail: "manual",
      fallback: true,
    },
    {
      name: "manual preferred, only stripe ready → fallback stripe",
      preferred: "manual",
      stripeReady: true,
      manualReady: false,
      expectOk: true,
      rail: "stripe",
      fallback: true,
    },
    {
      name: "neither ready → blocked",
      preferred: "stripe",
      stripeReady: false,
      manualReady: false,
      expectOk: false,
    },
    {
      name: "manual preferred neither ready → blocked",
      preferred: "manual",
      stripeReady: false,
      manualReady: false,
      expectOk: false,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const r = resolveCheckoutRail({
        preferred: c.preferred,
        stripeReady: c.stripeReady,
        manualReady: c.manualReady,
      });
      expect(r.ok).toBe(c.expectOk);
      if (c.expectOk) {
        expect(r).toEqual({
          ok: true,
          rail: c.rail,
          fallback: c.fallback,
        });
      } else {
        expect(r).toEqual({
          ok: false,
          code: "organizer_payouts_not_ready",
          message: expect.any(String),
        });
      }
    });
  }

  it("isPayoutRail guards (mercadopago removed)", () => {
    expect(isPayoutRail("stripe")).toBe(true);
    expect(isPayoutRail("manual")).toBe(true);
    expect(isPayoutRail("mercadopago")).toBe(false);
    expect(isPayoutRail("paypal")).toBe(false);
    expect(isPayoutRail(null)).toBe(false);
  });
});

describe("Stripe/manual fee math", () => {
  it("defaults Stripe/manual to org/11", () => {
    expect(
      resolveServiceFeePercentForRail({ rail: "stripe", organizerFee: 11 }),
    ).toBe(11);
    expect(
      resolveServiceFeePercentForRail({ rail: "manual", organizerFee: 11 }),
    ).toBe(11);
    expect(resolveServiceFeePercentForRail({ rail: "stripe" })).toBe(11);
  });

  it("treats empty string event fee as missing", () => {
    expect(
      resolveServiceFeePercentForRail({
        eventFee: "",
        organizerFee: 11,
        rail: "stripe",
      }),
    ).toBe(11);
  });

  it("allows event override 0%", () => {
    expect(
      resolveServiceFeePercentForRail({
        eventFee: 0,
        rail: "manual",
      }),
    ).toBe(0);
  });

  it("pass_through $250 list at 11%", () => {
    const b = computeCheckoutBreakdown({
      listPriceCents: 25_000,
      serviceFeePercent: 11,
      feePresentation: "pass_through",
    });
    expect(b.serviceFeeCents).toBe(2_750);
    expect(b.athleteTotalCents).toBe(27_750);
    expect(b.stripeOrganizerTransferCents).toBe(25_000);
    expect(validateCheckoutBreakdown(b)).toBeNull();
  });

  it("absorb_all $250 list at 11%", () => {
    const b = computeCheckoutBreakdown({
      listPriceCents: 25_000,
      serviceFeePercent: 11,
      feePresentation: "absorb_all",
    });
    expect(b.athleteTotalCents).toBe(25_000);
    expect(b.serviceFeeCents).toBe(2_750);
    expect(b.stripeOrganizerTransferCents).toBe(22_250);
    expect(validateCheckoutBreakdown(b)).toBeNull();
  });
});

describe("category eligibility mysql Date edge (Luis regression)", () => {
  it("accepts Date DOB + DateTime start without false age reject", () => {
    const dob = new Date("1998-11-22T00:00:00.000Z");
    const start = new Date("2026-07-14T21:22:00.000Z");
    expect(ageOnReferenceDate(dob, start)).toBe(27);
    expect(
      evaluateCategoryEligibility(
        { min_age: 18, max_age: 39, gender_restriction: "male" },
        { date_of_birth: dob, gender: "male" },
        start,
      ),
    ).toEqual({ eligible: true });
  });

  it("rejects String(Date).slice style reference dates", () => {
    expect(ageOnReferenceDate("1998-11-22", "Tue Jul 14")).toBeNull();
  });

  it("DATETIME string start_date still works via normalize", () => {
    expect(ageOnReferenceDate("1998-11-22", "2026-07-14 21:22:00")).toBe(27);
  });
});

describe("Mercado Pago residual helpers (historical / stubbed)", () => {
  const prevJwt = process.env.JWT_SECRET;
  const prevMp = {
    id: process.env.MP_CLIENT_ID,
    secret: process.env.MP_CLIENT_SECRET,
    token: process.env.MP_PLATFORM_ACCESS_TOKEN,
  };

  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret-for-mp-crypto-unit";
    delete process.env.MP_CLIENT_ID;
    delete process.env.MP_CLIENT_SECRET;
    delete process.env.MP_PLATFORM_ACCESS_TOKEN;
    delete process.env.MP_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env.JWT_SECRET = prevJwt;
    process.env.MP_CLIENT_ID = prevMp.id;
    process.env.MP_CLIENT_SECRET = prevMp.secret;
    process.env.MP_PLATFORM_ACCESS_TOKEN = prevMp.token;
    delete process.env.MP_WEBHOOK_SECRET;
  });

  it("encrypt/decrypt round-trips", () => {
    const enc = encryptSecret("APP_USR-seller-token-xyz");
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe("APP_USR-seller-token-xyz");
  });

  it("decrypt returns null for garbage", () => {
    expect(decryptSecret("v1:bad:bad:bad")).toBeNull();
  });

  it("isMercadoPagoConfigured stays stubbed off", () => {
    expect(isMercadoPagoConfigured()).toBe(false);
    process.env.MP_CLIENT_ID = "app";
    process.env.MP_CLIENT_SECRET = "secret";
    process.env.MP_PLATFORM_ACCESS_TOKEN = "token";
    process.env.MP_WEBHOOK_SECRET = "whsec";
    expect(isMercadoPagoConfigured()).toBe(false);
  });

  it("organizerMpReady fails closed without seller tokens", () => {
    const base: OrganizerMpRow = {
      id: 1,
      payout_rail: "stripe",
      mp_user_id: "123",
      mp_access_token_enc: encryptSecret("tok"),
      mp_refresh_token_enc: null,
      mp_token_expires_at: null,
      mp_public_key: null,
      mp_oauth_status: "ready",
      mp_oauth_connected_at: new Date().toISOString(),
      mp_oauth_last_synced_at: null,
      legal_name: "Club X",
      billing_email: "club@example.com",
      rfc: "XAXX010101000",
      payout_terms_accepted_at: new Date().toISOString(),
      payout_fee_acknowledged_at: new Date().toISOString(),
    };
    // Product purge: loadOrganizerMp stubs tokens as null; readiness requires tokens.
    expect(organizerMpReady({ ...base, mp_access_token_enc: null })).toBe(false);
    expect(organizerMpReady(base)).toBe(true);
  });
});

describe("checkout readiness rejects mercadopago provider", () => {
  const base = {
    paymentPublicUuid: "pay-mp",
    clientSecret: null as string | null,
    amountCents: 28_250,
    registrationAmountCents: 25_000,
    serviceFeeCents: 3_250,
    currency: "MXN",
    categoryName: "6K",
    eventTitle: "Cars run",
    provider: "mercadopago" as const,
    mpPreferenceId: "pref-1",
    mpPublicKey: "TEST-pk",
  };

  it("never ready for mercadopago checkout sessions", () => {
    expect(registrationCheckoutIsReady(base, 28_250)).toBe(false);
  });

  it("stripe path still requires clientSecret", () => {
    expect(
      registrationCheckoutIsReady(
        {
          ...base,
          provider: "stripe",
          clientSecret: "pi_sec",
          mpPreferenceId: null,
        },
        28_250,
      ),
    ).toBe(true);
  });
});
