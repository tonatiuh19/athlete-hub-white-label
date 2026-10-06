/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  authErrorMessage,
  AUTH_ERROR_I18N_KEYS,
} from "../../shared/authMessages";
import { resolveRequestLocaleCandidates } from "../../shared/i18n";

describe("authMessages", () => {
  it("returns Spanish and English for each code", () => {
    expect(authErrorMessage("es", "account_not_found")).toMatch(/No hay cuenta/i);
    expect(authErrorMessage("en", "account_not_found")).toMatch(/No account found/i);
    expect(authErrorMessage("es", "invalid_credentials")).toMatch(/incorrectos/i);
    expect(authErrorMessage("en", "social_account_exists")).toMatch(/social sign-in/i);
  });

  it("maps every AuthErrorCode to an i18n key", () => {
    expect(Object.keys(AUTH_ERROR_I18N_KEYS).length).toBeGreaterThan(10);
    expect(AUTH_ERROR_I18N_KEYS.account_not_found).toBe("auth.errors.accountNotFound");
  });
});

describe("OTP locale vs body conflict (regression)", () => {
  it("DB en wins over body es for existing accounts", () => {
    expect(
      resolveRequestLocaleCandidates({
        dbLocale: "en",
        bodyLocale: "es",
        acceptLanguage: "es-MX",
      }),
    ).toBe("en");
  });

  it("browser Accept-Language used when no DB and no body", () => {
    expect(
      resolveRequestLocaleCandidates({
        dbLocale: null,
        bodyLocale: undefined,
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe("en");
  });
});
