const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const output = mkdtempSync(path.join(tmpdir(), "vanguard-tests-"));
execFileSync(
  process.execPath,
  [
    "node_modules/typescript/bin/tsc",
    "src/lib/analytics/engine.ts",
    "--outDir",
    output,
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { stdio: "pipe" },
);
after(() => rmSync(output, { recursive: true, force: true }));
const { processBankStatement } = require(
  path.join(output, "analytics/engine.js"),
);
const { validateStatementData } = require(
  path.join(output, "analytics/data-validator.js"),
);
const { parseStatementNumber } = require(
  path.join(output, "analytics/statement-fields.js"),
);

test("parenthesized amounts remain debits and totals reconcile", () => {
  const data = processBankStatement([
    {
      Date: "2026-01-01",
      Description: "Salary",
      Amount: "NGN 1,000.00",
      Balance: "₦1,000.00",
    },
    {
      Date: "2026-01-02",
      Description: "Groceries",
      Amount: "(₦125.50)",
      Balance: "₦874.50",
    },
  ]);
  assert.equal(data.totalIncome, 1000);
  assert.equal(data.totalExpenses, 125.5);
  assert.equal(data.closingBalance, 874.5);
  assert.equal(data.validationReport.balanceMathDiscrepancies, 0);
});
test("validation and analytics share column aliases, preferring exact matches", () => {
  const data = processBankStatement([
    {
      Address: "123 Main",
      "Transaction Date": "2026-01-01",
      Narration: "Payroll",
      "Credit Amount": "500",
      "Debit Amount": "",
      "Running Balance": "500",
    },
    {
      Address: "123 Main",
      "Transaction Date": "2026-01-02",
      Narration: "Food",
      "Credit Amount": "",
      "Debit Amount": "25",
      "Running Balance": "475",
    },
  ]);
  assert.equal(data.totalTransactions, 2);
  assert.equal(data.totalExpenses, 25);
  assert.equal(data.validationReport.validRowCount, 2);
  assert.equal(data.validationReport.balanceMathDiscrepancies, 0);
});
test("invalid dates, impossible calendar dates and non-finite values are excluded", () => {
  const data = processBankStatement([
    { Date: "not a date", Amount: 20 },
    { Date: "2026-02-31", Amount: 30 },
    { Date: "2026-01-01", Amount: "Infinity" },
  ]);
  assert.equal(data.totalTransactions, 0);
  assert.equal(data.validationReport.invalidDateCount, 2);
  assert.equal(data.validationReport.impossibleValueCount, 1);
});
test("flagged row count counts rows, rather than multiple issues per row", () => {
  const { report, cleanRows } = validateStatementData([
    { Date: "", Amount: "bad" },
  ]);
  assert.equal(report.flaggedRowCount, 1);
  assert.equal(report.flaggedRows.length, 2);
  assert.equal(cleanRows.length, 0);
});
test("same-date equal debit and credit are not duplicate transactions", () => {
  const { report } = validateStatementData([
    { Date: "2026-01-01", Description: "Transfer", Debit: 50 },
    { Date: "2026-01-01", Description: "Transfer", Credit: 50 },
    { Date: "2026-01-01", Description: "Transfer", Credit: 50 },
  ]);
  assert.equal(report.duplicateRowCount, 1);
});
test("newest-first statements reconcile using the newer transaction amount", () => {
  const data = processBankStatement([
    { Date: "2026-01-03", Description: "Food", Amount: -25, Balance: 425 },
    { Date: "2026-01-02", Description: "Rent", Amount: -50, Balance: 450 },
    { Date: "2026-01-01", Description: "Salary", Amount: 500, Balance: 500 },
  ]);
  assert.equal(data.validationReport.balanceMathDiscrepancies, 0);
  assert.equal(data.closingBalance, 425);
});
test("category overrides and transfer exclusions still update aggregates", () => {
  const rows = [
    { Date: "2026-01-01", Description: "Salary", Amount: 1000 },
    { Date: "2026-01-02", Description: "Something", Amount: -100 },
  ];
  const data = processBankStatement(rows, "", {
    excludeTransfers: true,
    categoryOverrides: { tx_2: "Transfer" },
  });
  assert.equal(data.totalExpenses, 0);
  assert.equal(data.operatingCashFlow, 1000);
  assert.equal(data.transferVolume, 100);
});
test("numeric parsing rejects partial numbers and accepts finite zero", () => {
  for (const value of ["Infinity", "12oops", {}, null, "--2"])
    assert.ok(Number.isNaN(parseStatementNumber(value)));
  assert.equal(parseStatementNumber("0"), 0);
  assert.equal(parseStatementNumber("(1,234.50)"), -1234.5);
});
