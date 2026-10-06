import { apexHostnameFromAppUrl } from "./apexHost.js";

/** Event vanity hostnames: `{subdomain}.{apex}` (globally unique, immutable). */

export const EVENT_SUBDOMAIN_MAX_LEN = 63;
export const EVENT_SUBDOMAIN_MIN_LEN = 3;

/** Apex / product hosts that must never be claimed as event subdomains. */
export const EVENT_SUBDOMAIN_RESERVED = new Set([
  "www",
  "api",
  "app",
  "admin",
  "staff",
  "portal",
  "cdn",
  "static",
  "assets",
  "mail",
  "email",
  "smtp",
  "ftp",
  "ssh",
  "vpn",
  "dev",
  "test",
  "staging",
  "sandbox",
  "embed",
  "widget",
  "docs",
  "help",
  "support",
  "status",
  "blog",
  "shop",
  "store",
  "pay",
  "payments",
  "billing",
  "stripe",
  "webhooks",
  "webhook",
  "oauth",
  "auth",
  "login",
  "signup",
  "register",
  "account",
  "accounts",
  "dashboard",
  "console",
  "m",
  "mobile",
  "ns",
  "ns1",
  "ns2",
  "mx",
  "root",
  "null",
  "undefined",
  "localhost",
  "atleita",
  "triboo",
  "triboosport",
  "sim",
  "simulation",
  "simulations",
]);

export type EventSubdomainValidationError =
  | "required"
  | "too_short"
  | "too_long"
  | "invalid_chars"
  | "reserved"
  | "taken";

/** Normalize user / title input to a DNS label candidate. */
export function normalizeEventSubdomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, EVENT_SUBDOMAIN_MAX_LEN)
    .replace(/-+$/g, "");
}

export function validateEventSubdomainFormat(
  raw: string,
): EventSubdomainValidationError | null {
  const value = normalizeEventSubdomain(raw);
  if (!value) return "required";
  if (value.length < EVENT_SUBDOMAIN_MIN_LEN) return "too_short";
  if (value.length > EVENT_SUBDOMAIN_MAX_LEN) return "too_long";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return "invalid_chars";
  if (EVENT_SUBDOMAIN_RESERVED.has(value)) return "reserved";
  if (value.startsWith("sim-") || value.startsWith("www-")) return "reserved";
  return null;
}

export function primaryEventSubdomainFromTitle(title: string): string | null {
  const base = normalizeEventSubdomain(title);
  if (!base || validateEventSubdomainFormat(base)) return null;
  return base;
}

/**
 * Suggestion chips for the create picker.
 * - Default: title-only label (no year).
 * - `includeAlternates`: year/city variants — use when the primary name is taken.
 */
export function buildEventSubdomainSuggestions(opts: {
  title: string;
  startDate?: string | null;
  city?: string | null;
  /** When true (e.g. primary taken), include year/city alternates. */
  includeAlternates?: boolean;
}): string[] {
  const base = normalizeEventSubdomain(opts.title);
  const yearMatch = String(opts.startDate ?? "").match(/(\d{4})/);
  const year = yearMatch?.[1] ?? String(new Date().getFullYear());
  const city = normalizeEventSubdomain(opts.city ?? "");

  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const c = normalizeEventSubdomain(raw).slice(0, EVENT_SUBDOMAIN_MAX_LEN);
    if (!c || seen.has(c) || validateEventSubdomainFormat(c)) return;
    seen.add(c);
    out.push(c);
  };

  if (base) push(base);

  const needAlternates = opts.includeAlternates === true || out.length === 0;
  if (needAlternates) {
    if (base) {
      push(`${base}-${year}`);
      if (city) push(`${base}-${city}`);
      else push(`${base}-mx`);
    }
    if (out.length === 0) {
      for (let i = 0; i < 50; i += 1) {
        const raw = i === 0 ? `evento-${year}` : `evento-${year}-${i}`;
        push(raw);
        if (out.length > 0) break;
      }
    }
    if (out.length === 0) push(`evt-${year}`);
  }

  return out.slice(0, 3);
}

/** True when subdomain looks like a year-suffixed auto from an earlier title prefix (e.g. e-2026 while typing endgame). */
export function isStaleTitleYearAutoSubdomain(
  subdomain: string,
  title: string,
): boolean {
  const current = normalizeEventSubdomain(subdomain);
  const titleNorm = normalizeEventSubdomain(title);
  if (!current || !titleNorm) return false;
  const m = current.match(/^(.+)-(\d{4})$/);
  if (!m) return false;
  const prefix = m[1];
  return titleNorm.startsWith(prefix) && prefix.length < titleNorm.length;
}

const APEX_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
]);

export function defaultApexHostname(): string {
  if (typeof process !== "undefined" && process.env) {
    const fromEnv = apexHostnameFromAppUrl(
      process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL || "",
    );
    if (fromEnv && fromEnv !== "localhost") return fromEnv;
  }
  return "localhost";
}

/**
 * Extract event/organizer vanity label from Host header / location.hostname.
 * Returns null for apex, www, localhost, IP, or multi-label without our apex.
 */
export function parseEventSubdomainFromHost(
  hostHeader: string | null | undefined,
  apex = defaultApexHostname(),
): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!host || APEX_HOSTS.has(host)) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  let bareApex = apex.replace(/^www\./i, "").toLowerCase();
  // When PUBLIC_APP_URL is unset (dev default localhost), infer apex from host parent.
  if (
    (bareApex === "localhost" || !bareApex) &&
    host.includes(".") &&
    !host.endsWith(".localhost")
  ) {
    const parts = host.split(".");
    if (parts.length >= 2) {
      bareApex = parts.slice(1).join(".");
    }
  }

  if (host === bareApex || host === `www.${bareApex}`) return null;

  const suffix = `.${bareApex}`;
  if (!host.endsWith(suffix)) {
    // Local dev: carrera.localhost
    if (host.endsWith(".localhost")) {
      const sub = host.slice(0, -".localhost".length);
      if (!sub || sub.includes(".")) return null;
      return validateEventSubdomainFormat(sub) ? null : sub;
    }
    return null;
  }

  const sub = host.slice(0, -suffix.length);
  if (!sub || sub.includes(".")) return null;
  if (EVENT_SUBDOMAIN_RESERVED.has(sub)) return null;
  if (validateEventSubdomainFormat(sub)) return null;
  return sub;
}

export function eventPublicSubdomainUrl(
  subdomain: string,
  apex = defaultApexHostname(),
  protocol = "https",
): string {
  const bare = apex.replace(/^www\./i, "").toLowerCase();
  return `${protocol}://${normalizeEventSubdomain(subdomain)}.${bare}`;
}
