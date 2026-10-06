import { es, enUS } from "date-fns/locale";
import { normalizeLocale } from "@shared/i18n";

export function getDateFnsLocale(language: string) {
  return normalizeLocale(language) === "en" ? enUS : es;
}

export function getNumberLocale(language: string) {
  return normalizeLocale(language) === "en" ? "en-US" : "es-MX";
}

/** Stripe Connect embedded components locale (must match their supported codes). */
export function getStripeConnectLocale(language: string) {
  return normalizeLocale(language) === "en" ? "en-US" : "es-MX";
}
