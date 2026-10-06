// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearGroupRegistrationOAuthSession,
  clearRegistrationSession,
  loadAnyGroupOAuthSession,
  loadPendingAuthRegistrationSession,
  loadPendingGroupAuthRegistrationSession,
  loadRegistrationSession,
  persistGroupRegistrationBeforeOAuth,
  persistRegistrationBeforeOAuth,
  saveRegistrationSession,
  shouldSkipClerkSilentResume,
} from "@/utils/registrationSessionStorage";
import { WAIVER_ACCEPTANCE_SIGNATURE } from "@shared/waiverConstants";

const SLUG = "mock-marathon-2026";
const CATEGORY_ID = 10;

describe("smoke: registration session persistence (3DS / orphan resume)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));
  });

  it("saves and restores checkout session for same event + category", () => {
    saveRegistrationSession({
      eventSlug: SLUG,
      categoryId: CATEGORY_ID,
      idempotencyKey: "idem-mock-001",
      step: "checkout",
      paymentPublicUuid: "pay-mock-uuid-001",
      waiverAcceptance: [
        { waiverId: 1, signature: WAIVER_ACCEPTANCE_SIGNATURE, waiverVersion: 2 },
      ],
      discountCode: "EARLY10",
      fieldValues: { shirt_size: "M" },
      checkoutPaymentReady: true,
    });

    const restored = loadRegistrationSession(SLUG, CATEGORY_ID);
    expect(restored?.paymentPublicUuid).toBe("pay-mock-uuid-001");
    expect(restored?.step).toBe("checkout");
    expect(restored?.waiverAcceptance?.[0].waiverVersion).toBe(2);
    expect(restored?.checkoutPaymentReady).toBe(true);
  });

  it("does not restore session for a different category (prevents cross-category resume)", () => {
    saveRegistrationSession({
      eventSlug: SLUG,
      categoryId: CATEGORY_ID,
      idempotencyKey: "idem-mock-001",
      step: "checkout",
    });
    expect(loadRegistrationSession(SLUG, 99)).toBeNull();
  });

  it("expires sessions older than 24 hours", () => {
    saveRegistrationSession({
      eventSlug: SLUG,
      categoryId: CATEGORY_ID,
      idempotencyKey: "idem-old",
      step: "checkout",
    });
    vi.setSystemTime(new Date("2026-06-06T12:00:01.000Z"));
    expect(loadRegistrationSession(SLUG, CATEGORY_ID)).toBeNull();
    expect(sessionStorage.getItem("atleita_registration_checkout")).toBeNull();
  });

  it("loadPendingAuthRegistrationSession finds auth step for slug only", () => {
    saveRegistrationSession({
      eventSlug: SLUG,
      categoryId: CATEGORY_ID,
      idempotencyKey: "idem-auth",
      step: "auth",
    });
    expect(loadPendingAuthRegistrationSession(SLUG)?.categoryId).toBe(CATEGORY_ID);
    expect(loadPendingAuthRegistrationSession("other-slug")).toBeNull();
  });

  it("loadPendingAuthRegistrationSession finds waiver/extras but ignores checkout", () => {
    saveRegistrationSession({
      eventSlug: SLUG,
      categoryId: CATEGORY_ID,
      idempotencyKey: "idem-waiver",
      step: "waiver",
    });
    expect(loadPendingAuthRegistrationSession(SLUG)?.step).toBe("waiver");

    saveRegistrationSession({
      eventSlug: SLUG,
      categoryId: CATEGORY_ID,
      idempotencyKey: "idem-checkout",
      step: "checkout",
    });
    expect(loadPendingAuthRegistrationSession(SLUG)).toBeNull();
  });

  it("clearRegistrationSession removes persisted checkout after successful confirm", () => {
    saveRegistrationSession({
      eventSlug: SLUG,
      categoryId: CATEGORY_ID,
      idempotencyKey: "idem-done",
      step: "result",
    });
    clearRegistrationSession();
    expect(loadRegistrationSession(SLUG, CATEGORY_ID)).toBeNull();
  });

  it("persistRegistrationBeforeOAuth flushes auth step for Google resume", () => {
    persistRegistrationBeforeOAuth({
      eventSlug: SLUG,
      categoryId: CATEGORY_ID,
      step: "auth",
    });
    expect(loadPendingAuthRegistrationSession(SLUG)?.categoryId).toBe(CATEGORY_ID);
    expect(loadPendingAuthRegistrationSession(SLUG)?.step).toBe("auth");
  });

  it("shouldSkipClerkSilentResume when solo or group wizard is open", () => {
    expect(
      shouldSkipClerkSilentResume({
        registrationOpen: true,
        eventSlug: SLUG,
        categoryId: CATEGORY_ID,
      }),
    ).toBe(true);
    expect(
      shouldSkipClerkSilentResume({
        registrationOpen: false,
        groupRegistrationOpen: true,
        eventSlug: SLUG,
      }),
    ).toBe(true);
    expect(
      shouldSkipClerkSilentResume({
        registrationOpen: false,
        groupRegistrationOpen: false,
        eventSlug: SLUG,
        categoryId: CATEGORY_ID,
      }),
    ).toBe(false);
    expect(
      shouldSkipClerkSilentResume({
        registrationOpen: true,
        eventSlug: SLUG,
        categoryId: null,
      }),
    ).toBe(false);
  });

  it("persistGroupRegistrationBeforeOAuth restores pending group OAuth session", () => {
    persistGroupRegistrationBeforeOAuth({
      eventSlug: SLUG,
      simulationToken: "sim-token",
    });
    expect(loadPendingGroupAuthRegistrationSession(SLUG)?.simulationToken).toBe("sim-token");
    expect(loadAnyGroupOAuthSession()?.eventSlug).toBe(SLUG);
    expect(loadPendingGroupAuthRegistrationSession("other")).toBeNull();
    clearGroupRegistrationOAuthSession();
    expect(loadAnyGroupOAuthSession()).toBeNull();
  });
});
