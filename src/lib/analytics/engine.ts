import {
  detectColumns,
  parseStatementNumber,
  smartParseDate,
} from "./statement-fields";
import {
  categorizeTransaction,
  normalizeMerchantName,
  type TransactionCategory,
} from "./category-engine";
import { calculateStats, type StatisticalSummary } from "./stats";
import {
  detectDocumentCurrency,
  formatCurrency,
  type CurrencyConfig,
} from "./currency-detector";
import {
  validateStatementData,
  type ValidationReport,
  type ValidatedStatementData,
} from "./data-validator";
import {
  classifyDocumentType,
  type ClassificationResult,
} from "./document-classifier";
import {
  forecastBalanceML,
  type MLForecastResult,
} from "../ml/time-series-forecaster";
import { detectAnomaliesML, type MLAnomalyScore } from "../ml/anomaly-detector";
import {
  classifyTextML,
  type MLCategoryPrediction,
} from "../ml/text-classifier";

// ─── Core Transaction Type ──────────────────────────────────────────
export interface EnrichedTransaction {
  id: string;
  date: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  weekLabel: string; // "2024-W03"
  monthLabel: string; // "2024-01"
  description: string;
  rawDescription: string;
  category: TransactionCategory;
  amount: number;
  type: "debit" | "credit";
  balance?: number;
  isDuplicate?: boolean;
  isRecurring?: boolean;
  isAnomaly?: boolean;
}

// ─── Aggregation Types ──────────────────────────────────────────────
export interface CategoryAggregate {
  category: TransactionCategory;
  total: number;
  percentage: number;
  count: number;
  avgPerTransaction: number;
  color: string;
}

export interface MerchantAggregate {
  merchant: string;
  total: number;
  percentage: number;
  count: number;
  avgPerVisit: number;
  category: TransactionCategory;
}

export interface MonthlyBreakdown {
  month: string; // "2024-01"
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  savingsRate: number;
}

export interface YearlyBreakdown {
  year: string; // "2026"
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  savingsRate: number;
}

export interface WeeklyBreakdown {
  week: string;
  income: number;
  expenses: number;
  net: number;
}

export interface DayOfWeekBreakdown {
  day: string; // "Mon", "Tue", etc.
  dayIndex: number;
  totalSpent: number;
  avgSpent: number;
  transactionCount: number;
}

export interface TimeSeriesPoint {
  date: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  runningBalance: number;
}

export interface IncomeStream {
  source: string;
  total: number;
  count: number;
  avgAmount: number;
  percentage: number;
  isRecurring: boolean;
}

export interface AnomalyItem {
  id: string;
  type:
    | "duplicate"
    | "spike"
    | "recurring"
    | "large_withdrawal"
    | "inactive_period";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  date: string;
  amount: number;
}

export interface ChannelAnalytics {
  count: number;
  total: number;
  avgAmount: number;
  percentageOfExpenses: number;
}

export interface ProcessingOptions {
  excludeTransfers?: boolean;
  categoryOverrides?: Record<string, TransactionCategory>;
}

// ─── Main Analytics Result ──────────────────────────────────────────
export interface BankStatementAnalytics {
  currency: CurrencyConfig;
  statementPeriod: { start: string; end: string };
  options: ProcessingOptions;
  validationReport: ValidationReport;
  classification: ClassificationResult;

  // ── Balance Dynamics ──
  openingBalance: number;
  closingBalance: number;
  currentBalance: number;
  highestBalance: number;
  lowestBalance: number;
  avgDailyBalance: number;
  balanceVolatility: number; // Coefficient of Variation (stdDev / mean)

  // ── Overview & Cash Flow ──
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  incomeToExpenseRatio: number;

  // Operating vs Gross
  operatingIncome: number;
  operatingExpenses: number;
  operatingCashFlow: number;
  transferVolume: number;

  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  avgTransactionValue: number;
  medianTransaction: number;
  largestCredit: { amount: number; description: string; date: string } | null;
  largestDebit: { amount: number; description: string; date: string } | null;
  smallestDebit: { amount: number; description: string; date: string } | null;
  avgDailySpending: number;
  avgDailyIncome: number;
  activeDaysCount: number;
  daysSpan: number;

  // ── Growth Rates & Streaks ──
  monthlyGrowthRate: number | null;
  weeklyGrowthRate: number | null;
  dailyGrowthRate: number | null;
  longestSpendingStreak: number; // consecutive days with debits > 0
  longestIncomeStreak: number; // consecutive days with credits > 0

  // ── Channel Analytics ──
  atmUsage: ChannelAnalytics;
  posUsage: ChannelAnalytics;
  cashWithdrawalUsage: ChannelAnalytics;
  transferUsage: ChannelAnalytics;

  // ── Merchant Concentration ──
  top3MerchantShare: number; // % of total expenses
  top5MerchantShare: number; // % of total expenses
  merchantHHI: number; // Herfindahl-Hirschman Index (0 - 10,000)

  // ── Statistical Profile ──
  expenseStats: StatisticalSummary;
  incomeStats: StatisticalSummary;

  // ── Cash Flow Trajectory ──
  timeSeries: TimeSeriesPoint[];
  yearlyBreakdown: YearlyBreakdown[];
  monthlyBreakdown: MonthlyBreakdown[];
  weeklyBreakdown: WeeklyBreakdown[];
  dayOfWeekBreakdown: DayOfWeekBreakdown[];
  positiveDaysCount: number;
  negativeDaysCount: number;
  neutralDaysCount: number;
  bestFinancialDay: { date: string; net: number } | null;
  worstFinancialDay: { date: string; net: number } | null;
  bestMonth: MonthlyBreakdown | null;
  worstMonth: MonthlyBreakdown | null;
  cashFlowTrend: "improving" | "declining" | "stable";

  // ── Income Analysis ──
  salaryInfo: {
    detected: boolean;
    employer: string;
    avgAmount: number;
    frequency: string;
    totalSalary: number;
    paydates: string[];
  };
  incomeStreams: IncomeStream[];
  largestIncomeSource: { source: string; total: number } | null;
  incomeConcentration: number; // % from top source

  // ── Expense Analysis ──
  categoryBreakdown: CategoryAggregate[];
  topMerchants: MerchantAggregate[];
  largestExpense: { amount: number; description: string; date: string } | null;
  avgExpense: number;
  weekdayVsWeekendSpending: {
    weekday: number;
    weekend: number;
    weekdayPct: number;
    weekendPct: number;
  };
  monthOverMonthExpenseChange: number | null;

  // ── Transaction & Anomaly Detection ──
  enrichedTransactions: EnrichedTransaction[];
  anomalies: AnomalyItem[];
  recurringSubscriptions: {
    description: string;
    amount: number;
    frequency: string;
    category: TransactionCategory;
  }[];
  inactivePeriods: { startDate: string; endDate: string; daysGap: number }[];

  // ── Client-Side ML Model Predictions ──
  mlForecast: MLForecastResult;
  mlAnomalyScores: MLAnomalyScore[];
}

// ═══════════════════════════════════════════════════════════════════
//  SMART COLUMN DETECTOR
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
//  CORE ANALYTICS PROCESSOR
// ═══════════════════════════════════════════════════════════════════

export function processBankStatement(
  rawRows: Record<string, unknown>[],
  fileName = "",
  options: ProcessingOptions = {},
): BankStatementAnalytics {
  // ── 0. Pre-Analysis Data Validation & Classification ──
  const validationResult = validateStatementData(rawRows);
  const { cleanRows, report: validationReport } = validationResult;
  const classification = classifyDocumentType(cleanRows, fileName);

  if (!cleanRows || cleanRows.length === 0) {
    return createEmptyAnalytics(options, validationReport, classification);
  }

  const currency = detectDocumentCurrency(cleanRows, fileName);
  const cols = detectColumns(cleanRows);

  // ── 1. Enrich & Standardize Transactions ──
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const enriched: EnrichedTransaction[] = cleanRows.map((r, idx) => {
    const txId = `tx_${idx + 1}`;
    const rawDateVal = cols.dateCol
      ? r[cols.dateCol]
      : (r.Date ?? r.date ?? r.Sleep_Day ?? r.txn_date);
    const rawDate = String(rawDateVal ?? new Date().toISOString());
    let cleanDate = smartParseDate(rawDate.trim());

    const parsedDate = new Date(cleanDate);
    const dayOfWeek = !isNaN(parsedDate.getTime()) ? parsedDate.getDay() : 0;
    const yearMonth = cleanDate.substring(0, 7); // "2024-01"
    const weekNum = !isNaN(parsedDate.getTime()) ? getISOWeek(parsedDate) : 1;
    const weekLabel = `${cleanDate.substring(0, 4)}-W${String(weekNum).padStart(2, "0")}`;

    const rawDescVal = cols.descCol
      ? r[cols.descCol]
      : (r.Description ?? r.description ?? r.Payee ?? r.Vendor ?? r.Category);
    const rawDesc = String(rawDescVal ?? "Transaction").trim();
    const normalizedDesc = normalizeMerchantName(rawDesc);

    const getNum = (key: string | null): number => {
      if (!key) return NaN;
      return parseStatementNumber(r[key]);
    };

    const amtNum = getNum(cols.amountCol);
    const debitNum = getNum(cols.debitCol);
    const creditNum = getNum(cols.creditCol);
    const balanceNum = getNum(cols.balanceCol);

    let type: "debit" | "credit" = "debit";
    let amount = 0;

    if (!isNaN(creditNum) && creditNum > 0) {
      type = "credit";
      amount = creditNum;
    } else if (!isNaN(debitNum) && debitNum > 0) {
      type = "debit";
      amount = debitNum;
    } else if (!isNaN(amtNum)) {
      if (amtNum > 0) {
        type = "credit";
        amount = amtNum;
      } else if (amtNum < 0) {
        type = "debit";
        amount = Math.abs(amtNum);
      }
    }

    const overriddenCat =
      options.categoryOverrides?.[txId] ||
      options.categoryOverrides?.[rawDesc] ||
      options.categoryOverrides?.[normalizedDesc];

    const category =
      overriddenCat || categorizeTransaction(rawDesc, type === "credit");

    return {
      id: txId,
      date: cleanDate,
      dayOfWeek,
      weekLabel,
      monthLabel: yearMonth,
      description: normalizedDesc,
      rawDescription: rawDesc,
      category,
      amount: round2(amount),
      type,
      balance: !isNaN(balanceNum) ? round2(balanceNum) : undefined,
    };
  });

  // Sort chronologically
  enriched.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const validTxs = enriched.filter((tx) => tx.amount > 0);
  const creditTxs = validTxs.filter((t) => t.type === "credit");
  const debitTxs = validTxs.filter((t) => t.type === "debit");

  // ── 2. Overview Metrics & Operating vs Gross ──
  let grossIncome = 0;
  let grossExpenses = 0;
  let transferIncome = 0;
  let transferExpenses = 0;

  creditTxs.forEach((tx) => {
    grossIncome += tx.amount;
    if (tx.category === "Transfer") transferIncome += tx.amount;
  });
  debitTxs.forEach((tx) => {
    grossExpenses += tx.amount;
    if (tx.category === "Transfer") transferExpenses += tx.amount;
  });

  const operatingIncome = round2(grossIncome - transferIncome);
  const operatingExpenses = round2(grossExpenses - transferExpenses);
  const operatingCashFlow = round2(operatingIncome - operatingExpenses);
  const transferVolume = round2(transferIncome + transferExpenses);

  const excludeTransfers = options.excludeTransfers ?? false;
  const totalIncome = excludeTransfers ? operatingIncome : round2(grossIncome);
  const totalExpenses = excludeTransfers
    ? operatingExpenses
    : round2(grossExpenses);
  const netCashFlow = round2(totalIncome - totalExpenses);
  const incomeToExpenseRatio =
    totalExpenses > 0
      ? round2(totalIncome / totalExpenses)
      : totalIncome > 0
        ? 99
        : 0;

  const largestCredit =
    creditTxs.length > 0
      ? (() => {
          const t = creditTxs.reduce((a, b) => (b.amount > a.amount ? b : a));
          return { amount: t.amount, description: t.description, date: t.date };
        })()
      : null;
  const largestDebit =
    debitTxs.length > 0
      ? (() => {
          const t = debitTxs.reduce((a, b) => (b.amount > a.amount ? b : a));
          return { amount: t.amount, description: t.description, date: t.date };
        })()
      : null;
  const smallestDebit =
    debitTxs.length > 0
      ? (() => {
          const t = debitTxs.reduce((a, b) => (b.amount < a.amount ? b : a));
          return { amount: t.amount, description: t.description, date: t.date };
        })()
      : null;

  const totalTransactions = validTxs.length;
  const avgTransactionValue =
    totalTransactions > 0
      ? (totalIncome + totalExpenses) / totalTransactions
      : 0;

  // Statistical profiles
  const expenseStats = calculateStats(debitTxs.map((t) => t.amount));
  const incomeStats = calculateStats(creditTxs.map((t) => t.amount));
  const allAmounts = validTxs.map((t) => t.amount).sort((a, b) => a - b);
  const medianTransaction =
    allAmounts.length > 0 ? allAmounts[Math.floor(allAmounts.length / 2)] : 0;

  // ── 3. Daily, Weekly, Monthly Aggregation ──
  const dailyMap = new Map<string, { income: number; expenses: number }>();
  const monthlyMap = new Map<
    string,
    { income: number; expenses: number; txCount: number }
  >();
  const weeklyMap = new Map<string, { income: number; expenses: number }>();
  const dayOfWeekMap = new Map<
    number,
    { totalSpent: number; txCount: number }
  >();

  validTxs.forEach((tx) => {
    // Daily
    const dd = dailyMap.get(tx.date) || { income: 0, expenses: 0 };
    if (tx.type === "credit") dd.income += tx.amount;
    else dd.expenses += tx.amount;
    dailyMap.set(tx.date, dd);

    // Monthly
    const mm = monthlyMap.get(tx.monthLabel) || {
      income: 0,
      expenses: 0,
      txCount: 0,
    };
    if (tx.type === "credit") mm.income += tx.amount;
    else mm.expenses += tx.amount;
    mm.txCount++;
    monthlyMap.set(tx.monthLabel, mm);

    // Weekly
    const ww = weeklyMap.get(tx.weekLabel) || { income: 0, expenses: 0 };
    if (tx.type === "credit") ww.income += tx.amount;
    else ww.expenses += tx.amount;
    weeklyMap.set(tx.weekLabel, ww);

    // Day-of-week
    if (tx.type === "debit") {
      const dow = dayOfWeekMap.get(tx.dayOfWeek) || {
        totalSpent: 0,
        txCount: 0,
      };
      dow.totalSpent += tx.amount;
      dow.txCount++;
      dayOfWeekMap.set(tx.dayOfWeek, dow);
    }
  });

  // Category & Merchant aggregation
  const categoryMap = new Map<
    TransactionCategory,
    { total: number; count: number }
  >();
  const merchantMap = new Map<
    string,
    { total: number; count: number; category: TransactionCategory }
  >();

  debitTxs.forEach((tx) => {
    const cc = categoryMap.get(tx.category) || { total: 0, count: 0 };
    cc.total += tx.amount;
    cc.count++;
    categoryMap.set(tx.category, cc);

    const mc = merchantMap.get(tx.description) || {
      total: 0,
      count: 0,
      category: tx.category,
    };
    mc.total += tx.amount;
    mc.count++;
    merchantMap.set(tx.description, mc);
  });

  // ── 4. Time Series & Balance Dynamics ──
  const sortedDates = Array.from(dailyMap.keys()).sort();
  const statementPeriod = {
    start: sortedDates[0] || "",
    end: sortedDates[sortedDates.length - 1] || "",
  };

  let daysSpan = 1;
  if (sortedDates.length > 1) {
    const firstMs = new Date(sortedDates[0]).getTime();
    const lastMs = new Date(sortedDates[sortedDates.length - 1]).getTime();
    if (!isNaN(firstMs) && !isNaN(lastMs)) {
      daysSpan = Math.max(1, Math.round((lastMs - firstMs) / 86400000) + 1);
    } else {
      daysSpan = sortedDates.length;
    }
  }

  const avgDailySpending = totalExpenses / daysSpan;
  const avgDailyIncome = totalIncome / daysSpan;

  const hasBalanceData = validTxs.some((t) => t.balance !== undefined);
  const firstTxWithBalance = validTxs.find((t) => t.balance !== undefined);
  const lastTxWithBalance = [...validTxs]
    .reverse()
    .find((t) => t.balance !== undefined);

  let openingBalance = 0;
  let closingBalance = 0;

  if (hasBalanceData && firstTxWithBalance && lastTxWithBalance) {
    if (firstTxWithBalance.type === "credit") {
      openingBalance = firstTxWithBalance.balance! - firstTxWithBalance.amount;
    } else {
      openingBalance = firstTxWithBalance.balance! + firstTxWithBalance.amount;
    }
    closingBalance = lastTxWithBalance.balance!;
  }

  const dailyBalanceMap = new Map<string, number>();
  if (hasBalanceData) {
    validTxs.forEach((tx) => {
      if (tx.balance !== undefined) {
        dailyBalanceMap.set(tx.date, tx.balance);
      }
    });
  }

  let runBal = openingBalance;
  const runningBalancesList: number[] = [];

  const timeSeries: TimeSeriesPoint[] = sortedDates.map((d) => {
    const dayData = dailyMap.get(d)!;
    const net = dayData.income - dayData.expenses;

    if (dailyBalanceMap.has(d)) {
      runBal = dailyBalanceMap.get(d)!;
    } else {
      runBal += net;
    }

    runningBalancesList.push(runBal);

    return {
      date: d,
      income: round2(dayData.income),
      expenses: round2(dayData.expenses),
      netCashFlow: round2(net),
      runningBalance: round2(runBal),
    };
  });

  const highestBalance =
    runningBalancesList.length > 0
      ? round2(Math.max(...runningBalancesList))
      : openingBalance;
  const lowestBalance =
    runningBalancesList.length > 0
      ? round2(Math.min(...runningBalancesList))
      : openingBalance;
  const balanceStats = calculateStats(runningBalancesList);
  const avgDailyBalance = round2(balanceStats.mean);
  const balanceVolatility =
    balanceStats.mean > 0
      ? round2((balanceStats.stdDev / balanceStats.mean) * 100)
      : 0;

  // Best / Worst days
  let positiveDaysCount = 0;
  let negativeDaysCount = 0;
  let neutralDaysCount = 0;
  let bestFinancialDay: { date: string; net: number } | null = null;
  let worstFinancialDay: { date: string; net: number } | null = null;

  timeSeries.forEach((pt) => {
    if (pt.netCashFlow > 0) positiveDaysCount++;
    else if (pt.netCashFlow < 0) negativeDaysCount++;
    else neutralDaysCount++;

    if (
      !bestFinancialDay ||
      pt.netCashFlow > (bestFinancialDay as { date: string; net: number }).net
    ) {
      bestFinancialDay = { date: pt.date, net: pt.netCashFlow };
    }
    if (
      !worstFinancialDay ||
      pt.netCashFlow < (worstFinancialDay as { date: string; net: number }).net
    ) {
      worstFinancialDay = { date: pt.date, net: pt.netCashFlow };
    }
  });

  // ── 5. Yearly, Monthly & Weekly Breakdowns + Growth ──
  const yearlyMap = new Map<
    string,
    { income: number; expenses: number; txCount: number }
  >();
  validTxs.forEach((tx) => {
    const year = tx.date.split("-")[0] || "Unknown";
    const curr = yearlyMap.get(year) || { income: 0, expenses: 0, txCount: 0 };
    if (tx.type === "credit") curr.income += tx.amount;
    else curr.expenses += tx.amount;
    curr.txCount += 1;
    yearlyMap.set(year, curr);
  });

  const yearlyBreakdown: YearlyBreakdown[] = Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      income: round2(data.income),
      expenses: round2(data.expenses),
      net: round2(data.income - data.expenses),
      transactionCount: data.txCount,
      savingsRate:
        data.income > 0
          ? round2(((data.income - data.expenses) / data.income) * 100)
          : 0,
    }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const monthlyBreakdown: MonthlyBreakdown[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      income: round2(data.income),
      expenses: round2(data.expenses),
      net: round2(data.income - data.expenses),
      transactionCount: data.txCount,
      savingsRate:
        data.income > 0
          ? round2(((data.income - data.expenses) / data.income) * 100)
          : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const bestMonth =
    monthlyBreakdown.length > 0
      ? monthlyBreakdown.reduce((a, b) => (b.net > a.net ? b : a))
      : null;
  const worstMonth =
    monthlyBreakdown.length > 0
      ? monthlyBreakdown.reduce((a, b) => (b.net < a.net ? b : a))
      : null;

  let cashFlowTrend: "improving" | "declining" | "stable" = "stable";
  if (monthlyBreakdown.length >= 2) {
    const last = monthlyBreakdown[monthlyBreakdown.length - 1].net;
    const prev = monthlyBreakdown[monthlyBreakdown.length - 2].net;
    if (last > prev * 1.05) cashFlowTrend = "improving";
    else if (last < prev * 0.95) cashFlowTrend = "declining";
  }

  let monthOverMonthExpenseChange: number | null = null;
  let monthlyGrowthRate: number | null = null;
  if (monthlyBreakdown.length >= 2) {
    const lastExp = monthlyBreakdown[monthlyBreakdown.length - 1].expenses;
    const prevExp = monthlyBreakdown[monthlyBreakdown.length - 2].expenses;
    if (prevExp > 0)
      monthOverMonthExpenseChange = round2(
        ((lastExp - prevExp) / prevExp) * 100,
      );

    const lastNet = monthlyBreakdown[monthlyBreakdown.length - 1].net;
    const prevNet = monthlyBreakdown[monthlyBreakdown.length - 2].net;
    if (prevNet !== 0)
      monthlyGrowthRate = round2(
        ((lastNet - prevNet) / Math.abs(prevNet)) * 100,
      );
  }

  const weeklyBreakdown: WeeklyBreakdown[] = Array.from(weeklyMap.entries())
    .map(([week, data]) => ({
      week,
      income: round2(data.income),
      expenses: round2(data.expenses),
      net: round2(data.income - data.expenses),
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  let weeklyGrowthRate: number | null = null;
  if (weeklyBreakdown.length >= 2) {
    const lastW = weeklyBreakdown[weeklyBreakdown.length - 1].net;
    const prevW = weeklyBreakdown[weeklyBreakdown.length - 2].net;
    if (prevW !== 0)
      weeklyGrowthRate = round2(((lastW - prevW) / Math.abs(prevW)) * 100);
  }

  let dailyGrowthRate: number | null = null;
  if (timeSeries.length >= 2) {
    const lastD = timeSeries[timeSeries.length - 1].netCashFlow;
    const prevD = timeSeries[timeSeries.length - 2].netCashFlow;
    if (prevD !== 0)
      dailyGrowthRate = round2(((lastD - prevD) / Math.abs(prevD)) * 100);
  }

  // Streaks (Longest spending & income streaks)
  let longestSpendingStreak = 0;
  let currentSpendStreak = 0;
  let longestIncomeStreak = 0;
  let currentIncomeStreak = 0;

  timeSeries.forEach((pt) => {
    if (pt.expenses > 0) {
      currentSpendStreak++;
      longestSpendingStreak = Math.max(
        longestSpendingStreak,
        currentSpendStreak,
      );
    } else {
      currentSpendStreak = 0;
    }

    if (pt.income > 0) {
      currentIncomeStreak++;
      longestIncomeStreak = Math.max(longestIncomeStreak, currentIncomeStreak);
    } else {
      currentIncomeStreak = 0;
    }
  });

  // ── 6. Day-of-Week Breakdown ──
  const dayOfWeekBreakdown: DayOfWeekBreakdown[] = DAY_NAMES.map((day, idx) => {
    const data = dayOfWeekMap.get(idx) || { totalSpent: 0, txCount: 0 };
    return {
      day,
      dayIndex: idx,
      totalSpent: round2(data.totalSpent),
      avgSpent: data.txCount > 0 ? round2(data.totalSpent / data.txCount) : 0,
      transactionCount: data.txCount,
    };
  });

  let weekdaySpend = 0;
  let weekendSpend = 0;
  debitTxs.forEach((tx) => {
    if (tx.dayOfWeek === 0 || tx.dayOfWeek === 6) weekendSpend += tx.amount;
    else weekdaySpend += tx.amount;
  });
  const totalSpend = weekdaySpend + weekendSpend;

  // ── 7. Channel Analytics (ATM, POS, Cash, Transfer) ──
  const buildChannelAnalytics = (
    filterFn: (tx: EnrichedTransaction) => boolean,
  ): ChannelAnalytics => {
    const matches = debitTxs.filter(filterFn);
    const count = matches.length;
    const total = round2(matches.reduce((a, b) => a + b.amount, 0));
    const avgAmount = count > 0 ? round2(total / count) : 0;
    const percentageOfExpenses =
      totalExpenses > 0 ? round2((total / totalExpenses) * 100) : 0;
    return { count, total, avgAmount, percentageOfExpenses };
  };

  const atmUsage = buildChannelAnalytics(
    (t) =>
      t.category === "ATM" || t.rawDescription.toLowerCase().includes("atm"),
  );
  const posUsage = buildChannelAnalytics(
    (t) =>
      t.category === "POS" || t.rawDescription.toLowerCase().includes("pos"),
  );
  const cashWithdrawalUsage = buildChannelAnalytics(
    (t) =>
      t.category === "Cash Withdrawal" ||
      t.rawDescription.toLowerCase().includes("cash"),
  );
  const transferUsage = buildChannelAnalytics(
    (t) =>
      t.category === "Transfer" ||
      t.rawDescription.toLowerCase().includes("transfer"),
  );

  // ── 8. Category & Merchant Aggregates + HHI Index ──
  const categoryBreakdown: CategoryAggregate[] = Array.from(
    categoryMap.entries(),
  )
    .map(([category, { total, count }]) => ({
      category: category as TransactionCategory,
      total: round2(total),
      percentage: totalExpenses > 0 ? round2((total / totalExpenses) * 100) : 0,
      count,
      avgPerTransaction: count > 0 ? round2(total / count) : 0,
      color: getCategoryColor(category as TransactionCategory),
    }))
    .sort((a, b) => b.total - a.total);

  const allMerchants: MerchantAggregate[] = Array.from(merchantMap.entries())
    .map(([merchant, { total, count, category }]) => ({
      merchant,
      total: round2(total),
      percentage: totalExpenses > 0 ? round2((total / totalExpenses) * 100) : 0,
      count,
      avgPerVisit: count > 0 ? round2(total / count) : 0,
      category,
    }))
    .sort((a, b) => b.total - a.total);

  const topMerchants = allMerchants.slice(0, 10);
  const top3MerchantShare = allMerchants
    .slice(0, 3)
    .reduce((a, b) => a + b.percentage, 0);
  const top5MerchantShare = allMerchants
    .slice(0, 5)
    .reduce((a, b) => a + b.percentage, 0);
  const merchantHHI = round2(
    allMerchants.reduce((acc, m) => acc + Math.pow(m.percentage, 2), 0),
  );

  // ── 9. Income Analysis ──
  const salaryTxs = creditTxs.filter((tx) => tx.category === "Salary");
  const totalSalary = salaryTxs.reduce((a, b) => a + b.amount, 0);
  const salaryEmployer = salaryTxs[0]?.description || "Primary Employer";
  const salaryInfo = {
    detected: salaryTxs.length > 0,
    employer: salaryEmployer,
    avgAmount:
      salaryTxs.length > 0 ? round2(totalSalary / salaryTxs.length) : 0,
    frequency:
      salaryTxs.length >= 3
        ? "Monthly"
        : salaryTxs.length >= 1
          ? "Periodic"
          : "None",
    totalSalary: round2(totalSalary),
    paydates: salaryTxs.map((t) => t.date),
  };

  const incomeMap = new Map<string, { total: number; count: number }>();
  creditTxs.forEach((tx) => {
    const im = incomeMap.get(tx.description) || { total: 0, count: 0 };
    im.total += tx.amount;
    im.count++;
    incomeMap.set(tx.description, im);
  });
  const incomeStreams: IncomeStream[] = Array.from(incomeMap.entries())
    .map(([source, { total, count }]) => ({
      source,
      total: round2(total),
      count,
      avgAmount: round2(total / count),
      percentage: totalIncome > 0 ? round2((total / totalIncome) * 100) : 0,
      isRecurring: count >= 2,
    }))
    .sort((a, b) => b.total - a.total);

  const largestIncomeSource =
    incomeStreams.length > 0
      ? { source: incomeStreams[0].source, total: incomeStreams[0].total }
      : null;
  const incomeConcentration =
    incomeStreams.length > 0 ? incomeStreams[0].percentage : 0;

  // ── 10. Anomaly Detection ──
  const anomalies: AnomalyItem[] = [];
  const spikeThreshold = expenseStats.mean + 2.5 * expenseStats.stdDev;

  for (let i = 0; i < validTxs.length; i++) {
    const tx = validTxs[i];

    if (
      tx.type === "debit" &&
      tx.amount > spikeThreshold &&
      debitTxs.length >= 5
    ) {
      tx.isAnomaly = true;
      anomalies.push({
        id: `anom_spike_${tx.id}`,
        type: "spike",
        severity: tx.amount > expenseStats.mean * 5 ? "high" : "medium",
        title: "Unusual Spending Spike",
        description: `${tx.description} (${formatCurrency(tx.amount, currency)}) is ${(tx.amount / (expenseStats.mean || 1)).toFixed(1)}x average debit of ${formatCurrency(expenseStats.mean, currency)}.`,
        date: tx.date,
        amount: tx.amount,
      });
    }

    for (let j = i + 1; j < validTxs.length; j++) {
      const tx2 = validTxs[j];
      const daysDiff =
        Math.abs(new Date(tx2.date).getTime() - new Date(tx.date).getTime()) /
        86400000;
      if (daysDiff > 3) break;
      if (
        tx.description.toLowerCase() === tx2.description.toLowerCase() &&
        tx.amount === tx2.amount &&
        tx.type === tx2.type
      ) {
        tx.isDuplicate = true;
        tx2.isDuplicate = true;
        anomalies.push({
          id: `anom_dup_${tx2.id}`,
          type: "duplicate",
          severity: "medium",
          title: "Potential Duplicate",
          description: `${tx.type === "credit" ? "Credit" : "Debit"} of ${formatCurrency(tx.amount, currency)} to "${tx.description}" appears twice within ${Math.round(daysDiff)} day(s).`,
          date: tx2.date,
          amount: tx2.amount,
        });
      }
    }

    if (
      tx.type === "debit" &&
      incomeStats.median > 0 &&
      tx.amount > incomeStats.median * 0.5 &&
      !tx.isAnomaly
    ) {
      anomalies.push({
        id: `anom_large_${tx.id}`,
        type: "large_withdrawal",
        severity: tx.amount > incomeStats.median ? "high" : "low",
        title: "Large Single Withdrawal",
        description: `${tx.description} (${formatCurrency(tx.amount, currency)}) represents ${((tx.amount / incomeStats.median) * 100).toFixed(0)}% of your median income.`,
        date: tx.date,
        amount: tx.amount,
      });
    }
  }

  const inactivePeriods: {
    startDate: string;
    endDate: string;
    daysGap: number;
  }[] = [];
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const gap = Math.round(
      (new Date(sortedDates[i + 1]).getTime() -
        new Date(sortedDates[i]).getTime()) /
        86400000,
    );
    if (gap > 4) {
      inactivePeriods.push({
        startDate: sortedDates[i],
        endDate: sortedDates[i + 1],
        daysGap: gap,
      });
      anomalies.push({
        id: `anom_gap_${i}`,
        type: "inactive_period",
        severity: gap > 14 ? "high" : "low",
        title: `${gap}-Day Activity Gap`,
        description: `No transactions recorded between ${sortedDates[i]} and ${sortedDates[i + 1]}.`,
        date: sortedDates[i],
        amount: 0,
      });
    }
  }

  const recurringSubscriptions: {
    description: string;
    amount: number;
    frequency: string;
    category: TransactionCategory;
  }[] = [];
  merchantMap.forEach(({ count, total, category }, merchant) => {
    if (count >= 2) {
      const amounts = debitTxs
        .filter((t) => t.description === merchant)
        .map((t) => t.amount);
      const stdDevCheck = calculateStats(amounts);
      const isConsistent =
        stdDevCheck.mean > 0 && stdDevCheck.stdDev / stdDevCheck.mean < 0.15;
      if (isConsistent || category === "Subscription" || count >= 3) {
        recurringSubscriptions.push({
          description: merchant,
          amount: round2(total / count),
          frequency:
            count >= 6 ? "Weekly" : count >= 2 ? "Monthly" : "Periodic",
          category,
        });
      }
    }
  });

  anomalies.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });

  return {
    currency,
    statementPeriod,
    options,
    validationReport,
    classification,

    openingBalance: round2(openingBalance),
    closingBalance: round2(closingBalance),
    currentBalance: round2(closingBalance),
    highestBalance,
    lowestBalance,
    avgDailyBalance,
    balanceVolatility,

    totalIncome: round2(totalIncome),
    totalExpenses: round2(totalExpenses),
    netCashFlow: round2(netCashFlow),
    incomeToExpenseRatio,

    operatingIncome,
    operatingExpenses,
    operatingCashFlow,
    transferVolume,

    totalTransactions,
    totalCredits: creditTxs.length,
    totalDebits: debitTxs.length,
    avgTransactionValue: round2(avgTransactionValue),
    medianTransaction: round2(medianTransaction),
    largestCredit,
    largestDebit,
    smallestDebit,
    avgDailySpending: round2(avgDailySpending),
    avgDailyIncome: round2(avgDailyIncome),
    activeDaysCount: sortedDates.length,
    daysSpan,

    monthlyGrowthRate,
    weeklyGrowthRate,
    dailyGrowthRate,
    longestSpendingStreak,
    longestIncomeStreak,

    atmUsage,
    posUsage,
    cashWithdrawalUsage,
    transferUsage,

    top3MerchantShare: round2(top3MerchantShare),
    top5MerchantShare: round2(top5MerchantShare),
    merchantHHI,

    expenseStats,
    incomeStats,

    timeSeries,
    yearlyBreakdown,
    monthlyBreakdown,
    weeklyBreakdown,
    dayOfWeekBreakdown,
    positiveDaysCount,
    negativeDaysCount,
    neutralDaysCount,
    bestFinancialDay,
    worstFinancialDay,
    bestMonth,
    worstMonth,
    cashFlowTrend,

    salaryInfo,
    incomeStreams: incomeStreams.slice(0, 10),
    largestIncomeSource,
    incomeConcentration: round2(incomeConcentration),

    categoryBreakdown,
    topMerchants,
    largestExpense: largestDebit,
    avgExpense: expenseStats.mean,
    weekdayVsWeekendSpending: {
      weekday: round2(weekdaySpend),
      weekend: round2(weekendSpend),
      weekdayPct:
        totalSpend > 0 ? round2((weekdaySpend / totalSpend) * 100) : 0,
      weekendPct:
        totalSpend > 0 ? round2((weekendSpend / totalSpend) * 100) : 0,
    },
    monthOverMonthExpenseChange,

    enrichedTransactions: validTxs,
    anomalies: anomalies.slice(0, 10),
    recurringSubscriptions: recurringSubscriptions.slice(0, 10),
    inactivePeriods,

    // Client-Side ML Model Computations
    mlForecast: forecastBalanceML(timeSeries),
    mlAnomalyScores: detectAnomaliesML(validTxs),
  };
}

// ─── Utilities ──────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}

function getCategoryColor(category: TransactionCategory): string {
  const colors: Record<TransactionCategory, string> = {
    Salary: "#10b981",
    Transfer: "#6366f1",
    Groceries: "#f59e0b",
    Transport: "#06b6d4",
    Utilities: "#8b5cf6",
    Entertainment: "#ec4899",
    Shopping: "#3b82f6",
    Healthcare: "#ef4444",
    Restaurants: "#f97316",
    Bills: "#64748b",
    ATM: "#14b8a6",
    POS: "#0284c7",
    "Cash Withdrawal": "#0d9488",
    Investment: "#84cc16",
    Loan: "#dc2626",
    Insurance: "#4f46e5",
    Subscription: "#a855f7",
    Education: "#38bdf8",
    Travel: "#eab308",
    Other: "#94a3b8",
  };
  return colors[category] || "#94a3b8";
}

function createEmptyAnalytics(
  options: ProcessingOptions = {},
  validationReport?: ValidationReport,
  classification?: ClassificationResult,
): BankStatementAnalytics {
  const emptyCurrency = { symbol: "$", code: "USD", locale: "en-US" };
  const emptyStats: StatisticalSummary = {
    count: 0,
    mean: 0,
    median: 0,
    min: 0,
    max: 0,
    sum: 0,
    stdDev: 0,
    variance: 0,
    p25: 0,
    p75: 0,
    iqr: 0,
    outliers: [],
  };
  const emptyChannel = {
    count: 0,
    total: 0,
    avgAmount: 0,
    percentageOfExpenses: 0,
  };
  const defaultValidation: ValidationReport = {
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
  };
  const defaultClassification: ClassificationResult = {
    documentType: "Generic CSV/Excel Dataset",
    confidenceScore: 50,
    detectedFeatures: [],
    recommendedEngine: "general_dataset",
  };

  return {
    currency: emptyCurrency,
    statementPeriod: { start: "", end: "" },
    options,
    validationReport: validationReport || defaultValidation,
    classification: classification || defaultClassification,

    openingBalance: 0,
    closingBalance: 0,
    currentBalance: 0,
    highestBalance: 0,
    lowestBalance: 0,
    avgDailyBalance: 0,
    balanceVolatility: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    incomeToExpenseRatio: 0,
    operatingIncome: 0,
    operatingExpenses: 0,
    operatingCashFlow: 0,
    transferVolume: 0,
    totalTransactions: 0,
    totalCredits: 0,
    totalDebits: 0,
    avgTransactionValue: 0,
    medianTransaction: 0,
    largestCredit: null,
    largestDebit: null,
    smallestDebit: null,
    avgDailySpending: 0,
    avgDailyIncome: 0,
    activeDaysCount: 0,
    daysSpan: 0,

    monthlyGrowthRate: null,
    weeklyGrowthRate: null,
    dailyGrowthRate: null,
    longestSpendingStreak: 0,
    longestIncomeStreak: 0,

    atmUsage: emptyChannel,
    posUsage: emptyChannel,
    cashWithdrawalUsage: emptyChannel,
    transferUsage: emptyChannel,

    top3MerchantShare: 0,
    top5MerchantShare: 0,
    merchantHHI: 0,

    expenseStats: emptyStats,
    incomeStats: emptyStats,
    timeSeries: [],
    yearlyBreakdown: [],
    monthlyBreakdown: [],
    weeklyBreakdown: [],
    dayOfWeekBreakdown: [],
    positiveDaysCount: 0,
    negativeDaysCount: 0,
    neutralDaysCount: 0,
    bestFinancialDay: null,
    worstFinancialDay: null,
    bestMonth: null,
    worstMonth: null,
    cashFlowTrend: "stable",
    salaryInfo: {
      detected: false,
      employer: "",
      avgAmount: 0,
      frequency: "None",
      totalSalary: 0,
      paydates: [],
    },
    incomeStreams: [],
    largestIncomeSource: null,
    incomeConcentration: 0,
    categoryBreakdown: [],
    topMerchants: [],
    largestExpense: null,
    avgExpense: 0,
    weekdayVsWeekendSpending: {
      weekday: 0,
      weekend: 0,
      weekdayPct: 0,
      weekendPct: 0,
    },
    monthOverMonthExpenseChange: null,
    enrichedTransactions: [],
    anomalies: [],
    recurringSubscriptions: [],
    inactivePeriods: [],
    mlForecast: {
      rSquared: 0,
      dailySlope: 0,
      projectedBalance30Days: 0,
      trendDirection: "flat",
      confidenceRating: 50,
      forecastPoints: [],
    },
    mlAnomalyScores: [],
  };
}
