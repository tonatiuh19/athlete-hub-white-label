import type { EventCreatePreviewData } from "@/components/staff/event-create/types";
import type { StaffEventCategory, StaffEventDetail } from "@shared/api";
import { fromDatetimeLocal } from "@/utils/datetimeLocal";
import { normalizeCdnUploadUrl } from "@/lib/cdn-url";

export type BuildEventEditPreviewInput = {
  formValues: {
    title: string;
    sport_type_id: number;
    start_date: string;
    end_date?: string;
    location_city: string;
    location_state?: string;
    location_name?: string;
    location_lat?: string;
    location_lng?: string;
    short_description?: string;
    hero_image_url?: string;
  };
  event?: StaffEventDetail | null;
  categories: StaffEventCategory[];
  heroPreviewUrl?: string | null;
  bannerPreviewUrl?: string | null;
  media?: EventCreatePreviewData["media"];
  sportName?: string;
  sportSlug?: string;
  organizerName?: string;
  organizerLogo?: string | null;
};

export function buildEventEditPreviewData(
  input: BuildEventEditPreviewInput,
): EventCreatePreviewData {
  const { formValues, event, categories } = input;

  const heroUrl =
    input.heroPreviewUrl ??
    (formValues.hero_image_url
      ? normalizeCdnUploadUrl(formValues.hero_image_url)
      : null) ??
    (event?.hero_image_url ? normalizeCdnUploadUrl(event.hero_image_url) : null);

  const bannerUrl =
    input.bannerPreviewUrl ??
    (event?.banner_image_url ? normalizeCdnUploadUrl(event.banner_image_url) : null);

  return {
    title: formValues.title.trim() || event?.title || "",
    sportName: input.sportName,
    sportSlug: input.sportSlug,
    startDate: formValues.start_date
      ? fromDatetimeLocal(formValues.start_date) ?? formValues.start_date
      : event?.start_date,
    endDate: formValues.end_date
      ? fromDatetimeLocal(formValues.end_date) ?? formValues.end_date
      : event?.end_date ?? undefined,
    locationCity: formValues.location_city || event?.location_city || undefined,
    locationState: formValues.location_state || event?.location_state || undefined,
    locationName: formValues.location_name || event?.location_name || undefined,
    locationCountry: event?.location_country ?? "MX",
    locationLat: formValues.location_lat || event?.location_lat || undefined,
    locationLng: formValues.location_lng || event?.location_lng || undefined,
    heroUrl,
    bannerUrl,
    media: input.media,
    shortDescription: formValues.short_description?.trim() || event?.short_description || undefined,
    description: event?.description?.trim() || undefined,
    subdomain: event?.subdomain || undefined,
    organizerName: input.organizerName ?? event?.organizer_name ?? undefined,
    organizerLogo: input.organizerLogo ?? null,
    categories: categories
      .filter((c) => c.is_active !== 0 && c.is_active !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        price_cents: c.price_cents,
        distance_km: c.distance_km ?? undefined,
        description: c.description ?? undefined,
      })),
  };
}
