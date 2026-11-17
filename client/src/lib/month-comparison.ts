export interface MonthComparisonTransaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface MonthTotals {
  income: number;
  expense: number;
}

export function createMonthKey(year: number, monthIndex: number): string | null {
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9999 ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function calculateMonthComparisonTotals(
  transactions: readonly MonthComparisonTransaction[],
  firstMonthKey: string,
  secondMonthKey: string,
): { first: MonthTotals; second: MonthTotals } {
  const first: MonthTotals = { income: 0, expense: 0 };
  const second: MonthTotals = { income: 0, expense: 0 };

  transactions.forEach(transaction => {
    const transactionMonth = transaction.date.slice(0, 7);
    if (transactionMonth === firstMonthKey) {
      first[transaction.type] += transaction.amount;
    }
    if (transactionMonth === secondMonthKey) {
      second[transaction.type] += transaction.amount;
    }
  });

  return { first, second };
}

export function getPercentageChange(currentAmount: number, comparisonAmount: number): number | null {
  if (comparisonAmount <= 0) return null;
  return ((currentAmount - comparisonAmount) / comparisonAmount) * 100;
}