import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { Layout } from "@/components/layout";
import { useData, TransactionType, Transaction } from "@/contexts/data-context";
import { useTheme } from "@/contexts/theme-context";
import { formatCurrency, cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  Filter,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Pencil,
  Copy,
  Check,
} from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "@/components/confirm-modal";
import { TransactionModal } from "@/components/transaction-modal";

interface FilterSelectOption {
  value: string;
  label: string;
}
function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: FilterSelectOption[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  const position = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const listH = 240;
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    setStyle({
      position: "fixed",
      left: r.left,
      width: r.width,
      zIndex: 9999,
      ...(below < listH && above > below
        ? { bottom: window.innerHeight - r.top + 4 }
        : { top: r.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (open) position();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !listRef.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-background border-2 border-border rounded-xl px-3.5 py-2.5 hover:border-primary/50 transition-all cursor-pointer group text-left"
      >
        <span
          className={cn(
            "text-sm font-medium truncate",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 ml-2 group-hover:text-primary transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2 group-hover:text-primary transition-colors" />
        )}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={listRef}
              style={style}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="overflow-y-auto max-h-56 py-1.5">
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all cursor-pointer text-left",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {opt.label}
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

const MONTHS = [
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

export default function Transactions() {
  const { transactions, categories, deleteTransaction } = useData();
  const { currency } = useTheme();

  const [filterType, setFilterType] = useState<TransactionType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterMonthNum, setFilterMonthNum] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showByCategory, setShowByCategory] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [duplicateTx, setDuplicateTx] = useState<Transaction | null>(null);

  const getCategory = (id: string) =>
    categories.find((category) => category.id === id) ?? {
      id,
      name: id,
      icon: "📦",
    };

  const availableYears = useMemo(() => {
    const years = [...new Set(transactions.map((t) => t.date.substring(0, 4)))];
    return years.sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  const activeAdvancedCount = [
    dateFrom,
    dateTo,
    filterYear,
    minAmount,
    maxAmount,
    filterMonthNum && filterMonthYear ? "1" : "",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilterType("all");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setFilterMonthNum("");
    setFilterMonthYear("");
    setFilterYear("");
    setMinAmount("");
    setMaxAmount("");
  };

  const filtered = useMemo(
    () =>
      transactions.filter((tx) => {
        if (filterType !== "all" && tx.type !== filterType) return false;
        if (searchTerm) {
          const cat = getCategory(tx.category);
          const lower = searchTerm.toLowerCase();
          if (
            !cat.name.toLowerCase().includes(lower) &&
            !tx.note?.toLowerCase().includes(lower)
          )
            return false;
        }
        const txDate = tx.date.split("T")[0];
        if (dateFrom && txDate < dateFrom) return false;
        if (dateTo && txDate > dateTo) return false;
        if (
          filterMonthNum &&
          filterMonthYear &&
          !tx.date.startsWith(`${filterMonthYear}-${filterMonthNum}`)
        )
          return false;
        if (filterYear && !tx.date.startsWith(filterYear)) return false;
        if (minAmount && tx.amount < Number(minAmount)) return false;
        if (maxAmount && tx.amount > Number(maxAmount)) return false;
        return true;
      }),
    [
      transactions,
      categories,
      filterType,
      searchTerm,
      dateFrom,
      dateTo,
      filterMonthNum,
      filterMonthYear,
      filterYear,
      minAmount,
      maxAmount,
    ],
  );

  // Category breakdown of filtered transactions
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filtered.forEach((tx) => {
      if (!map.has(tx.category))
        map.set(tx.category, { income: 0, expense: 0 });
      const entry = map.get(tx.category)!;
      if (tx.type === "income") entry.income += tx.amount;
      else entry.expense += tx.amount;
    });
    return Array.from(map.entries())
      .map(([id, v]) => {
        const cat = getCategory(id);
        return { name: cat.name, cat, ...v, total: v.income + v.expense };
      })
      .sort((a, b) => b.total - a.total);
  }, [filtered, categories]);

  const filteredIncome = useMemo(
    () =>
      filtered
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [filtered],
  );
  const filteredExpense = useMemo(
    () =>
      filtered
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [filtered],
  );
  const maxCatTotal = Math.max(...categoryBreakdown.map((c) => c.total), 1);

  const confirmDelete = () => {
    if (deleteId) {
      deleteTransaction(deleteId);
      setDeleteId(null);
    }
  };

  const inputCls =
    "w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-primary transition-all text-foreground placeholder:text-muted-foreground";
  const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block";

  return (
    <Layout>
      <div className="min-w-0 space-y-5 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold sm:text-3xl">Transactions</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {(filterType !== "all" ||
              searchTerm ||
              activeAdvancedCount > 0) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/30 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
            <div className="text-muted-foreground text-sm font-medium bg-card px-3 py-1.5 rounded-full border border-border">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </div>
          </div>
        </div>

        {/* Primary Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by category or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <div className="flex w-full rounded-xl border border-border bg-card p-1 sm:w-auto">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2 text-sm font-medium capitalize transition-all sm:flex-none sm:px-4",
                  filterType === t
                    ? t === "income"
                      ? "bg-income/20 text-income"
                      : t === "expense"
                        ? "bg-expense/20 text-expense"
                        : "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={cn(
              "flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-all sm:w-auto",
              showAdvanced || activeAdvancedCount > 0
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeAdvancedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                {activeAdvancedCount}
              </span>
            )}
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Advanced Filter Panel */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="overflow-visible rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <p className="mb-3 text-sm font-semibold text-foreground">
                      📅 Date Range
                    </p>
                    <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                      <div>
                        <label className={labelCls}>From</label>
                        <DatePicker
                          value={dateFrom}
                          onChange={setDateFrom}
                          placeholder="From date"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>To</label>
                        <DatePicker
                          value={dateTo}
                          onChange={setDateTo}
                          placeholder="To date"
                          minDate={dateFrom || undefined}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-border/60" />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-semibold text-foreground">
                        📆 By Month
                      </p>
                      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                        <div>
                          <label className={labelCls}>Month</label>
                          <FilterSelect
                            value={filterMonthNum}
                            onChange={setFilterMonthNum}
                            placeholder="Any"
                            options={[
                              { value: "", label: "Any month" },
                              ...MONTHS.map((m, i) => ({
                                value: String(i + 1).padStart(2, "0"),
                                label: m,
                              })),
                            ]}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Year</label>
                          <FilterSelect
                            value={filterMonthYear}
                            onChange={setFilterMonthYear}
                            placeholder="Any"
                            options={[
                              { value: "", label: "Any year" },
                              ...availableYears.map((y) => ({
                                value: y,
                                label: y,
                              })),
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-sm font-semibold text-foreground">
                        🗓️ By Year
                      </p>
                      <div>
                        <label className={labelCls}>Year</label>
                        <FilterSelect
                          value={filterYear}
                          onChange={setFilterYear}
                          placeholder="All years"
                          options={[
                            { value: "", label: "All years" },
                            ...availableYears.map((y) => ({
                              value: y,
                              label: y,
                            })),
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-border/60" />
                  <div>
                    <p className="mb-3 text-sm font-semibold text-foreground">
                      💰 Amount Range
                    </p>
                    <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                      <div>
                        <label className={labelCls}>Min Amount</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={minAmount}
                          onChange={(e) => setMinAmount(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Max Amount</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Any"
                          value={maxAmount}
                          onChange={(e) => setMaxAmount(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                  {activeAdvancedCount > 0 && (
                    <button
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                        setFilterMonthNum("");
                        setFilterMonthYear("");
                        setFilterYear("");
                        setMinAmount("");
                        setMaxAmount("");
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      Clear advanced filters
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* By Category Breakdown */}
        {filtered.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setShowByCategory((v) => !v)}
              className="flex w-full flex-col gap-2 p-4 text-left transition-colors hover:bg-muted/30 min-[440px]:flex-row min-[440px]:items-center min-[440px]:justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 break-words text-sm font-bold text-foreground sm:text-base">
                  Breakdown by Category
                </span>
                {showByCategory ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground min-[440px]:hidden" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground min-[440px]:hidden" />
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                  <span className="font-semibold text-income">
                    +{formatCurrency(filteredIncome, currency)}
                  </span>
                  <span className="font-semibold text-expense">
                    −{formatCurrency(filteredExpense, currency)}
                  </span>
                </div>
                {showByCategory ? (
                  <ChevronUp className="hidden h-4 w-4 shrink-0 text-muted-foreground min-[440px]:block" />
                ) : (
                  <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground min-[440px]:block" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {showByCategory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                    {categoryBreakdown.map(
                      ({ name, cat, income, expense, total }) => (
                        <div key={name} className="space-y-1">
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 text-lg">
                                {cat?.icon ?? "📦"}
                              </span>
                              <span className="min-w-0 break-words font-medium text-foreground">
                                {name}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              {income > 0 && (
                                <span className="text-income text-xs font-semibold">
                                  +{formatCurrency(income, currency)}
                                </span>
                              )}
                              {expense > 0 && (
                                <span className="text-expense text-xs font-semibold">
                                  −{formatCurrency(expense, currency)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                            {income > 0 && (
                              <div
                                className="h-full bg-income rounded-full transition-all duration-500"
                                style={{
                                  width: `${(income / maxCatTotal) * 100}%`,
                                }}
                              />
                            )}
                            {expense > 0 && (
                              <div
                                className="h-full bg-expense rounded-full transition-all duration-500"
                                style={{
                                  width: `${(expense / maxCatTotal) * 100}%`,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Transaction List */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-3">
              <Filter className="w-14 h-14 opacity-20" />
              <p className="text-lg font-medium text-foreground">
                No transactions found
              </p>
              <p className="text-sm">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((tx, i) => {
                const cat = getCategory(tx.category);
                const isIncome = tx.type === "income";
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    key={tx.id}
                    className="group flex min-w-0 flex-col justify-between gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-0"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                        {cat.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold text-foreground text-base leading-tight">
                          {cat.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(tx.date), "MMMM d, yyyy")}
                        </p>
                        {tx.note && (
                          <p className="text-xs text-muted-foreground italic mt-0.5 md:hidden">
                            "{tx.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-4">
                      {tx.note && (
                        <p className="text-sm text-muted-foreground italic max-w-[150px] truncate hidden md:block">
                          "{tx.note}"
                        </p>
                      )}
                      <div
                        className={cn(
                          "min-w-0 max-w-full text-right text-sm font-bold [overflow-wrap:anywhere] sm:min-w-[100px] sm:whitespace-nowrap sm:text-lg",
                          isIncome ? "text-income" : "text-expense",
                        )}
                      >
                        {isIncome ? "+" : "−"}
                        {formatCurrency(tx.amount, currency)}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-all focus-within:opacity-100 group-hover:opacity-100 sm:gap-1 sm:opacity-0">
                        <button
                          type="button"
                          onClick={() => {
                            setDuplicateTx(null);
                            setEditTx(tx);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                          aria-label={`Edit ${cat.name} transaction`}
                          title="Edit transaction"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          data-testid={`button-duplicate-transaction-${tx.id}`}
                          onClick={() => {
                            setEditTx(null);
                            setDuplicateTx(tx);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                          aria-label={`Duplicate ${cat.name} transaction`}
                          title="Duplicate transaction"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(tx.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                          aria-label={`Delete ${cat.name} transaction`}
                          title="Delete transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit and duplicate transaction modal */}
      <TransactionModal
        isOpen={editTx !== null || duplicateTx !== null}
        onClose={() => {
          setEditTx(null);
          setDuplicateTx(null);
        }}
        editTx={editTx ?? undefined}
        duplicateTx={duplicateTx ?? undefined}
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