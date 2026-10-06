/**
 * Mexico MSI (meses sin intereses) — Atleita fee uplift (Y2).
 *
 * When an athlete selects an MSI plan, Atleita application_fee must cover:
 * - base platform service fee
 * - Stripe's MSI surcharge on the *full charge*
 * - Atleita margin (+2%)
 *
 * Pass-through closed form (list L, rates as decimals):
 *   appFee = round( L * (base + margin + msi) / (1 - msi) )
 * so Stripe's msi% of (L+appFee) is funded inside appFee.
 *
 * Absorb-all: charge stays L; appFee = round(L * (base + margin + msi)), capped at L.
 */

import {
  calcServiceFeeCents,
  type CheckoutBreakdown,
  type FeePresentation,
  computeCheckoutBreakdown,
} from "./checkoutBreakdown.js";

export const MSI_PLATFORM_MARGIN_PERCENT = 2;
export const MSI_MIN_ATHLETE_TOTAL_CENTS = 100_000; // $1,000 MXN
export const MSI_ALLOWED_PLAN_MONTHS = [3, 6, 9] as const;
export type MsiPlanMonths = (typeof MSI_ALLOWED_PLAN_MONTHS)[number];

/** Stripe additional fee % by plan (docs.stripe.com/payments/mx-installments). */
export const MSI_STRIPE_FEE_PERCENT_BY_PLAN: Record<MsiPlanMonths, number> = {
  3: 5,
  6: 7.5,
  9: 10,
};

export function isMsiPlanMonths(value: unknown): value is MsiPlanMonths {
  return value === 3 || value === 6 || value === 9;
}

export function stripeMsiFeePercentForPlan(planMonths: MsiPlanMonths): number {
  return MSI_STRIPE_FEE_PERCENT_BY_PLAN[planMonths];
}

/** Whether checkout total qualifies for offering MSI (Stripe min + Atleita floor). */
export function athleteTotalQualifiesForMsi(athleteTotalCents: number): boolean {
  return athleteTotalCents >= MSI_MIN_ATHLETE_TOTAL_CENTS;
}

/**
 * Y2 application fee (service fee cents) when MSI plan is selected.
 * `baseServiceFeePercent` is the resolved event/org Stripe fee (no MSI).
 */
export function calcMsiServiceFeeCents(opts: {
  listPriceCents: number;
  baseServiceFeePercent: number;
  feePresentation: FeePresentation;
  planMonths: MsiPlanMonths;
  marginPercent?: number;
}): number {
  const L = Math.max(0, Math.round(opts.listPriceCents));
  if (L <= 0) return 0;

  const b = Math.max(0, opts.baseServiceFeePercent) / 100;
  const g = Math.max(0, opts.marginPercent ?? MSI_PLATFORM_MARGIN_PERCENT) / 100;
  const m = stripeMsiFeePercentForPlan(opts.planMonths) / 100;

  if (opts.feePresentation === "absorb_all") {
    const fee = Math.round(L * (b + g + m));
    return Math.min(L, Math.max(0, fee));
  }

  // pass_through: fund MSI% on full athlete total (L + fee)
  if (m >= 1) return calcServiceFeeCents(L, opts.baseServiceFeePercent);
  const fee = Math.round((L * (b + g + m)) / (1 - m));
  return Math.max(0, fee);
}

/** Effective % of list for display (may be non-integer with Y2). */
export function effectiveMsiFeePercentOfList(
  listPriceCents: number,
  serviceFeeCents: number,
): number {
  const L = Math.max(0, Math.round(listPriceCents));
  if (L <= 0) return 0;
  return Math.round((serviceFeeCents / L) * 10000) / 100;
}

export function computeCheckoutBreakdownForMsiPlan(opts: {
  listPriceCents: number;
  baseServiceFeePercent: number;
  feePresentation: FeePresentation;
  planMonths: MsiPlanMonths | null;
}): CheckoutBreakdown {
  const listPriceCents = Math.max(0, Math.round(opts.listPriceCents));
  const mode = opts.feePresentation;

  if (!opts.planMonths) {
    return computeCheckoutBreakdown({
      listPriceCents,
      serviceFeePercent: opts.baseServiceFeePercent,
      feePresentation: mode,
    });
  }

  const serviceFeeCents = calcMsiServiceFeeCents({
    listPriceCents,
    baseServiceFeePercent: opts.baseServiceFeePercent,
    feePresentation: mode,
    planMonths: opts.planMonths,
  });
  const serviceFeePercent = effectiveMsiFeePercentOfList(
    listPriceCents,
    serviceFeeCents,
  );

  // Reuse core breakdown shape with explicit fee cents via percent approximation
  // is lossy — build from computeCheckoutBreakdown then override fee fields.
  const base = computeCheckoutBreakdown({
    listPriceCents,
    serviceFeePercent: opts.baseServiceFeePercent,
    feePresentation: mode,
  });

  if (mode === "absorb_all") {
    const stripePlatformFeeCents = serviceFeeCents;
    const stripeOrganizerTransferCents = Math.max(0, listPriceCents - serviceFeeCents);
    const organizerFiscalNetCents = stripeOrganizerTransferCents; // display aligned
    return {
      ...base,
      serviceFeePercent,
      serviceFeeCents,
      athleteTotalCents: listPriceCents,
      stripePlatformFeeCents,
      stripeOrganizerTransferCents,
      organizerFiscalNetCents,
      organizerReceivesCents: organizerFiscalNetCents,
      platformFeeCents: stripePlatformFeeCents,
      platformCfdiGrossCents: serviceFeeCents,
      organizerCfdiGrossCents: stripeOrganizerTransferCents,
      totalCents: listPriceCents,
    };
  }

  const athleteTotalCents = listPriceCents + serviceFeeCents;
  return {
    ...base,
    serviceFeePercent,
    serviceFeeCents,
    athleteTotalCents,
    stripePlatformFeeCents: serviceFeeCents,
    stripeOrganizerTransferCents: listPriceCents,
    organizerFiscalNetCents: listPriceCents,
    organizerReceivesCents: listPriceCents,
    platformFeeCents: serviceFeeCents,
    platformCfdiGrossCents: serviceFeeCents,
    organizerCfdiGrossCents: listPriceCents,
    totalCents: athleteTotalCents,
  };
}
