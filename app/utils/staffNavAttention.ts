import { isOrganizerSiteLegalReadyFromDocs } from "@/utils/organizerSiteLegal";
import { canAccessStaffPayouts } from "@/utils/staffNav";

export type StaffNavAttentionKey = "site" | "legal" | "payouts";

export type StaffNavAttentionMap = Partial<Record<string, StaffNavAttentionKey>>;

/**
 * Which organizer sidebar destinations need setup attention.
 * Keys are nav `to` paths.
 */
export function buildOrganizerNavAttention(input: {
  organizerRole?: string;
  siteStatus?: string | null;
  siteLegal?: Array<{
    documentKey: string;
    locale?: string;
    bodyHtml?: string | null;
  }> | null;
  siteLoaded?: boolean;
  payoutReady?: boolean | null;
  payoutsLoaded?: boolean;
}): StaffNavAttentionMap {
  const attention: StaffNavAttentionMap = {};

  if (input.siteLoaded) {
    const status = String(input.siteStatus ?? "draft");
    if (status !== "published") {
      attention["/staff/site"] = "site";
    }
    if (!isOrganizerSiteLegalReadyFromDocs(input.siteLegal ?? [])) {
      attention["/staff/legal"] = "legal";
    }
  }

  if (
    input.payoutsLoaded &&
    canAccessStaffPayouts(false, input.organizerRole) &&
    input.payoutReady === false
  ) {
    attention["/staff/payments"] = "payouts";
  }

  return attention;
}

export function staffNavAttentionLabelKey(
  key: StaffNavAttentionKey,
): string {
  return `staffPortal.nav.attention.${key}`;
}
