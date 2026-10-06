/** Supported app locales — Spanish (Mexico) default, English US */
export type AppLocale = "es" | "en";

export const DEFAULT_LOCALE: AppLocale = "es";
export const SUPPORTED_LOCALES: AppLocale[] = ["es", "en"];

const LOCALE_STORAGE_KEY = "atleita_locale";

/** Normalize browser / DB / header values to es | en */
export function normalizeLocale(input?: string | null): AppLocale {
  if (!input) return DEFAULT_LOCALE;
  const tag = input.trim().toLowerCase();
  if (tag.startsWith("en")) return "en";
  if (tag.startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}

/**
 * Parse Accept-Language for the first *supported* tag.
 * Unsupported languages (e.g. fr) return null — do not collapse to DEFAULT_LOCALE.
 */
export function localeFromAcceptLanguage(
  header?: string | null,
): AppLocale | null {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.split(";")[0]?.trim()).filter(Boolean);
  for (const part of parts) {
    const tag = part.toLowerCase();
    if (tag.startsWith("en")) return "en";
    if (tag.startsWith("es")) return "es";
  }
  return null;
}

/** Browser navigator.language with es default */
export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(navigator.language);
}

export function getStoredLocale(): AppLocale | null {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored ? normalizeLocale(stored) : null;
}

export function setStoredLocale(locale: AppLocale): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function resolveLocale(
  ...candidates: (string | null | undefined)[]
): AppLocale {
  for (const c of candidates) {
    if (c != null && String(c).trim() !== "") return normalizeLocale(c);
  }
  return DEFAULT_LOCALE;
}

/**
 * Resolve locale for API requests / emails.
 * - Existing account (`dbLocale` set): DB preference wins over transient UI `bodyLocale`.
 * - New account / no DB: body → Accept-Language → default.
 */
export function resolveRequestLocaleCandidates(opts: {
  bodyLocale?: string | null;
  dbLocale?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  const accept = localeFromAcceptLanguage(opts.acceptLanguage);
  const db = opts.dbLocale != null && String(opts.dbLocale).trim() !== ""
    ? opts.dbLocale
    : null;
  if (db) {
    return resolveLocale(db, opts.bodyLocale, accept);
  }
  return resolveLocale(opts.bodyLocale, accept);
}

/** Locale to send on auth/register bodies — omit when nothing explicit so Accept-Language can win. */
export function explicitRequestLocale(): AppLocale | undefined {
  return getStoredLocale() ?? undefined;
}

export const LOCALE_LABELS: Record<AppLocale, string> = {
  es: "Español",
  en: "English",
};

export const LOCALE_HTML_LANG: Record<AppLocale, string> = {
  es: "es-MX",
  en: "en",
};

/** Mercado Pago Brick / Stripe Elements locale tags from app locale */
export function mercadoPagoLocale(locale: AppLocale): "es-MX" | "en-US" {
  return locale === "en" ? "en-US" : "es-MX";
}

export function stripeElementsLocale(locale: AppLocale): "es" | "en" {
  return locale === "en" ? "en" : "es";
}
