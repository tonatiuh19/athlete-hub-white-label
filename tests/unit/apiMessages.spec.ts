/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  apiErrorMessage,
  apiSuccessMessage,
  API_ERROR_I18N_KEYS,
  API_SUCCESS_I18N_KEYS,
} from "../../shared/apiMessages";
import { AUTH_ERROR_I18N_KEYS } from "../../shared/authMessages";

describe("apiMessages", () => {
  it("localizes register validation codes", () => {
    expect(apiErrorMessage("es", "names_required")).toMatch(/nombre y apellido/i);
    expect(apiErrorMessage("en", "names_required")).toMatch(/first and last name/i);
    expect(apiErrorMessage("es", "date_of_birth_required")).toMatch(/nacimiento/i);
    expect(apiErrorMessage("es", "password_policy")).toMatch(/contraseña/i);
    expect(apiErrorMessage("es", "invalid_gender")).toMatch(/género/i);
  });

  it("localizes common non-auth athlete errors", () => {
    expect(apiErrorMessage("es", "event_not_found")).toMatch(/evento no encontrado/i);
    expect(apiErrorMessage("es", "waiver_required")).toMatch(/carta responsiva/i);
    expect(apiErrorMessage("es", "category_sold_out")).toMatch(/agotada/i);
    expect(apiErrorMessage("es", "unauthorized")).toMatch(/no autorizado/i);
    expect(apiErrorMessage("en", "session_expired")).toMatch(/session expired/i);
  });

  it("localizes success acknowledgments", () => {
    expect(apiSuccessMessage("es", "verification_code_sent")).toMatch(/código de verificación/i);
    expect(apiSuccessMessage("en", "verification_code_sent")).toMatch(/verification code sent/i);
    expect(apiSuccessMessage("es", "forgot_password_instructions_sent")).toMatch(
      /si existe una cuenta/i,
    );
  });

  it("maps every ApiErrorCode to an i18n key including auth subset", () => {
    expect(API_ERROR_I18N_KEYS.event_not_found).toBe("api.errors.eventNotFound");
    expect(API_ERROR_I18N_KEYS.account_not_found).toBe(
      AUTH_ERROR_I18N_KEYS.account_not_found,
    );
    expect(API_SUCCESS_I18N_KEYS.verification_code_sent).toBe(
      "api.success.verificationCodeSent",
    );
  });
});
