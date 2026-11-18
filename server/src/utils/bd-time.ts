/**
 * Bangladesh Standard Time (Asia/Dhaka) is a fixed UTC+6 offset (no daylight saving).
 * Everything LifeLedger stores or returns about "when" uses it.
 */
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

/** Today's date in Bangladesh as YYYY-MM-DD. */
export function todayBD(now: Date = new Date()): string {
  return new Date(now.getTime() + BD_OFFSET_MS).toISOString().slice(0, 10);
}

/** An instant as an ISO string carrying the Bangladesh offset, e.g. 2026-11-17T15:04:05.000+06:00 */
export function toBdIso(date: Date): string {
  return new Date(date.getTime() + BD_OFFSET_MS).toISOString().replace("Z", "+06:00");
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Amounts are whole numbers. Returns null when the value is not a usable amount. */
export function toWholeAmount(value: unknown): number | null {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : null;
}
