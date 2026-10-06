/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import i18n from "../../app/i18n";
import {
  extractApiErrorMessage,
  extractApiSuccessMessage,
} from "../../app/utils/apiError";

describe("extractApiErrorMessage localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("translates by code", () => {
    expect(
      extractApiErrorMessage({
        response: {
          data: {
            error: "No account found for that email.",
            code: "account_not_found",
          },
        },
      }),
    ).toMatch(/No hay cuenta/i);
  });

  it("translates non-auth codes", () => {
    expect(
      extractApiErrorMessage({
        response: {
          data: { error: "Event not found", code: "event_not_found" },
        },
      }),
    ).toMatch(/Evento no encontrado/i);
    expect(
      extractApiErrorMessage({
        response: {
          data: {
            error: "First and last name required",
            code: "names_required",
          },
        },
      }),
    ).toMatch(/nombre y apellido/i);
  });

  it("translates known English string without code", () => {
    expect(
      extractApiErrorMessage({
        response: { data: { error: "Invalid or expired code" } },
      }),
    ).toMatch(/inválido o expirado/i);
    expect(
      extractApiErrorMessage({
        response: { data: { error: "Waiver acceptance required" } },
      }),
    ).toMatch(/carta responsiva/i);
  });

  it("uses generic Spanish fallback", () => {
    expect(extractApiErrorMessage({})).toMatch(/Algo salió mal/i);
  });

  it("translates rate_limited with seconds", async () => {
    await i18n.changeLanguage("en");
    expect(
      extractApiErrorMessage({
        response: {
          data: { code: "rate_limited", error: "Too many", retryAfterSec: 42 },
        },
      }),
    ).toMatch(/42/);
  });

  it("translates success codes", () => {
    expect(
      extractApiSuccessMessage({
        message: "Verification code sent.",
        code: "verification_code_sent",
      }),
    ).toMatch(/Código de verificación/i);
  });
});
