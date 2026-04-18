import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { format, isSameDay, addMonths, subMonths } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

// Week starts Saturday: Sa=col0, Su=1, Mo=2, Tu=3, We=4, Th=5, Fr=6
const getDayCol = (jsDay: number) => jsDay === 6 ? 0 : jsDay + 1;
const WEEK_HEADERS = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];

function buildDays(view: Date): (Date | null)[] {
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
}

interface DatePickerProps {
  value: string;           // YYYY-MM-DD or ''
  onChange: (date: string) => void;
  maxDate?: string;        // YYYY-MM-DD — dates after this are disabled
  minDate?: string;        // YYYY-MM-DD — dates before this are disabled
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, maxDate, minDate, placeholder = 'Select date', className }: DatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (s: string | undefined) => {
    if (!s) return undefined;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? undefined : d;
  };

  const maxObj = parseDate(maxDate);
  const minObj = parseDate(minDate);

  const selectedDate = parseDate(value);

  const initView = (): Date => {
    if (selectedDate) return new Date(selectedDate);
    if (maxObj && maxObj < today) return new Date(maxObj);
    return new Date(today);
  };

  const [open, setOpen] = useState(false);
  const [calView, setCalView] = useState<Date>(initView);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Sync calView with value
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (d) setCalView(d);
    }
  }, [value]);

  // Position the popup relative to the button using fixed positioning
  const updatePopupPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popupHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow;
    setPopupStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 240),
      zIndex: 9999,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (open) updatePopupPosition();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', () => setOpen(false), { passive: true });
    window.addEventListener('resize', () => setOpen(false), { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const isDisabled = (d: Date): boolean => {
    if (maxObj && d > maxObj) return true;
    if (minObj && d < minObj) return true;
    return false;
  };

  const handleDayClick = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const prevMonth = () => setCalView(v => subMonths(v, 1));
  const nextMonth = () => {
    const next = addMonths(calView, 1);
    if (maxObj) {
      const maxYM = maxObj.getFullYear() * 12 + maxObj.getMonth();
      const nextYM = next.getFullYear() * 12 + next.getMonth();
      if (nextYM > maxYM) return;
    }
    setCalView(next);
  };

  const canGoNext = !maxObj || (
    calView.getFullYear() * 12 + calView.getMonth() <
    maxObj.getFullYear() * 12 + maxObj.getMonth()
  );

  const days = buildDays(calView);

  const popup = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popupRef}
          style={popupStyle}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className="bg-card border border-border rounded-2xl shadow-2xl p-3"
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer text-foreground">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-foreground">{format(calView, 'MMMM yyyy')}</span>
            <button onClick={nextMonth} disabled={!canGoNext}
              className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                canGoNext ? 'hover:bg-muted cursor-pointer text-foreground' : 'opacity-25 cursor-not-allowed text-foreground')}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 text-center mb-0.5">
            {WEEK_HEADERS.map(h => (
              <div key={h} className="text-[9px] font-bold text-muted-foreground py-0.5">{h}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />;
              const disabled = isDisabled(d);
              const selected = selectedDate && isSameDay(d, selectedDate);
              const isToday = isSameDay(d, today);
              const inMonth = d.getMonth() === calView.getMonth();
              return (
                <button key={i}
                  onClick={() => handleDayClick(d)}
                  disabled={disabled}
                  className={cn(
                    'h-7 w-full flex items-center justify-center text-[11px] rounded-lg transition-all',
                    disabled ? 'opacity-20 cursor-not-allowed text-foreground' : 'cursor-pointer',
                    !inMonth && !disabled && 'opacity-35',
                    selected && 'bg-primary text-primary-foreground font-bold',
                    !selected && !disabled && inMonth && 'hover:bg-muted text-foreground',
                    !selected && !inMonth && !disabled && 'text-foreground',
                    isToday && !selected && 'ring-1 ring-primary text-primary font-semibold',
                  )}
                >{d.getDate()}</button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-background border-2 border-border rounded-xl hover:border-primary/60 focus:border-primary focus:outline-none transition-all text-left cursor-pointer"
      >
        <span className={cn('text-sm', selectedDate ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
        </span>
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {createPortal(popup, document.body)}
    </div>
  );
}
