import { normalizeRichHtmlForCompare } from "@/utils/normalizeRichHtml";

export const ORGANIZER_SITE_LEGAL_KEYS = ["terms", "privacy", "refund"] as const;
export type OrganizerSiteLegalKey = (typeof ORGANIZER_SITE_LEGAL_KEYS)[number];

export function isOrganizerSiteLegalDocKey(
  value: string,
): value is OrganizerSiteLegalKey {
  return (ORGANIZER_SITE_LEGAL_KEYS as readonly string[]).includes(value);
}

export function isOrganizerSiteLegalReadyFromDocs(
  docs: Array<{ documentKey: string; locale?: string; bodyHtml?: string | null }>,
  locale = "es",
): boolean {
  const byKey = new Map<string, string>();
  for (const doc of docs) {
    if ((doc.locale ?? "es") !== locale) continue;
    byKey.set(doc.documentKey, doc.bodyHtml ?? "");
  }
  return ORGANIZER_SITE_LEGAL_KEYS.every(
    (key) => normalizeRichHtmlForCompare(byKey.get(key)) !== "",
  );
}

export function organizerMicrositeLegalPath(documentKey: OrganizerSiteLegalKey): string {
  return `/legal/${documentKey}`;
}
