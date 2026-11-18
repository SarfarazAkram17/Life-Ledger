import { addDays, format } from "date-fns";

/** DMY = DD/MM/YYYY, MDY = MM/DD/YYYY */
export type DateFormatPref = "DMY" | "MDY";
/** JS weekday number the week starts on: 6 = Saturday, 0 = Sunday, 1 = Monday */
export type WeekStart = 6 | 0 | 1;

/** Dates are always shown as DD/MM/YYYY. */
export const DATE_FORMAT: DateFormatPref = "DMY";
/** Weeks always start on Saturday. */
export const WEEK_START: WeekStart = 6;

/** Numeric date for compact fields: 17/11/2026 or 11/17/2026 */
export function formatDate(date: Date, pref: DateFormatPref): string {
  return format(date, pref === "DMY" ? "dd/MM/yyyy" : "MM/dd/yyyy");
}

/** Long date with the month spelled out: 17 November 2026 or November 17, 2026 */
export function formatDateLong(date: Date, pref: DateFormatPref): string {
  return format(date, pref === "DMY" ? "d MMMM yyyy" : "MMMM d, yyyy");
}

/** Short date with an abbreviated month: 17 Nov 2026 or Nov 17, 2026 */
export function formatDateShort(date: Date, pref: DateFormatPref): string {
  return format(date, pref === "DMY" ? "d MMM yyyy" : "MMM d, yyyy");
}

/** Day and month only: 17 Nov or Nov 17 */
export function formatDayMonth(date: Date, pref: DateFormatPref): string {
  return format(date, pref === "DMY" ? "d MMM" : "MMM d");
}

/** Weekday, day and month: Mon, 3 Nov or Mon, Nov 3 */
export function formatWeekdayDayMonth(
  date: Date,
  pref: DateFormatPref,
): string {
  return format(date, pref === "DMY" ? "EEE, d MMM" : "EEE, MMM d");
}

/** Full weekday and date: Tuesday, 17 November 2026 or Tuesday, November 17, 2026 */
export function formatWeekdayDateLong(
  date: Date,
  pref: DateFormatPref,
): string {
  return format(date, pref === "DMY" ? "EEEE, d MMMM yyyy" : "EEEE, MMMM d, yyyy");
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Two-letter weekday headers, starting from the chosen first day of week. */
export function getWeekdayHeaders(weekStart: WeekStart): string[] {
  return Array.from(
    { length: 7 },
    (_, index) => WEEKDAY_LABELS[(weekStart + index) % 7],
  );
}

/** Calendar grid column (0-6) for a JS weekday number. */
export function getDayColumn(jsDay: number, weekStart: WeekStart): number {
  return (jsDay - weekStart + 7) % 7;
}

/** First day of the week that contains `date`. */
export function getWeekStartDate(date: Date, weekStart: WeekStart): Date {
  const start = addDays(date, -getDayColumn(date.getDay(), weekStart));
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Last moment of the week that begins on `weekStartDate`. */
export function getWeekEndDate(weekStartDate: Date): Date {
  const end = addDays(weekStartDate, 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
