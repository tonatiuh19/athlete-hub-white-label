import type { EventMediaAsset, StaffEventCategory } from "@shared/api";

export type EventCreateWizardStep =
  | "organizer"
  | "info"
  | "tickets"
  | "customize"
  | "publish";

/** Organizer self-serve wizard (no org picker). */
export const ORGANIZER_CREATE_WIZARD_STEPS: EventCreateWizardStep[] = [
  "info",
  "tickets",
  "customize",
  "publish",
];

/** Admin create: pick organizer first, then same cool wizard. */
export const ADMIN_CREATE_WIZARD_STEPS: EventCreateWizardStep[] = [
  "organizer",
  "info",
  "tickets",
  "customize",
  "publish",
];

/** @deprecated Prefer role-specific lists — kept as organizer default. */
export const EVENT_CREATE_WIZARD_STEPS = ORGANIZER_CREATE_WIZARD_STEPS;

export function eventCreateWizardSteps(isAdmin: boolean): EventCreateWizardStep[] {
  return isAdmin ? ADMIN_CREATE_WIZARD_STEPS : ORGANIZER_CREATE_WIZARD_STEPS;
}

export function parseEventCreateWizardStep(
  raw: string | null,
  steps: EventCreateWizardStep[],
): EventCreateWizardStep {
  if (raw && steps.includes(raw as EventCreateWizardStep)) {
    return raw as EventCreateWizardStep;
  }
  return steps[0] ?? "info";
}

export type EventCreatePreviewDevice = "phone" | "tablet" | "desktop";

export type EventCreatePreviewCategory = Pick<
  StaffEventCategory,
  "id" | "name" | "price_cents" | "distance_km" | "description"
>;

export type EventCreatePreviewData = {
  title: string;
  sportName?: string;
  sportSlug?: string;
  startDate?: string;
  endDate?: string;
  locationCity?: string;
  locationState?: string;
  locationName?: string;
  locationCountry?: string;
  locationLat?: number | string | null;
  locationLng?: number | string | null;
  heroUrl?: string | null;
  bannerUrl?: string | null;
  media?: EventMediaAsset[];
  shortDescription?: string;
  description?: string;
  subdomain?: string;
  organizerName?: string;
  organizerLogo?: string | null;
  categories: EventCreatePreviewCategory[];
};
