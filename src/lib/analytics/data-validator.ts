import {
  detectColumns,
  parseStatementNumber,
  isStatementDateValid,
  smartParseDate,
} from "./statement-fields";

/**
 * Production-Grade Financial Data Validation Engine
 * 100% Deterministic pre-analysis data hygiene audit.
 * Audits raw statement rows before running analytics algorithms.
 */

export interface FlaggedRow {
  rowIndex: number;
  rowId?: string;
  rawRecord: Record<string, unknown>;
  issueType:
    | "balance_mismatch"
    | "invalid_date"
    | "impossible_value"
    | "duplicate_transaction"
    | "out_of_order";
  severity: "critical" | "warning";
  description: string;
}

export interface ValidationReport {
  totalRows: number;
  validRowCount: number;
  flaggedRowCount: number;
  duplicateRowCount: number;
  balanceMathDiscrepancies: number;
  invalidDateCount: number;
  impossibleValueCount: number;
  dataQualityScore: number; // 0 - 100%
  qualityGrade: "A+" | "A" | "B" | "C" | "F";
  flaggedRows: FlaggedRow[];
}

export interface ValidatedStatementData {
  cleanRows: Record<string, unknown>[];
  report: ValidationReport;
}

export function validateStatementData(
  rows: Record<string, unknown>[],
): ValidatedStatementData {
  if (!rows || rows.length === 0) {
    return {
      cleanRows: [],
      report: {
        totalRows: 0,
        validRowCount: 0,
        flaggedRowCount: 0,
        duplicateRowCount: 0,
        balanceMathDiscrepancies: 0,
        invalidDateCount: 0,
        impossibleValueCount: 0,
        dataQualityScore: 100,
        qualityGrade: "A+",
        flaggedRows: [],
      },
    };
  }

  const cols = detectColumns(rows);
  const read = (row: Record<string, unknown>, key: string | null) =>
    key ? row[key] : undefined;
  const getNum = parseStatementNumber;
  const signedAmount = (row: Record<string, unknown>) => {
    const credit = getNum(read(row, cols.creditCol));
    const debit = getNum(read(row, cols.debitCol));
    const amount = getNum(read(row, cols.amountCol));
    return credit > 0 ? credit : debit > 0 ? -debit : amount;
  };
  const flaggedRows: FlaggedRow[] = [];
  const cleanRows: Record<string, unknown>[] = [];
  const seenTxSignatures = new Map<string, number>();

  let duplicateRowCount = 0;
  let balanceMathDiscrepancies = 0;
  let invalidDateCount = 0;
  let impossibleValueCount = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    let isRowValid = true;

    // 1. Date Validation
    const dateVal = read(r, cols.dateCol);
    if (!isStatementDateValid(dateVal)) {
      invalidDateCount++;
      isRowValid = false;
      flaggedRows.push({
        rowIndex: idx + 1,
        rawRecord: r,
        issueType: "invalid_date",
        severity: "critical",
        description: `Row ${idx + 1} contains missing or unparseable date value: "${dateVal}".`,
      });
    }

    // 2. Numeric Sanity (Debit / Credit / Amount)
    const amt = getNum(read(r, cols.amountCol));
    const debit = getNum(read(r, cols.debitCol));
    const credit = getNum(read(r, cols.creditCol));

    if (isNaN(amt) && isNaN(debit) && isNaN(credit)) {
      impossibleValueCount++;
      isRowValid = false;
      flaggedRows.push({
        rowIndex: idx + 1,
        rawRecord: r,
        issueType: "impossible_value",
        severity: "critical",
        description: `Row ${idx + 1} has no valid numeric amount, debit, or credit values.`,
      });
    }

    // Check for impossible negative debits/credits
    if ((!isNaN(debit) && debit < 0) || (!isNaN(credit) && credit < 0)) {
      impossibleValueCount++;
      flaggedRows.push({
        rowIndex: idx + 1,
        rawRecord: r,
        issueType: "impossible_value",
        severity: "warning",
        description: `Row ${idx + 1} contains negative debit (${debit}) or credit (${credit}) amounts.`,
      });
    }

    // 3. Duplicate Transaction Detection (Date + Payee + Amount + Type)
    const descStr = String(read(r, cols.descCol) ?? "")
      .trim()
      .toLowerCase();
    const sigAmt =
      !isNaN(credit) && credit > 0
        ? credit
        : !isNaN(debit) && debit > 0
          ? debit
          : amt;
    const direction =
      credit > 0
        ? "credit"
        : debit > 0
          ? "debit"
          : amt < 0
            ? "debit"
            : "credit";
    const txSig = `${dateVal}_${descStr}_${Math.abs(sigAmt)}_${direction}`;

    if (seenTxSignatures.has(txSig)) {
      duplicateRowCount++;
      flaggedRows.push({
        rowIndex: idx + 1,
        rawRecord: r,
        issueType: "duplicate_transaction",
        severity: "warning",
        description: `Row ${idx + 1} is an exact duplicate of row ${seenTxSignatures.get(txSig)! + 1} ("${descStr}", ${sigAmt}).`,
      });
    } else {
      seenTxSignatures.set(txSig, idx);
    }

    // 4. Sequential Balance Verification (if Balance column is present)
    const balance = getNum(read(r, cols.balanceCol));
    if (idx > 0 && !isNaN(balance)) {
      const prevRow = rows[idx - 1];
      const prevBal = getNum(read(prevRow, cols.balanceCol));
      if (!isNaN(prevBal)) {
        const previousDate = read(prevRow, cols.dateCol);
        const descending =
          isStatementDateValid(previousDate) &&
          isStatementDateValid(dateVal) &&
          smartParseDate(String(previousDate)) >
            smartParseDate(String(dateVal));
        const expectedBal = descending
          ? prevBal - signedAmount(prevRow)
          : prevBal + signedAmount(r);

        // Allow 0.05 rounding tolerance
        if (Math.abs(balance - expectedBal) > 0.05) {
          balanceMathDiscrepancies++;
          flaggedRows.push({
            rowIndex: idx + 1,
            rawRecord: r,
            issueType: "balance_mismatch",
            severity: "warning",
            description: `Row ${idx + 1} balance math mismatch: reported ${balance}, expected ${expectedBal.toFixed(2)} (diff: ${(balance - expectedBal).toFixed(2)}).`,
          });
        }
      }
    }

    if (isRowValid) {
      cleanRows.push(r);
    }
  }

  // 5. Data Quality Score Calculation
  const totalRows = rows.length;
  const criticalCount = flaggedRows.filter(
    (f) => f.severity === "critical",
  ).length;
  const warningCount = flaggedRows.filter(
    (f) => f.severity === "warning",
  ).length;

  // Deduct 5 points per critical error, 1 point per warning error
  const penalty =
    (criticalCount * 5 + warningCount * 1) / Math.max(1, totalRows / 20);
  const dataQualityScore = Math.max(
    0,
    Math.min(100, Math.round(100 - penalty)),
  );

  let qualityGrade: "A+" | "A" | "B" | "C" | "F" = "A+";
  if (dataQualityScore >= 95) qualityGrade = "A+";
  else if (dataQualityScore >= 85) qualityGrade = "A";
  else if (dataQualityScore >= 70) qualityGrade = "B";
  else if (dataQualityScore >= 50) qualityGrade = "C";
  else qualityGrade = "F";

  return {
    cleanRows, // Invalid-only statements must not silently re-enter analytics.
    report: {
      totalRows,
      validRowCount: cleanRows.length,
      flaggedRowCount: new Set(flaggedRows.map((row) => row.rowIndex)).size,
      duplicateRowCount,
      balanceMathDiscrepancies,
      invalidDateCount,
      impossibleValueCount,
      dataQualityScore,
      qualityGrade,
      flaggedRows: flaggedRows.slice(0, 20), // top 20 flagged
    },
  };
}
