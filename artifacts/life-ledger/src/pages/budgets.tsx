import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { useData } from '@/contexts/data-context';
import { useTheme } from '@/contexts/theme-context';
import { CATEGORIES } from '@/lib/constants';
import { formatCurrency, getCurrencySymbol, cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { Plus, Trash2, Target, AlertTriangle, Pencil } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfirmModal } from '@/components/confirm-modal';

export default function Budgets() {
  const { budgets, transactions, addBudget, updateBudget, deleteBudget } = useData();
  const { currency } = useTheme();

  const [activeMonthStr, setActiveMonthStr] = useState(format(new Date(), 'yyyy-MM'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);

  const [selectedCat, setSelectedCat] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [editBudgetId, setEditBudgetId] = useState<string | null>(null);

  const monthDate = parse(activeMonthStr, 'yyyy-MM', new Date());

  const activeBudgets = budgets.filter(b => b.monthKey === activeMonthStr).map(b => {
    const spent = transactions
      .filter(t => t.type === 'expense' && t.category === b.category && t.date.startsWith(activeMonthStr))
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...b, spent, percent: b.amount > 0 ? (spent / b.amount) * 100 : 0, isOver: spent > b.amount };
  });

  const totalBudgeted = activeBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = activeBudgets.reduce((s, b) => s + b.spent, 0);
  const totalPercent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const openAddModal = () => {
    setEditBudgetId(null);
    setSelectedCat('');
    setBudgetAmount('');
    setIsModalOpen(true);
  };

  const openEditModal = (b: typeof activeBudgets[0]) => {
    setEditBudgetId(b.id);
    setSelectedCat(b.category);
    setBudgetAmount(String(b.amount));
    setIsModalOpen(true);
  };

  const handleSaveBudget = () => {
    if (!selectedCat || !budgetAmount || Number(budgetAmount) <= 0) return;
    if (editBudgetId) {
      updateBudget(editBudgetId, Number(budgetAmount));
    } else {
      addBudget({ category: selectedCat, amount: Number(budgetAmount), monthKey: activeMonthStr });
    }
    setIsModalOpen(false);
    setSelectedCat('');
    setBudgetAmount('');
    setEditBudgetId(null);
  };

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Budgets</h1>
            <p className="text-muted-foreground text-sm mt-0.5 sm:mt-1">Keep your spending in check</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 bg-card px-3 sm:px-4 py-2 rounded-xl border border-border self-start sm:self-auto">
            <button onClick={() => setActiveMonthStr(format(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1), 'yyyy-MM'))}
              className="p-1 hover:text-primary transition-colors font-bold cursor-pointer text-lg leading-none">‹</button>
            <span className="font-semibold w-28 sm:w-32 text-center text-sm sm:text-base">{format(monthDate, 'MMMM yyyy')}</span>
            <button onClick={() => setActiveMonthStr(format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1), 'yyyy-MM'))}
              className="p-1 hover:text-primary transition-colors font-bold cursor-pointer text-lg leading-none">›</button>
          </div>
        </div>

        {/* Total Overview Card */}
        <div className="bg-card rounded-2xl sm:rounded-3xl border border-border p-5 sm:p-8 shadow-sm">
          <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Total Budget</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">{format(monthDate, 'MMMM')} Overview</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-bold text-foreground break-all">{formatCurrency(totalSpent, currency)}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-base sm:text-lg font-medium text-muted-foreground break-all">{formatCurrency(totalBudgeted, currency)}</span>
            </div>
          </div>
          <div className="w-full h-3 sm:h-4 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full transition-all duration-1000', totalPercent > 100 ? 'bg-destructive' : 'bg-primary')}
              style={{ width: `${Math.min(totalPercent, 100)}%` }} />
          </div>
          <p className="text-xs sm:text-sm text-right mt-1.5 sm:mt-2 font-medium text-muted-foreground">{totalPercent.toFixed(0)}% used</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-colors cursor-pointer text-sm sm:text-base">
            <Plus className="w-4 h-4 shrink-0" /> Add Budget
          </button>
        </div>

        {/* Category Budgets Grid */}
        {activeBudgets.length === 0 ? (
          <div className="text-center py-12 sm:py-16 border-2 border-dashed border-border rounded-2xl sm:rounded-3xl text-muted-foreground text-sm">
            <p>No budgets set for this month.</p>
            <button onClick={openAddModal} className="text-primary hover:underline mt-2 cursor-pointer">Create your first budget</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {activeBudgets.map(b => {
              const cat = CATEGORIES.find(c => c.id === b.category)!;
              return (
                <div key={b.id} className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm group">
                  <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl sm:text-3xl bg-background w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center border border-border shadow-sm shrink-0">
                        {cat?.icon ?? '📦'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base sm:text-lg text-foreground truncate">{cat?.name ?? b.category}</h3>
                        {b.isOver ? (
                          <span className="text-xs font-semibold text-destructive flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> Over budget
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground mt-0.5 inline-block">On track</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditModal(b)}
                        className="p-1.5 sm:p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button onClick={() => setDeleteBudgetId(b.id)}
                        className="p-1.5 sm:p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-2 font-medium gap-2">
                    <span className="text-foreground break-all">{formatCurrency(b.spent, currency)}</span>
                    <span className="text-muted-foreground break-all text-right">of {formatCurrency(b.amount, currency)}</span>
                  </div>
                  <div className="w-full h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full transition-all duration-1000', b.isOver ? 'bg-destructive' : 'bg-primary')}
                      style={{ width: `${Math.min(b.percent, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Budget Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl"
            >
              <h2 className="text-lg sm:text-xl font-bold mb-5 sm:mb-6">
                {editBudgetId ? 'Edit Budget Limit' : 'Set Budget Limit'}
              </h2>
              <div className="space-y-4 mb-5 sm:mb-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Category</label>
                  {editBudgetId ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-background border border-border rounded-xl">
                      <span className="text-xl">{CATEGORIES.find(c => c.id === selectedCat)?.icon}</span>
                      <span className="font-medium text-sm sm:text-base">{CATEGORIES.find(c => c.id === selectedCat)?.name ?? selectedCat}</span>
                    </div>
                  ) : (
                    <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl py-3 px-4 outline-none focus:border-primary cursor-pointer text-sm sm:text-base text-foreground">
                      <option value="">Select a category...</option>
                      {CATEGORIES.filter(c => c.defaultType !== 'income').map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Monthly Limit</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 w-12 sm:w-14 flex items-center justify-center pointer-events-none border-r border-border/50">
                      <span className="text-sm sm:text-base font-bold text-primary">{getCurrencySymbol(currency)}</span>
                    </div>
                    <input type="number" min="0" step="0.01" value={budgetAmount}
                      onChange={e => setBudgetAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-background border border-border rounded-xl py-3 pl-14 sm:pl-[4.5rem] pr-4 outline-none focus:border-primary text-base sm:text-lg font-bold text-foreground"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium cursor-pointer text-sm sm:text-base">Cancel</button>
                <button onClick={handleSaveBudget} disabled={!selectedCat || !budgetAmount || Number(budgetAmount) <= 0}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-50 cursor-pointer text-sm sm:text-base">
                  {editBudgetId ? 'Update' : 'Save Limit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteBudgetId !== null}
        title="Delete Budget"
        message="Are you sure you want to remove this budget limit? Your transaction history will not be affected."
        confirmLabel="Delete" cancelLabel="Cancel" destructive
        onConfirm={() => { if (deleteBudgetId) { deleteBudget(deleteBudgetId); setDeleteBudgetId(null); } }}
        onCancel={() => setDeleteBudgetId(null)}
      />
    </Layout>
  );
}
