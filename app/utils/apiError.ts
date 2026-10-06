import i18n from "@/i18n";
import {
  API_ERROR_I18N_KEYS,
  API_ERROR_STRING_TO_CODE,
  API_SUCCESS_I18N_KEYS,
  type ApiErrorCode,
  type ApiSuccessCode,
} from "@shared/apiMessages";
import {
  AUTH_ERROR_I18N_KEYS,
  type AuthErrorCode,
} from "@shared/authMessages";

/** Normalize API / axios errors to a user-visible string (never render objects in UI). */
export function extractApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (typeof err === "string" && err.trim()) {
    return translateKnownApiMessage(err.trim()) ?? err.trim();
  }

  const ax = err as {
    response?: { data?: unknown };
    message?: string;
  };

  const data = ax?.response?.data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : null;
    if (code && code in API_ERROR_I18N_KEYS) {
      const key = API_ERROR_I18N_KEYS[code as ApiErrorCode];
      if (code === "rate_limited") {
        return i18n.t(key, {
          seconds: Number(record.retryAfterSec ?? 60),
        });
      }
      return i18n.t(key);
    }
    // Legacy auth-only map (subset already covered by API_ERROR_I18N_KEYS)
    if (code && code in AUTH_ERROR_I18N_KEYS) {
      return i18n.t(AUTH_ERROR_I18N_KEYS[code as AuthErrorCode]);
    }
    const nested = record.error;
    if (typeof nested === "string" && nested.trim()) {
      return translateKnownApiMessage(nested.trim()) ?? nested.trim();
    }
    if (nested && typeof nested === "object") {
      const msg = (nested as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) {
        return translateKnownApiMessage(msg.trim()) ?? msg.trim();
      }
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return (
        translateKnownApiMessage(record.message.trim()) ??
        record.message.trim()
      );
    }
  }

  if (typeof ax?.message === "string" && ax.message.trim()) {
    return translateKnownApiMessage(ax.message.trim()) ?? ax.message.trim();
  }
  const fb = translateKnownApiMessage(fallback);
  return fb ?? (fallback === "Something went wrong. Please try again."
    ? i18n.t("auth.errors.generic")
    : fallback);
}

/** Localize known API success `message` / `code` payloads. */
export function extractApiSuccessMessage(
  data: unknown,
  fallback?: string,
): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : null;
    if (code && code in API_SUCCESS_I18N_KEYS) {
      return i18n.t(API_SUCCESS_I18N_KEYS[code as ApiSuccessCode]);
    }
    if (typeof record.message === "string" && record.message.trim()) {
      const mapped = translateKnownSuccessMessage(record.message.trim());
      if (mapped) return mapped;
      return record.message.trim();
    }
  }
  return fallback ?? i18n.t("api.success.verificationCodeSent");
}

function translateKnownSuccessMessage(message: string): string | null {
  if (/verification code sent/i.test(message) || /código de verificación enviado/i.test(message)) {
    return i18n.t(API_SUCCESS_I18N_KEYS.verification_code_sent);
  }
  if (
    /if an account exists for that email/i.test(message) ||
    /si existe una cuenta con ese correo/i.test(message)
  ) {
    return i18n.t(API_SUCCESS_I18N_KEYS.forgot_password_instructions_sent);
  }
  return null;
}

/** Map well-known English/Spanish server strings when `code` is missing. */
function translateKnownApiMessage(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [re, code] of API_ERROR_STRING_TO_CODE) {
    if (re.test(lower) || re.test(message)) {
      if (code === "rate_limited") {
        return i18n.t(API_ERROR_I18N_KEYS[code], { seconds: 60 });
      }
      return i18n.t(API_ERROR_I18N_KEYS[code]);
    }
  }
  // Auth-only legacy patterns still covered via API_ERROR_STRING_TO_CODE + authMessages
  const authMap: Array<[RegExp, AuthErrorCode]> = [
    [/valid email required/i, "valid_email_required"],
    [/se requiere un correo válido/i, "valid_email_required"],
    [/email and code required/i, "email_and_code_required"],
    [/email and password required/i, "email_and_password_required"],
    [/no account found for that email/i, "account_not_found"],
    [/no hay cuenta con ese correo/i, "account_not_found"],
    [/linked to social sign-in/i, "social_account_exists"],
    [/vinculado a inicio de sesión social/i, "social_account_exists"],
    [/already exists/i, "account_exists"],
    [/ya existe una cuenta/i, "account_exists"],
    [/invalid or expired code/i, "invalid_or_expired_code"],
    [/código inválido o expirado/i, "invalid_or_expired_code"],
    [/invalid email or password/i, "invalid_credentials"],
    [/correo o contraseña incorrectos/i, "invalid_credentials"],
    [/uses email codes/i, "otp_required"],
    [/usa códigos por correo/i, "otp_required"],
    [/too many attempts/i, "rate_limited"],
    [/demasiados intentos/i, "rate_limited"],
    [/clerk is not configured|social sign-in is not configured/i, "clerk_not_configured"],
    [/invalid or expired social session/i, "invalid_clerk_session"],
    [/no staff account found/i, "staff_account_not_found"],
    [/no hay cuenta de staff/i, "staff_account_not_found"],
    [/no organizer account found/i, "organizer_account_not_found"],
    [/no hay cuenta de organizador/i, "organizer_account_not_found"],
    [/complete your profile \(date of birth/i, "profile_incomplete"],
    [/completa tu perfil \(fecha de nacimiento/i, "profile_incomplete"],
  ];
  for (const [re, code] of authMap) {
    if (re.test(lower) || re.test(message)) {
      if (code === "rate_limited") {
        return i18n.t(AUTH_ERROR_I18N_KEYS[code], { seconds: 60 });
      }
      return i18n.t(AUTH_ERROR_I18N_KEYS[code]);
    }
  }
  return null;
}
