import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCIES } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrencySymbol(currencyCode: string): string {
  const found = CURRENCIES.find(c => c.code === currencyCode);
  return found ? found.symbol : currencyCode;
}

/** Amounts are whole numbers everywhere in LifeLedger (no cents). */
export function roundAmount(amount: number): number {
  return Math.round(amount);
}

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const symbol = getCurrencySymbol(currencyCode);
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${rounded < 0 ? "-" : ""}${symbol}${formatted}`;
}

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Same as formatCurrency, but switches to a compact form (1.2M, 3.4B) once the
 * amount reaches `threshold`, so huge numbers never overflow their card.
 */
export function formatCompactCurrency(
  amount: number,
  currencyCode: string = "USD",
  threshold: number = 1_000_000,
): string {
  const rounded = Math.round(amount);
  if (Math.abs(rounded) < threshold) return formatCurrency(rounded, currencyCode);
  const symbol = getCurrencySymbol(currencyCode);
  return `${rounded < 0 ? "-" : ""}${symbol}${compactNumber.format(Math.abs(rounded))}`;
}

/** Whole-number percentage; tiny non-zero changes show as "<1%" instead of "0%". */
export function formatPercent(value: number): string {
  const abs = Math.abs(value);
  if (abs > 0 && abs < 0.5) return "<1%";
  return `${Math.round(abs)}%`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
