import { getNumberLocale } from "@/utils/dateLocale";

export function formatEventDateTimeRange(
  startIso: string,
  endIso: string | undefined,
  locale: string,
  timeZone?: string,
): string {
  try {
    const start = new Date(startIso);
    const loc = getNumberLocale(locale);
    const tz = timeZone && timeZone.trim() ? timeZone : undefined;
    const dateOpts: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(tz ? { timeZone: tz } : {}),
    };
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      ...(tz ? { timeZone: tz, timeZoneName: "short" } : {}),
    };
    const datePart = start.toLocaleDateString(loc, dateOpts);
    const startTime = start.toLocaleTimeString(loc, timeOpts);
    if (!endIso) return `${datePart}, ${startTime}`;
    const end = new Date(endIso);
    const endTime = end.toLocaleTimeString(loc, {
      hour: "numeric",
      minute: "2-digit",
      ...(tz ? { timeZone: tz } : {}),
    });
    return `${datePart}, ${startTime} – ${endTime}`;
  } catch {
    return startIso;
  }
}

/** Compact month/day for calendar badge (e.g. "AUG 16"). */
export function formatEventDateBadge(iso: string, locale: string, timeZone?: string): {
  month: string;
  day: string;
} {
  try {
    const d = new Date(iso);
    const loc = getNumberLocale(locale);
    const tz = timeZone && timeZone.trim() ? timeZone : undefined;
    const month = d
      .toLocaleDateString(loc, { month: "short", ...(tz ? { timeZone: tz } : {}) })
      .replace(".", "")
      .toUpperCase();
    const day = d.toLocaleDateString(loc, {
      day: "numeric",
      ...(tz ? { timeZone: tz } : {}),
    });
    return { month, day };
  } catch {
    return { month: "—", day: "—" };
  }
}
