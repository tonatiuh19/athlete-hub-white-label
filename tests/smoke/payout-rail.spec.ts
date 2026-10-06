import { describe, it, expect } from "vitest";
import {
  resolveCheckoutRail,
  resolveServiceFeePercentForRail,
  isPayoutRail,
} from "../../shared/payoutRail";

describe("payout rail", () => {
  it("prefers ready preferred rail", () => {
    expect(
      resolveCheckoutRail({
        preferred: "stripe",
        stripeReady: true,
        manualReady: true,
      }),
    ).toEqual({ ok: true, rail: "stripe", fallback: false });
  });

  it("falls back to manual when stripe is not ready", () => {
    expect(
      resolveCheckoutRail({
        preferred: "stripe",
        stripeReady: false,
        manualReady: true,
      }),
    ).toEqual({ ok: true, rail: "manual", fallback: true });
  });

  it("falls back from manual to stripe when preferred manual is not ready", () => {
    expect(
      resolveCheckoutRail({
        preferred: "manual",
        stripeReady: true,
        manualReady: false,
      }),
    ).toEqual({ ok: true, rail: "stripe", fallback: true });
  });

  it("blocks when neither ready", () => {
    const r = resolveCheckoutRail({
      preferred: "stripe",
      stripeReady: false,
      manualReady: false,
    });
    expect(r.ok).toBe(false);
  });

  it("prefers manual when preferred and manualReady", () => {
    expect(
      resolveCheckoutRail({
        preferred: "manual",
        stripeReady: false,
        manualReady: true,
      }),
    ).toEqual({ ok: true, rail: "manual", fallback: false });
  });

  it("rejects mercadopago as a payout rail", () => {
    expect(isPayoutRail("mercadopago")).toBe(false);
    expect(isPayoutRail("stripe")).toBe(true);
    expect(isPayoutRail("manual")).toBe(true);
  });

  it("uses org fee for stripe when no event override", () => {
    expect(
      resolveServiceFeePercentForRail({
        organizerFee: 11,
        rail: "stripe",
      }),
    ).toBe(11);
  });

  it("keeps event override over rail default", () => {
    expect(
      resolveServiceFeePercentForRail({
        eventFee: 9,
        organizerFee: 11,
        rail: "manual",
      }),
    ).toBe(9);
  });
});
