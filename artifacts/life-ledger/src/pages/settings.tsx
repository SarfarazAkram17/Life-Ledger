import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useData } from '@/contexts/data-context';
import { CURRENCIES } from '@/lib/constants';
import { Camera, Download, LogOut, Trash2, FileText, Pencil, Check, X, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmModal } from '@/components/confirm-modal';
import { PdfReportModal } from '@/components/pdf-report-modal';

export default function Settings() {
  const { user, logout, updateDisplayName } = useAuth();
  const { theme, setTheme, currency, setCurrency, avatar, setAvatar } = useTheme();
  const { transactions, clearAllData } = useData();

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEditName = () => {
    setNewName(user?.displayName ?? '');
    setNameError('');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveDisplayName = async () => {
    setSavingName(true);
    const result = await updateDisplayName(newName);
    setSavingName(false);
    if (result.success) { setEditingName(false); setNameError(''); }
    else setNameError(result.error ?? 'Update failed');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = 'Date,Type,Category,Amount,Note\n';
    const csv = transactions.map(t =>
      `${t.date},${t.type},${t.category},${t.amount},"${t.note || ''}"`
    ).join('\n');
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredCurrencies = CURRENCIES.filter(c =>
    currencySearch === '' ||
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.symbol.includes(currencySearch)
  );

  const selectedCurrencyObj = CURRENCIES.find(c => c.code === currency);

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8 max-w-3xl mx-auto animate-in fade-in duration-500 pb-10">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>

        {/* Settings Header */}
        <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="relative mb-4 group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl sm:text-4xl font-bold text-primary-foreground overflow-hidden shadow-xl border-4 border-card">
              {avatar
                ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                : user?.displayName.charAt(0).toUpperCase()}
            </div>
            <label className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 bg-background border-2 border-card rounded-full flex items-center justify-center cursor-pointer shadow-md text-foreground hover:bg-muted transition-colors group-hover:scale-110">
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </label>
          </div>

          {editingName ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <input
                ref={nameInputRef}
                value={newName}
                onChange={e => { setNewName(e.target.value); setNameError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') saveDisplayName(); if (e.key === 'Escape') setEditingName(false); }}
                className="text-xl sm:text-2xl font-bold text-center bg-background border-2 border-primary rounded-xl px-3 sm:px-4 py-2 w-full outline-none"
                maxLength={50}
              />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              <div className="flex gap-2">
                <button onClick={saveDisplayName} disabled={savingName}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {savingName
                    ? <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    : <><Check className="w-4 h-4" /> Save</>}
                </button>
                <button onClick={() => { setEditingName(false); setNameError(''); }}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold cursor-pointer">
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={startEditName}
              className="group/name flex items-center gap-2 mt-1 cursor-pointer rounded-xl px-3 py-1 hover:bg-muted transition-colors max-w-full"
              title="Click to edit name">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">{user?.displayName}</h2>
              <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 truncate max-w-xs">{user?.email}</p>
        </div>

        <div className="space-y-4 sm:space-y-6">

          {/* Appearance */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Appearance</h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-3">Color Theme</label>
              <div className="flex gap-5">
                {[
                  { id: 'emerald', color: 'bg-[#1ED760]', label: 'Emerald' },
                  { id: 'ocean', color: 'bg-[#2979FF]', label: 'Ocean' },
                  { id: 'violet', color: 'bg-[#A855F7]', label: 'Violet' },
                ].map(t => (
                  <button key={t.id} onClick={() => setTheme(t.id as any)}
                    className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer', t.color,
                      theme === t.id ? 'ring-4 ring-offset-4 ring-offset-card ring-primary scale-110 shadow-lg' : 'hover:scale-105 opacity-80')}
                    aria-label={`${t.label} theme`} />
                ))}
              </div>
            </div>
          </div>

          {/* Preferences — Currency */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Preferences</h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Base Currency</label>
              <button
                onClick={() => { setCurrencySearch(''); setShowCurrencyPicker(true); }}
                className="w-full flex items-center justify-between bg-background border-2 border-border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 hover:border-primary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm sm:text-base font-bold text-primary shrink-0">
                    {selectedCurrencyObj?.symbol ?? currency}
                  </span>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-foreground text-sm">{selectedCurrencyObj?.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedCurrencyObj?.name}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Data Management</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 py-2.5 sm:py-3 rounded-xl font-medium transition-colors border border-border cursor-pointer text-sm sm:text-base">
                <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> Export CSV
              </button>
              <button onClick={() => setShowPdfModal(true)}
                className="flex items-center justify-center gap-2 flex-1 bg-primary/10 text-primary hover:bg-primary/20 py-2.5 sm:py-3 rounded-xl font-medium transition-colors border border-primary/30 cursor-pointer text-sm sm:text-base">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> Export PDF Report
              </button>
            </div>
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
              <button onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 text-destructive hover:bg-destructive/10 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors -ml-3 sm:-ml-4 cursor-pointer text-sm sm:text-base">
                <Trash2 className="w-4 h-4 shrink-0" /> Clear All Data
              </button>
            </div>
          </div>

          <button onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-muted text-muted-foreground hover:bg-border rounded-2xl font-bold transition-colors cursor-pointer text-sm sm:text-base">
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> Log Out
          </button>
        </div>
      </div>

      <PdfReportModal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} />

      {/* Currency Picker Modal */}
      <AnimatePresence>
        {showCurrencyPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCurrencyPicker(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm flex flex-col overflow-hidden max-h-[80vh]">
                <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
                  <h3 className="font-bold text-base">Select Currency</h3>
                  <button onClick={() => setShowCurrencyPicker(false)}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-4 py-3 border-b border-border shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search currency..."
                      value={currencySearch}
                      onChange={e => setCurrencySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredCurrencies.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">No currencies found</p>
                  ) : (
                    filteredCurrencies.map(c => {
                      const isSelected = c.code === currency;
                      return (
                        <button key={c.code}
                          onClick={() => { setCurrency(c.code); setShowCurrencyPicker(false); setCurrencySearch(''); }}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer text-left border-b border-border/30 last:border-0',
                            isSelected && 'bg-primary/10'
                          )}
                        >
                          <span className={cn(
                            'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                          )}>
                            {c.symbol}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={cn('font-semibold text-sm', isSelected && 'text-primary')}>{c.code}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={confirmClear} title="Clear All Data"
        message="This will permanently delete all your transactions and budgets from the database. This action cannot be undone."
        confirmLabel="Clear Everything" cancelLabel="Keep My Data" destructive
        onConfirm={() => { clearAllData(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)} />

      <ConfirmModal isOpen={confirmLogout} title="Log Out"
        message="Are you sure you want to log out of LifeLedger?"
        confirmLabel="Log Out" cancelLabel="Stay"
        onConfirm={() => { logout(); setConfirmLogout(false); }}
        onCancel={() => setConfirmLogout(false)} />
    </Layout>
  );
}
