/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  localeFromAcceptLanguage,
  normalizeLocale,
  resolveLocale,
  resolveRequestLocaleCandidates,
  mercadoPagoLocale,
  stripeElementsLocale,
} from "../../shared/i18n";

describe("locale helpers", () => {
  it("normalizes en/es tags and defaults unsupported to es", () => {
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("es-MX")).toBe("es");
    expect(normalizeLocale("fr")).toBe("es");
    expect(normalizeLocale(null)).toBe("es");
  });

  it("does not treat unsupported Accept-Language as es", () => {
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9")).toBeNull();
    expect(localeFromAcceptLanguage("en-GB,en;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("es,en;q=0.5")).toBe("es");
  });

  it("prefers DB preference over body locale for existing accounts", () => {
    expect(
      resolveRequestLocaleCandidates({
        bodyLocale: "es",
        dbLocale: "en",
        acceptLanguage: "es-MX",
      }),
    ).toBe("en");
  });

  it("uses body then Accept-Language when no DB preference", () => {
    expect(
      resolveRequestLocaleCandidates({
        bodyLocale: "en",
        dbLocale: null,
        acceptLanguage: "es-MX",
      }),
    ).toBe("en");
    expect(
      resolveRequestLocaleCandidates({
        bodyLocale: undefined,
        dbLocale: null,
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe("en");
    expect(
      resolveRequestLocaleCandidates({
        bodyLocale: undefined,
        dbLocale: null,
        acceptLanguage: "fr-FR",
      }),
    ).toBe("es");
  });

  it("resolveLocale skips empty strings", () => {
    expect(resolveLocale("", null, "en")).toBe("en");
  });

  it("maps payment SDK locales", () => {
    expect(mercadoPagoLocale("en")).toBe("en-US");
    expect(mercadoPagoLocale("es")).toBe("es-MX");
    expect(stripeElementsLocale("en")).toBe("en");
    expect(stripeElementsLocale("es")).toBe("es");
  });
});
