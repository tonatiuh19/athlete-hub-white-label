import type { EventDetailResponse, EventWaiverPublic } from "@shared/api";
import {
  selectApplicableWaivers,
  type WaiverAudience,
} from "@shared/waiverAudience";
import { isMinorOnReferenceDate } from "@shared/groupCheckout";

export function getRegistrationWaivers(
  eventDetail: EventDetailResponse | null | undefined,
): EventWaiverPublic[] {
  if (!eventDetail) return [];
  if (eventDetail.waivers?.length) return eventDetail.waivers;
  if (eventDetail.waiver) return [eventDetail.waiver];
  return [];
}

export function eventRequiresWaiver(
  eventDetail: EventDetailResponse | null | undefined,
): boolean {
  return Boolean(eventDetail?.event.requires_waiver);
}

export function isWaiverMisconfigured(
  eventDetail: EventDetailResponse | null | undefined,
): boolean {
  return eventRequiresWaiver(eventDetail) && getRegistrationWaivers(eventDetail).length === 0;
}

/** Waivers that apply for this registrant age + category (adult vs minor + optional category rules). */
export function getApplicableRegistrationWaivers(
  eventDetail: EventDetailResponse | null | undefined,
  opts: {
    categoryId: number;
    dateOfBirth?: string | null;
    eventStartDate?: string | null;
  },
): EventWaiverPublic[] {
  const all = getRegistrationWaivers(eventDetail);
  if (!opts.dateOfBirth || !opts.categoryId) return all;
  const eventStart =
    opts.eventStartDate ??
    eventDetail?.event.start_date ??
    new Date().toISOString();
  const isMinor = isMinorOnReferenceDate(opts.dateOfBirth, eventStart);
  return selectApplicableWaivers(
    all.map((w) => ({
      ...w,
      audience: (w.audience ?? "all") as WaiverAudience,
      category_ids: w.category_ids ?? null,
    })),
    { isMinor, categoryId: opts.categoryId },
  );
}
