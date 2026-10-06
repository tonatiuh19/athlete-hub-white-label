/** Sub-tabs of the event details Formik editor (console Editar subtree). */
export const EVENT_EDIT_DETAIL_SECTIONS = [
  "details",
  "location",
  "checkin",
  "registration",
  "description",
  "images",
  "policies",
] as const;

export type EventEditDetailSection = (typeof EVENT_EDIT_DETAIL_SECTIONS)[number];

export function isEventEditDetailSection(
  value: string,
): value is EventEditDetailSection {
  return (EVENT_EDIT_DETAIL_SECTIONS as readonly string[]).includes(value);
}

/** Legacy hero/banner tabs → combined images section. */
export function normalizeEventEditDetailTab(
  tab: string | null | undefined,
): string | null {
  if (!tab) return null;
  if (tab === "hero" || tab === "banner") return "images";
  return tab;
}
