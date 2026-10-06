export type StripeConnectStatus =
  | "not_started"
  | "pending"
  | "action_required"
  | "ready"
  | "restricted"
  | "disabled";

export type StripeConnectOnboardingMode = "self" | "admin";

/** How the Connect account was provisioned for destination payouts. */
export type StripeConnectAccountModel =
  | "recipient_v2"
  | "controller_none_transfers"
  | "express_transfers";

export type { FeePresentation } from "./checkoutBreakdown.js";
import type { FeePresentation } from "./checkoutBreakdown.js";

export interface OrganizerPayoutProfileInput {
  legal_name?: string | null;
  billing_email?: string | null;
  rfc?: string | null;
  tax_regime?: string | null;
  payout_terms_accepted_at?: string | Date | null;
  payout_fee_acknowledged_at?: string | Date | null;
}

export interface OrganizerConnectState extends OrganizerPayoutProfileInput {
  organizer_id: number;
  email: string;
  service_fee_percent: number;
  fee_presentation: FeePresentation;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | number;
  stripe_connect_status: StripeConnectStatus;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  stripe_connect_onboarded_at?: string | null;
  stripe_connect_last_synced_at?: string | null;
  stripe_connect_onboarding_mode?: StripeConnectOnboardingMode | null;
  requirements_currently_due?: string[];
  requirements_eventually_due?: string[];
  requirements_disabled_reason?: string | null;
}

export interface PlatformPayoutChecklistItem {
  key: string;
  complete: boolean;
  required: boolean;
}

export interface PlatformPayoutChecklist {
  items: PlatformPayoutChecklistItem[];
  complete: boolean;
}

export interface StripePayoutChecklist {
  items: PlatformPayoutChecklistItem[];
  complete: boolean;
}

export function buildPlatformPayoutChecklist(
  profile: OrganizerPayoutProfileInput,
): PlatformPayoutChecklist {
  const items: PlatformPayoutChecklistItem[] = [
    {
      key: "legal_name",
      complete: Boolean(profile.legal_name?.trim()),
      required: true,
    },
    {
      key: "rfc",
      // Collected by Stripe during provider onboarding when needed.
      complete: Boolean(profile.rfc?.trim()),
      required: false,
    },
    {
      key: "billing_email",
      complete: Boolean(profile.billing_email?.trim()),
      required: true,
    },
    {
      key: "payout_terms",
      complete: Boolean(profile.payout_terms_accepted_at),
      required: true,
    },
    {
      key: "fee_acknowledged",
      complete: Boolean(profile.payout_fee_acknowledged_at),
      required: true,
    },
  ];
  return {
    items,
    complete: items.filter((i) => i.required).every((i) => i.complete),
  };
}

/**
 * Recipient / destination-charge checklist.
 * Organizers receive transfers — they do NOT need card_payments / charges_enabled.
 */
export function buildStripePayoutChecklist(state: {
  stripe_account_id?: string | null;
  stripe_details_submitted: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  requirements_currently_due?: string[];
  requirements_eventually_due?: string[];
}): StripePayoutChecklist {
  const due = state.requirements_currently_due ?? [];
  const eventuallyDue = state.requirements_eventually_due ?? [];
  const hasAccount = Boolean(state.stripe_account_id);
  const items: PlatformPayoutChecklistItem[] = [
    {
      key: "account_created",
      complete: hasAccount,
      required: true,
    },
    {
      key: "business_details",
      complete: state.stripe_details_submitted,
      required: true,
    },
    {
      key: "identity",
      complete: hasAccount && !due.some((d) => d.includes("verification")),
      required: true,
    },
    {
      key: "bank_account",
      complete: hasAccount && !due.some((d) => d.includes("external_account")),
      required: true,
    },
    {
      key: "transfers_enabled",
      complete: state.stripe_payouts_enabled,
      required: true,
    },
    {
      key: "future_requirements",
      complete: eventuallyDue.length === 0,
      required: false,
    },
  ];
  return {
    items,
    complete:
      hasAccount &&
      state.stripe_payouts_enabled &&
      due.length === 0,
  };
}

export function isPlatformPayoutProfileComplete(
  profile: OrganizerPayoutProfileInput,
): boolean {
  return buildPlatformPayoutChecklist(profile).complete;
}

/**
 * Organizer can receive destination transfers when Atleita profile is complete,
 * Connect status is ready, and payouts/transfers are enabled.
 * charges_enabled is NOT required (recipient / transfers-only accounts).
 */
export function isOrganizerPayoutReady(state: {
  stripe_connect_status: StripeConnectStatus;
  stripe_account_id?: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  requirements_currently_due?: string[];
  platform_profile_complete: boolean;
}): boolean {
  if (!state.platform_profile_complete) return false;
  if (state.stripe_connect_status !== "ready") return false;
  if (!state.stripe_account_id) return false;
  if (!state.stripe_payouts_enabled) return false;
  if ((state.requirements_currently_due?.length ?? 0) > 0) return false;
  return true;
}

/**
 * Derive Connect status for marketplace recipients.
 * Ready = can receive payouts/transfers; card charging capability is irrelevant.
 *
 * Note: Stripe sets `requirements.disabled_reason` during normal onboarding
 * (e.g. requirements.past_due). That is NOT a hard restriction — organizers
 * should complete verification, not contact support.
 */
export function deriveStripeConnectStatusFromCapabilities(opts: {
  disabled: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  currently_due: string[];
  disabled_reason?: string | null;
  has_account: boolean;
  /** When known, prefer transfers capability over legacy charges_enabled. */
  transfers_active?: boolean | null;
}): StripeConnectStatus {
  if (opts.disabled) return "disabled";
  if (!opts.has_account) return "not_started";

  const reason = opts.disabled_reason?.trim() || "";
  if (reason) {
    // Hard / platform blocks — organizer cannot self-serve.
    if (
      reason.startsWith("rejected.") ||
      reason === "listed" ||
      reason === "platform_paused" ||
      reason === "other"
    ) {
      return "restricted";
    }
    // Normal onboarding / review states — actionable in Atleita.
    if (
      reason.includes("pending_verification") ||
      reason === "under_review"
    ) {
      return opts.currently_due.length > 0 ? "action_required" : "pending";
    }
    // requirements.past_due and similar → finish verification below.
    return "action_required";
  }

  const canReceive =
    opts.transfers_active === true ||
    (opts.transfers_active == null && opts.payouts_enabled);

  if (canReceive && opts.currently_due.length === 0 && opts.payouts_enabled) {
    return "ready";
  }
  if (opts.details_submitted || opts.currently_due.length > 0)
    return "action_required";
  return "pending";
}

/** Actor that started Stripe Connect Account Links (hosted onboarding / update). */
export type ConnectAccountLinkActor = "organizer" | "admin";

/**
 * Return/refresh URLs for Stripe Account Links.
 * Organizers land on Pagos → Configurar; admins land on People → organizer Connect panel.
 */
export function buildConnectAccountLinkUrls(
  appUrl: string,
  context: { actor: ConnectAccountLinkActor; organizerId?: number },
): { returnUrl: string; refreshUrl: string } {
  const base = appUrl.replace(/\/$/, "");
  if (context.actor === "admin") {
    const id = context.organizerId;
    if (id != null && Number.isFinite(id) && id > 0) {
      const path = `/staff/people?tab=organizers&organizerId=${id}`;
      return {
        returnUrl: `${base}${path}&connect=return`,
        refreshUrl: `${base}${path}&connect=refresh`,
      };
    }
    return {
      returnUrl: `${base}/staff/people?tab=organizers&connect=return`,
      refreshUrl: `${base}/staff/people?tab=organizers&connect=refresh`,
    };
  }
  return {
    returnUrl: `${base}/staff/payments?tab=setup&connect=return`,
    refreshUrl: `${base}/staff/payments?tab=setup&connect=refresh`,
  };
}
