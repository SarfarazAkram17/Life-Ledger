import { useEffect, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { cn, formatCompactCurrency, formatCurrency } from "@/lib/utils";

interface AmountProps {
  value: number;
  currency: string;
  className?: string;
}

/**
 * A whole-number amount that switches to a compact form (1.2M) for very large
 * values. The full value stays available as a tooltip and to screen readers.
 */
export function Amount({ value, currency, className }: AmountProps) {
  const full = formatCurrency(value, currency);
  const compact = formatCompactCurrency(value, currency);
  if (compact === full) {
    return <span className={cn("whitespace-nowrap", className)}>{full}</span>;
  }
  return (
    <span title={full} className={cn("whitespace-nowrap", className)}>
      <span aria-hidden="true">{compact}</span>
      <span className="sr-only">{full}</span>
    </span>
  );
}

/** Same as Amount, but counts up/down to the value when it changes. */
export function AnimatedAmount({ value, currency, className }: AmountProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(reduceMotion ? value : 0);
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useMotionValueEvent(motionValue, "change", (latest) => setDisplay(latest));

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(value);
      setDisplay(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [value, reduceMotion, motionValue]);

  const full = formatCurrency(value, currency);
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span aria-hidden="true" title={full}>
        {formatCompactCurrency(display, currency)}
      </span>
      <span className="sr-only">{full}</span>
    </span>
  );
}
