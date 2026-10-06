/** Form wire format matches native `datetime-local`: `YYYY-MM-DDTHH:mm`. */

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function parseDatetimeLocalValue(value: string): Date | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const m = LOCAL_RE.exec(raw);
  if (!m) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const d = new Date(y, mo, day, h, mi, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function combineDateWithTime(
  date: Date,
  hours: number,
  minutes: number,
): string {
  const d = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  );
  return toDatetimeLocalValue(d);
}

export function snapMinute(minute: number, step: number): number {
  if (step <= 1) return Math.min(59, Math.max(0, minute));
  const snapped = Math.round(minute / step) * step;
  return snapped >= 60 ? 60 - step : snapped;
}

export function buildMinuteOptions(step: number): number[] {
  const safe = step > 0 ? step : 15;
  const out: number[] = [];
  for (let m = 0; m < 60; m += safe) out.push(m);
  return out;
}

export function parseDefaultTime(defaultTime: string): {
  hours: number;
  minutes: number;
} {
  const m = /^(\d{1,2}):(\d{2})$/.exec(defaultTime.trim());
  if (!m) return { hours: 8, minutes: 0 };
  const hours = Math.min(23, Math.max(0, Number(m[1])));
  const minutes = Math.min(59, Math.max(0, Number(m[2])));
  return { hours, minutes };
}
