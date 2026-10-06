import type { EventCategory, WaiverSignatureInput } from "@shared/api";
import type { RegistrationWizardStep } from "@/store/slices/registrationCheckoutSlice";

const KEY = "atleita_registration_checkout";

/** Steps restored after Google/SSO return (payment orphan uses a separate path). */
const OAUTH_RESUME_STEPS: RegistrationWizardStep[] = [
  "auth",
  "waiver",
  "extras",
];

const IN_PROGRESS_STEPS: RegistrationWizardStep[] = [
  "auth",
  "waiver",
  "extras",
  "checkout",
];

export type PersistedRegistrationSession = {
  eventSlug: string;
  categoryId: number;
  idempotencyKey: string;
  paymentPublicUuid?: string;
  step?: RegistrationWizardStep;
  waiverAcceptance?: WaiverSignatureInput[];
  discountCode?: string;
  fieldValues?: Record<string, string | boolean>;
  /** User passed registration details and is on the payment sub-step. */
  checkoutPaymentReady?: boolean;
  simulationToken?: string;
  savedAt: number;
};

export function loadRegistrationSession(
  slug: string,
  categoryId: number,
): PersistedRegistrationSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedRegistrationSession;
    if (data.eventSlug !== slug || data.categoryId !== categoryId) return null;
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Pending OAuth return — wizard was on auth / waiver / extras (not payment orphan). */
export function loadPendingAuthRegistrationSession(
  slug: string,
): PersistedRegistrationSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedRegistrationSession;
    if (data.eventSlug !== slug) return null;
    const step = data.step ?? "auth";
    if (!OAUTH_RESUME_STEPS.includes(step)) return null;
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveRegistrationSession(session: Omit<PersistedRegistrationSession, "savedAt">) {
  try {
    const payload: PersistedRegistrationSession = { ...session, savedAt: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
}

export function clearRegistrationSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function loadAnyRegistrationSession(): PersistedRegistrationSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedRegistrationSession;
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function hasPendingRegistrationAuth(slug: string): boolean {
  return Boolean(loadPendingAuthRegistrationSession(slug));
}

/** True while the athlete still needs to finish the wizard (not after success). */
export function isInProgressRegistrationSession(
  session: PersistedRegistrationSession | null,
): session is PersistedRegistrationSession {
  if (!session) return false;
  return IN_PROGRESS_STEPS.includes(session.step ?? "auth");
}

/**
 * Flush registration wizard state to sessionStorage before leaving for OAuth.
 * Call synchronously on Google click so resume works after /sso-callback.
 */
export function persistRegistrationBeforeOAuth(args: {
  eventSlug: string;
  categoryId: number;
  step?: RegistrationWizardStep;
  idempotencyKey?: string;
}): void {
  const existing = loadAnyRegistrationSession();
  saveRegistrationSession({
    eventSlug: args.eventSlug,
    categoryId: args.categoryId,
    idempotencyKey:
      args.idempotencyKey ||
      existing?.idempotencyKey ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `oauth-${Date.now()}`),
    step: args.step ?? existing?.step ?? "auth",
    paymentPublicUuid: existing?.paymentPublicUuid,
    waiverAcceptance: existing?.waiverAcceptance,
    discountCode: existing?.discountCode,
    fieldValues: existing?.fieldValues,
    checkoutPaymentReady: existing?.checkoutPaymentReady,
    simulationToken: existing?.simulationToken,
  });
}

/**
 * While the registration wizard is open, never sync an existing Clerk session into a
 * Atleita JWT before Google redirect — that advances auth → next step and flashes the form.
 * Applies to solo and group wizards.
 */
export function shouldSkipClerkSilentResume(args: {
  registrationOpen: boolean;
  groupRegistrationOpen?: boolean;
  eventSlug?: string | null;
  categoryId?: number | null;
}): boolean {
  if (args.groupRegistrationOpen && args.eventSlug) return true;
  return Boolean(
    args.registrationOpen && args.eventSlug && args.categoryId != null,
  );
}

const GROUP_OAUTH_KEY = "atleita_group_registration_oauth";

export type PersistedGroupOAuthSession = {
  eventSlug: string;
  simulationToken?: string | null;
  savedAt: number;
};

/** Flush group wizard intent before OAuth so we can reopen after /sso-callback. */
export function persistGroupRegistrationBeforeOAuth(args: {
  eventSlug: string;
  simulationToken?: string | null;
}): void {
  try {
    const payload: PersistedGroupOAuthSession = {
      eventSlug: args.eventSlug,
      simulationToken: args.simulationToken ?? null,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(GROUP_OAUTH_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function loadPendingGroupAuthRegistrationSession(
  slug: string,
): PersistedGroupOAuthSession | null {
  try {
    const raw = sessionStorage.getItem(GROUP_OAUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedGroupOAuthSession;
    if (data.eventSlug !== slug) return null;
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(GROUP_OAUTH_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function loadAnyGroupOAuthSession(): PersistedGroupOAuthSession | null {
  try {
    const raw = sessionStorage.getItem(GROUP_OAUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedGroupOAuthSession;
    if (!data.eventSlug) return null;
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(GROUP_OAUTH_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearGroupRegistrationOAuthSession() {
  try {
    sessionStorage.removeItem(GROUP_OAUTH_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer event page when a registration wizard was open before OAuth. */
export function findPendingRegistrationReturnPath(
  returnTo?: string | null,
): string | null {
  if (returnTo?.startsWith("/events/")) {
    const slug = returnTo.match(/^\/events\/([^/]+)/)?.[1];
    if (
      slug &&
      (hasPendingRegistrationAuth(slug) ||
        Boolean(loadPendingGroupAuthRegistrationSession(slug)))
    ) {
      return returnTo;
    }
  }
  const saved = loadAnyRegistrationSession();
  if (isInProgressRegistrationSession(saved)) {
    return `/events/${saved.eventSlug}`;
  }
  const groupSaved = loadAnyGroupOAuthSession();
  if (groupSaved) {
    return `/events/${groupSaved.eventSlug}`;
  }
  return null;
}

/** Only resume an in-progress registration — never send athletes back after success. */
export function registrationReturnPathAfterProfile(): string | null {
  const saved = loadAnyRegistrationSession();
  if (isInProgressRegistrationSession(saved)) {
    return `/events/${saved.eventSlug}`;
  }
  const groupSaved = loadAnyGroupOAuthSession();
  if (groupSaved) {
    return `/events/${groupSaved.eventSlug}`;
  }
  return null;
}

export function categorySessionKey(category: EventCategory) {
  return { categoryId: category.id };
}
