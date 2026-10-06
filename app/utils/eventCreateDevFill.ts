import type { GeoCity, GeoState, StaffEventCategoryInput } from "@shared/api";
import type { EventCreateGalleryItem } from "@/utils/eventCreateGallery";
import {
  EVENT_CATEGORY_TEMPLATES,
  templateToCategoryInput,
  type EventCategoryTemplateId,
} from "@/utils/eventCategoryTemplates";
import { toDatetimeLocal } from "@/utils/datetimeLocal";

export type DevEventCreateFillValues = {
  title: string;
  subdomain: string;
  sport_type_id: string;
  start_date: string;
  end_date: string;
  location_name: string;
  short_description: string;
};

export const DEV_EVENT_SHORT_DESCRIPTION =
  "Carrera de prueba generada en desarrollo. Distancia marcada, ambiente familiar y meta en el parque central. Ideal para validar el flujo de publicación en local.";

/** Prefer Running when the catalog has it; otherwise first sport. */
export function pickDevSportTypeId(
  sportTypes: Array<{ id: number; slug?: string | null }>,
): string {
  if (sportTypes.length === 0) return "";
  const running = sportTypes.find((s) => s.slug === "running");
  return String((running ?? sportTypes[0]).id);
}

/** Prefer CDMX / NL so geo dropdowns resolve against real catalog rows. */
export function pickDevGeoState(states: GeoState[]): GeoState | null {
  if (states.length === 0) return null;
  const preferred =
    states.find(
      (s) =>
        s.code === "CMX" ||
        s.code === "CDMX" ||
        /ciudad de m[eé]xico|cdmx/i.test(s.name),
    ) ??
    states.find(
      (s) => s.code === "NL" || /nuevo le[oó]n/i.test(s.name),
    );
  return preferred ?? states[0] ?? null;
}

export function pickDevGeoCity(cities: GeoCity[]): GeoCity | null {
  if (cities.length === 0) return null;
  const preferred =
    cities.find((c) =>
      /ciudad de m[eé]xico|monterrey|guadalajara|canc[uú]n/i.test(c.name),
    ) ?? cities.find((c) => c.lat != null && c.lng != null);
  return preferred ?? cities[0] ?? null;
}

/**
 * Deterministic-ish draft values for local DEV fill-button.
 * Subdomain includes a short stamp so availability checks stay unique.
 */
export function buildDevEventCreateFillValues(input: {
  sportTypes: Array<{ id: number; slug?: string | null }>;
  now?: Date;
  stamp?: string;
}): DevEventCreateFillValues {
  const now = input.now ?? new Date();
  const stamp =
    input.stamp ??
    `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  const start = new Date(now);
  start.setDate(start.getDate() + 30);
  start.setHours(7, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);

  return {
    title: `Carrera de prueba ${stamp}`,
    subdomain: `test-${stamp}`.slice(0, 48),
    sport_type_id: pickDevSportTypeId(input.sportTypes),
    start_date: toDatetimeLocal(start.toISOString()),
    end_date: toDatetimeLocal(end.toISOString()),
    location_name: "Parque Central",
    short_description: DEV_EVENT_SHORT_DESCRIPTION,
  };
}

/** Free tickets so publish isn’t blocked by unpaid Connect payouts in local DEV. */
export const DEV_TICKET_TEMPLATE_SPECS: Array<{
  templateId: EventCategoryTemplateId;
  name: string;
  priceCents: number;
}> = [
  { templateId: "5k", name: "5K Prueba", priceCents: 0 },
  { templateId: "10k", name: "10K Prueba", priceCents: 0 },
];

export function buildDevTicketCategoryBodies(): StaffEventCategoryInput[] {
  return DEV_TICKET_TEMPLATE_SPECS.map((spec) => {
    const template = EVENT_CATEGORY_TEMPLATES.find((tpl) => tpl.id === spec.templateId);
    if (!template) {
      return {
        name: spec.name,
        price_cents: spec.priceCents,
        gender_restriction: "any" as const,
        waitlist_enabled: false,
      };
    }
    return {
      ...templateToCategoryInput(template, spec.name, spec.priceCents),
      waitlist_enabled: false,
    };
  });
}

/** Synthetic cover image for customize-step DEV fill (uploaded on Save and continue). */
export async function createDevGalleryItem(
  label = "Atleita DEV",
): Promise<EventCreateGalleryItem> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unsupported");
  }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0f3d2e");
  gradient.addColorStop(1, "#c8f560");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 72px system-ui, sans-serif";
  ctx.fillText(label, 64, 180);
  ctx.font = "36px system-ui, sans-serif";
  ctx.fillText("Portada de prueba", 64, 260);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Failed to create DEV gallery blob"));
      },
      "image/jpeg",
      0.88,
    );
  });

  const file = new File([blob], "dev-event-hero.jpg", { type: "image/jpeg" });
  return {
    id: `dev-hero-${Date.now()}`,
    previewUrl: URL.createObjectURL(file),
    file,
  };
}
