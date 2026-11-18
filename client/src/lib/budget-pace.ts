/**
 * "How much can I still spend per day?" for a budget in the current month.
 * Pure helper (no imports) so it is easy to test.
 */
export type DailyAllowance = {
  /** Whole amount that can be spent each remaining day (rounded down so it never overspends). */
  perDay: number;
  /** Days left in the month, counting today. */
  daysLeft: number;
  /** True when nothing is left in the budget (spent >= limit). */
  exhausted: boolean;
};

/**
 * Returns null unless `monthKey` (YYYY-MM) is the month `today` falls in, because
 * a daily allowance only makes sense for the month that is still in progress.
 * `today` should already be a Bangladesh-time date (see bd-time.ts).
 */
export function getDailyAllowance(input: {
  amount: number;
  spent: number;
  monthKey: string;
  today: Date;
}): DailyAllowance | null {
  const [year, month] = input.monthKey.split("-").map(Number);
  const { today } = input;
  if (today.getFullYear() !== year || today.getMonth() + 1 !== month) return null;

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = daysInMonth - today.getDate() + 1;
  const remaining = Math.round(input.amount) - Math.round(input.spent);

  if (remaining <= 0) return { perDay: 0, daysLeft, exhausted: true };
  return { perDay: Math.floor(remaining / daysLeft), daysLeft, exhausted: false };
}
