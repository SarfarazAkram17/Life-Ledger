import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildBudgetPreview,
  buildBudgetTable,
  buildTransactionPreview,
  buildTransactionTable,
  categoryMappingKey,
  guessBudgetColumnMapping,
  guessTransactionColumnMapping,
  parseCsvDocument,
} from "./csv-import.ts";

test("imports transaction and budget sections with separate mappings and previews", () => {
  const document = parseCsvDocument(
    [
      "Date,Type,Category,Amount,Note",
      "2025-01-03,Expense,Food,15.25,Lunch",
      "",
      "Budgets (1)",
      "",
      "Cycle,Envelope,Allocation,Spent",
      "January 2025,Food,300,45",
    ].join("\n"),
  );
  const transactionTable = buildTransactionTable(document);
  const budgetTable = buildBudgetTable(document);
  const budgetMapping = guessBudgetColumnMapping(budgetTable.headers);
  const categories = [
    { id: "food-id", name: "Food", type: "expense" as const },
  ];
  const transactionPreview = buildTransactionPreview(
    transactionTable,
    guessTransactionColumnMapping(transactionTable.headers),
    categories,
    [],
  );
  const budgetPreview = buildBudgetPreview(
    budgetTable,
    budgetMapping,
    categories,
    [],
  );

  assert.equal(transactionPreview.length, 1);
  assert.equal(transactionPreview[0].note, "Lunch");
  assert.equal(budgetPreview.length, 1);
  assert.equal(budgetPreview[0].monthKey, "2025-01");
  assert.equal(budgetPreview[0].categoryId, "food-id");
  assert.equal(budgetPreview[0].amount, 300);
  assert.deepEqual(budgetMapping, { month: 0, category: 1, amount: 2 });
});

test("recognizes a standalone budget CSV and blocks invalid budget rows", () => {
  const document = parseCsvDocument(
    "Budget Month,Category,Monthly Budget\nJanuary 2025,Food,250\nFebruary 2025,Food,not-an-amount",
  );
  const table = buildBudgetTable(document);
  const preview = buildBudgetPreview(
    table,
    guessBudgetColumnMapping(table.headers),
    [{ id: "food-id", name: "Food", type: "expense" }],
    [],
  );

  assert.equal(document.detectedHeaderLine, null);
  assert.equal(preview.length, 2);
  assert.equal(preview[0].errors.length, 0);
  assert.equal(preview[0].amount, 250);
  assert.ok(
    preview[1].errors.some((error) => /valid budget limit/i.test(error)),
  );
});

test("reads LifeLedger export cells and stops before the budget section", () => {
  const csv = [
    `="","",="Transactions (2)",="",""`,
    `="","",="","",=""`,
    `="Date",="Type",="Category",="Amount",="Note"`,
    `="2025-01-03",="Expense",="Food, groceries",1250.5,="Bought ""fruit"", pears"`,
    `="2025-01-04",="Expense",="Budgets",20,=""`,
    `="","",="","",=""`,
    `="","",="","",=""`,
    `="","",="Budgets (1)",="",""`,
    `="","",="","",=""`,
    `="Month",="Category",="Limit",="Spent",="Used %"`,
    `="January 2025",="Food",100,50,="50%"`,
  ].join("\r\n");

  const document = parseCsvDocument(`\uFEFF${csv}`);
  const table = buildTransactionTable(document);

  assert.equal(document.detectedHeaderLine, 3);
  assert.deepEqual(table.headers, [
    "Date",
    "Type",
    "Category",
    "Amount",
    "Note",
  ]);
  assert.equal(table.rows.length, 2);
  assert.deepEqual(table.rows[0].cells, [
    "2025-01-03",
    "Expense",
    "Food, groceries",
    "1250.5",
    'Bought "fruit", pears',
  ]);
  assert.deepEqual(table.rows[1].cells, [
    "2025-01-04",
    "Expense",
    "Budgets",
    "20",
    "",
  ]);
});

test("parses standard quoted cells and embedded newlines", () => {
  const document = parseCsvDocument(
    'Date,Type,Category,Amount,Note\r\n2025-02-03,Income,Pay,2500,"Salary,\r\nmonthly"',
  );
  const table = buildTransactionTable(document);

  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0].cells[4], "Salary,\r\nmonthly");
});

test("guesses common transaction column names", () => {
  assert.deepEqual(
    guessTransactionColumnMapping([
      "Transaction Date",
      "Debit/Credit",
      "Category Name",
      "Amount (USD)",
      "Memo",
    ]),
    { date: 0, type: 1, category: 2, amount: 3, note: 4 },
  );
});

test("flags invalid rows, existing duplicates, and repeated rows", () => {
  const table = {
    hasHeader: true,
    headers: ["Date", "Type", "Category", "Amount", "Note"],
    rows: [
      {
        lineNumber: 2,
        cells: ["2025-03-10", "Expense", "Food", "12.50", "Lunch"],
      },
      {
        lineNumber: 3,
        cells: ["2025-03-10", "Expense", "Food", "12.50", "Different note"],
      },
      {
        lineNumber: 4,
        cells: ["not-a-date", "Expense", "Food", "12.50", "Invalid"],
      },
      {
        lineNumber: 5,
        cells: ["2025-03-11", "Expense", "Unknown", "12,50", "Unmapped"],
      },
    ],
  };
  const categories = [
    { id: "food-id", name: "Food", type: "expense" as const },
  ];
  const existingTransactions = [
    {
      date: "2025-03-10",
      type: "expense" as const,
      amount: 12.5,
      category: "food-id",
      note: "Existing note",
    },
  ];
  const mapping = guessTransactionColumnMapping(table.headers);
  const preview = buildTransactionPreview(
    table,
    mapping,
    categories,
    existingTransactions,
  );

  assert.equal(preview[0].possibleDuplicate, true);
  assert.match(preview[0].duplicateReason ?? "", /existing transaction/i);
  assert.equal(preview[1].possibleDuplicate, true);
  assert.match(preview[1].duplicateReason ?? "", /existing transaction/i);
  assert.ok(preview[2].errors.some((error) => /valid date/i.test(error)));
  assert.ok(preview[3].errors.some((error) => /valid amount/i.test(error)));
  assert.ok(preview[3].errors.some((error) => /map "Unknown"/i.test(error)));
});

test("applies a manual category mapping and infers expenses from negative amounts", () => {
  const table = {
    hasHeader: true,
    headers: ["Date", "Amount", "Category", "Note"],
    rows: [
      {
        lineNumber: 2,
        cells: ["03/12/2025", "-42.75", "Market", "Groceries"],
      },
    ],
  };
  const categories = [
    { id: "groceries-id", name: "Groceries", type: "expense" as const },
  ];
  const mapping = guessTransactionColumnMapping(table.headers);
  const categoryMappings = {
    [categoryMappingKey("expense", "Market")]: "groceries-id",
  };
  const preview = buildTransactionPreview(
    table,
    mapping,
    categories,
    [],
    categoryMappings,
  );

  assert.equal(preview[0].type, "expense");
  assert.equal(preview[0].date, "2025-03-12");
  assert.equal(preview[0].amount, 42.75);
  assert.equal(preview[0].categoryId, "groceries-id");
  assert.equal(preview[0].errors.length, 0);
});