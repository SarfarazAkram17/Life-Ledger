import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { useData } from "@/contexts/data-context";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type PeriodType = "day" | "week" | "month" | "year" | "all";

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Week starts Saturday: JS day 0=Sun,1=Mon,...,5=Fri,6=Sat
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun…6=Sat
  const diff = day === 6 ? 0 : day + 1; // days to go back to reach Saturday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const getWeekEnd = (ws: Date): Date => {
  const d = new Date(ws);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Calendar grid: week starts Saturday
// Sat(6)->col 0, Sun(0)->1, Mon(1)->2, Tue(2)->3, Wed(3)->4, Thu(4)->5, Fri(5)->6
const getDayCol = (jsDay: number) => (jsDay === 6 ? 0 : jsDay + 1);

const WEEK_HEADERS = ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];
const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function PdfReportModal({ isOpen, onClose }: PdfReportModalProps) {
  const { user } = useAuth();
  const { transactions, budgets, categories } = useData();
  const { currency } = useTheme();

  const today = useMemo(() => new Date(), []);

  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calView, setCalView] = useState<Date>(today);
  const [generating, setGenerating] = useState(false);

  const { allTimeStart, allTimeEnd } = useMemo(() => {
    const transactionDates = transactions.flatMap((tx) => {
      const date = parseISO(tx.date);
      return Number.isNaN(date.getTime()) ? [] : [date];
    });
    const budgetMonths = budgets.flatMap((budget) => {
      const date = parseISO(`${budget.monthKey}-01`);
      return Number.isNaN(date.getTime()) ? [] : [date];
    });
    const starts = [
      ...transactionDates.map((date) => startOfDay(date)),
      ...budgetMonths.map((date) => startOfMonth(date)),
    ];
    const ends = [
      ...transactionDates.map((date) => endOfDay(date)),
      ...budgetMonths.map((date) => endOfMonth(date)),
    ];

    if (starts.length === 0) {
      return { allTimeStart: startOfDay(today), allTimeEnd: endOfDay(today) };
    }

    return {
      allTimeStart: starts.reduce((earliest, date) =>
        date < earliest ? date : earliest,
      ),
      allTimeEnd: ends.reduce((latest, date) =>
        date > latest ? date : latest,
      ),
    };
  }, [transactions, budgets, today]);
  const calendarMaxDate =
    allTimeEnd > endOfDay(today) ? allTimeEnd : endOfDay(today);

  // Compute date range
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    let start: Date, end: Date, label: string;
    if (periodType === "all") {
      start = allTimeStart;
      end = allTimeEnd;
      label = "All Time";
    } else if (periodType === "day") {
      start = startOfDay(selectedDate);
      end = endOfDay(selectedDate);
      label = format(selectedDate, "MMMM d, yyyy");
    } else if (periodType === "week") {
      const ws = getWeekStart(selectedDate);
      start = ws;
      end = getWeekEnd(ws);
      label = `${format(ws, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    } else if (periodType === "month") {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
      label = format(selectedDate, "MMMM yyyy");
    } else {
      start = startOfYear(selectedDate);
      end = endOfYear(selectedDate);
      label = `${selectedDate.getFullYear()}`;
    }
    return { rangeStart: start, rangeEnd: end, rangeLabel: label };
  }, [periodType, selectedDate, allTimeStart, allTimeEnd]);

  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      const d = parseISO(tx.date);
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [transactions, rangeStart, rangeEnd]);

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const bd = new Date(b.monthKey + "-01");
      return bd >= startOfMonth(rangeStart) && bd <= startOfMonth(rangeEnd);
    });
  }, [budgets, rangeStart, rangeEnd]);

  const filteredTotals = useMemo(() => {
    return filteredTxs.reduce(
      (acc, tx) => {
        if (tx.type === "income") acc.income += tx.amount;
        else acc.expense += tx.amount;
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 },
    );
  }, [filteredTxs]);

  // Calendar helpers
  const buildDays = (view: Date): (Date | null)[] => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const offset = getDayCol(firstDay.getDay());
    const days: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const inSelectedRange = (d: Date): boolean => {
    if (periodType === "all")
      return d >= startOfDay(allTimeStart) && d <= startOfDay(allTimeEnd);
    if (periodType === "day") return isSameDay(d, selectedDate);
    if (periodType === "week") {
      const ws = getWeekStart(selectedDate);
      const we = getWeekEnd(ws);
      return d >= startOfDay(ws) && d <= endOfDay(we);
    }
    if (periodType === "month") return isSameMonth(d, selectedDate);
    return d.getFullYear() === selectedDate.getFullYear();
  };
  const isStart = (d: Date): boolean => {
    if (periodType === "all") return isSameDay(d, allTimeStart);
    if (periodType === "day") return isSameDay(d, selectedDate);
    if (periodType === "week") return isSameDay(d, getWeekStart(selectedDate));
    if (periodType === "month") return isSameDay(d, startOfMonth(selectedDate));
    return isSameDay(d, startOfYear(selectedDate));
  };
  const isEnd = (d: Date): boolean => {
    if (periodType === "all") return isSameDay(d, allTimeEnd);
    if (periodType === "day") return isSameDay(d, selectedDate);
    if (periodType === "week")
      return isSameDay(d, getWeekEnd(getWeekStart(selectedDate)));
    if (periodType === "month") return isSameDay(d, endOfMonth(selectedDate));
    return isSameDay(d, endOfYear(selectedDate));
  };

  const setPreset = (p: "today" | "this_week" | "this_month" | "this_year") => {
    const t = new Date();
    setSelectedDate(t);
    setCalView(t);
    const map = {
      today: "day",
      this_week: "week",
      this_month: "month",
      this_year: "year",
    } as const;
    setPeriodType(map[p]);
  };

  const changePeriod = (pt: PeriodType) => {
    setPeriodType(pt);
    setCalView(pt === "all" ? allTimeStart : selectedDate);
  };

  const formatCurrency = (amount: number, currency: string = "USD"): string => {
    const formatted = Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${amount < 0 ? "-" : ""}${currency} ${formatted}`;
  };

  // Build PDF
  const generatePDF = (allTime = false) => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const getCat = (id: string) =>
        categories.find((category) => category.id === id)?.name ?? id;
      const now = format(new Date(), "MMMM d, yyyy");
      const primary: [number, number, number] = [30, 215, 96];
      const reportLabel = allTime ? "All Time" : rangeLabel;
      const reportDateRange = `${format(rangeStart, "MMM d, yyyy")} – ${format(rangeEnd, "MMM d, yyyy")}`;
      const reportTransactions = allTime ? transactions : filteredTxs;
      const reportBudgets = allTime ? budgets : filteredBudgets;
      const reportTotals = allTime
        ? transactions.reduce(
            (acc, tx) => {
              if (tx.type === "income") acc.income += tx.amount;
              else acc.expense += tx.amount;
              acc.balance = acc.income - acc.expense;
              return acc;
            },
            { income: 0, expense: 0, balance: 0 },
          )
        : filteredTotals;

      // Header banner
      doc.setFillColor(...primary);
      doc.rect(0, 0, 210, 42, "F");
      doc.setTextColor(10, 10, 10);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("LifeLedger", 14, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Period: ${reportLabel}${allTime ? ` (${reportDateRange})` : ""}`,
        14,
        28,
        { maxWidth: 182 },
      );
      doc.text(`Generated: ${now}   |   ${user?.displayName ?? ""}`, 14, 36, {
        maxWidth: 182,
      });

      // Balance Overview
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Balance Overview`, 14, 52);

      autoTable(doc, {
        startY: 57,
        head: [["Total Income", "Total Expenses", "Net Balance"]],
        body: [
          [
            formatCurrency(reportTotals.income, currency),
            formatCurrency(reportTotals.expense, currency),
            formatCurrency(reportTotals.balance, currency),
          ],
        ],
        headStyles: {
          fillColor: primary,
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 10,
        },
        bodyStyles: { fontSize: 11, fontStyle: "bold" },
        columnStyles: {
          0: { textColor: [34, 197, 94] },
          1: { textColor: [255, 71, 87] },
          2: {
            textColor:
              reportTotals.balance >= 0 ? [34, 197, 94] : [255, 71, 87],
          },
        },
        margin: { left: 14, right: 14 },
      });

      // Transactions
      const txY = (doc as any).lastAutoTable.finalY + 14;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Transactions (${reportTransactions.length})`, 14, txY);

      if (reportTransactions.length > 0) {
        autoTable(doc, {
          startY: txY + 5,
          head: [["Date", "Type", "Category", "Amount", "Note"]],
          body: reportTransactions.map((tx) => [
            format(parseISO(tx.date), "MMM d, yyyy"),
            tx.type === "income" ? "Income" : "Expense",
            getCat(tx.category),
            (tx.type === "income" ? "+" : "-") +
              formatCurrency(tx.amount, currency),
            tx.note || "—",
          ]),
          headStyles: {
            fillColor: [35, 35, 50],
            textColor: [220, 220, 220],
            fontSize: 9,
          },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
          didParseCell(data) {
            if (data.section === "body" && data.column.index === 3) {
              const val = String(data.cell.raw);
              data.cell.styles.textColor = val.startsWith("+")
                ? [34, 197, 94]
                : [255, 71, 87];
              data.cell.styles.fontStyle = "bold";
            }
          },
          margin: { left: 14, right: 14 },
        });
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150, 150, 150);
        doc.text("No transactions for this period.", 14, txY + 10);
      }

      // Budgets
      if (reportBudgets.length > 0) {
        const bdgY =
          reportTransactions.length > 0
            ? (doc as any).lastAutoTable.finalY + 14
            : txY + 20;
        let actualY = bdgY;
        if (bdgY > 240) {
          doc.addPage();
          actualY = 20;
        }

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`Budgets (${reportBudgets.length})`, 14, actualY);

        const budgetRows = reportBudgets.map((b) => {
          const spent = transactions
            .filter(
              (t) =>
                t.type === "expense" &&
                t.category === b.category &&
                t.date.startsWith(b.monthKey),
            )
            .reduce((s, t) => s + t.amount, 0);
          return [
            format(new Date(b.monthKey + "-01"), "MMMM yyyy"),
            getCat(b.category),
            formatCurrency(b.amount, currency),
            formatCurrency(spent, currency),
            b.amount > 0 ? ((spent / b.amount) * 100).toFixed(0) + "%" : "0%",
          ];
        });

        autoTable(doc, {
          startY: actualY + 5,
          head: [["Month", "Category", "Limit", "Spent", "Used %"]],
          body: budgetRows,
          headStyles: {
            fillColor: [35, 35, 50],
            textColor: [220, 220, 220],
            fontSize: 9,
          },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `LifeLedger  ·  ${reportLabel}  ·  Page ${i} of ${pages}`,
          14,
          290,
        );
      }

      doc.save(
        allTime
          ? "lifeledger_all-time.pdf"
          : `lifeledger_${periodType}_${format(rangeStart, "yyyy-MM-dd")}.pdf`,
      );
    } finally {
      setGenerating(false);
      onClose();
    }
  };

  const days = buildDays(calView);
  const firstYear = Math.min(
    today.getFullYear() - 10,
    allTimeStart.getFullYear(),
  );
  const lastYear = Math.max(today.getFullYear(), calendarMaxDate.getFullYear());
  const years = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, i) => firstYear + i,
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-2 min-[420px]:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[92dvh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
                <div>
                  <h2 className="text-lg font-bold">Export PDF Report</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose a period to download
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-muted rounded-full hover:bg-muted/80 text-muted-foreground cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* Quick presets */}
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Quick Select
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Today",
                        sub: format(today, "MMM d"),
                        preset: "today" as const,
                      },
                      {
                        label: "This Week",
                        sub: `${format(getWeekStart(today), "MMM d")} – ${format(getWeekEnd(getWeekStart(today)), "MMM d")}`,
                        preset: "this_week" as const,
                      },
                      {
                        label: "This Month",
                        sub: format(today, "MMMM yyyy"),
                        preset: "this_month" as const,
                      },
                      {
                        label: "This Year",
                        sub: `${today.getFullYear()}`,
                        preset: "this_year" as const,
                      },
                    ].map(({ label, sub, preset }) => (
                      <button
                        key={preset}
                        onClick={() => setPreset(preset)}
                        className="flex flex-col items-start px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all cursor-pointer text-left"
                      >
                        <span className="text-xs font-bold text-primary">
                          {label}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {sub}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => changePeriod("all")}
                      aria-pressed={periodType === "all"}
                      data-testid="button-export-all-time"
                      className={cn(
                        "col-span-2 flex flex-col items-start px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left",
                        periodType === "all"
                          ? "bg-primary/20 border-primary ring-1 ring-primary/20"
                          : "bg-primary/10 hover:bg-primary/20 border-primary/20",
                      )}
                    >
                      <span className="text-xs font-bold text-primary">
                        All Time
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        Complete transaction and budget history
                      </span>
                    </button>
                  </div>
                </div>

                {/* Period tabs */}
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Period
                  </p>
                  <div className="flex p-1 bg-muted rounded-xl mb-4">
                    {(
                      ["day", "week", "month", "year", "all"] as PeriodType[]
                    ).map((pt) => (
                      <button
                        key={pt}
                        onClick={() => changePeriod(pt)}
                        aria-pressed={periodType === pt}
                        data-testid={
                          pt === "all" ? "tab-period-all" : undefined
                        }
                        className={cn(
                          "flex-1 py-2 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer",
                          periodType === pt
                            ? "bg-card shadow text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {pt === "all" ? "All" : pt}
                      </button>
                    ))}
                  </div>

                  {/* Custom Calendar */}
                  <div className="bg-background border border-border rounded-xl p-3">
                    {/* Day / Week calendar */}
                    {(periodType === "day" ||
                      periodType === "week" ||
                      periodType === "all") && (
                      <>
                        {/* Calendar navigation */}
                        {(() => {
                          const maxDate =
                            periodType === "all" ? allTimeEnd : calendarMaxDate;
                          const canNextMonth =
                            calView.getFullYear() * 12 + calView.getMonth() <
                            maxDate.getFullYear() * 12 + maxDate.getMonth();
                          const canPrevMonth =
                            periodType !== "all" ||
                            calView.getFullYear() * 12 + calView.getMonth() >
                              allTimeStart.getFullYear() * 12 +
                                allTimeStart.getMonth();
                          return (
                            <div className="flex items-center justify-between mb-3">
                              <button
                                onClick={() =>
                                  canPrevMonth &&
                                  setCalView(
                                    new Date(
                                      calView.getFullYear(),
                                      calView.getMonth() - 1,
                                      1,
                                    ),
                                  )
                                }
                                disabled={!canPrevMonth}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                                  canPrevMonth
                                    ? "hover:bg-muted cursor-pointer"
                                    : "opacity-25 cursor-not-allowed",
                                )}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-semibold">
                                {format(calView, "MMMM yyyy")}
                              </span>
                              <button
                                onClick={() =>
                                  canNextMonth &&
                                  setCalView(
                                    new Date(
                                      calView.getFullYear(),
                                      calView.getMonth() + 1,
                                      1,
                                    ),
                                  )
                                }
                                disabled={!canNextMonth}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                                  canNextMonth
                                    ? "hover:bg-muted cursor-pointer"
                                    : "opacity-25 cursor-not-allowed",
                                )}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })()}
                        {periodType === "all" && (
                          <p className="mb-2 rounded-lg bg-primary/10 px-2 py-1.5 text-center text-[10px] font-medium text-primary">
                            Full range: {format(allTimeStart, "MMM d, yyyy")} –{" "}
                            {format(allTimeEnd, "MMM d, yyyy")}
                          </p>
                        )}
                        <div className="grid grid-cols-7 text-center mb-1">
                          {WEEK_HEADERS.map((h) => (
                            <div
                              key={h}
                              className="text-[10px] font-bold text-muted-foreground py-1"
                            >
                              {h}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-y-0.5">
                          {days.map((d, i) => {
                            if (!d) return <div key={`e-${i}`} />;
                            const isBeforeAllTime =
                              periodType === "all" &&
                              d < startOfDay(allTimeStart);
                            const isAfterSelectableEnd =
                              periodType === "all"
                                ? d > startOfDay(allTimeEnd)
                                : d > startOfDay(calendarMaxDate);
                            const isUnavailable =
                              isBeforeAllTime || isAfterSelectableEnd;
                            const inRange =
                              !isUnavailable && inSelectedRange(d);
                            const s = !isUnavailable && isStart(d);
                            const e = !isUnavailable && isEnd(d);
                            const isT = isSameDay(d, today);
                            const inMonth = d.getMonth() === calView.getMonth();
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (!isUnavailable) {
                                    if (periodType === "all")
                                      setPeriodType("day");
                                    setSelectedDate(d);
                                    setCalView(d);
                                  }
                                }}
                                disabled={isUnavailable}
                                className={cn(
                                  "h-8 w-full flex items-center justify-center text-xs transition-all",
                                  !inMonth && "opacity-25",
                                  isUnavailable
                                    ? "opacity-20 cursor-not-allowed"
                                    : "cursor-pointer",
                                  // range middle
                                  inRange && !s && !e && "bg-primary/15",
                                  // range start
                                  s &&
                                    !e &&
                                    "bg-primary text-primary-foreground font-bold rounded-l-lg",
                                  // range end
                                  e &&
                                    !s &&
                                    "bg-primary text-primary-foreground font-bold rounded-r-lg",
                                  // single selection
                                  s &&
                                    e &&
                                    "bg-primary text-primary-foreground font-bold rounded-lg",
                                  // today indicator
                                  isT &&
                                    !inRange &&
                                    "border border-primary/60 text-primary font-semibold rounded-lg",
                                  // hover for non-selected & not future
                                  !inRange &&
                                    inMonth &&
                                    !isUnavailable &&
                                    "hover:bg-muted rounded-lg",
                                )}
                              >
                                {d.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Month picker */}
                    {periodType === "month" && (
                      <>
                        {(() => {
                          const canNextYear =
                            calView.getFullYear() <
                            calendarMaxDate.getFullYear();
                          return (
                            <div className="flex items-center justify-between mb-3">
                              <button
                                onClick={() =>
                                  setCalView(
                                    new Date(calView.getFullYear() - 1, 0, 1),
                                  )
                                }
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-semibold">
                                {calView.getFullYear()}
                              </span>
                              <button
                                onClick={() =>
                                  canNextYear &&
                                  setCalView(
                                    new Date(calView.getFullYear() + 1, 0, 1),
                                  )
                                }
                                disabled={!canNextYear}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                                  canNextYear
                                    ? "hover:bg-muted cursor-pointer"
                                    : "opacity-25 cursor-not-allowed",
                                )}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })()}
                        <div className="grid grid-cols-4 gap-1.5">
                          {MONTH_NAMES_SHORT.map((m, idx) => {
                            const sel =
                              selectedDate.getMonth() === idx &&
                              selectedDate.getFullYear() ===
                                calView.getFullYear();
                            const isFutureMonth =
                              calView.getFullYear() >
                                calendarMaxDate.getFullYear() ||
                              (calView.getFullYear() ===
                                calendarMaxDate.getFullYear() &&
                                idx > calendarMaxDate.getMonth());
                            return (
                              <button
                                key={m}
                                onClick={() => {
                                  if (isFutureMonth) return;
                                  const d = new Date(
                                    calView.getFullYear(),
                                    idx,
                                    1,
                                  );
                                  setSelectedDate(d);
                                }}
                                disabled={isFutureMonth}
                                className={cn(
                                  "py-2 rounded-lg text-xs font-semibold transition-all",
                                  isFutureMonth
                                    ? "opacity-20 cursor-not-allowed"
                                    : "cursor-pointer",
                                  sel && !isFutureMonth
                                    ? "bg-primary text-primary-foreground"
                                    : !isFutureMonth &&
                                        "hover:bg-muted text-foreground",
                                  isFutureMonth && "text-foreground",
                                )}
                              >
                                {m}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Year picker */}
                    {periodType === "year" && (
                      <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
                        {years.map((yr) => {
                          const sel = selectedDate.getFullYear() === yr;
                          return (
                            <button
                              key={yr}
                              onClick={() => {
                                setSelectedDate(new Date(yr, 0, 1));
                              }}
                              className={cn(
                                "py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                sel
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted text-foreground",
                              )}
                            >
                              {yr}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary strip */}
                <div className="flex items-center justify-between bg-primary/10 border border-primary/25 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        Selected Period
                      </p>
                      <p className="text-sm font-bold text-primary leading-tight">
                        {rangeLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted-foreground">
                      {periodType === "all"
                        ? transactions.length
                        : filteredTxs.length}{" "}
                      transactions
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {periodType === "all"
                        ? budgets.length
                        : filteredBudgets.length}{" "}
                      budgets
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-3 border-t border-border shrink-0">
                <button
                  onClick={() => generatePDF(periodType === "all")}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {generating ? "Generating…" : "Download PDF Report"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}