"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ShieldCheck,
  Zap,
  Upload,
  Search,
  Award,
  Calendar,
  Building2,
  BarChart3,
  Activity,
  Download,
  Printer,
  ArrowRightLeft,
  RotateCcw,
  FileCheck,
  LayoutDashboard,
  PieChart as PieIcon,
  Receipt,
  Cpu,
  LineChart as LineIcon,
  Star,
  Home as HomeIcon,
  ArrowLeft,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from "recharts";
import { getDailyCashFlowLayout } from "@/lib/charts/daily-cash-flow";
import { Brand } from "@/components/shared/Brand";
import { useDataStore } from "@/stores/data-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { processBankStatement } from "@/lib/analytics/engine";
import { calculateFinancialHealthScore } from "@/lib/insights/health-score";
import { generateSmartInsights } from "@/lib/insights/insights";
import { formatCurrency } from "@/lib/analytics/currency-detector";
import { type TransactionCategory } from "@/lib/analytics/category-engine";
import { classifyTextML } from "@/lib/ml/text-classifier";
import { classifyTransactionML } from "@/lib/ml/transaction-classifier";

const ALL_CATEGORIES: TransactionCategory[] = [
  "Salary",
  "Transfer",
  "Groceries",
  "Transport",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Restaurants",
  "Bills",
  "ATM",
  "POS",
  "Cash Withdrawal",
  "Investment",
  "Loan",
  "Insurance",
  "Subscription",
  "Education",
  "Travel",
  "Other",
];

const CHART_COLORS = [
  "#145c37",
  "#86b73d",
  "#badc70",
  "#397f68",
  "#d6ed9e",
  "#517d2b",
  "#94b4a4",
  "#d8c885",
];
const TABS = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "A clearer view of your financial story.",
  },
  {
    id: "cashflow",
    label: "Cash flow",
    icon: BarChart3,
    description: "Follow your income, spending, and balances over time.",
  },
  {
    id: "income",
    label: "Income analysis",
    icon: Building2,
    description: "Understand the sources behind your income.",
  },
  {
    id: "categories",
    label: "Spending",
    icon: PieIcon,
    description: "See where your money goes, category by category.",
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: Receipt,
    description: "Explore and refine the ledger behind your insights.",
  },
  {
    id: "ml",
    label: "Forecasts & signals",
    icon: Cpu,
    description: "Explore historical patterns and signals worth a closer look.",
  },
] as const;
type TabId = (typeof TABS)[number]["id"];

interface FintechDashboardProps {
  onReturnHome?: () => void;
  onUploadNew?: () => void;
}

export function FintechDashboard({
  onReturnHome,
  onUploadNew,
}: FintechDashboardProps) {
  const dataset = useDataStore((s) => s.dataset);
  const clearDataset = useDataStore((s) => s.clearDataset);
  const resetDashboard = useDashboardStore((s) => s.reset);

  const excludeTransfers = useDashboardStore((s) => s.excludeTransfers);
  const toggleExcludeTransfers = useDashboardStore(
    (s) => s.toggleExcludeTransfers,
  );
  const categoryOverrides = useDashboardStore((s) => s.categoryOverrides);
  const setCategoryOverride = useDashboardStore((s) => s.setCategoryOverride);
  const clearCategoryOverrides = useDashboardStore(
    (s) => s.clearCategoryOverrides,
  );

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, categoryOverrides]);
  const tab = TABS.find((t) => t.id === activeTab)!;

  const overrideCount = Object.keys(categoryOverrides).length;

  const handleGoHome = () => {
    clearDataset();
    resetDashboard();
    onReturnHome?.();
  };

  const options = useMemo(
    () => ({
      excludeTransfers,
      categoryOverrides,
    }),
    [excludeTransfers, categoryOverrides],
  );

  // 100% Client-Side Machine Learning Analytics Engine
  const analytics = useMemo(() => {
    return processBankStatement(
      dataset?.rows ?? [],
      dataset?.fileName ?? "",
      options,
    );
  }, [dataset, options]);

  const healthScore = useMemo(() => {
    return calculateFinancialHealthScore(analytics);
  }, [analytics]);

  const insights = useMemo(() => {
    return generateSmartInsights(analytics);
  }, [analytics]);

  const filteredTransactions = useMemo(() => {
    return analytics.enrichedTransactions.filter((tx) => {
      const matchesSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.rawDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat =
        selectedCategory === "all" || tx.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [analytics.enrichedTransactions, searchTerm, selectedCategory]);

  if (!dataset) return null;

  const dailyChartLayout = getDailyCashFlowLayout(analytics.timeSeries.length);

  const fmt = (amt: number, compact = false) =>
    formatCurrency(amt, analytics.currency, { compact });

  const exportCSV = () => {
    const headers = [
      "ID",
      "Date",
      "Payee",
      "Raw Description",
      "Category",
      "Type",
      "Amount",
      "Balance",
      "Duplicate",
      "Spike",
    ];
    const csvRows = analytics.enrichedTransactions.map((tx) => [
      tx.id,
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.rawDescription.replace(/"/g, '""')}"`,
      tx.category,
      tx.type,
      tx.amount,
      tx.balance ?? "",
      tx.isDuplicate ? "Yes" : "No",
      tx.isAnomaly ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Bank_Statement_${analytics.currency.code}_${dataset.fileName.replace(/\.[^/.]+$/, "")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="workspace">
      <aside className="workspace-sidebar print:hidden">
        <div>
          <button onClick={handleGoHome} aria-label="Vanguard home">
            <Brand />
          </button>
          <nav aria-label="Workspace navigation">
            <span className="sidebar-label">YOUR WORKSPACE</span>
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={activeTab === item.id ? "page" : undefined}
                className={`workspace-nav ${activeTab === item.id ? "active" : ""}`}
              >
                <item.icon size={17} />
                {item.label}
              </button>
            ))}
          </nav>
          <button className="workspace-nav mt-6 w-full" onClick={handleGoHome}>
            <HomeIcon size={17} />
            Back to home
          </button>
        </div>
        <div className="sidebar-health">
          <h3>
            Financial health{" "}
            <span className="float-right">{healthScore.grade}</span>
          </h3>
          <strong>{healthScore.score}</strong>
          <small>/ 100</small>
          <div className="health-track">
            <div style={{ width: `${healthScore.score}%` }} />
          </div>
          <p>{healthScore.riskLevel} · Based on this statement</p>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header print:hidden">
          <div>
            <h1>{dataset.name}</h1>
            <p>
              {analytics.statementPeriod.start} —{" "}
              {analytics.statementPeriod.end} · {analytics.totalTransactions}{" "}
              transactions · {analytics.currency.code}
            </p>
          </div>
          <div className="workspace-toolbar">
            <button
              onClick={toggleExcludeTransfers}
              aria-pressed={excludeTransfers}
              className={`workspace-action ${excludeTransfers ? "active" : ""}`}
            >
              <ArrowRightLeft size={13} />
              {excludeTransfers ? "Transfers excluded" : "Include transfers"}
            </button>
            {overrideCount > 0 && (
              <button
                className="workspace-action"
                onClick={clearCategoryOverrides}
              >
                <RotateCcw size={13} />
                Reset categories ({overrideCount})
              </button>
            )}
            <button onClick={exportCSV} className="workspace-action">
              <Download size={13} />
              Export CSV
            </button>
            <button onClick={handlePrint} className="workspace-action">
              <Printer size={13} />
              Print
            </button>
            <button
              onClick={onUploadNew ?? handleGoHome}
              className="workspace-action primary"
            >
              <Upload size={13} />
              New statement
            </button>
            <button
              onClick={handleGoHome}
              className="workspace-action md:hidden"
            >
              <HomeIcon size={13} />
              Home
            </button>
          </div>
        </header>
        <nav
          className="workspace-mobile-nav print:hidden"
          aria-label="Workspace navigation"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? "page" : undefined}
              className={activeTab === item.id ? "active" : ""}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <main className="workspace-content space-y-6">
          <div className="workspace-intro">
            <div>
              <span className="eyebrow">YOUR NUMBERS, IN PERSPECTIVE</span>
              <h2>{tab.label}</h2>
              <p>{tab.description}</p>
            </div>
            <span className="workspace-badge">
              <ShieldCheck size={13} />
              Processed in your browser
            </span>
          </div>
          <div className="analysis-banner flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileCheck size={23} className="text-primary" />
              <div>
                <strong className="text-xs">
                  Data quality: {analytics.validationReport.dataQualityScore}% ·
                  Grade {analytics.validationReport.qualityGrade}
                </strong>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {analytics.validationReport.validRowCount} valid rows ·{" "}
                  {analytics.validationReport.flaggedRowCount} rows flagged for
                  review
                </p>
              </div>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">
                Review data checks
              </summary>
              <div className="mt-3 max-w-xl space-y-2">
                <p>
                  {analytics.validationReport.invalidDateCount} date issues ·{" "}
                  {analytics.validationReport.balanceMathDiscrepancies} balance
                  mismatches · {analytics.validationReport.duplicateRowCount}{" "}
                  possible duplicates
                </p>
                {analytics.validationReport.flaggedRows.map((row, i) => (
                  <p key={i} className="text-muted-foreground">
                    {row.description}
                  </p>
                ))}
                {analytics.validationReport.flaggedRowCount === 0 && (
                  <p>
                    No validation issues detected. Always verify against the
                    original statement.
                  </p>
                )}
              </div>
            </details>
          </div>
          {analytics.totalTransactions === 0 && (
            <div
              role="status"
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="font-semibold">No usable transactions found</h3>
              <p className="mt-2 text-muted-foreground">
                Check that the statement includes valid dates and amount or
                debit/credit columns, then try another file.
              </p>
              <button
                className="button button-lime mt-4"
                onClick={onUploadNew ?? handleGoHome}
              >
                Choose another statement
              </button>
            </div>
          )}
          {/* ═══ TAB 1: EXECUTIVE OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* High-Density KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Account Balance */}
                <div className="metric-balance rounded-2xl border border-border bg-card p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Account Balance
                  </span>
                  <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
                    {fmt(analytics.currentBalance)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 font-sans">
                    <span>Open: {fmt(analytics.openingBalance)}</span>
                    <span className="font-semibold text-foreground">
                      Close: {fmt(analytics.closingBalance)}
                    </span>
                  </div>
                </div>

                {/* Total Income */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    {excludeTransfers ? "Operating Income" : "Total Income"}
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">
                    +{fmt(analytics.totalIncome)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 font-sans">
                    <span>Avg/Day: {fmt(analytics.avgDailyIncome, true)}</span>
                    <span>{analytics.totalCredits} credits</span>
                  </div>
                </div>

                {/* Total Expenses */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    {excludeTransfers ? "Operating Expenses" : "Total Expenses"}
                  </span>
                  <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
                    -{fmt(analytics.totalExpenses)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 font-sans">
                    <span>
                      Avg/Day: {fmt(analytics.avgDailySpending, true)}
                    </span>
                    <span>{analytics.totalDebits} debits</span>
                  </div>
                </div>

                {/* Net Cash Flow */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    {excludeTransfers ? "Net Operating Cash" : "Net Cash Flow"}
                  </span>
                  <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                    {analytics.netCashFlow >= 0 ? "+" : ""}
                    {fmt(analytics.netCashFlow)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 font-sans">
                    <span>
                      Savings:{" "}
                      {analytics.totalIncome > 0
                        ? (
                            (analytics.netCashFlow / analytics.totalIncome) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </span>
                    <span className="font-semibold text-foreground">
                      {analytics.cashFlowTrend === "improving"
                        ? "↑ Improving"
                        : analytics.cashFlowTrend === "declining"
                          ? "↓ Declining"
                          : "→ Stable"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Health Score + Running Balance Trajectory Chart */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Health Score Panel */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        Financial Health Score
                      </h3>
                      <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-bold font-mono text-primary">
                        Grade {healthScore.grade}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-col items-center">
                      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary shadow-xs">
                        <div className="text-center">
                          <span className="text-2xl font-bold font-mono text-foreground">
                            {healthScore.score}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            / 100
                          </span>
                        </div>
                      </div>
                      <span className="mt-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                        {healthScore.tier} Status ({healthScore.confidenceScore}
                        % Confidence)
                      </span>
                      <p className="mt-1 text-xs text-center text-muted-foreground leading-relaxed px-1">
                        {healthScore.summary}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2 border-t border-border pt-3">
                    {healthScore.factors.map((factor) => (
                      <div key={factor.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-medium">
                            {factor.name}
                          </span>
                          <span className="font-bold font-mono text-foreground">
                            {factor.score} / {factor.maxScore}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${(factor.score / factor.maxScore) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Running Balance Area Chart */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">
                        Running Balance Trajectory
                      </h3>
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">
                        {analytics.statementPeriod.start} →{" "}
                        {analytics.statementPeriod.end} (
                        {analytics.currency.symbol})
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-sans">
                      <span className="text-foreground font-medium">
                        {analytics.positiveDaysCount} surplus days
                      </span>
                      <span className="text-muted-foreground">
                        {analytics.negativeDaysCount} deficit days
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analytics.timeSeries}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="balanceGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#145c37"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="#145c37"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e7d5" />
                        <XAxis
                          dataKey="date"
                          className="text-[10px] text-muted-foreground font-sans"
                          tickLine={false}
                        />
                        <YAxis
                          className="text-[10px] text-muted-foreground font-sans"
                          tickLine={false}
                          tickFormatter={(v) =>
                            `${analytics.currency.symbol}${v}`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e2e8f0",
                            borderRadius: "0.75rem",
                            color: "#0f172a",
                            fontSize: "11px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value) => [fmt(Number(value)), "Balance"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="runningBalance"
                          stroke="#145c37"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#balanceGrad)"
                          name="Running Balance"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 2: CLIENT-SIDE ML MODELS ═══ */}
          {activeTab === "ml" && (
            <div className="space-y-6">
              <p className="text-xs text-muted-foreground">
                Projections extend historical trends; they are estimates, not
                guarantees. Anomaly scores identify unusual patterns, not
                confirmed fraud.
              </p>
              {/* 30-Day ML Balance Forecast Chart */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      30-Day Client ML Balance Forecast (Linear Regression)
                    </h3>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      Calculated 100% in-browser &middot; Fit Confidence $R^2 ={" "}
                      {analytics.mlForecast.rSquared}$ &middot; Slope:{" "}
                      {fmt(analytics.mlForecast.dailySlope)}/day
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-bold font-mono text-primary">
                    T+30 Forecast:{" "}
                    {fmt(analytics.mlForecast.projectedBalance30Days)}
                  </span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics.mlForecast.forecastPoints}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="mlForecastGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#62972c"
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="95%"
                            stopColor="#62972c"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e7d5" />
                      <XAxis
                        dataKey="date"
                        className="text-[10px] text-muted-foreground font-sans"
                        tickLine={false}
                      />
                      <YAxis
                        className="text-[10px] text-muted-foreground font-sans"
                        tickLine={false}
                        tickFormatter={(v) =>
                          `${analytics.currency.symbol}${v}`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2e8f0",
                          borderRadius: "0.75rem",
                          color: "#0f172a",
                          fontSize: "11px",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                        formatter={(val) => fmt(Number(val))}
                      />
                      <Area
                        type="monotone"
                        dataKey="projectedBalance"
                        stroke="#62972c"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#mlForecastGrad)"
                        name="ML Projected Balance"
                      />
                      <Area
                        type="monotone"
                        dataKey="upperBound"
                        stroke="#7d9b64"
                        strokeDasharray="3 3"
                        fill="none"
                        name="+95% Upper Bound"
                      />
                      <Area
                        type="monotone"
                        dataKey="lowerBound"
                        stroke="#cbd5e1"
                        strokeDasharray="3 3"
                        fill="none"
                        name="-95% Lower Bound"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Client-Side TF-IDF Payee Classification & Anomaly Detection Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* TF-IDF Payee Classification Table */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                  <h3 className="font-semibold text-sm text-foreground border-b border-border pb-3 mb-4">
                    Suggested transaction categories
                  </h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {analytics.enrichedTransactions.slice(0, 10).map((tx) => {
                      const pred = classifyTextML(tx.rawDescription);
                      return (
                        <div
                          key={tx.id}
                          className="rounded-xl border border-border bg-muted/40 p-3 flex items-center justify-between text-xs font-sans"
                        >
                          <div>
                            <span className="text-foreground font-semibold block truncate max-w-[180px]">
                              {tx.description}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {pred.method} &middot; tokens: [
                              {pred.topFeatures.join(", ")}]
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-foreground font-bold block">
                              {pred.category}
                            </span>
                            <span className="text-emerald-600 font-medium text-[11px]">
                              {pred.confidenceScore}% ML confidence
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Multivariate Anomaly Detection Scores */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                  <h3 className="font-semibold text-sm text-foreground border-b border-border pb-3 mb-4">
                    Transactions worth a closer look
                  </h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {analytics.mlAnomalyScores.slice(0, 10).map((mlScore) => {
                      const tx = analytics.enrichedTransactions.find(
                        (t) => t.id === mlScore.transactionId,
                      );
                      if (!tx) return null;
                      return (
                        <div
                          key={mlScore.transactionId}
                          className="rounded-xl border border-border bg-muted/40 p-3 flex items-center justify-between text-xs font-sans"
                        >
                          <div>
                            <span className="text-foreground font-semibold block truncate max-w-[180px]">
                              {tx.description}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {mlScore.features.join(" &middot; ")}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-foreground font-bold font-mono block">
                              {fmt(tx.amount)}
                            </span>
                            <span className="text-amber-600 font-medium text-[11px]">
                              {mlScore.anomalyScore}% Risk Score
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 3: CASH FLOW ═══ */}
          {activeTab === "cashflow" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <h3 className="font-semibold text-sm text-foreground border-b border-border pb-3 mb-4">
                  Daily Income vs Expenses ({analytics.currency.symbol})
                </h3>
                <p
                  id="daily-cash-flow-help"
                  className="text-xs text-muted-foreground mb-3"
                >
                  Scroll horizontally to view all {analytics.timeSeries.length}{" "}
                  transaction days.
                </p>
                <div
                  className="w-full overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  role="region"
                  aria-label="Daily income and expenses chart"
                  aria-describedby="daily-cash-flow-help"
                  tabIndex={0}
                >
                  <div
                    className="h-64"
                    style={{ minWidth: dailyChartLayout.minWidth }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.timeSeries}
                        barGap={dailyChartLayout.barGap}
                        barCategoryGap={dailyChartLayout.barCategoryGap}
                        maxBarSize={dailyChartLayout.maxBarSize}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e7d5" />
                        <XAxis
                          dataKey="date"
                          className="text-[10px] text-muted-foreground font-sans"
                          tickLine={false}
                        />
                        <YAxis
                          className="text-[10px] text-muted-foreground font-sans"
                          tickLine={false}
                          tickFormatter={(v) =>
                            `${analytics.currency.symbol}${v}`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e2e8f0",
                            borderRadius: "0.75rem",
                            color: "#0f172a",
                            fontSize: "11px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                          formatter={(val) => fmt(Number(val))}
                        />
                        <Legend />
                        <Bar
                          isAnimationActive={false}
                          dataKey="income"
                          name="Income"
                          fill="#145c37"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          isAnimationActive={false}
                          dataKey="expenses"
                          name="Expenses"
                          fill="#a4cd59"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {analytics.monthlyBreakdown.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                  <h3 className="font-semibold text-sm text-foreground border-b border-border pb-3 mb-4">
                    Monthly Cash Flow Summary
                  </h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.monthlyBreakdown}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e7d5" />
                        <XAxis
                          dataKey="month"
                          className="text-[10px] text-muted-foreground font-sans"
                          tickLine={false}
                        />
                        <YAxis
                          className="text-[10px] text-muted-foreground font-sans"
                          tickLine={false}
                          tickFormatter={(v) =>
                            `${analytics.currency.symbol}${v}`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e2e8f0",
                            borderRadius: "0.75rem",
                            color: "#0f172a",
                            fontSize: "11px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                          formatter={(val) => fmt(Number(val))}
                        />
                        <Legend />
                        <Bar
                          dataKey="income"
                          name="Income"
                          fill="#145c37"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="expenses"
                          name="Expenses"
                          fill="#a4cd59"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="net"
                          name="Net"
                          fill="#397f68"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ═══ YEARLY CASH FLOW SUMMARY ═══ */}
              {analytics.yearlyBreakdown.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                    <h3 className="font-semibold text-sm text-foreground">
                      Yearly Cash Flow Breakdown ({analytics.currency.symbol})
                    </h3>
                    <span className="text-xs text-muted-foreground font-sans">
                      {analytics.yearlyBreakdown.length} year(s) analyzed
                    </span>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.yearlyBreakdown}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e7d5" />
                        <XAxis
                          dataKey="year"
                          className="text-[10px] text-muted-foreground font-sans"
                          tickLine={false}
                        />
                        <YAxis
                          className="text-[10px] text-muted-foreground font-sans"
                          tickLine={false}
                          tickFormatter={(v) =>
                            `${analytics.currency.symbol}${v}`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e2e8f0",
                            borderRadius: "0.75rem",
                            color: "#0f172a",
                            fontSize: "11px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                          formatter={(val) => fmt(Number(val))}
                        />
                        <Legend />
                        <Bar
                          dataKey="income"
                          name="Yearly Income"
                          fill="#145c37"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="expenses"
                          name="Yearly Expenses"
                          fill="#a4cd59"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="net"
                          name="Net Cash Flow"
                          fill="#397f68"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-muted/50 text-foreground font-semibold border-b border-border">
                        <tr>
                          <th className="px-4 py-2.5">Year</th>
                          <th className="px-4 py-2.5 text-right">Income</th>
                          <th className="px-4 py-2.5 text-right">Expenses</th>
                          <th className="px-4 py-2.5 text-right">
                            Net Cash Flow
                          </th>
                          <th className="px-4 py-2.5 text-right">Txns</th>
                          <th className="px-4 py-2.5 text-right">
                            Savings Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {analytics.yearlyBreakdown.map((y) => (
                          <tr
                            key={y.year}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-4 py-2.5 font-bold text-foreground">
                              {y.year}
                            </td>
                            <td className="px-4 py-2.5 text-right text-emerald-600 font-bold font-mono">
                              +{fmt(y.income)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-foreground font-mono">
                              -{fmt(y.expenses)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-foreground font-bold font-mono">
                              {y.net >= 0 ? "+" : ""}
                              {fmt(y.net)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">
                              {y.transactionCount}
                            </td>
                            <td className="px-4 py-2.5 text-right text-foreground font-bold font-mono">
                              {y.savingsRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 4: INCOME ANALYSIS ═══ */}
          {activeTab === "income" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4">Income sources</h3>
                {analytics.incomeStreams.length === 0 ? (
                  <p className="text-muted-foreground">
                    No income transactions were found in this statement.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {analytics.incomeStreams.map((stream) => (
                      <div key={stream.source}>
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <strong>{stream.source}</strong>
                          <span>
                            {fmt(stream.total)} · {stream.count} transactions
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Math.min(100, stream.percentage)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Salary & Payroll Detection
                  </h3>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold border border-border bg-muted/50 text-foreground">
                    {analytics.salaryInfo.detected
                      ? "Salary pattern detected"
                      : "No Regular Salary Pattern"}
                  </span>
                </div>
                {analytics.salaryInfo.detected && (
                  <div className="grid gap-3 sm:grid-cols-4 font-sans text-xs">
                    <div className="bg-muted/50 border border-border rounded-xl p-3.5">
                      <span className="text-muted-foreground uppercase text-[10px] font-semibold block">
                        Employer
                      </span>
                      <span className="font-bold text-foreground text-sm mt-1 block">
                        {analytics.salaryInfo.employer}
                      </span>
                    </div>
                    <div className="bg-muted/50 border border-border rounded-xl p-3.5">
                      <span className="text-muted-foreground uppercase text-[10px] font-semibold block">
                        Avg Paycheck
                      </span>
                      <span className="font-bold text-foreground text-sm mt-1 block font-mono">
                        {fmt(analytics.salaryInfo.avgAmount)}
                      </span>
                    </div>
                    <div className="bg-muted/50 border border-border rounded-xl p-3.5">
                      <span className="text-muted-foreground uppercase text-[10px] font-semibold block">
                        Frequency
                      </span>
                      <span className="font-bold text-foreground text-sm mt-1 block">
                        {analytics.salaryInfo.frequency}
                      </span>
                    </div>
                    <div className="bg-muted/50 border border-border rounded-xl p-3.5">
                      <span className="text-muted-foreground uppercase text-[10px] font-semibold block">
                        Total Salary
                      </span>
                      <span className="font-bold text-foreground text-sm mt-1 block font-mono">
                        {fmt(analytics.salaryInfo.totalSalary)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TAB 5: CATEGORIES ═══ */}
          {activeTab === "categories" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {analytics.categoryBreakdown.map((cat, idx) => (
                <div
                  key={cat.category}
                  className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                      {cat.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {cat.percentage}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between font-sans">
                    <span className="text-lg font-bold text-foreground font-mono">
                      {fmt(cat.total)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cat.count} txns
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ TAB 6: TRANSACTION LEDGER ═══ */}
          {activeTab === "transactions" && (
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    Enriched Transaction Ledger
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    {filteredTransactions.length} of{" "}
                    {analytics.totalTransactions} shown · Click category badge
                    to reclassify
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      aria-label="Search transactions"
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="rounded-full border border-border bg-muted/50 pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-40 md:w-56"
                    />
                  </div>
                  <select
                    aria-label="Filter by category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Categories</option>
                    {analytics.categoryBreakdown.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-muted/50 text-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Payee / Merchant</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTransactions
                      .slice((page - 1) * 50, page * 50)
                      .map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono">
                            {tx.date}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            <span className="font-bold text-foreground">
                              {tx.description}
                            </span>
                            {tx.rawDescription !== tx.description && (
                              <span className="text-[11px] text-muted-foreground block font-mono truncate max-w-xs">
                                {tx.rawDescription}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              aria-label={`Category for ${tx.description}`}
                              value={tx.category}
                              onChange={(e) =>
                                setCategoryOverride(
                                  tx.id,
                                  e.target.value as TransactionCategory,
                                )
                              }
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold border border-border bg-muted text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {ALL_CATEGORIES.map((cat) => (
                                <option
                                  key={cat}
                                  value={cat}
                                  className="bg-card text-foreground font-sans"
                                >
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold font-mono whitespace-nowrap ${tx.type === "credit" ? "text-emerald-600" : "text-foreground"}`}
                          >
                            {tx.type === "credit" ? "+" : "-"}
                            {fmt(tx.amount)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground font-mono whitespace-nowrap">
                            {tx.balance != null ? fmt(tx.balance) : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="ledger-pagination">
                <span>
                  {filteredTransactions.length
                    ? `${(page - 1) * 50 + 1}–${Math.min(page * 50, filteredTransactions.length)} of ${filteredTransactions.length}`
                    : "No transactions match your filters"}
                </span>
                <div>
                  <button
                    className="workspace-action"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="workspace-action"
                    disabled={page * 50 >= filteredTransactions.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
