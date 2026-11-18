/**
 * Bangladesh Standard Time (Asia/Dhaka, UTC+6, no daylight saving).
 *
 * LifeLedger treats "today", "this month" and "now" as Bangladesh time no matter
 * which timezone the browser (or server) is running in. The helpers return
 * plain local `Date` objects whose *local fields* (year, month, day, hour...)
 * show the Bangladesh wall-clock time, so they can be passed straight to
 * date-fns `format`, `startOfDay`, `isSameDay`, etc.
 */
export const BD_TIME_ZONE = "Asia/Dhaka";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BD_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function getBdParts(instant: Date) {
  const parts: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** A local Date whose fields show the current Bangladesh wall-clock time. */
export function nowBD(instant: Date = new Date()): Date {
  const p = getBdParts(instant);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Today's date in Bangladesh as `YYYY-MM-DD`. */
export function todayBD(instant: Date = new Date()): string {
  const p = getBdParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** The current month in Bangladesh as `YYYY-MM`. */
export function currentMonthBD(instant: Date = new Date()): string {
  const p = getBdParts(instant);
  return `${p.year}-${pad(p.month)}`;
}

/** Yesterday's date in Bangladesh as `YYYY-MM-DD`. */
export function yesterdayBD(instant: Date = new Date()): string {
  return todayBD(new Date(instant.getTime() - 24 * 60 * 60 * 1000));
}

/** The current year in Bangladesh. */
export function currentYearBD(instant: Date = new Date()): number {
  return getBdParts(instant).year;
}

/** The current hour (0-23) in Bangladesh. */
export function currentHourBD(instant: Date = new Date()): number {
  return getBdParts(instant).hour;
}
