import type { Express, RequestHandler, Response } from "express";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type Stripe from "stripe";
import type { FeePresentation } from "../shared/checkoutBreakdown.js";
import {
  buildConnectAccountLinkUrls,
  buildStripePayoutChecklist,
  buildPlatformPayoutChecklist,
  deriveStripeConnectStatusFromCapabilities,
  isOrganizerPayoutReady,
  isPlatformPayoutProfileComplete,
  type ConnectAccountLinkActor,
  type OrganizerConnectState,
  type StripeConnectOnboardingMode,
  type StripeConnectStatus,
} from "../shared/stripeConnect.js";
import type { AuthedRequest } from "./staffPortal.js";
import { registerMercadoPagoRoutes } from "./mercadoPago.js";
import {
  listAccounts,
  organizerHasVerifiedDefaultPayoutAccount,
  registerOrganizerPayoutAccountRoutes,
} from "./organizerPayoutAccounts.js";
import { registerSpeiSettlementRoutes } from "./speiSettlements.js";
import {
  isPayoutRail,
  resolveCheckoutRail,
  resolveServiceFeePercentForRail,
  type PayoutRail,
} from "../shared/payoutRail.js";
import type { OrganizerPayoutAccountPublic } from "../shared/api.js";

function respondStripeConnectRouteError(res: Response, err: unknown): void {
  const raw = err instanceof Error ? err.message : String(err);
  console.error("[stripeConnect]", raw);
  if (raw.includes("signed up for Connect")) {
    res.status(503).json({
      error:
        "Payout verification is not available on this platform account yet.",
      code: "connect_not_enabled",
    });
    return;
  }
  res.status(502).json({
    error: "Could not start payout verification.",
    code: "connect_onboard_failed",
  });
}

const ORGANIZER_CONNECT_SELECT = `
  o.id AS organizer_id,
  o.email,
  o.legal_name,
  o.billing_email,
  o.rfc,
  o.tax_regime,
  o.service_fee_percent,
  o.fee_presentation,
  o.payout_rail,
  o.status,
  o.stripe_account_id,
  o.stripe_onboarding_complete,
  o.stripe_connect_status,
  o.stripe_charges_enabled,
  o.stripe_payouts_enabled,
  o.stripe_details_submitted,
  DATE_FORMAT(o.stripe_connect_onboarded_at, '%Y-%m-%d %H:%i:%s') AS stripe_connect_onboarded_at,
  DATE_FORMAT(o.stripe_connect_last_synced_at, '%Y-%m-%d %H:%i:%s') AS stripe_connect_last_synced_at,
  o.stripe_connect_onboarding_mode,
  DATE_FORMAT(o.payout_terms_accepted_at, '%Y-%m-%d %H:%i:%s') AS payout_terms_accepted_at,
  DATE_FORMAT(o.payout_fee_acknowledged_at, '%Y-%m-%d %H:%i:%s') AS payout_fee_acknowledged_at
`;

export interface StripeConnectDeps {
  pool: Pool;
  requireAdmin: RequestHandler;
  requireOrganizer: RequestHandler;
  getStripeClient: () => Stripe | null;
  getStripePublishableKey?: () => string;
  appUrl: string;
  getOrganizerMemberRole: (
    pool: Pool,
    memberId: number,
    organizerId: number,
  ) => Promise<string | null>;
}

type OrganizerConnectRow = RowDataPacket & {
  organizer_id: number;
  email: string;
  legal_name: string | null;
  billing_email: string | null;
  rfc: string | null;
  tax_regime: string | null;
  service_fee_percent: number | string;
  fee_presentation: FeePresentation;
  payout_rail?: PayoutRail | string | null;
  status: string;
  stripe_account_id: string | null;
  stripe_onboarding_complete: number;
  stripe_connect_status: StripeConnectStatus;
  stripe_charges_enabled: number;
  stripe_payouts_enabled: number;
  stripe_details_submitted: number;
  stripe_connect_onboarded_at: string | null;
  stripe_connect_last_synced_at: string | null;
  stripe_connect_onboarding_mode: StripeConnectOnboardingMode | null;
  payout_terms_accepted_at: string | null;
  payout_fee_acknowledged_at: string | null;
};

export async function loadOrganizerConnectRow(
  pool: Pool,
  organizerId: number,
): Promise<OrganizerConnectRow | null> {
  const [rows] = await pool.query<OrganizerConnectRow[]>(
    `SELECT ${ORGANIZER_CONNECT_SELECT}
     FROM organizers o
     WHERE o.id = ? AND o.deleted_at IS NULL
     LIMIT 1`,
    [organizerId],
  );
  return rows[0] ?? null;
}

function rowToConnectState(
  row: OrganizerConnectRow,
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    disabled_reason: string | null;
  },
): OrganizerConnectState {
  const platformComplete = isPlatformPayoutProfileComplete(row);
  return {
    organizer_id: Number(row.organizer_id),
    email: String(row.email),
    legal_name: row.legal_name,
    billing_email: row.billing_email,
    rfc: row.rfc,
    tax_regime: row.tax_regime,
    service_fee_percent: Number(row.service_fee_percent ?? 11),
    fee_presentation:
      row.fee_presentation === "absorb_all" ? "absorb_all" : "pass_through",
    stripe_account_id: row.stripe_account_id,
    stripe_onboarding_complete: Boolean(row.stripe_onboarding_complete),
    stripe_connect_status: row.stripe_connect_status ?? "not_started",
    stripe_charges_enabled: Boolean(row.stripe_charges_enabled),
    stripe_payouts_enabled: Boolean(row.stripe_payouts_enabled),
    stripe_details_submitted: Boolean(row.stripe_details_submitted),
    stripe_connect_onboarded_at: row.stripe_connect_onboarded_at,
    stripe_connect_last_synced_at: row.stripe_connect_last_synced_at,
    stripe_connect_onboarding_mode: row.stripe_connect_onboarding_mode,
    payout_terms_accepted_at: row.payout_terms_accepted_at,
    payout_fee_acknowledged_at: row.payout_fee_acknowledged_at,
    requirements_currently_due: requirements?.currently_due ?? [],
    requirements_eventually_due: requirements?.eventually_due ?? [],
    requirements_disabled_reason: requirements?.disabled_reason ?? null,
  };
}

export function buildConnectStatusPayload(
  row: OrganizerConnectRow,
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    disabled_reason: string | null;
  },
  opts?: {
    /** True when a verified default Cuenta de Pago exists (before Atleita gate). */
    hasVerifiedDefaultManualAccount?: boolean;
    manualAccounts?: OrganizerPayoutAccountPublic[];
  },
) {
  const state = rowToConnectState(row, requirements);
  const platformChecklist = buildPlatformPayoutChecklist(state);
  const stripeChecklist = buildStripePayoutChecklist({
    stripe_account_id: state.stripe_account_id,
    stripe_details_submitted: state.stripe_details_submitted,
    stripe_charges_enabled: state.stripe_charges_enabled,
    stripe_payouts_enabled: state.stripe_payouts_enabled,
    requirements_currently_due: state.requirements_currently_due,
    requirements_eventually_due: state.requirements_eventually_due,
  });
  const stripeReady = isOrganizerPayoutReady({
    stripe_connect_status: state.stripe_connect_status,
    stripe_account_id: state.stripe_account_id,
    stripe_charges_enabled: state.stripe_charges_enabled,
    stripe_payouts_enabled: state.stripe_payouts_enabled,
    requirements_currently_due: state.requirements_currently_due,
    platform_profile_complete: platformChecklist.complete,
  });

  const preferredRail: PayoutRail = isPayoutRail(row.payout_rail)
    ? row.payout_rail
    : "stripe";

  const hasVerifiedDefaultManual = Boolean(
    opts?.hasVerifiedDefaultManualAccount,
  );
  const manualReady = hasVerifiedDefaultManual && platformChecklist.complete;

  const railResolution = resolveCheckoutRail({
    preferred: preferredRail,
    stripeReady,
    manualReady,
  });
  const payoutReady = railResolution.ok;
  const effectiveRail = railResolution.ok ? railResolution.rail : preferredRail;
  const displayFeePercent = resolveServiceFeePercentForRail({
    organizerFee: state.service_fee_percent,
    rail: railResolution.ok ? railResolution.rail : preferredRail,
  });

  return {
    organizer: {
      ...state,
      payout_rail: preferredRail,
    },
    platformChecklist,
    stripeChecklist,
    payoutReady,
    preferredRail,
    effectiveRail: railResolution.ok ? effectiveRail : null,
    railFallback: railResolution.ok ? railResolution.fallback : false,
    serviceFeePercent: displayFeePercent,
    stripeServiceFeePercent: Number(state.service_fee_percent ?? 11),
    feePresentation: state.fee_presentation,
    stripeReady,
    manualReady,
    manualAccounts: opts?.manualAccounts ?? [],
  };
}

async function loadManualPayoutOpts(
  pool: Pool,
  organizerId: number,
): Promise<{
  hasVerifiedDefaultManualAccount: boolean;
  manualAccounts: OrganizerPayoutAccountPublic[];
}> {
  const [hasVerifiedDefaultManualAccount, manualAccounts] = await Promise.all([
    organizerHasVerifiedDefaultPayoutAccount(pool, organizerId),
    listAccounts(pool, organizerId),
  ]);
  return { hasVerifiedDefaultManualAccount, manualAccounts };
}

export async function persistOrganizerConnectFromStripeAccount(
  pool: Pool,
  organizerId: number,
  account: Stripe.Account,
  onboardingMode?: StripeConnectOnboardingMode | null,
  opts?: { forceWhileDisabled?: boolean },
): Promise<void> {
  const [[existing]] = await pool.query<RowDataPacket[]>(
    "SELECT stripe_connect_status FROM organizers WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [organizerId],
  );
  if (
    existing?.stripe_connect_status === "disabled" &&
    !opts?.forceWhileDisabled
  ) {
    await pool.query<ResultSetHeader>(
      `UPDATE organizers SET stripe_connect_last_synced_at = NOW() WHERE id = ?`,
      [organizerId],
    );
    return;
  }

  const currentlyDue = account.requirements?.currently_due ?? [];
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const transfersCap = account.capabilities?.transfers;
  const transfersActive =
    transfersCap === "active"
      ? true
      : transfersCap === "inactive" || transfersCap === "pending"
        ? false
        : null;
  const status = deriveStripeConnectStatusFromCapabilities({
    disabled: false,
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    currently_due: currentlyDue,
    disabled_reason: disabledReason,
    has_account: true,
    transfers_active: transfersActive,
  });
  const ready = status === "ready";

  await pool.query<ResultSetHeader>(
    `UPDATE organizers SET
       stripe_account_id = ?,
       stripe_onboarding_complete = ?,
       stripe_connect_status = ?,
       stripe_charges_enabled = ?,
       stripe_payouts_enabled = ?,
       stripe_details_submitted = ?,
       stripe_connect_onboarded_at = CASE
         WHEN ? = 1 AND stripe_connect_onboarded_at IS NULL THEN NOW()
         ELSE stripe_connect_onboarded_at
       END,
       stripe_connect_last_synced_at = NOW(),
       stripe_connect_onboarding_mode = COALESCE(?, stripe_connect_onboarding_mode)
     WHERE id = ?`,
    [
      account.id,
      ready ? 1 : 0,
      status,
      account.charges_enabled ? 1 : 0,
      account.payouts_enabled ? 1 : 0,
      account.details_submitted ? 1 : 0,
      ready ? 1 : 0,
      onboardingMode ?? null,
      organizerId,
    ],
  );
}

/**
 * True when the stored Connect acct_* cannot be used with the current platform
 * secret (wrong Stripe account, revoked platform access, deleted Connect acct).
 * Transient network errors must return false so we keep the DB linkage.
 */
export function isUnrecoverableStripeConnectAccountError(
  err: unknown,
): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  if (
    code === "account_invalid" ||
    code === "resource_missing" ||
    code === "platform_api_key_expired"
  ) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /does not have access to account/i.test(msg) ||
    /application access may have been revoked/i.test(msg) ||
    /no such account/i.test(msg) ||
    /account.*(invalid|deauthorized|not connected)/i.test(msg)
  );
}

/**
 * Mark Connect as restricted without deleting the acct_* link.
 * Never NULL out stripe_account_id on sync/retrieve failures — that permanently
 * orphans a live Stripe account and forces organizers to re-onboard.
 */
export async function markOrganizerStripeConnectRestricted(
  pool: Pool,
  organizerId: number,
): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE organizers SET
       stripe_onboarding_complete = 0,
       stripe_connect_status = 'restricted',
       stripe_charges_enabled = 0,
       stripe_payouts_enabled = 0,
       stripe_connect_last_synced_at = NOW()
     WHERE id = ?
       AND deleted_at IS NULL
       AND stripe_account_id IS NOT NULL
       AND COALESCE(stripe_connect_status, 'not_started') <> 'disabled'`,
    [organizerId],
  );
}

/**
 * Best-effort live sync. Transient Stripe failures keep the last known DB row
 * (no 500). Unrecoverable retrieve errors (account_invalid / revoked / missing)
 * also keep the last known row — do NOT mark restricted.
 *
 * Why: `account_invalid` is indistinguishable from a test/live platform key
 * mismatch. Auto-restricting poisoned ready organizers (e.g. shared TiDB +
 * local sk_test browsing a public event page) and blocked paid checkout even
 * when Stripe live still had transfers active.
 *
 * Staff can still disable Connect explicitly; checkout fails safely if the
 * account is truly inaccessible at charge time.
 */
export async function syncOrganizerConnectFromStripe(
  pool: Pool,
  organizerId: number,
  stripe: Stripe,
  opts?: { forceWhileDisabled?: boolean },
): Promise<OrganizerConnectRow | null> {
  const row = await loadOrganizerConnectRow(pool, organizerId);
  if (!row?.stripe_account_id) return row;
  try {
    const account = await stripe.accounts.retrieve(row.stripe_account_id);
    await persistOrganizerConnectFromStripeAccount(
      pool,
      organizerId,
      account,
      undefined,
      { forceWhileDisabled: opts?.forceWhileDisabled },
    );
    return loadOrganizerConnectRow(pool, organizerId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[stripeConnect] sync failed for organizer ${organizerId}:`,
      msg,
    );
    if (isUnrecoverableStripeConnectAccountError(err)) {
      console.warn(
        `[stripeConnect] keeping last known Connect status for organizer ${organizerId} ` +
          `(${row.stripe_account_id}, status=${row.stripe_connect_status}) — ` +
          `retrieve failed (possible test/live key mismatch or revoked access); not auto-restricting`,
      );
    }
    return row;
  }
}

async function retrieveConnectAccountSafe(
  stripe: Stripe,
  accountId: string,
): Promise<Stripe.Account | null> {
  try {
    return await stripe.accounts.retrieve(accountId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[stripeConnect] accounts.retrieve failed (${accountId}):`,
      msg,
    );
    return null;
  }
}

/**
 * MX RFC: 12 chars = persona moral (company), 13 = persona física (individual).
 */
export function resolveMxEntityType(
  rfc?: string | null,
): "company" | "individual" {
  const cleaned = rfc?.trim().toUpperCase() ?? "";
  if (cleaned.length === 12) return "company";
  return "individual";
}

export type ConnectDashboardKind = "none" | "express" | "full" | "unknown";

/** Whether AccountSession may set disable_stripe_user_authentication. */
export function accountAllowsDisableStripeAuth(
  account: Stripe.Account,
): boolean {
  const reqCollection = account.controller?.requirement_collection;
  if (reqCollection === "application") return true;
  if (reqCollection === "stripe") return false;
  const dash = account.controller?.stripe_dashboard?.type;
  if (dash === "none") return true;
  if (account.type === "express" || account.type === "standard") return false;
  return false;
}

export function resolveConnectDashboardKind(
  account: Stripe.Account,
): ConnectDashboardKind {
  const dash = account.controller?.stripe_dashboard?.type;
  if (dash === "none" || dash === "express" || dash === "full") return dash;
  if (account.type === "express") return "express";
  if (account.type === "standard") return "full";
  if (account.type === "custom") return "none";
  return "unknown";
}

export function resolveConnectModelFromAccount(
  account: Stripe.Account,
): string | null {
  const meta = account.metadata?.connect_model?.trim();
  if (meta) return meta;
  const dash = resolveConnectDashboardKind(account);
  if (dash === "none") return "controller_none_transfers";
  if (dash === "express" || account.type === "express") return "express_transfers";
  return null;
}

export function isEmbeddedPreferredForAccount(account: Stripe.Account): boolean {
  const dash = resolveConnectDashboardKind(account);
  // AccountSession works for white-label and Express (without disable_stripe_user_authentication).
  // Prefer in-app embedded over a cold redirect for both.
  if (dash === "none" || dash === "express") return true;
  if (account.type === "express" || account.type === "custom") return true;
  return accountAllowsDisableStripeAuth(account);
}

/**
 * Create a marketplace recipient Connect account.
 * Prefers Accounts v2 recipient (dashboard: none), then v1 controller dashboard=none.
 * If the platform profile does not allow collecting requirements yourself, falls back
 * to Express transfers-only (embedded AccountSession still works; Express login for legacy).
 * Never requests card_payments (longer KYC).
 */
async function createRecipientConnectAccount(
  stripe: Stripe,
  row: OrganizerConnectRow,
): Promise<{
  accountId: string;
  model: "recipient_v2" | "controller_none_transfers" | "express_transfers";
}> {
  const legalName = row.legal_name?.trim() || undefined;
  const billingEmail = row.billing_email?.trim().toLowerCase() || row.email;
  const rfc = row.rfc?.trim().toUpperCase() || undefined;
  const entityType = resolveMxEntityType(rfc);
  const metadata = {
    organizer_id: String(row.organizer_id),
    atleita_platform: "athlete-hub",
    connect_model: "recipient_v2",
    connect_dashboard: "none",
    entity_type: entityType,
  };

  try {
    const v2Account = await stripe.v2.core.accounts.create({
      contact_email: billingEmail,
      display_name: legalName || billingEmail,
      dashboard: "none",
      identity: {
        country: "mx",
        entity_type: entityType,
        ...(entityType === "company" && legalName
          ? { business_details: { registered_name: legalName } }
          : {}),
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      defaults: {
        currency: "mxn",
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
        ...(legalName ? { profile: { doing_business_as: legalName } } : {}),
      },
      metadata,
      include: [
        "configuration.recipient",
        "requirements",
        "identity",
        "defaults",
      ],
    });
    console.info(
      `[stripeConnect] created v2 recipient (dashboard=none, ${entityType}) ${v2Account.id} for organizer ${row.organizer_id}`,
    );
    return { accountId: v2Account.id, model: "recipient_v2" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[stripeConnect] Accounts v2 recipient create failed; trying v1 controller dashboard=none: ${msg}`,
    );
  }

  try {
    const accountParams: Stripe.AccountCreateParams = {
      country: "MX",
      email: billingEmail,
      business_type: entityType,
      controller: {
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "application",
        stripe_dashboard: { type: "none" },
      },
      capabilities: {
        transfers: { requested: true },
      },
      business_profile: legalName ? { name: legalName } : undefined,
      metadata: {
        ...metadata,
        connect_model: "controller_none_transfers",
      },
    };

    if (entityType === "company" && rfc) {
      accountParams.company = {
        tax_id: rfc,
        ...(legalName ? { name: legalName } : {}),
      };
    }

    const account = await stripe.accounts.create(accountParams);
    console.info(
      `[stripeConnect] created v1 controller dashboard=none (${entityType}) ${account.id} for organizer ${row.organizer_id}`,
    );
    return { accountId: account.id, model: "controller_none_transfers" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[stripeConnect] controller dashboard=none create failed (platform profile may need “collect requirements”); falling back to Express transfers-only: ${msg}`,
    );
  }

  const expressParams: Stripe.AccountCreateParams = {
    type: "express",
    country: "MX",
    email: billingEmail,
    business_type: entityType,
    capabilities: {
      transfers: { requested: true },
    },
    business_profile: legalName ? { name: legalName } : undefined,
    metadata: {
      ...metadata,
      connect_model: "express_transfers",
      connect_dashboard: "express",
    },
  };

  if (entityType === "company" && rfc) {
    expressParams.company = {
      tax_id: rfc,
      ...(legalName ? { name: legalName } : {}),
    };
  }

  const expressAccount = await stripe.accounts.create(expressParams);
  console.info(
    `[stripeConnect] created Express transfers-only (${entityType}) ${expressAccount.id} for organizer ${row.organizer_id}`,
  );
  return { accountId: expressAccount.id, model: "express_transfers" };
}

async function ensureStripeConnectAccount(
  pool: Pool,
  stripe: Stripe,
  row: OrganizerConnectRow,
  mode: StripeConnectOnboardingMode,
): Promise<string> {
  if (row.stripe_account_id) {
    // Prefer verifying the existing account, but never drop the link or create
    // a second Connect account when retrieve fails (orphans the live acct_*).
    await retrieveConnectAccountSafe(stripe, row.stripe_account_id);
    return row.stripe_account_id;
  }

  const { accountId, model } = await createRecipientConnectAccount(stripe, row);

  try {
    await pool.query<ResultSetHeader>(
      `UPDATE organizers SET
         stripe_account_id = ?,
         stripe_connect_status = 'pending',
         stripe_connect_onboarding_mode = ?,
         stripe_connect_last_synced_at = NOW()
       WHERE id = ?`,
      [accountId, mode, row.organizer_id],
    );
  } catch (err) {
    // Avoid orphaned Connect accounts when the DB write fails after Stripe create.
    try {
      await stripe.accounts.del(accountId);
      console.warn(
        `[stripeConnect] rolled back orphan Connect account ${accountId} after DB link failure`,
      );
    } catch (delErr) {
      const delMsg = delErr instanceof Error ? delErr.message : String(delErr);
      console.error(
        `[stripeConnect] failed to delete orphan Connect account ${accountId} (${model}): ${delMsg}`,
      );
    }
    throw err;
  }

  return accountId;
}

export async function createOrganizerAccountSession(
  stripe: Stripe,
  accountId: string,
): Promise<{
  clientSecret: string;
  dashboard: ConnectDashboardKind;
  disableStripeAuth: boolean;
}> {
  const account = await stripe.accounts.retrieve(accountId);
  const dashboard = resolveConnectDashboardKind(account);
  let disableStripeAuth = accountAllowsDisableStripeAuth(account);

  const buildComponents = (disableAuth: boolean) => {
    const features = disableAuth
      ? { disable_stripe_user_authentication: true as const }
      : undefined;
    return {
      account_onboarding: { enabled: true, ...(features ? { features } : {}) },
      notification_banner: {
        enabled: true,
        ...(features ? { features } : {}),
      },
      account_management: {
        enabled: true,
        ...(features ? { features } : {}),
      },
      payouts: { enabled: true, ...(features ? { features } : {}) },
    };
  };

  try {
    const session = await stripe.accountSessions.create({
      account: accountId,
      components: buildComponents(disableStripeAuth),
    });
    if (!session.client_secret) {
      throw new Error("AccountSession missing client_secret");
    }
    return {
      clientSecret: session.client_secret,
      dashboard,
      disableStripeAuth,
    };
  } catch (err) {
    if (!disableStripeAuth) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[stripeConnect] AccountSession with disable_stripe_user_authentication failed; retrying without flag: ${msg}`,
    );
    disableStripeAuth = false;
    const session = await stripe.accountSessions.create({
      account: accountId,
      components: buildComponents(false),
    });
    if (!session.client_secret) {
      throw new Error("AccountSession missing client_secret");
    }
    return {
      clientSecret: session.client_secret,
      dashboard,
      disableStripeAuth,
    };
  }
}

async function createAccountManagementLink(
  stripe: Stripe,
  account: Stripe.Account,
  accountId: string,
  appUrl: string,
  context: { actor: ConnectAccountLinkActor; organizerId?: number },
): Promise<string> {
  const { returnUrl, refreshUrl } = buildConnectAccountLinkUrls(appUrl, context);
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: account.details_submitted ? "account_update" : "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
  return link.url;
}

async function createExpressDashboardLoginLink(
  stripe: Stripe,
  accountId: string,
): Promise<string> {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

export async function eventHasPaidActiveCategories(
  pool: Pool,
  eventId: number,
): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM event_categories
     WHERE event_id = ? AND is_active = 1 AND price_cents > 0
     LIMIT 1`,
    [eventId],
  );
  return rows.length > 0;
}

export type PaidCategoryMutationError = {
  status: number;
  error: string;
  code?: string;
};

/** Blocks paid category create/update on published events when organizer payout is not ready. */
export async function assertPaidCategoryMutationAllowed(
  pool: Pool,
  eventId: number,
  priceCents: number,
  stripe?: Stripe | null,
): Promise<PaidCategoryMutationError | null> {
  if (priceCents <= 0) return null;

  const [[event]] = await pool.query<RowDataPacket[]>(
    `SELECT status, organizer_id FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [eventId],
  );
  if (!event || event.status !== "published") return null;

  const payoutCheck = await assertOrganizerPayoutReadyForPaidEvent(
    pool,
    Number(event.organizer_id),
    stripe ?? null,
  );
  if (payoutCheck.ok === false) {
    return {
      status: 403,
      error:
        "Complete payout setup before adding or updating paid categories on a published event.",
      code: payoutCheck.code,
    };
  }
  return null;
}

export async function attachEventPaymentAvailability(
  pool: Pool,
  event: { id: number; status: string; organizer_id: number },
  stripe?: Stripe | null,
): Promise<{ has_paid_categories: boolean; payments_available: boolean }> {
  const has_paid_categories = await eventHasPaidActiveCategories(
    pool,
    event.id,
  );
  if (event.status !== "published" || !has_paid_categories) {
    return { has_paid_categories, payments_available: true };
  }
  const rail = await resolveOrganizerCheckoutDestination(
    pool,
    event.organizer_id,
    stripe ?? null,
  );
  return { has_paid_categories, payments_available: rail.ok };
}

/**
 * Rail-aware readiness: preferred ready, else fallback rail, else blocked.
 * Used for marketplace payments_available and checkout entry.
 */
export async function resolveOrganizerCheckoutDestination(
  pool: Pool,
  organizerId: number,
  stripe?: Stripe | null,
): Promise<
  | {
      ok: true;
      rail: PayoutRail;
      fallback: boolean;
      stripeAccountId?: string;
      serviceFeePercent: number;
    }
  | { ok: false; code: string; message: string }
> {
  let row = await loadOrganizerConnectRow(pool, organizerId);
  if (!row) {
    return {
      ok: false,
      code: "organizer_not_found",
      message: "Organizer not found",
    };
  }
  if (row.status === "suspended" || row.status === "inactive") {
    return {
      ok: false,
      code: "organizer_suspended",
      message: "Organizer account is not active",
    };
  }
  if (stripe && row.stripe_account_id) {
    row =
      (await syncOrganizerConnectFromStripe(pool, organizerId, stripe)) ?? row;
  }

  const manualOpts = await loadManualPayoutOpts(pool, organizerId);
  const payload = buildConnectStatusPayload(row, undefined, manualOpts);
  if (!payload.payoutReady || !payload.effectiveRail) {
    if (
      row.stripe_connect_status === "disabled" &&
      !payload.manualReady
    ) {
      return {
        ok: false,
        code: "organizer_payouts_disabled",
        message: "Organizer payouts are disabled",
      };
    }
    return {
      ok: false,
      code: "organizer_payouts_not_ready",
      message: "Organizer payout setup is not complete",
    };
  }

  const serviceFeePercent = resolveServiceFeePercentForRail({
    organizerFee: payload.stripeServiceFeePercent,
    rail: payload.effectiveRail,
  });

  if (payload.effectiveRail === "stripe") {
    if (!row.stripe_account_id || row.stripe_connect_status === "disabled") {
      return {
        ok: false,
        code: "organizer_payouts_not_ready",
        message: "Organizer Stripe account is missing",
      };
    }
    return {
      ok: true,
      rail: "stripe",
      fallback: payload.railFallback,
      stripeAccountId: row.stripe_account_id,
      serviceFeePercent,
    };
  }

  return {
    ok: true,
    rail: "manual",
    fallback: payload.railFallback,
    serviceFeePercent,
  };
}

export async function enrichStaffEventsWithPaymentAvailability<
  T extends { id: number; status: string; organizer_id?: number | null },
>(
  pool: Pool,
  events: T[],
  stripe?: Stripe | null,
): Promise<
  (T & { has_paid_categories: boolean; payments_available: boolean })[]
> {
  if (events.length === 0) return [];

  const ids = events.map((e) => e.id);
  const placeholders = ids.map(() => "?").join(", ");
  const [paidRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT event_id FROM event_categories
     WHERE event_id IN (${placeholders}) AND is_active = 1 AND price_cents > 0`,
    ids,
  );
  const paidSet = new Set(paidRows.map((r) => Number(r.event_id)));
  const organizerReadyCache = new Map<number, boolean>();

  return Promise.all(
    events.map(async (event) => {
      const has_paid_categories = paidSet.has(event.id);
      let payments_available = true;
      if (
        event.status === "published" &&
        has_paid_categories &&
        event.organizer_id != null
      ) {
        const organizerId = Number(event.organizer_id);
        if (!organizerReadyCache.has(organizerId)) {
          const check = await resolveOrganizerCheckoutDestination(
            pool,
            organizerId,
            stripe ?? null,
          );
          organizerReadyCache.set(organizerId, check.ok);
        }
        payments_available = organizerReadyCache.get(organizerId) ?? false;
      }
      return { ...event, has_paid_categories, payments_available };
    }),
  );
}

export async function assertOrganizerPayoutReadyForPaidEvent(
  pool: Pool,
  organizerId: number,
  stripe?: Stripe | null,
): Promise<
  | { ok: true; rail: "stripe"; stripeAccountId: string }
  | { ok: true; rail: "manual" }
  | { ok: false; code: string; message: string }
> {
  const dest = await resolveOrganizerCheckoutDestination(
    pool,
    organizerId,
    stripe,
  );
  if (dest.ok === false) {
    return {
      ok: false,
      code: dest.code,
      message: dest.message,
    };
  }
  if (dest.rail === "stripe") {
    if (!dest.stripeAccountId) {
      return {
        ok: false,
        code: "organizer_payouts_not_ready",
        message: "Organizer Stripe account is missing",
      };
    }
    return {
      ok: true,
      rail: "stripe",
      stripeAccountId: dest.stripeAccountId,
    };
  }
  return { ok: true, rail: "manual" };
}

export type CheckoutConnectResolution =
  | { mode: "destination"; stripeAccountId: string }
  | { mode: "platform" }
  | { mode: "blocked"; code: string; message: string };

/**
 * Destination Connect when Stripe rail is ready; platform charge (no transfer)
 * when manual SPEI rail is effective; blocked otherwise for Stripe PI paths.
 */
export async function resolveCheckoutConnectMode(
  pool: Pool,
  organizerId: number,
  stripe?: Stripe | null,
): Promise<CheckoutConnectResolution> {
  const dest = await resolveOrganizerCheckoutDestination(
    pool,
    organizerId,
    stripe,
  );
  if (dest.ok === false) {
    return { mode: "blocked", code: dest.code, message: dest.message };
  }
  if (dest.rail === "manual") {
    return { mode: "platform" };
  }
  if (dest.rail !== "stripe" || !dest.stripeAccountId) {
    return {
      mode: "blocked",
      code: "organizer_stripe_not_ready",
      message: "Organizer Stripe payout setup is not complete",
    };
  }
  return { mode: "destination", stripeAccountId: dest.stripeAccountId };
}

export function applyConnectToPaymentIntent(
  params: Stripe.PaymentIntentCreateParams,
  opts: { destinationAccountId: string; applicationFeeCents: number },
): Stripe.PaymentIntentCreateParams {
  return {
    ...params,
    transfer_data: { destination: opts.destinationAccountId },
    ...(opts.applicationFeeCents > 0
      ? { application_fee_amount: opts.applicationFeeCents }
      : {}),
  };
}

export async function handleStripeAccountUpdatedWebhook(
  pool: Pool,
  account: Stripe.Account,
): Promise<void> {
  const organizerIdRaw = account.metadata?.organizer_id;
  let organizerId = organizerIdRaw ? Number(organizerIdRaw) : NaN;

  if (!Number.isFinite(organizerId)) {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM organizers WHERE stripe_account_id = ? AND deleted_at IS NULL LIMIT 1",
      [account.id],
    );
    if (rows.length === 0) return;
    organizerId = Number(rows[0].id);
  }

  await persistOrganizerConnectFromStripeAccount(pool, organizerId, account);
}

export async function handleStripeConnectDeauthorized(
  pool: Pool,
  accountId: string,
): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE organizers SET
       stripe_connect_status = 'restricted',
       stripe_charges_enabled = 0,
       stripe_payouts_enabled = 0,
       stripe_onboarding_complete = 0,
       stripe_connect_last_synced_at = NOW()
     WHERE stripe_account_id = ? AND deleted_at IS NULL`,
    [accountId],
  );
}

function assertPayoutRole(role: string | null): boolean {
  // Keep aligned with Mercado Pago canManagePayouts (no promoter — bank/payout ops).
  return Boolean(role && ["owner", "finance", "organizer"].includes(role));
}

export function registerStripeConnectRoutes(
  app: Express,
  deps: StripeConnectDeps,
): void {
  const {
    pool,
    requireAdmin,
    requireOrganizer,
    getStripeClient,
    getStripePublishableKey,
    appUrl,
    getOrganizerMemberRole,
  } = deps;

  function publishableKey(): string {
    return (
      getStripePublishableKey?.()?.trim() ||
      process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
      process.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
      ""
    );
  }

  async function buildStatusResponse(organizerId: number) {
    let row = await loadOrganizerConnectRow(pool, organizerId);
    if (!row) return null;

    const stripe = getStripeClient();
    let requirements:
      | {
          currently_due: string[];
          eventually_due: string[];
          disabled_reason: string | null;
        }
      | undefined;
    let connectDashboard: ConnectDashboardKind | undefined;
    let connectModel: string | null | undefined;
    let embeddedPreferred: boolean | undefined;
    if (stripe && row.stripe_account_id) {
      row =
        (await syncOrganizerConnectFromStripe(pool, organizerId, stripe)) ??
        row;
    }
    if (stripe && row.stripe_account_id) {
      const account = await retrieveConnectAccountSafe(
        stripe,
        row.stripe_account_id,
      );
      if (account) {
        requirements = {
          currently_due: account.requirements?.currently_due ?? [],
          eventually_due: account.requirements?.eventually_due ?? [],
          disabled_reason: account.requirements?.disabled_reason ?? null,
        };
        connectDashboard = resolveConnectDashboardKind(account);
        connectModel = resolveConnectModelFromAccount(account);
        embeddedPreferred = isEmbeddedPreferredForAccount(account);
      }
    }

    const manualOpts = await loadManualPayoutOpts(pool, organizerId);
    return {
      ...buildConnectStatusPayload(row, requirements, manualOpts),
      ...(connectDashboard ? { connectDashboard } : {}),
      ...(connectModel !== undefined ? { connectModel } : {}),
      ...(embeddedPreferred !== undefined ? { embeddedPreferred } : {}),
    };
  }

  async function ensureAccountAndSession(
    organizerId: number,
    mode: StripeConnectOnboardingMode,
    opts?: { skipPlatformCheck?: boolean },
  ): Promise<
    | {
        ok: true;
        accountId: string;
        clientSecret: string;
        url: string | null;
        dashboard: ConnectDashboardKind;
        embeddedPreferred: boolean;
        payload: NonNullable<Awaited<ReturnType<typeof buildStatusResponse>>>;
      }
    | { ok: false; status: number; body: Record<string, unknown> }
  > {
    const stripe = getStripeClient();
    if (!stripe) {
      return {
        ok: false,
        status: 503,
        body: { error: "Payment service unavailable" },
      };
    }

    const row = await loadOrganizerConnectRow(pool, organizerId);
    if (!row) {
      return {
        ok: false,
        status: 404,
        body: { error: "Organizer not found" },
      };
    }

    if (!opts?.skipPlatformCheck) {
      const platformChecklist = buildPlatformPayoutChecklist(row);
      if (!platformChecklist.complete) {
        return {
          ok: false,
          status: 400,
          body: {
            error:
              "Complete your Atleita payout profile before starting Stripe onboarding",
            code: "platform_profile_incomplete",
          },
        };
      }
    }

    const accountId = await ensureStripeConnectAccount(
      pool,
      stripe,
      row,
      mode,
    );

    let clientSecret = "";
    let dashboard: ConnectDashboardKind = "unknown";
    let embeddedPreferred = false;
    try {
      const session = await createOrganizerAccountSession(stripe, accountId);
      clientSecret = session.clientSecret;
      dashboard = session.dashboard;
      embeddedPreferred =
        session.dashboard === "none" || session.disableStripeAuth;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[stripeConnect] AccountSession create failed; falling back to Account Links: ${msg}`,
      );
      try {
        const account = await stripe.accounts.retrieve(accountId);
        dashboard = resolveConnectDashboardKind(account);
        embeddedPreferred = isEmbeddedPreferredForAccount(account);
      } catch {
        /* ignore — Account Link fallback below */
      }
    }

    let url: string | null = null;
    try {
      const account = await stripe.accounts.retrieve(accountId);
      dashboard = resolveConnectDashboardKind(account);
      embeddedPreferred = isEmbeddedPreferredForAccount(account);
      url = await createAccountManagementLink(
        stripe,
        account,
        accountId,
        appUrl,
        mode === "admin"
          ? { actor: "admin", organizerId }
          : { actor: "organizer" },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[stripeConnect] Account Link fallback failed: ${msg}`);
    }

    if (!clientSecret && !url) {
      throw new Error("Could not start Connect onboarding session or link");
    }

    const payload = await buildStatusResponse(organizerId);
    if (!payload) {
      return {
        ok: false,
        status: 404,
        body: { error: "Organizer not found" },
      };
    }

    return {
      ok: true,
      accountId,
      clientSecret,
      url,
      dashboard,
      embeddedPreferred,
      payload,
    };
  }

  registerMercadoPagoRoutes(
    app,
    pool,
    requireOrganizer,
    async (organizerId) => {
      const status = await buildStatusResponse(organizerId);
      if (!status) throw new Error("Organizer not found");
      return status;
    },
    getOrganizerMemberRole,
  );

  registerOrganizerPayoutAccountRoutes(app, {
    pool,
    requireAdmin,
    requireOrganizer,
    getOrganizerMemberRole,
    buildStatusResponse: async (organizerId) => {
      const status = await buildStatusResponse(organizerId);
      if (!status) throw new Error("Organizer not found");
      return status;
    },
  });

  registerSpeiSettlementRoutes(app, {
    pool,
    requireAdmin,
    requireOrganizer,
    getOrganizerMemberRole,
  });

  app.get(
    "/api/organizer/payouts/status",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = req.auth!.organizerId;
      if (!organizerId) {
        return res.status(403).json({ error: "Organizer context missing" });
      }
      const memberRole = await getOrganizerMemberRole(
        pool,
        req.auth!.id,
        organizerId,
      );
      if (!assertPayoutRole(memberRole)) {
        return res
          .status(403)
          .json({ error: "Insufficient permissions for payouts" });
      }

      const payload = await buildStatusResponse(organizerId);
      if (!payload)
        return res.status(404).json({ error: "Organizer not found" });
      res.json({
        ...payload,
        stripePublishableKey: publishableKey() || undefined,
        embeddedOnboarding: payload.embeddedPreferred !== false,
      });
    },
  );

  app.patch(
    "/api/organizer/payouts/profile",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = req.auth!.organizerId;
      if (!organizerId) {
        return res.status(403).json({ error: "Organizer context missing" });
      }
      const memberRole = await getOrganizerMemberRole(
        pool,
        req.auth!.id,
        organizerId,
      );
      if (!assertPayoutRole(memberRole)) {
        return res
          .status(403)
          .json({ error: "Insufficient permissions for payouts" });
      }

      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      if (req.body?.legal_name != null) {
        updates.push("legal_name = ?");
        params.push(String(req.body.legal_name).trim().slice(0, 255) || null);
      }
      if (req.body?.billing_email != null) {
        const billingEmail = String(req.body.billing_email)
          .trim()
          .toLowerCase()
          .slice(0, 255);
        if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
          return res.status(400).json({ error: "Invalid billing_email" });
        }
        updates.push("billing_email = ?");
        params.push(billingEmail || null);
      }
      if (req.body?.rfc != null) {
        const rfc = String(req.body.rfc).trim().slice(0, 13).toUpperCase();
        if (rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
          return res.status(400).json({ error: "Invalid RFC format" });
        }
        updates.push("rfc = ?");
        params.push(rfc || null);
      }
      if (req.body?.tax_regime != null) {
        updates.push("tax_regime = ?");
        params.push(String(req.body.tax_regime).trim().slice(0, 10) || null);
      }
      if (req.body?.fee_presentation != null) {
        const fp = String(req.body.fee_presentation);
        if (fp !== "pass_through" && fp !== "absorb_all") {
          return res.status(400).json({ error: "Invalid fee_presentation" });
        }
        updates.push("fee_presentation = ?");
        params.push(fp);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      params.push(organizerId);
      await pool.query<ResultSetHeader>(
        `UPDATE organizers SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );

      const payload = await buildStatusResponse(organizerId);
      res.json(payload);
    },
  );

  app.post(
    "/api/organizer/payouts/accept-terms",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = req.auth!.organizerId;
      if (!organizerId) {
        return res.status(403).json({ error: "Organizer context missing" });
      }
      const memberRole = await getOrganizerMemberRole(
        pool,
        req.auth!.id,
        organizerId,
      );
      if (!memberRole || !["owner", "finance"].includes(memberRole)) {
        return res
          .status(403)
          .json({ error: "Only owner or finance can accept payout terms" });
      }

      await pool.query<ResultSetHeader>(
        `UPDATE organizers SET
           payout_terms_accepted_at = COALESCE(payout_terms_accepted_at, NOW()),
           payout_fee_acknowledged_at = COALESCE(payout_fee_acknowledged_at, NOW())
         WHERE id = ?`,
        [organizerId],
      );

      const payload = await buildStatusResponse(organizerId);
      res.json(payload);
    },
  );

  app.post(
    "/api/organizer/payouts/onboard",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = req.auth!.organizerId;
      if (!organizerId) {
        return res.status(403).json({ error: "Organizer context missing" });
      }
      const memberRole = await getOrganizerMemberRole(
        pool,
        req.auth!.id,
        organizerId,
      );
      if (!assertPayoutRole(memberRole)) {
        return res
          .status(403)
          .json({ error: "Insufficient permissions for payouts" });
      }

      try {
        const result = await ensureAccountAndSession(organizerId, "self");
        if (result.ok === false) {
          return res.status(result.status).json(result.body);
        }
        res.json({
          ...result.payload,
          url: result.url,
          clientSecret: result.clientSecret || undefined,
          stripePublishableKey: publishableKey() || undefined,
          embeddedOnboarding: Boolean(result.clientSecret),
          connectDashboard: result.dashboard,
          embeddedPreferred: result.embeddedPreferred,
        });
      } catch (err) {
        respondStripeConnectRouteError(res, err);
      }
    },
  );

  app.post(
    "/api/organizer/payouts/account-session",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = req.auth!.organizerId;
      if (!organizerId) {
        return res.status(403).json({ error: "Organizer context missing" });
      }
      const memberRole = await getOrganizerMemberRole(
        pool,
        req.auth!.id,
        organizerId,
      );
      if (!assertPayoutRole(memberRole)) {
        return res
          .status(403)
          .json({ error: "Insufficient permissions for payouts" });
      }

      try {
        const result = await ensureAccountAndSession(organizerId, "self");
        if (result.ok === false) {
          return res.status(result.status).json(result.body);
        }
        if (!result.clientSecret) {
          return res.status(502).json({
            error: "Could not create embedded onboarding session",
            code: "account_session_failed",
            url: result.url,
          });
        }
        res.json({
          clientSecret: result.clientSecret,
          publishableKey: publishableKey(),
          url: result.url,
          stripeAccountId: result.accountId,
          connectDashboard: result.dashboard,
          embeddedPreferred: result.embeddedPreferred,
        });
      } catch (err) {
        respondStripeConnectRouteError(res, err);
      }
    },
  );

  app.post(
    "/api/organizer/payouts/login",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = req.auth!.organizerId;
      if (!organizerId) {
        return res.status(403).json({ error: "Organizer context missing" });
      }
      const memberRole = await getOrganizerMemberRole(
        pool,
        req.auth!.id,
        organizerId,
      );
      if (!assertPayoutRole(memberRole)) {
        return res
          .status(403)
          .json({ error: "Insufficient permissions for payouts" });
      }

      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(503).json({ error: "Payment service unavailable" });
      }

      const row = await loadOrganizerConnectRow(pool, organizerId);
      if (!row?.stripe_account_id) {
        return res.status(400).json({ error: "No payout account linked" });
      }

      // White-label accounts (dashboard=none) have no Express Dashboard.
      // Keep payouts/account management inside Atleita via embedded components.
      try {
        const account = await stripe.accounts.retrieve(row.stripe_account_id);
        const dashType = resolveConnectDashboardKind(account);
        if (dashType === "none") {
          return res.status(400).json({
            error:
              "Payouts are managed inside Atleita. Use the payouts panel on this page.",
            code: "dashboard_internal",
          });
        }
        const url = await createExpressDashboardLoginLink(
          stripe,
          row.stripe_account_id,
        );
        res.json({ url });
      } catch (err) {
        respondStripeConnectRouteError(res, err);
      }
    },
  );

  app.post(
    "/api/organizer/payouts/sync",
    requireOrganizer,
    async (req: AuthedRequest, res) => {
      const organizerId = req.auth!.organizerId;
      if (!organizerId) {
        return res.status(403).json({ error: "Organizer context missing" });
      }
      const memberRole = await getOrganizerMemberRole(
        pool,
        req.auth!.id,
        organizerId,
      );
      if (!assertPayoutRole(memberRole)) {
        return res
          .status(403)
          .json({ error: "Insufficient permissions for payouts" });
      }

      const stripe = getStripeClient();
      const row = await loadOrganizerConnectRow(pool, organizerId);
      if (!row) {
        return res.status(404).json({ error: "Organizer not found" });
      }

      // MP-only organizers may have no Connect account — still return live status.
      if (stripe && row.stripe_account_id) {
        await syncOrganizerConnectFromStripe(pool, organizerId, stripe);
      }
      const payload = await buildStatusResponse(organizerId);
      res.json(payload);
    },
  );

  app.get(
    "/api/admin/organizers/:organizerId/connect",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      if (!Number.isFinite(organizerId)) {
        return res.status(400).json({ error: "Invalid organizer id" });
      }
      const payload = await buildStatusResponse(organizerId);
      if (!payload)
        return res.status(404).json({ error: "Organizer not found" });
      res.json(payload);
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/connect/onboard",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      if (!Number.isFinite(organizerId)) {
        return res.status(400).json({ error: "Invalid organizer id" });
      }

      try {
        const result = await ensureAccountAndSession(organizerId, "admin", {
          skipPlatformCheck: true,
        });
        if (result.ok === false) {
          return res.status(result.status).json(result.body);
        }
        res.json({
          ...result.payload,
          url: result.url,
          clientSecret: result.clientSecret || undefined,
          stripePublishableKey: publishableKey() || undefined,
          embeddedOnboarding: Boolean(result.clientSecret),
          connectDashboard: result.dashboard,
          embeddedPreferred: result.embeddedPreferred,
        });
      } catch (err) {
        respondStripeConnectRouteError(res, err);
      }
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/connect/sync",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      if (!Number.isFinite(organizerId)) {
        return res.status(400).json({ error: "Invalid organizer id" });
      }

      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(503).json({ error: "Payment service unavailable" });
      }

      const row = await loadOrganizerConnectRow(pool, organizerId);
      if (!row?.stripe_account_id) {
        return res
          .status(400)
          .json({ error: "No Stripe Connect account linked" });
      }

      await syncOrganizerConnectFromStripe(pool, organizerId, stripe);
      const payload = await buildStatusResponse(organizerId);
      res.json(payload);
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/connect/link-account",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      const accountId = String(req.body?.stripe_account_id ?? "").trim();
      if (!Number.isFinite(organizerId) || !accountId.startsWith("acct_")) {
        return res.status(400).json({
          error: "organizerId and stripe_account_id (acct_…) required",
        });
      }

      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(503).json({ error: "Payment service unavailable" });
      }

      const account = await stripe.accounts.retrieve(accountId);

      const [linked] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM organizers WHERE stripe_account_id = ? AND id != ? AND deleted_at IS NULL LIMIT 1",
        [accountId, organizerId],
      );
      if (linked.length > 0) {
        return res.status(409).json({
          error: "Stripe account already linked to another organizer",
        });
      }

      await persistOrganizerConnectFromStripeAccount(
        pool,
        organizerId,
        account,
        "admin",
      );
      const payload = await buildStatusResponse(organizerId);
      res.json(payload);
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/connect/disable",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      if (!Number.isFinite(organizerId)) {
        return res.status(400).json({ error: "Invalid organizer id" });
      }

      await pool.query<ResultSetHeader>(
        `UPDATE organizers SET
           stripe_connect_status = 'disabled',
           stripe_onboarding_complete = 0
         WHERE id = ?`,
        [organizerId],
      );

      const payload = await buildStatusResponse(organizerId);
      res.json(payload);
    },
  );

  app.post(
    "/api/admin/organizers/:organizerId/connect/enable",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const organizerId = Number(req.params.organizerId);
      if (!Number.isFinite(organizerId)) {
        return res.status(400).json({ error: "Invalid organizer id" });
      }

      const stripe = getStripeClient();
      const row = await loadOrganizerConnectRow(pool, organizerId);
      if (!row) return res.status(404).json({ error: "Organizer not found" });

      if (stripe && row.stripe_account_id) {
        // Clear disabled so persist can write the live Connect status again.
        await pool.query<ResultSetHeader>(
          `UPDATE organizers SET
             stripe_connect_status = 'pending',
             stripe_onboarding_complete = 0
           WHERE id = ? AND stripe_connect_status = 'disabled'`,
          [organizerId],
        );
        await syncOrganizerConnectFromStripe(pool, organizerId, stripe, {
          forceWhileDisabled: true,
        });
      } else {
        await pool.query<ResultSetHeader>(
          `UPDATE organizers SET stripe_connect_status = 'not_started' WHERE id = ?`,
          [organizerId],
        );
      }

      const payload = await buildStatusResponse(organizerId);
      res.json(payload);
    },
  );
}
