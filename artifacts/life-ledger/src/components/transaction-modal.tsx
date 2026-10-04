import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useData, TransactionType, Transaction } from "@/contexts/data-context";
import { useTheme } from "@/contexts/theme-context";
import { format } from "date-fns";
import { DatePicker } from "@/components/date-picker";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTx?: Transaction;
  duplicateTx?: Transaction;
}

export function TransactionModal({
  isOpen,
  onClose,
  editTx,
  duplicateTx,
}: TransactionModalProps) {
  const { addTransaction, updateTransaction, categories } = useData();
  const { currency } = useTheme();

  const isEditMode = !!editTx;
  const isDuplicateMode = !isEditMode && !!duplicateTx;
  const sourceTx = editTx ?? duplicateTx;
  const today = format(new Date(), "yyyy-MM-dd");

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (sourceTx) {
        setType(sourceTx.type);
        setAmount(String(sourceTx.amount));
        setCategory(sourceTx.category);
        setDate(sourceTx.date.split("T")[0]);
        setNote(sourceTx.note || "");
      } else {
        setType("expense");
        setAmount("");
        setCategory("");
        setDate(today);
        setNote("");
      }
    }
  }, [isOpen, sourceTx, today]);

  const selectedCategory = categories.find((item) => item.id === category);
  const canKeepArchivedCategory =
    isEditMode &&
    editTx?.category === category &&
    selectedCategory?.isArchived === true;
  const hasValidCategory =
    selectedCategory?.type === type &&
    (!selectedCategory.isArchived || canKeepArchivedCategory);

  const handleSave = () => {
    if (
      !amount ||
      isNaN(Number(amount)) ||
      Number(amount) <= 0 ||
      !category ||
      !hasValidCategory
    )
      return;
    const payload = { type, amount: Number(amount), category, date, note };
    if (isEditMode && editTx) {
      updateTransaction(editTx.id, payload);
    } else {
      addTransaction(payload);
    }
    onClose();
  };

  const filteredCategories = categories.filter(
    (category) =>
      category.type === type &&
      (!category.isArchived ||
        (isEditMode && editTx?.category === category.id)),
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:p-4"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] w-full flex-col overflow-y-auto overscroll-contain rounded-t-3xl border border-border bg-card pb-[env(safe-area-inset-bottom)] lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[90dvh] lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:pb-0 lg:shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 border-b border-border/50 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {isEditMode
                  ? "Edit Transaction"
                  : isDuplicateMode
                    ? "Duplicate Transaction"
                    : "New Transaction"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 bg-muted rounded-full hover:bg-muted/80 text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              {/* Type Toggle */}
              <div className="flex p-1 bg-muted rounded-xl">
                <button
                  onClick={() => {
                    setType("expense");
                    setCategory("");
                  }}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer",
                    type === "expense"
                      ? "bg-card shadow text-expense"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Expense
                </button>
                <button
                  onClick={() => {
                    setType("income");
                    setCategory("");
                  }}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer",
                    type === "income"
                      ? "bg-card shadow text-income"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Amount
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center justify-center border-r border-border/50">
                    <span className="text-xl font-bold text-primary">
                      {getCurrencySymbol(currency)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      "w-full rounded-xl border-2 border-border bg-background py-4 pl-16 pr-4 text-2xl font-bold outline-none transition-all sm:text-3xl",
                      type === "expense"
                        ? "focus:border-expense focus:ring-4 focus:ring-expense/10"
                        : "focus:border-income focus:ring-4 focus:ring-income/10",
                    )}
                  />
                </div>
              </div>

              {/* Category Grid */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Category
                </label>
                {isDuplicateMode && selectedCategory?.isArchived && (
                  <p className="text-xs text-muted-foreground">
                    This category is archived. Choose an active category for the
                    duplicate.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
                  {filteredCategories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                        category === c.id
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-background hover:border-border/80 hover:bg-muted/50",
                      )}
                    >
                      <span className="text-2xl mb-1">{c.icon}</span>
                      <span className="text-xs font-medium truncate w-full text-center leading-tight">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Note */}
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Date
                  </label>
                  <DatePicker value={date} onChange={setDate} maxDate={today} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Lunch..."
                    className="w-full bg-background border-2 border-border rounded-xl py-2 px-4 outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="p-4 border-t border-border mt-auto">
              <button
                onClick={handleSave}
                disabled={!amount || !hasValidCategory || Number(amount) <= 0}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none transition-all cursor-pointer"
              >
                <Check className="w-5 h-5" />
                {isEditMode
                  ? "Update Transaction"
                  : isDuplicateMode
                    ? "Save Duplicate"
                    : `Save ${type === "income" ? "Income" : "Expense"}`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}