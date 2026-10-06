import type { StaffRole } from "@shared/api";

/** Decode staff role from JWT `actor` without verifying signature (client restore only). */
export function decodeStaffRoleFromToken(token: string | null | undefined): StaffRole | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { actor?: string };
    if (payload.actor === "admin") return "admin";
    if (payload.actor === "organizer") return "organizer";
    return null;
  } catch {
    return null;
  }
}

/**
 * Only auth failures should wipe a persisted staff session on hydrate.
 * Network / timeout / 5xx must keep localStorage token so closing tabs
 * does not force a full OTP login.
 */
export function isStaffHydrateAuthFailure(status: number | undefined): boolean {
  return status === 401 || status === 403;
}
