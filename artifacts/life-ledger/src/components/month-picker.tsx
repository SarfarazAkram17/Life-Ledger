import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  ariaLabel: string;
}

const months = Array.from({ length: 12 }, (_, index) =>
  format(new Date(2020, index, 1), "MMMM"),
);

export function MonthPicker({ value, onChange, ariaLabel }: MonthPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [yearInput, setYearInput] = useState(() => {
    const year = Number(value.slice(0, 4));
    return String(
      Number.isInteger(year) && year >= 1 && year <= 9999
        ? year
        : new Date().getFullYear(),
    );
  });
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  const parsedMonth = value ? parseISO(`${value}-01`) : null;
  const selectedMonth =
    parsedMonth && !Number.isNaN(parsedMonth.getTime()) ? parsedMonth : null;
  const selectedMonthLabel = selectedMonth
    ? format(selectedMonth, "MMMM yyyy")
    : "Select month";
  const year = Number(yearInput);
  const isYearValid =
    /^\d{1,4}$/.test(yearInput) &&
    Number.isInteger(year) &&
    year >= 1 &&
    year <= 9999;
  const currentMonthKey = format(new Date(), "yyyy-MM");

  useEffect(() => {
    if (!open) return;
    setYearInput(
      String(selectedMonth?.getFullYear() ?? new Date().getFullYear()),
    );
  }, [open, value]);

  const updatePopupPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 260), window.innerWidth - 16);
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - width - 8),
    );
    const popupHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < popupHeight && rect.top > spaceBelow;

    setPopupStyle({
      position: "fixed",
      left,
      width,
      zIndex: 9999,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (open) updatePopupPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const closePopup = () => setOpen(false);

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closePopup, true);
    window.addEventListener("resize", closePopup);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closePopup, true);
      window.removeEventListener("resize", closePopup);
    };
  }, [open]);

  const changeYear = (delta: number) => {
    const baseYear = isYearValid ? year : new Date().getFullYear();
    setYearInput(String(Math.min(9999, Math.max(1, baseYear + delta))));
  };

  const selectMonth = (monthIndex: number) => {
    if (!isYearValid) return;
    const monthKey = `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}`;
    onChange(monthKey);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const popup = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popupRef}
          role="dialog"
          aria-label="Choose a month"
          style={popupStyle}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className="rounded-2xl border border-border bg-card p-3 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous year"
              onClick={() => changeYear(-1)}
              disabled={isYearValid && year <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              Year
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="9999"
                step="1"
                aria-label="Year"
                value={yearInput}
                onChange={(event) => setYearInput(event.target.value)}
                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-center text-sm font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <button
              type="button"
              aria-label="Next year"
              onClick={() => changeYear(1)}
              disabled={isYearValid && year >= 9999}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {months.map((month, index) => {
              const monthKey = isYearValid
                ? `${String(year).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`
                : "";
              const isSelected = monthKey === value;
              const isCurrentMonth = monthKey === currentMonthKey;

              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => selectMonth(index)}
                  disabled={!isYearValid}
                  aria-pressed={isSelected}
                  className={[
                    "rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-foreground hover:bg-muted",
                    isCurrentMonth && !isSelected
                      ? "ring-1 ring-primary text-primary"
                      : "",
                  ].join(" ")}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl border-2 border-border bg-background px-3.5 py-2.5 text-left transition-all hover:border-primary/60 hover:ring-2 hover:ring-primary/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <span
          className={
            selectedMonth
              ? "text-sm font-medium text-foreground"
              : "text-sm text-muted-foreground"
          }
        >
          {selectedMonthLabel}
        </span>
        <Calendar className="ml-2 h-4 w-4 shrink-0 text-foreground" />
      </button>

      {createPortal(popup, document.body)}
    </div>
  );
}