import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateMonthComparisonTotals,
  createMonthKey,
  getPercentageChange,
} from "./month-comparison.ts";

test("creates exact month keys for selected years and months", () => {
  assert.equal(createMonthKey(2026, 9), "2026-10");
  assert.equal(createMonthKey(2025, 0), "2025-01");
  assert.equal(createMonthKey(2026, 12), null);
  assert.equal(createMonthKey(0, 0), null);
});

test("keeps the same month in different years separate", () => {
  const totals = calculateMonthComparisonTotals(
    [
      { date: "2025-01-15", type: "income", amount: 125 },
      { date: "2025-01-20", type: "expense", amount: 40 },
      { date: "2026-01-03", type: "income", amount: 300 },
      { date: "2026-01-25", type: "expense", amount: 90 },
      { date: "2026-02-01", type: "income", amount: 500 },
    ],
    "2026-01",
    "2025-01",
  );

  assert.deepEqual(totals, {
    first: { income: 300, expense: 90 },
    second: { income: 125, expense: 40 },
  });
});

test("returns zero totals for selected months with no transactions", () => {
  const totals = calculateMonthComparisonTotals(
    [{ date: "2024-04-02", type: "income", amount: 80 }],
    "2025-07",
    "2026-07",
  );

  assert.deepEqual(totals, {
    first: { income: 0, expense: 0 },
    second: { income: 0, expense: 0 },
  });
});

test("treats a single empty month as zero without an invalid percentage", () => {
  const totals = calculateMonthComparisonTotals(
    [{ date: "2025-12-04", type: "expense", amount: 45 }],
    "2025-11",
    "2025-12",
  );

  assert.deepEqual(totals.first, { income: 0, expense: 0 });
  assert.deepEqual(totals.second, { income: 0, expense: 45 });
  assert.equal(getPercentageChange(0, 45), -100);
  assert.equal(getPercentageChange(0, 0), null);
  assert.equal(getPercentageChange(80, 0), null);
  assert.equal(getPercentageChange(80, 40), 100);
});