/**
 * Apex hostname helpers — derive from PUBLIC_APP_URL / VITE_PUBLIC_APP_URL
 * (same architecture as athlete-hub; no separate apex env var).
 */

export function apexHostnameFromAppUrl(
  appUrl?: string | null,
): string {
  const raw = (appUrl ?? "").trim();
  if (!raw) return "localhost";
  try {
    const withProto = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "localhost";
  }
}

export function resolveApexHostnameFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return apexHostnameFromAppUrl(
    env.PUBLIC_APP_URL || env.VITE_PUBLIC_APP_URL || "",
  );
}

export function isApexHostname(
  hostname: string,
  apex: string,
): boolean {
  const host = hostname.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1") return true;
  const a = apex.replace(/^www\./i, "").toLowerCase();
  return host === a || host === `www.${a}`;
}
