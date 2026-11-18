import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './auth-context';
import { usePinLock } from './pin-lock-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { Category, CategoryInput, CategoryUpdate } from '@/types/category';
import { roundAmount } from '@/lib/utils';

export type TransactionType = 'income' | 'expense';
export type { Category };

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

export interface MutationOptions {
  /** Skip the success/error toast (used for bulk operations like CSV import). */
  silent?: boolean;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Please try again.';
}

interface DataContextType {
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  loading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>, options?: MutationOptions) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>, options?: MutationOptions) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id'>, options?: MutationOptions) => Promise<void>;
  updateBudget: (id: string, amount: number, options?: MutationOptions) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addCategory: (category: CategoryInput) => Promise<Category>;
  updateCategory: (id: string, updates: CategoryUpdate) => Promise<Category>;
  clearAllData: () => Promise<void>;
  totals: { income: number; expense: number; balance: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { ready: pinReady, isLocked } = usePinLock();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    if (!user || !pinReady || isLocked) {
      setTransactions([]);
      setBudgets([]);
      setCategories([]);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    const loadData = async () => {
      try {
        const [{ data: txs }, { data: bdgts }] = await Promise.all([
          api.get<Transaction[]>('/transactions'),
          api.get<Budget[]>('/budgets'),
        ]);
        const { data: cats } = await api.get<Category[]>('/categories');
        if (active) {
          setTransactions(txs);
          setBudgets(bdgts);
          setCategories(cats);
        }
      } catch (err) {
        if (active) console.error('Failed to load data:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadData();

    const refreshCategories = () => {
      void api.get<Category[]>('/categories')
        .then(({ data: cats }) => {
          if (active) setCategories(cats);
        })
        .catch((err) => {
          if (active) console.error('Failed to refresh categories:', err);
        });
    };
    window.addEventListener('focus', refreshCategories);

    return () => {
      active = false;
      window.removeEventListener('focus', refreshCategories);
    };
  }, [user, pinReady, isLocked]);

  const sortTransactions = (list: Transaction[]) => list.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime() ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const createTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const { data: newTx } = await api.post<Transaction>('/transactions', { ...tx, amount: roundAmount(tx.amount) });
    setTransactions(prev => sortTransactions([newTx, ...prev]));
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>, options?: MutationOptions) => {
    try {
      await createTransaction(tx);
      if (!options?.silent) toast.success('Transaction added');
    } catch (err) {
      if (options?.silent) throw err;
      toast.error('Could not add transaction', { description: errorMessage(err) });
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>, options?: MutationOptions) => {
    try {
      const payload = updates.amount !== undefined ? { ...updates, amount: roundAmount(updates.amount) } : updates;
      const { data: updated } = await api.put<Transaction>(`/transactions/${id}`, payload);
      setTransactions(prev => sortTransactions(prev.map(t => t.id === id ? updated : t)));
      if (!options?.silent) toast.success('Transaction updated');
    } catch (err) {
      if (options?.silent) throw err;
      toast.error('Could not update transaction', { description: errorMessage(err) });
    }
  };

  const deleteTransaction = async (id: string) => {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;

    try {
      await api.delete(`/transactions/${id}`);
      setTransactions((prev) => prev.filter((item) => item.id !== id));

      let undoRequested = false;
      toast('Deleted', {
        duration: 7_000,
        action: {
          label: 'Undo',
          onClick: () => {
            if (undoRequested) return;
            undoRequested = true;
            void createTransaction({
              type: transaction.type,
              amount: transaction.amount,
              category: transaction.category,
              date: transaction.date,
              note: transaction.note,
            })
              .then(() => toast.success('Restored'))
              .catch(() => {
                undoRequested = false;
                toast.error('Could not restore transaction', {
                  description: 'Please refresh and try again.',
                });
              });
          },
        },
      });
    } catch {
      toast.error('Could not delete transaction', {
        description: 'Please try again.',
      });
    }
  };

  const addBudget = async (budget: Omit<Budget, 'id'>, options?: MutationOptions) => {
    try {
      const { data: newBudget } = await api.post<Budget>('/budgets', { ...budget, amount: roundAmount(budget.amount) });
      setBudgets(prev => {
        const existing = prev.findIndex(b => b.category === budget.category && b.monthKey === budget.monthKey);
        if (existing >= 0) return prev.map((b, i) => i === existing ? newBudget : b);
        return [...prev, newBudget];
      });
      if (!options?.silent) toast.success('Budget saved');
    } catch (err) {
      if (options?.silent) throw err;
      toast.error('Could not save budget', { description: errorMessage(err) });
    }
  };

  const updateBudget = async (id: string, amount: number, options?: MutationOptions) => {
    try {
      const { data: updated } = await api.put<Budget>(`/budgets/${id}`, { amount: roundAmount(amount) });
      setBudgets(prev => prev.map(b => b.id === id ? updated : b));
      if (!options?.silent) toast.success('Budget saved');
    } catch (err) {
      if (options?.silent) throw err;
      toast.error('Could not save budget', { description: errorMessage(err) });
    }
  };

  const deleteBudget = async (id: string) => {
    await api.delete(`/budgets/${id}`);
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const addCategory = async (category: CategoryInput) => {
    const { data: created } = await api.post<Category>('/categories', category);
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const updateCategory = async (id: string, updates: CategoryUpdate) => {
    const { data: updated } = await api.patch<Category>(`/categories/${encodeURIComponent(id)}`, updates);
    setCategories((prev) =>
      prev.map((category) => (category.id === id ? updated : category)),
    );
    return updated;
  };

  const clearAllData = async () => {
    await api.delete('/data');
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
      transactions, budgets, categories, loading,
      addTransaction, updateTransaction, deleteTransaction,
      addBudget, updateBudget, deleteBudget,
      addCategory, updateCategory,
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
