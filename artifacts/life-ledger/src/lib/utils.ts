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

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
