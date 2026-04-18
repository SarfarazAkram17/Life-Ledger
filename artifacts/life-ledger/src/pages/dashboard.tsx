import React from 'react';
import { Layout } from '@/components/layout';
import { useData } from '@/contexts/data-context';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { formatCurrency, cn } from '@/lib/utils';
import { ArrowUpRight, Wallet, TrendingUp, TrendingDown, PieChart, ArrowRight } from 'lucide-react';
import { IoReceiptOutline } from 'react-icons/io5';
import { Link } from 'wouter';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { CATEGORIES } from '@/lib/constants';

export default function Dashboard() {
  const { totals, transactions } = useData();
  const { currency } = useTheme();
  const { user } = useAuth();
  
  const recentTransactions = transactions.slice(0, 5);

  const getCategory = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

  const formatDate = (isoString: string) => {
    const d = parseISO(isoString);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d, yyyy');
  };

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Welcome back, {user?.displayName}</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-sm">Here's your financial overview</p>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card to-card border border-border shadow-xl p-5 sm:p-8 group hover:border-primary/50 transition-colors duration-500">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-700 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-2">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="font-medium text-sm sm:text-base">Total Balance</span>
              </div>
              <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground break-all">
                {formatCurrency(totals.balance, currency)}
              </div>
            </div>
            
            <div className="flex items-stretch gap-2 sm:gap-4">
              <div className="bg-background/50 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-border flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-1">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-income shrink-0" />
                  Income
                </div>
                <div className="text-base sm:text-xl font-bold text-income break-all">{formatCurrency(totals.income, currency)}</div>
              </div>
              
              <div className="bg-background/50 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-border flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-1">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-expense shrink-0" />
                  Expense
                </div>
                <div className="text-base sm:text-xl font-bold text-expense break-all">{formatCurrency(totals.expense, currency)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Link href="/analytics" className="group rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all block">
             <div className="flex justify-between items-center mb-3 sm:mb-4">
               <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                 Analytics
               </h3>
               <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                 <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </div>
             </div>
             <p className="text-muted-foreground text-sm">See detailed breakdown of your spending habits and trends.</p>
          </Link>
          <Link href="/budgets" className="group rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all block">
             <div className="flex justify-between items-center mb-3 sm:mb-4">
               <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                 <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                 Budgets
               </h3>
               <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                 <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </div>
             </div>
             <p className="text-muted-foreground text-sm">Manage category limits and keep your expenses on track.</p>
          </Link>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Recent Transactions</h2>
            <Link href="/transactions" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline whitespace-nowrap">
              See All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {recentTransactions.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <IoReceiptOutline className="w-8 h-8 sm:w-10 sm:h-10 text-primary/60" />
                </div>
                <p className="font-medium text-foreground">No transactions yet</p>
                <p className="text-sm">Tap the + button to record your first one.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentTransactions.map(tx => {
                  const cat = getCategory(tx.category);
                  const isIncome = tx.type === 'income';
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors gap-2">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-background border border-border flex items-center justify-center text-xl sm:text-2xl shadow-sm shrink-0">
                          {cat.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm sm:text-base truncate">{cat.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 sm:gap-2 flex-wrap">
                            {formatDate(tx.date)}
                            {tx.note && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border hidden sm:inline-block"></span>
                                <span className="truncate max-w-[80px] sm:max-w-[200px] hidden sm:inline">{tx.note}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "font-bold text-sm sm:text-lg whitespace-nowrap shrink-0",
                        isIncome ? "text-income" : "text-expense"
                      )}>
                        {isIncome ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
