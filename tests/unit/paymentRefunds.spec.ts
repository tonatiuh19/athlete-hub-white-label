import { describe, expect, it } from "vitest";
import {
  buildManualSalePaymentMetadata,
  resolvePaymentRefundProvider,
  skipsExternalRefund,
} from "../../server/paymentRefunds.js";

describe("paymentRefunds helpers", () => {
  it("resolves manual provider for ledger-only refunds", () => {
    expect(
      resolvePaymentRefundProvider({
        provider: "manual",
        stripe_payment_intent_id: null,
      }),
    ).toBe("manual");
    expect(skipsExternalRefund("manual")).toBe(true);
  });

  it("resolves mock without external APIs", () => {
    expect(
      resolvePaymentRefundProvider({
        provider: "mock",
        stripe_payment_intent_id: null,
      }),
    ).toBe("mock");
    expect(skipsExternalRefund("mock")).toBe(true);
  });

  it("resolves stripe and mercadopago for external refunds", () => {
    expect(
      resolvePaymentRefundProvider({
        provider: "stripe",
        stripe_payment_intent_id: "pi_abc",
      }),
    ).toBe("stripe");
    expect(
      resolvePaymentRefundProvider({
        provider: "mercadopago",
        stripe_payment_intent_id: null,
      }),
    ).toBe("mercadopago");
    expect(skipsExternalRefund("stripe")).toBe(false);
    expect(skipsExternalRefund("mercadopago")).toBe(false);
  });

  it("stores cash tender metadata for manual sales", () => {
    expect(buildManualSalePaymentMetadata()).toEqual({
      manual_sale: true,
      tender: "cash",
    });
  });
});
