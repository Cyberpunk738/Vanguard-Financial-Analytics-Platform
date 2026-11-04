export interface ColumnMapping {
  dateCol: string | null;
  descCol: string | null;
  amountCol: string | null;
  debitCol: string | null;
  creditCol: string | null;
  balanceCol: string | null;
}

export function detectColumns(rows: Record<string, unknown>[]): ColumnMapping {
  const colNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  const lower = (s: string) => s.toLowerCase().replace(/[_\-\s]+/g, "");

  function findCol(keywords: string[]): string | null {
    for (const kw of keywords) {
      const exact = colNames.find((col) => lower(col) === kw);
      if (exact) return exact;
    }
    for (const col of colNames) {
      const norm = lower(col);
      if (keywords.some((kw) => kw.length > 2 && norm.includes(kw))) return col;
    }
    return null;
  }

  const dateCol = findCol([
    "date",
    "txndate",
    "transactiondate",
    "valuedate",
    "valudate",
    "postdate",
    "bookingdate",
    "sleepday",
    "createdat",
  ]);
  const descCol = findCol([
    "description",
    "narration",
    "particulars",
    "remarks",
    "detail",
    "payee",
    "reference",
    "memo",
    "vendor",
    "merchant",
    "beneficiary",
  ]);
  const debitCol = findCol(["debit", "withdrawal", "dr", "outflow", "spent"]);
  const creditCol = findCol(["credit", "deposit", "cr", "inflow", "received"]);
  const balanceCol = findCol([
    "balance",
    "runningbalance",
    "closingbalance",
    "availablebalance",
  ]);
  const amountCol = findCol([
    "amount",
    "value",
    "transactionamount",
    "txnamount",
    "price",
    "cost",
  ]);

  return { dateCol, descCol, amountCol, debitCol, creditCol, balanceCol };
}

/** Parse statement amounts without losing accounting negatives or accepting infinity. */
export function parseStatementNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  let text = value.trim();
  if (!text || text === "-") return NaN;
  const accountingNegative = /^\(.*\)$/.test(text);
  if (accountingNegative) text = text.slice(1, -1);
  text = text.replace(/^(?:USD|NGN|GBP|EUR)\s*/i, "").replace(/[$£€₦,\s]/g, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
  const number = Number(text);
  return Number.isFinite(number)
    ? accountingNegative
      ? -Math.abs(number)
      : number
    : NaN;
}

export function smartParseDate(raw: string): string {
  let s = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) s = s.split("T")[0];
  if (/\s\d{2}:\d{2}/.test(s)) s = s.split(/\s\d{2}:/)[0].trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  const slashDash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashDash) {
    const [, a, b, year] = slashDash;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);

    if (numA > 12) {
      return `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    }
    if (numB > 12) {
      return `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    }
    return `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }

  const ymdSlash = s.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (ymdSlash) {
    const [, year, month, day] = ymdSlash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const nativeAttempt = new Date(s);
  if (!isNaN(nativeAttempt.getTime())) {
    return nativeAttempt.toISOString().split("T")[0];
  }

  return s;
}

export function isStatementDateValid(value: unknown): boolean {
  if (value == null || String(value).trim() === "") return false;
  const date = smartParseDate(String(value));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}
