import { parseEventSubdomainFromHost } from "@shared/eventSubdomain";

/** Apex hostname from PUBLIC_APP_URL / VITE_PUBLIC_APP_URL (athlete-hub pattern). */
export function resolveApexHostname(): string {
  const raw =
    import.meta.env.VITE_PUBLIC_APP_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");
  if (!raw) return "localhost";
  try {
    const withProto = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "localhost";
  }
}

export function currentHostname(): string {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname.toLowerCase();
}

/** True on platform apex (www included) — not an organizer/event microsite host. */
export function isApexHost(hostname = currentHostname()): boolean {
  const host = hostname.split(":")[0] ?? hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  const apex = resolveApexHostname();
  return host === apex || host === `www.${apex}`;
}

/**
 * Non-apex vanity label (org microsite or legacy event host).
 * Uses PUBLIC_APP_URL-derived apex — same architecture as athlete-hub.
 */
export function parseVanitySubdomain(hostname = currentHostname()): string | null {
  if (isApexHost(hostname)) return null;
  const apex = resolveApexHostname();
  return parseEventSubdomainFromHost(hostname, apex);
}

/** Athlete auth is only offered on vanity microsite hosts. */
export function isAthleteLoginHost(hostname = currentHostname()): boolean {
  return Boolean(parseVanitySubdomain(hostname));
}
