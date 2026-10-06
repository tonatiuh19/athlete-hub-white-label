/**
 * Clerk browser SDK URL + runtime flags.
 * Custom Frontend API hosts (e.g. clerk.atleita.com) may not proxy /npm/* — load JS from CDN instead.
 */

export const CLERK_JS_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js";

/** Override with VITE_CLERK_JS_URL; otherwise always use the public CDN bundle. */
export function resolveClerkJsUrl(): string {
  const explicit = import.meta.env.VITE_CLERK_JS_URL?.trim();
  if (explicit) return explicit;
  return CLERK_JS_CDN_URL;
}

export function isClerkBypassCustomDomain(): boolean {
  const flag = import.meta.env.VITE_CLERK_BYPASS_CUSTOM_DOMAIN?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  // Default: load clerk-js from CDN (FAPI still comes from the publishable key).
  return true;
}
