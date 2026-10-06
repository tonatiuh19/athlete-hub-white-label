/**
 * Pure helpers for event day end + registration/listing lifecycle.
 * Event day ends at 23:59:59.999 UTC on the calendar day of end_date (or start_date).
 */

export function getEventLifecycleEndMs(
  startDate: string | Date,
  endDate?: string | Date | null,
): number {
  const raw = endDate ?? startDate;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    23,
    59,
    59,
    999,
  );
}

export function hasEventDayPassed(
  startDate: string | Date,
  endDate?: string | Date | null,
  nowMs: number = Date.now(),
): boolean {
  return nowMs > getEventLifecycleEndMs(startDate, endDate);
}

export type RegistrationWindowRow = {
  registration_opens_at?: Date | string | null;
  registration_closes_at?: Date | string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
};

/** Effective open = latest opens_at; effective close = earliest closes_at across event + category. */
export function getRegistrationWindowError(
  event: RegistrationWindowRow,
  category: RegistrationWindowRow,
  nowMs: number = Date.now(),
): { error: string; code: string } | null {
  const openTimes: number[] = [];
  const closeTimes: number[] = [];

  for (const row of [event, category]) {
    if (row.registration_opens_at) {
      openTimes.push(new Date(row.registration_opens_at as string).getTime());
    }
    if (row.registration_closes_at) {
      closeTimes.push(new Date(row.registration_closes_at as string).getTime());
    }
  }

  const effectiveOpen = openTimes.length ? Math.max(...openTimes) : null;
  const effectiveClose = closeTimes.length ? Math.min(...closeTimes) : null;

  if (effectiveOpen != null && nowMs < effectiveOpen) {
    return {
      error: "Registration has not opened yet",
      code: "registration_not_open",
    };
  }
  if (effectiveClose != null && nowMs > effectiveClose) {
    return { error: "Registration has closed", code: "registration_closed" };
  }

  if (event.start_date && hasEventDayPassed(event.start_date, event.end_date ?? null, nowMs)) {
    return {
      error: "Registration has closed — this event has already taken place",
      code: "registration_closed_event_passed",
    };
  }
  return null;
}
