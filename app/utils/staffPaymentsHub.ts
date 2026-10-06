/** Pagos hub tabs under `/staff/payments`. */

export type StaffPaymentsHubTab = "overview" | "activity" | "setup" | "spei";

export function parseStaffPaymentsHubTab(
  raw: string | null | undefined,
): StaffPaymentsHubTab | null {
  if (raw === "overview" || raw === "resumen") return "overview";
  if (raw === "activity" || raw === "movimientos" || raw === "payments") {
    return "activity";
  }
  if (raw === "setup" || raw === "configurar" || raw === "payouts") {
    return "setup";
  }
  if (raw === "spei" || raw === "liquidar") return "spei";
  return null;
}

/**
 * Default hub tab: setup attention → overview; otherwise activity.
 * Callers that cannot access payout setup should force activity.
 */
export function defaultStaffPaymentsHubTab(opts: {
  canAccessSetup: boolean;
  payoutsLoaded: boolean;
  payoutReady: boolean | null;
}): StaffPaymentsHubTab {
  if (
    opts.canAccessSetup &&
    opts.payoutsLoaded &&
    opts.payoutReady === false
  ) {
    return "overview";
  }
  return "activity";
}

/** Canonical organizer deep-link into Pagos → Configurar. */
export const STAFF_PAYMENTS_SETUP_PATH = "/staff/payments?tab=setup";

/** Admin SPEI settlement queue tab. */
export const STAFF_PAYMENTS_SPEI_PATH = "/staff/payments?tab=spei";
