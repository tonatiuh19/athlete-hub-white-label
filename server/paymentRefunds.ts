/** Ledger / provider helpers for payment refunds (Stripe, mock, manual, Mercado Pago). */

export type PaymentRefundProvider =
  | "stripe"
  | "mock"
  | "manual"
  | "mercadopago";

export function resolvePaymentRefundProvider(pay: {
  provider: string;
  stripe_payment_intent_id?: string | null;
}): PaymentRefundProvider {
  if (pay.provider === "manual") return "manual";
  if (pay.provider === "mercadopago") return "mercadopago";
  if (pay.stripe_payment_intent_id) return "stripe";
  return "mock";
}

/** Manual and mock refunds are ledger-only (no Stripe / Mercado Pago API call). */
export function skipsExternalRefund(provider: string): boolean {
  return provider === "manual" || provider === "mock";
}

export function buildManualSalePaymentMetadata(): {
  manual_sale: true;
  tender: "cash";
} {
  return { manual_sale: true, tender: "cash" };
}
