/** Payout/checkout rail resolution — Stripe vs manual SPEI account. */

export type PayoutRail = "stripe" | "manual";

export function isPayoutRail(value: unknown): value is PayoutRail {
  return value === "stripe" || value === "manual";
}

/**
 * When event override is set, it wins.
 * Else Stripe/manual use org percent (default 11%).
 */
export function resolveServiceFeePercentForRail(opts: {
  eventFee?: number | string | null;
  organizerFee?: number | string | null;
  rail: PayoutRail;
  defaultStripePercent?: number;
}): number {
  const eventNum =
    opts.eventFee != null && opts.eventFee !== "" ? Number(opts.eventFee) : NaN;
  if (Number.isFinite(eventNum) && eventNum >= 0) return eventNum;

  const orgNum =
    opts.organizerFee != null && opts.organizerFee !== ""
      ? Number(opts.organizerFee)
      : NaN;
  if (Number.isFinite(orgNum) && orgNum >= 0) return orgNum;
  return opts.defaultStripePercent ?? 11;
}

export type CheckoutRailResolution =
  | { ok: true; rail: PayoutRail; fallback: boolean }
  | { ok: false; code: "organizer_payouts_not_ready"; message: string };

/**
 * Preferred rail if ready; else first other ready rail; else blocked.
 * Simulations should force Stripe/mock and skip this helper.
 */
export function resolveCheckoutRail(opts: {
  preferred: PayoutRail;
  stripeReady: boolean;
  manualReady?: boolean;
}): CheckoutRailResolution {
  const preferred = opts.preferred;
  const manualReady = Boolean(opts.manualReady);
  const ready = (rail: PayoutRail) => {
    if (rail === "stripe") return opts.stripeReady;
    return manualReady;
  };

  if (ready(preferred)) {
    return { ok: true, rail: preferred, fallback: false };
  }

  const order: PayoutRail[] = ["stripe", "manual"];
  for (const rail of order) {
    if (rail === preferred) continue;
    if (ready(rail)) {
      return { ok: true, rail, fallback: true };
    }
  }

  return {
    ok: false,
    code: "organizer_payouts_not_ready",
    message: "Registration payments are temporarily unavailable for this event",
  };
}
