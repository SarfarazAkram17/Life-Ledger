import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { cn, getCurrencySymbol } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';
import { useData, TransactionType, Transaction } from '@/contexts/data-context';
import { useTheme } from '@/contexts/theme-context';
import { format } from 'date-fns';
import { DatePicker } from '@/components/date-picker';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTx?: Transaction;
}

export function TransactionModal({ isOpen, onClose, editTx }: TransactionModalProps) {
  const { addTransaction, updateTransaction } = useData();
  const { currency } = useTheme();

  const isEditMode = !!editTx;
  const today = format(new Date(), 'yyyy-MM-dd');

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editTx) {
        setType(editTx.type);
        setAmount(String(editTx.amount));
        setCategory(editTx.category);
        setDate(editTx.date.split('T')[0]);
        setNote(editTx.note || '');
      } else {
        setType('expense');
        setAmount('');
        setCategory('');
        setDate(today);
        setNote('');
      }
    }
  }, [isOpen, editTx]);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !category) return;
    const payload = { type, amount: Number(amount), category, date, note };
    if (isEditMode && editTx) {
      updateTransaction(editTx.id, payload);
    } else {
      addTransaction(payload);
    }
    onClose();
  };

  const filteredCategories = CATEGORIES.filter(c =>
    type === 'income' ? c.defaultType === 'income' : c.defaultType !== 'income'
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:p-4"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 bg-card lg:rounded-2xl rounded-t-3xl border border-border lg:max-w-md w-full max-h-[90vh] overflow-y-auto lg:shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card/90 backdrop-blur-md z-10 border-b border-border/50 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{isEditMode ? 'Edit Transaction' : 'New Transaction'}</h2>
              <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-muted/80 text-muted-foreground transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Type Toggle */}
              <div className="flex p-1 bg-muted rounded-xl">
                <button
                  onClick={() => { setType('expense'); setCategory(''); }}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer',
                    type === 'expense' ? 'bg-card shadow text-expense' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Expense
                </button>
                <button
                  onClick={() => { setType('income'); setCategory(''); }}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer',
                    type === 'income' ? 'bg-card shadow text-income' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center pointer-events-none border-r border-border/50">
                    <span className="text-xl font-bold text-primary">{getCurrencySymbol(currency)}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      'w-full bg-background border-2 border-border rounded-xl py-4 pl-20 pr-4 text-3xl font-bold outline-none transition-all',
                      type === 'expense'
                        ? 'focus:border-expense focus:ring-4 focus:ring-expense/10'
                        : 'focus:border-income focus:ring-4 focus:ring-income/10'
                    )}
                  />
                </div>
              </div>

              {/* Category Grid */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {filteredCategories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                        category === c.id
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-background hover:border-border/80 hover:bg-muted/50'
                      )}
                    >
                      <span className="text-2xl mb-1">{c.icon}</span>
                      <span className="text-xs font-medium truncate w-full text-center leading-tight">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Note */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    maxDate={today}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Note (Optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Lunch..."
                    className="w-full bg-background border-2 border-border rounded-xl py-3 px-4 outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="p-4 border-t border-border mt-auto">
              <button
                onClick={handleSave}
                disabled={!amount || !category || Number(amount) <= 0}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none transition-all cursor-pointer"
              >
                <Check className="w-5 h-5" />
                {isEditMode ? 'Update Transaction' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
