import React, { useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { useData } from "@/contexts/data-context";
import type { Transaction } from "@/contexts/data-context";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  ArrowRight,
  Copy,
  Pencil,
  Trash2,
} from "lucide-react";
import { IoReceiptOutline } from "react-icons/io5";
import { Link } from "wouter";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import {
  calculateMonthComparisonTotals,
  getPercentageChange,
} from "@/lib/month-comparison";
import { TransactionModal } from "@/components/transaction-modal";
import { MonthPicker } from "@/components/month-picker";
import { ConfirmModal } from "@/components/confirm-modal";

export default function Dashboard() {
  const { totals, transactions, categories, deleteTransaction } = useData();
  const { currency } = useTheme();
  const { user } = useAuth();

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction>();
  const [transactionModalMode, setTransactionModalMode] = useState<
    "edit" | "duplicate"
  >("edit");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [comparisonMonths, setComparisonMonths] = useState(() => {
    const currentMonthDate = new Date();
    const previousMonthDate = new Date(
      currentMonthDate.getFullYear(),
      currentMonthDate.getMonth() - 1,
      1,
    );

    return {
      first: format(currentMonthDate, "yyyy-MM"),
      second: format(previousMonthDate, "yyyy-MM"),
    };
  });

  const recentTransactions = transactions.slice(0, 5);

  const monthComparison = useMemo(() => {
    const { first, second } = calculateMonthComparisonTotals(
      transactions,
      comparisonMonths.first,
      comparisonMonths.second,
    );

    const getMonthLabel = (monthKey: string) =>
      monthKey
        ? format(parseISO(`${monthKey}-01`), "MMMM yyyy")
        : "Select a month";

    return {
      first: {
        ...first,
        key: comparisonMonths.first,
        label: getMonthLabel(comparisonMonths.first),
      },
      second: {
        ...second,
        key: comparisonMonths.second,
        label: getMonthLabel(comparisonMonths.second),
      },
    };
  }, [transactions, comparisonMonths.first, comparisonMonths.second]);

  const hasValidMonthComparison = Boolean(
    monthComparison.first.key &&
    monthComparison.second.key &&
    monthComparison.first.key !== monthComparison.second.key,
  );

  const openTransactionModal = (
    transaction: Transaction,
    mode: "edit" | "duplicate",
  ) => {
    setSelectedTransaction(transaction);
    setTransactionModalMode(mode);
    setIsTransactionModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    void deleteTransaction(deleteId);
    setDeleteId(null);
  };

  const getCategory = (id: string) =>
    categories.find((category) => category.id === id) ?? {
      id,
      name: id,
      icon: "📦",
    };

  const formatDate = (isoString: string) => {
    const d = parseISO(isoString);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d, yyyy");
  };

  return (
    <Layout>
      <div className="min-w-0 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">
              Welcome back, {user?.displayName}
            </h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-sm">
              Here's your financial overview
            </p>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card to-card border border-border shadow-xl p-5 sm:p-8 group hover:border-primary/50 transition-colors duration-500">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-700 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-2">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="font-medium text-sm sm:text-base">
                  Total Balance
                </span>
              </div>
              <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground break-all">
                {formatCurrency(totals.balance, currency)}
              </div>
            </div>

            <div className="flex flex-col gap-2 min-[400px]:flex-row sm:gap-4">
              <div className="bg-background/50 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-border flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-1">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-income shrink-0" />
                  Income
                </div>
                <div className="text-base sm:text-xl font-bold text-income break-all">
                  {formatCurrency(totals.income, currency)}
                </div>
              </div>

              <div className="bg-background/50 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-border flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-1">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-expense shrink-0" />
                  Expense
                </div>
                <div className="text-base sm:text-xl font-bold text-expense break-all">
                  {formatCurrency(totals.expense, currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Month-over-Month Comparison */}
        <section
          aria-labelledby="month-comparison-heading"
          data-testid="card-month-over-month"
          className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 mb-4">
            <div>
              <h2
                id="month-comparison-heading"
                className="text-lg sm:text-xl font-bold"
              >
                Compare any two months
              </h2>
              <p className="text-sm text-muted-foreground">
                {monthComparison.first.label} compared with{" "}
                {monthComparison.second.label}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              Income and spending by calendar month
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              <span>First month</span>
              <MonthPicker
                value={comparisonMonths.first}
                onChange={(month) =>
                  setComparisonMonths((months) => ({ ...months, first: month }))
                }
                ariaLabel="First month to compare"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              <span>Second month</span>
              <MonthPicker
                value={comparisonMonths.second}
                onChange={(month) =>
                  setComparisonMonths((months) => ({
                    ...months,
                    second: month,
                  }))
                }
                ariaLabel="Second month to compare"
              />
            </div>
          </div>

          {!hasValidMonthComparison ? (
            <p
              role="status"
              className="rounded-xl border border-border bg-background/50 p-4 text-sm text-muted-foreground"
            >
              Choose two different months to compare.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {(
                [
                  {
                    key: "income",
                    label: "Income",
                    first: monthComparison.first.income,
                    second: monthComparison.second.income,
                    Icon: TrendingUp,
                    amountClass: "text-income",
                  },
                  {
                    key: "expense",
                    label: "Spending",
                    first: monthComparison.first.expense,
                    second: monthComparison.second.expense,
                    Icon: TrendingDown,
                    amountClass: "text-expense",
                  },
                ] as const
              ).map((metric) => {
                const difference = metric.first - metric.second;
                const percentageChange = getPercentageChange(
                  metric.first,
                  metric.second,
                );
                const favorable =
                  difference === 0
                    ? null
                    : metric.key === "income"
                      ? difference > 0
                      : difference < 0;
                const trendClass =
                  favorable === null
                    ? "bg-muted text-muted-foreground"
                    : favorable
                      ? "bg-income/10 text-income"
                      : "bg-expense/10 text-expense";
                const trendText =
                  percentageChange === null
                    ? metric.first === 0
                      ? `No ${metric.label.toLowerCase()} in either month`
                      : `No ${metric.label.toLowerCase()} in ${monthComparison.second.label}`
                    : difference === 0
                      ? `No change from ${monthComparison.second.label}`
                      : `${difference > 0 ? "Up" : "Down"} ${Math.abs(percentageChange).toFixed(1)}% vs ${monthComparison.second.label}`;
                const TrendIcon = difference >= 0 ? TrendingUp : TrendingDown;
                const Icon = metric.Icon;

                return (
                  <div
                    key={metric.key}
                    data-testid={`card-month-comparison-${metric.key}`}
                    className="rounded-xl border border-border bg-background/50 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className={cn("h-4 w-4", metric.amountClass)} />
                      {metric.label}
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {monthComparison.first.label}
                        </p>
                        <p
                          className={cn(
                            "text-xl sm:text-2xl font-bold break-all",
                            metric.amountClass,
                          )}
                        >
                          {formatCurrency(metric.first, currency)}
                        </p>
                      </div>
                      <span
                        role="status"
                        aria-label={`${metric.label}: ${trendText}`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
                          trendClass,
                        )}
                      >
                        {difference !== 0 && (
                          <TrendIcon className="h-3.5 w-3.5" />
                        )}
                        {trendText}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3 text-sm">
                      <span className="text-muted-foreground">
                        {monthComparison.second.label}
                      </span>
                      <span className="font-semibold text-foreground break-all text-right">
                        {formatCurrency(metric.second, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Link
            href="/analytics"
            className="group rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all block"
          >
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Analytics
              </h3>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              See detailed breakdown of your spending habits and trends.
            </p>
          </Link>
          <Link
            href="/budgets"
            className="group rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all block"
          >
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Budgets
              </h3>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Manage category limits and keep your expenses on track.
            </p>
          </Link>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold">
              Recent Transactions
            </h2>
            <Link
              href="/transactions"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline whitespace-nowrap"
            >
              See All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {recentTransactions.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <IoReceiptOutline className="w-8 h-8 sm:w-10 sm:h-10 text-primary/60" />
                </div>
                <p className="font-medium text-foreground">
                  No transactions yet
                </p>
                <p className="text-sm">
                  Tap the + button to record your first one.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentTransactions.map((tx) => {
                  const cat = getCategory(tx.category);
                  const isIncome = tx.type === "income";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-background border border-border flex items-center justify-center text-xl sm:text-2xl shadow-sm shrink-0">
                          {cat.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                            {cat.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 sm:gap-2 flex-wrap">
                            {formatDate(tx.date)}
                            {tx.note && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border hidden sm:inline-block"></span>
                                <span className="truncate max-w-[80px] sm:max-w-[200px] hidden sm:inline">
                                  {tx.note}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div
                          className={cn(
                            "font-bold text-sm sm:text-lg whitespace-nowrap",
                            isIncome ? "text-income" : "text-expense",
                          )}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount, currency)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            data-testid={`button-edit-transaction-${tx.id}`}
                            aria-label={`Edit ${cat.name} transaction`}
                            title="Edit transaction"
                            onClick={() => openTransactionModal(tx, "edit")}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`button-duplicate-transaction-${tx.id}`}
                            aria-label={`Duplicate ${cat.name} transaction`}
                            title="Duplicate transaction"
                            onClick={() =>
                              openTransactionModal(tx, "duplicate")
                            }
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <Copy className="h-3 w-3" />
                            <span className="hidden sm:inline">Duplicate</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`button-delete-transaction-${tx.id}`}
                            aria-label={`Delete ${cat.name} transaction`}
                            title="Delete transaction"
                            onClick={() => setDeleteId(tx.id)}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        editTx={
          transactionModalMode === "edit" ? selectedTransaction : undefined
        }
        duplicateTx={
          transactionModalMode === "duplicate" ? selectedTransaction : undefined
        }
      />
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? You can undo it for a few seconds after confirming."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Layout>
  );
}