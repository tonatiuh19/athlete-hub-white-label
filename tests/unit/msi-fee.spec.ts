/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  MSI_MIN_ATHLETE_TOTAL_CENTS,
  athleteTotalQualifiesForMsi,
  calcMsiServiceFeeCents,
  computeCheckoutBreakdownForMsiPlan,
} from "../../shared/msi";

describe("MSI Y2 fee math", () => {
  it("one-shot matches base breakdown", () => {
    const b = computeCheckoutBreakdownForMsiPlan({
      listPriceCents: 200_000,
      baseServiceFeePercent: 11,
      feePresentation: "pass_through",
      planMonths: null,
    });
    expect(b.serviceFeeCents).toBe(22_000);
    expect(b.athleteTotalCents).toBe(222_000);
  });

  it("pass_through 3mo funds MSI on full charge (Y2)", () => {
    const L = 200_000;
    const fee = calcMsiServiceFeeCents({
      listPriceCents: L,
      baseServiceFeePercent: 11,
      feePresentation: "pass_through",
      planMonths: 3,
    });
    // L*(0.11+0.02+0.05)/(1-0.05) = 200000*0.18/0.95
    expect(fee).toBe(Math.round((L * 0.18) / 0.95));
    const charge = L + fee;
    const stripeMsi = Math.round(charge * 0.05);
    // app fee covers base+margin on list + stripe MSI on charge (within rounding)
    expect(fee).toBeGreaterThanOrEqual(Math.round(L * 0.13) + stripeMsi - 2);
  });

  it("9mo fee is higher than 3mo", () => {
    const f3 = calcMsiServiceFeeCents({
      listPriceCents: 200_000,
      baseServiceFeePercent: 11,
      feePresentation: "pass_through",
      planMonths: 3,
    });
    const f9 = calcMsiServiceFeeCents({
      listPriceCents: 200_000,
      baseServiceFeePercent: 11,
      feePresentation: "pass_through",
      planMonths: 9,
    });
    expect(f9).toBeGreaterThan(f3);
  });

  it("absorb_all keeps athlete total = list", () => {
    const b = computeCheckoutBreakdownForMsiPlan({
      listPriceCents: 200_000,
      baseServiceFeePercent: 11,
      feePresentation: "absorb_all",
      planMonths: 6,
    });
    expect(b.athleteTotalCents).toBe(200_000);
    expect(b.serviceFeeCents).toBe(Math.round(200_000 * (0.11 + 0.02 + 0.075)));
    expect(b.stripeOrganizerTransferCents).toBe(200_000 - b.serviceFeeCents);
  });

  it("qualifies at $1000 athlete total", () => {
    expect(athleteTotalQualifiesForMsi(MSI_MIN_ATHLETE_TOTAL_CENTS)).toBe(true);
    expect(athleteTotalQualifiesForMsi(MSI_MIN_ATHLETE_TOTAL_CENTS - 1)).toBe(
      false,
    );
  });
});
