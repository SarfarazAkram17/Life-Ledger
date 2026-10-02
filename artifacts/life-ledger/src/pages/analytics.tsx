import React, { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useData } from "@/contexts/data-context";
import { useTheme } from "@/contexts/theme-context";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { format, parse, parseISO } from "date-fns";
import { CalendarDays, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SelectedBreakdown = {
  categoryId: string;
  categoryName: string;
  icon: string;
  type: "income" | "expense";
};

export default function Analytics() {
  const { transactions } = useData();
  const { currency } = useTheme();
  const [selectedBreakdown, setSelectedBreakdown] =
    useState<SelectedBreakdown | null>(null);
  const [activeChartDate, setActiveChartDate] = useState<string | null>(null);
  const [activeMonthStr, setActiveMonthStr] = useState(
    format(new Date(), "yyyy-MM"),
  );
  const currentMonthStr = format(new Date(), "yyyy-MM");
  const isViewingOtherMonth = activeMonthStr !== currentMonthStr;

  const spedndingsStats = useMemo(() => {
    const expensesThisMonth = transactions.filter(
      (t) => t.type === "expense" && t.date.startsWith(activeMonthStr),
    );

    const totalExpense = expensesThisMonth.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    const stats = expensesThisMonth.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(stats)
      .map(([catId, amount]) => ({
        ...(CATEGORIES.find((c) => c.id === catId) ?? {
          id: catId,
          name: catId,
          icon: "📦",
        }),
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, activeMonthStr]);

  const earningStats = useMemo(() => {
    const incomeThisMonth = transactions.filter(
      (t) => t.type === "income" && t.date.startsWith(activeMonthStr),
    );
    const totalIncome = incomeThisMonth.reduce((sum, t) => sum + t.amount, 0);
    const stats = incomeThisMonth.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(stats)
      .map(([catId, amount]) => ({
        ...(CATEGORIES.find((c) => c.id === catId) ?? {
          id: catId,
          name: catId,
          icon: "📦",
        }),
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, activeMonthStr]);

  const chartData = useMemo(() => {
    const year = parseInt(activeMonthStr.split("-")[0]);
    const month = parseInt(activeMonthStr.split("-")[1]) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${activeMonthStr}-${String(i + 1).padStart(2, "0")}`;
      const dayTxs = transactions.filter((t) => t.date === dateStr);
      return {
        day: i + 1,
        date: dateStr,
        income: dayTxs
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0),
        expense: dayTxs
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0),
      };
    });

    const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)));
    return { data, maxVal: maxVal > 0 ? maxVal : 100 };
  }, [transactions, activeMonthStr]);

  const monthDate = parse(activeMonthStr, "yyyy-MM", new Date());
  const selectedTransactions = useMemo(() => {
    if (!selectedBreakdown) return [];

    return transactions
      .filter(
        (transaction) =>
          transaction.type === selectedBreakdown.type &&
          transaction.category === selectedBreakdown.categoryId &&
          transaction.date.startsWith(activeMonthStr),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedBreakdown, activeMonthStr]);
  const selectedTotal = selectedTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-4 bg-card px-3 sm:px-4 py-2 rounded-xl border border-border self-start sm:self-auto">
              <button
                onClick={() =>
                  setActiveMonthStr(
                    format(
                      new Date(
                        monthDate.getFullYear(),
                        monthDate.getMonth() - 1,
                      ),
                      "yyyy-MM",
                    ),
                  )
                }
                className="p-1 hover:text-primary transition-colors font-bold cursor-pointer text-lg leading-none"
              >
                ‹
              </button>
              <span className="font-semibold w-29 sm:w-33 text-center text-sm sm:text-base">
                {format(monthDate, "MMMM yyyy")}
              </span>
              <button
                onClick={() =>
                  setActiveMonthStr(
                    format(
                      new Date(
                        monthDate.getFullYear(),
                        monthDate.getMonth() + 1,
                      ),
                      "yyyy-MM",
                    ),
                  )
                }
                className="p-1 hover:text-primary transition-colors font-bold cursor-pointer text-lg leading-none"
              >
                ›
              </button>
            </div>
            {isViewingOtherMonth && (
              <button
                type="button"
                data-testid="button-back-to-current-month-analytics"
                onClick={() => setActiveMonthStr(currentMonthStr)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <CalendarDays className="h-4 w-4" />
                Back to this month
              </button>
            )}
          </div>
        </div>

        {/* Custom Bar Chart */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 sm:mb-6 text-muted-foreground text-sm sm:text-base">
            Cash Flow Over Time
          </h3>
          <div className="h-48 sm:h-64 relative w-full flex items-end gap-[1px] sm:gap-1">
            {chartData.data.map((d) => {
              const incomeHeight = `${(d.income / chartData.maxVal) * 100}%`;
              const expenseHeight = `${(d.expense / chartData.maxVal) * 100}%`;
              const isSelected = activeChartDate === d.date;
              const tooltipAlignment =
                d.day <= 6
                  ? "left-0 translate-x-0"
                  : d.day > chartData.data.length - 6
                    ? "right-0 translate-x-0"
                    : "left-1/2 -translate-x-1/2";
              return (
                <button
                  key={d.date}
                  type="button"
                  data-testid={`button-chart-day-${d.day}`}
                  aria-label={`${format(parseISO(d.date), "MMMM d, yyyy")}: income ${formatCurrency(d.income, currency)}, expense ${formatCurrency(d.expense, currency)}`}
                  aria-pressed={isSelected}
                  onClick={() => setActiveChartDate(isSelected ? null : d.date)}
                  className="group relative flex h-full flex-1 cursor-pointer appearance-none flex-col items-center justify-end rounded-t-sm border-0 bg-transparent p-0 text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div
                    data-testid={`tooltip-chart-day-${d.day}`}
                    className={`pointer-events-none absolute top-1 space-y-1 z-10 w-max rounded border border-border bg-popover p-2 text-center text-xs text-popover-foreground shadow-xl transition-opacity ${
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                    } ${tooltipAlignment}`}
                  >
                    <span className="block font-bold">
                      {format(parseISO(d.date), "MMMM d, yyyy")}
                    </span>
                    <span className="block text-income">
                      Income: {formatCurrency(d.income, currency)}
                    </span>
                    <span className="block text-expense">
                      Expense: {formatCurrency(d.expense, currency)}
                    </span>
                  </div>

                  <div className="w-full flex gap-[1px] h-full items-end justify-center">
                    <div
                      className="w-1/2 bg-income/80 rounded-t-sm transition-all group-hover:bg-income"
                      style={{ height: incomeHeight }}
                    ></div>
                    <div
                      className="w-1/2 bg-expense/80 rounded-t-sm transition-all group-hover:bg-expense"
                      style={{ height: expenseHeight }}
                    ></div>
                  </div>
                  <div className="h-4 mt-1 text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">
                    {d.day % 5 === 0 || d.day === 1 ? d.day : ""}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-income shrink-0"></span>{" "}
              Income
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-expense shrink-0"></span>{" "}
              Expense
            </div>
          </div>
        </div>

        {/* Earnings by Source */}
        <div>
          <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                Earnings by Source
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Income received this month, grouped by source
              </p>
            </div>
            {earningStats.length > 0 && (
              <p className="text-right shrink-0">
                <span className="block text-xs text-muted-foreground">
                  Total income
                </span>
                <span className="font-bold text-income text-sm sm:text-base">
                  {formatCurrency(
                    earningStats.reduce((sum, ear) => sum + ear.amount, 0),
                    currency,
                  )}
                </span>
              </p>
            )}
          </div>

          {earningStats.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 text-center text-muted-foreground text-sm">
              No income this month.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {earningStats.map((ear) => (
                <button
                  type="button"
                  key={ear.id}
                  data-testid={`card-earning-category-${ear.id}`}
                  aria-haspopup="dialog"
                  aria-label={`View ${ear.name} income transactions for ${format(monthDate, "MMMM yyyy")}`}
                  onClick={() =>
                    setSelectedBreakdown({
                      categoryId: ear.id,
                      categoryName: ear.name,
                      icon: ear.icon,
                      type: "income",
                    })
                  }
                  className="w-full bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm text-left cursor-pointer hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all"
                >
                  <div className="flex justify-between items-center mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="text-xl sm:text-2xl shrink-0">
                        {ear.icon}
                      </div>
                      <span className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {ear.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-bold text-income text-sm sm:text-base">
                        {formatCurrency(ear.amount, currency)}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {ear.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 sm:h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-income transition-all duration-1000 ease-out"
                      style={{ width: `${ear.percentage}%` }}
                    />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    View transactions
                    <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spendings by Category */}
        <div>
          <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                Spendings by Category
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Your expenses this month, broken down by category
              </p>
            </div>
            {spedndingsStats.length > 0 && (
              <p className="text-right shrink-0">
                <span className="block text-xs text-muted-foreground">
                  Total Expense
                </span>
                <span className="font-bold text-expense text-sm sm:text-base">
                  {formatCurrency(
                    spedndingsStats.reduce((sum, spen) => sum + spen.amount, 0),
                    currency,
                  )}
                </span>
              </p>
            )}
          </div>

          {spedndingsStats.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 text-center text-muted-foreground text-sm">
              No expenses this month.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {spedndingsStats.map((spen) => (
                <button
                  type="button"
                  key={spen.id}
                  data-testid={`card-spending-category-${spen.id}`}
                  aria-haspopup="dialog"
                  aria-label={`View ${spen.name} expense transactions for ${format(monthDate, "MMMM yyyy")}`}
                  onClick={() =>
                    setSelectedBreakdown({
                      categoryId: spen.id,
                      categoryName: spen.name,
                      icon: spen.icon,
                      type: "expense",
                    })
                  }
                  className="w-full bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm text-left cursor-pointer hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all"
                >
                  <div className="flex justify-between items-center mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="text-xl sm:text-2xl shrink-0">
                        {spen.icon}
                      </div>
                      <span className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {spen.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-bold text-expense text-sm sm:text-base">
                        {formatCurrency(spen.amount, currency)}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {spen.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 sm:h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-expense transition-all duration-1000 ease-out"
                      style={{ width: `${spen.percentage}%` }}
                    ></div>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    View transactions
                    <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={selectedBreakdown !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedBreakdown(null);
        }}
      >
        {selectedBreakdown && (
          <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-xl">
            <DialogHeader className="pr-8">
              <DialogTitle className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                  {selectedBreakdown.icon}
                </span>
                <span>{selectedBreakdown.categoryName}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedBreakdown.type === "income"
                  ? "Income transactions"
                  : "Expense transactions"}{" "}
                for {format(monthDate, "MMMM yyyy")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {selectedTransactions.length}{" "}
                {selectedTransactions.length === 1
                  ? "transaction"
                  : "transactions"}
              </span>
              <span
                className={`shrink-0 font-bold ${
                  selectedBreakdown.type === "income"
                    ? "text-income"
                    : "text-expense"
                }`}
              >
                {selectedBreakdown.type === "income" ? "+" : "−"}
                {formatCurrency(selectedTotal, currency)}
              </span>
            </div>

            {selectedTransactions.length > 0 ? (
              <div className="max-h-[55vh] divide-y divide-border/60 overflow-y-auto rounded-xl border border-border">
                {selectedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {format(parseISO(transaction.date), "MMMM d, yyyy")}
                      </p>
                      {transaction.note && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {transaction.note}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        selectedBreakdown.type === "income"
                          ? "text-income"
                          : "text-expense"
                      }`}
                    >
                      {selectedBreakdown.type === "income" ? "+" : "−"}
                      {formatCurrency(transaction.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No matching transactions for this month.
              </p>
            )}
          </DialogContent>
        )}
      </Dialog>
    </Layout>
  );
}