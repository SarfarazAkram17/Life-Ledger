import assert from "node:assert/strict";
import { test } from "node:test";
import { getDailyAllowance } from "./budget-pace.ts";

test("splits what is left evenly over the remaining days, counting today", () => {
  // 10 Nov 2026: November has 30 days, so 21 days are left including today.
  const result = getDailyAllowance({
    amount: 10000,
    spent: 4000,
    monthKey: "2026-11",
    today: new Date(2026, 10, 10),
  });
  assert.deepEqual(result, { perDay: 285, daysLeft: 21, exhausted: false });
});

test("on the last day the whole remainder is available today", () => {
  const result = getDailyAllowance({
    amount: 5000,
    spent: 4500,
    monthKey: "2026-11",
    today: new Date(2026, 10, 30),
  });
  assert.deepEqual(result, { perDay: 500, daysLeft: 1, exhausted: false });
});

test("reports an exhausted budget instead of a negative allowance", () => {
  const result = getDailyAllowance({
    amount: 5000,
    spent: 5000,
    monthKey: "2026-11",
    today: new Date(2026, 10, 10),
  });
  assert.equal(result?.exhausted, true);
  assert.equal(result?.perDay, 0);
});

test("only applies to the month that is in progress", () => {
  const today = new Date(2026, 10, 10);
  assert.equal(getDailyAllowance({ amount: 1000, spent: 0, monthKey: "2026-10", today }), null);
  assert.equal(getDailyAllowance({ amount: 1000, spent: 0, monthKey: "2026-12", today }), null);
  assert.equal(getDailyAllowance({ amount: 1000, spent: 0, monthKey: "2025-11", today }), null);
});

test("rounds down so the allowance never overspends", () => {
  const result = getDailyAllowance({
    amount: 1000,
    spent: 0,
    monthKey: "2026-11",
    today: new Date(2026, 10, 1),
  });
  assert.equal(result?.perDay, 33); // 1000 / 30 = 33.33...
});
