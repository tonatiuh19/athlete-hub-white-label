export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isPast: boolean;
};

export function getCountdownParts(targetIso: string, nowMs = Date.now()): CountdownParts {
  const target = new Date(targetIso).getTime();
  const totalMs = Number.isFinite(target) ? target - nowMs : 0;
  if (!Number.isFinite(target) || totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isPast: true };
  }
  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, totalMs, isPast: false };
}
