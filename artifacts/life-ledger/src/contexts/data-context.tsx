import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './auth-context';
import { apiFetch } from '@/lib/api';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  monthKey: string;
}

interface DataContextType {
  transactions: Transaction[];
  budgets: Budget[];
  loading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, amount: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  totals: { income: number; expense: number; balance: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) { setTransactions([]); setBudgets([]); return; }
    setLoading(true);
    try {
      const [txs, bdgts] = await Promise.all([
        apiFetch<Transaction[]>('/transactions'),
        apiFetch<Budget[]>('/budgets'),
      ]);
      setTransactions(txs);
      setBudgets(bdgts);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx = await apiFetch<Transaction>('/transactions', {
      method: 'POST', body: JSON.stringify(tx),
    });
    setTransactions(prev => [newTx, ...prev].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    const updated = await apiFetch<Transaction>(`/transactions/${id}`, {
      method: 'PUT', body: JSON.stringify(updates),
    });
    setTransactions(prev => prev
      .map(t => t.id === id ? updated : t)
      .sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  };

  const deleteTransaction = async (id: string) => {
    await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addBudget = async (budget: Omit<Budget, 'id'>) => {
    const newBudget = await apiFetch<Budget>('/budgets', {
      method: 'POST', body: JSON.stringify(budget),
    });
    setBudgets(prev => {
      const existing = prev.findIndex(b => b.category === budget.category && b.monthKey === budget.monthKey);
      if (existing >= 0) return prev.map((b, i) => i === existing ? newBudget : b);
      return [...prev, newBudget];
    });
  };

  const updateBudget = async (id: string, amount: number) => {
    const updated = await apiFetch<Budget>(`/budgets/${id}`, {
      method: 'PUT', body: JSON.stringify({ amount }),
    });
    setBudgets(prev => prev.map(b => b.id === id ? updated : b));
  };

  const deleteBudget = async (id: string) => {
    await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const clearAllData = async () => {
    await apiFetch('/data', { method: 'DELETE' });
    setTransactions([]);
    setBudgets([]);
  };

  const totals = useMemo(() => transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'income') acc.income += tx.amount;
      else acc.expense += tx.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, balance: 0 }
  ), [transactions]);

  return (
    <DataContext.Provider value={{
      transactions, budgets, loading,
      addTransaction, updateTransaction, deleteTransaction,
      addBudget, updateBudget, deleteBudget,
      clearAllData, totals,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
