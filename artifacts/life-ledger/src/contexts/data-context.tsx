import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './auth-context';
import { usePinLock } from './pin-lock-context';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type {
  Category as ApiCategory,
  CategoryInput,
  CategoryUpdate,
} from '@workspace/api-client-react';

export type TransactionType = 'income' | 'expense';
export type Category = ApiCategory;

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
  categories: Category[];
  loading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, amount: number) => Promise<void>;
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
        const [txs, bdgts] = await Promise.all([
          apiFetch<Transaction[]>('/transactions'),
          apiFetch<Budget[]>('/budgets'),
        ]);
        const cats = await apiFetch<Category[]>('/categories');
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
      void apiFetch<Category[]>('/categories')
        .then((cats) => {
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
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;

    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      setTransactions((prev) => prev.filter((item) => item.id !== id));

      let undoRequested = false;
      toast('Deleted', {
        duration: 7_000,
        action: {
          label: 'Undo',
          onClick: () => {
            if (undoRequested) return;
            undoRequested = true;
            void addTransaction({
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

  const addCategory = async (category: CategoryInput) => {
    const created = await apiFetch<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const updateCategory = async (id: string, updates: CategoryUpdate) => {
    const updated = await apiFetch<Category>(`/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setCategories((prev) =>
      prev.map((category) => (category.id === id ? updated : category)),
    );
    return updated;
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
