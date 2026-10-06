import type { AppLocale } from "./i18n.js";

/** Stable auth error codes — client maps these to i18n; server also returns localized `error`. */
export type AuthErrorCode =
  | "valid_email_required"
  | "email_and_code_required"
  | "email_and_password_required"
  | "account_not_found"
  | "social_account_exists"
  | "account_exists"
  | "invalid_or_expired_code"
  | "invalid_credentials"
  | "otp_required"
  | "rate_limited"
  | "clerk_not_configured"
  | "invalid_clerk_session"
  | "profile_incomplete"
  | "staff_account_not_found"
  | "organizer_account_not_found"
  | "generic";

const AUTH_MESSAGES: Record<AppLocale, Record<AuthErrorCode, string>> = {
  en: {
    valid_email_required: "Valid email required",
    email_and_code_required: "Email and code required",
    email_and_password_required: "Email and password required",
    account_not_found:
      "No account found for that email. Create your profile first.",
    social_account_exists:
      "This email is linked to social sign-in. Continue with Google or your linked provider.",
    account_exists: "An account with this email already exists",
    invalid_or_expired_code: "Invalid or expired code",
    invalid_credentials: "Invalid email or password",
    otp_required:
      "This account uses email codes. Check your inbox for a one-time code.",
    rate_limited: "Too many attempts. Try again in a moment.",
    clerk_not_configured: "Social sign-in is not configured",
    invalid_clerk_session: "Invalid or expired social session. Please try again.",
    profile_incomplete:
      "Complete your profile (date of birth and gender) before registering for this category",
    staff_account_not_found: "No staff account found for that email.",
    organizer_account_not_found: "No organizer account found for that email.",
    generic: "Something went wrong. Please try again.",
  },
  es: {
    valid_email_required: "Se requiere un correo válido",
    email_and_code_required: "Se requieren correo y código",
    email_and_password_required: "Se requieren correo y contraseña",
    account_not_found:
      "No hay cuenta con ese correo. Crea tu perfil primero.",
    social_account_exists:
      "Este correo está vinculado a inicio de sesión social. Continúa con Google o tu proveedor.",
    account_exists: "Ya existe una cuenta con este correo",
    invalid_or_expired_code: "Código inválido o expirado",
    invalid_credentials: "Correo o contraseña incorrectos",
    otp_required:
      "Esta cuenta usa códigos por correo. Revisa tu bandeja para el código de un solo uso.",
    rate_limited: "Demasiados intentos. Intenta de nuevo en un momento.",
    clerk_not_configured: "El inicio de sesión social no está configurado",
    invalid_clerk_session:
      "Sesión social inválida o expirada. Intenta de nuevo.",
    profile_incomplete:
      "Completa tu perfil (fecha de nacimiento y género) antes de inscribirte en esta categoría",
    staff_account_not_found: "No hay cuenta de staff con ese correo.",
    organizer_account_not_found: "No hay cuenta de organizador con ese correo.",
    generic: "Algo salió mal. Intenta de nuevo.",
  },
};

export function authErrorMessage(
  locale: AppLocale,
  code: AuthErrorCode,
): string {
  return AUTH_MESSAGES[locale][code] ?? AUTH_MESSAGES.es.generic;
}

/** i18n key under `auth.errors.*` matching AuthErrorCode (snake → camel for nested keys). */
export const AUTH_ERROR_I18N_KEYS: Record<AuthErrorCode, string> = {
  valid_email_required: "auth.errors.validEmailRequired",
  email_and_code_required: "auth.errors.emailAndCodeRequired",
  email_and_password_required: "auth.errors.emailAndPasswordRequired",
  account_not_found: "auth.errors.accountNotFound",
  social_account_exists: "auth.errors.socialAccountExists",
  account_exists: "auth.errors.accountExists",
  invalid_or_expired_code: "auth.errors.invalidOrExpiredCode",
  invalid_credentials: "auth.errors.invalidCredentials",
  otp_required: "auth.athlete.otpRequiredLegacy",
  rate_limited: "auth.rateLimited",
  clerk_not_configured: "auth.errors.clerkNotConfigured",
  invalid_clerk_session: "auth.errors.invalidClerkSession",
  profile_incomplete: "auth.errors.profileIncomplete",
  staff_account_not_found: "auth.errors.staffAccountNotFound",
  organizer_account_not_found: "auth.errors.organizerAccountNotFound",
  generic: "auth.errors.generic",
};
