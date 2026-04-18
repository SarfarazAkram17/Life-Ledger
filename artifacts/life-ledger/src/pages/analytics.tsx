import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { useData } from '@/contexts/data-context';
import { useTheme } from '@/contexts/theme-context';
import { CATEGORIES } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { parseISO, format, parse } from 'date-fns';

export default function Analytics() {
  const { transactions } = useData();
  const { currency } = useTheme();
  const [activeMonthStr, setActiveMonthStr] = useState(format(new Date(), 'yyyy-MM'));

  const categoryStats = useMemo(() => {
    const expensesThisMonth = transactions.filter(t => 
      t.type === 'expense' && t.date.startsWith(activeMonthStr)
    );
    
    const totalExpense = expensesThisMonth.reduce((sum, t) => sum + t.amount, 0);
    
    const stats = expensesThisMonth.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats)
      .map(([catId, amount]) => ({
        ...CATEGORIES.find(c => c.id === catId)!,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, activeMonthStr]);

  const chartData = useMemo(() => {
    const year = parseInt(activeMonthStr.split('-')[0]);
    const month = parseInt(activeMonthStr.split('-')[1]) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const data = Array.from({length: daysInMonth}, (_, i) => {
      const dateStr = `${activeMonthStr}-${String(i+1).padStart(2, '0')}`;
      const dayTxs = transactions.filter(t => t.date === dateStr);
      return {
        day: i + 1,
        income: dayTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount, 0),
        expense: dayTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0),
      };
    });
    
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)));
    return { data, maxVal: maxVal > 0 ? maxVal : 100 };
  }, [transactions, activeMonthStr]);

  const monthDate = parse(activeMonthStr, 'yyyy-MM', new Date());

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
          
          <div className="flex items-center gap-2 sm:gap-4 bg-card px-3 sm:px-4 py-2 rounded-xl border border-border self-start sm:self-auto">
            <button 
              onClick={() => setActiveMonthStr(format(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1), 'yyyy-MM'))}
              className="p-1 hover:text-primary transition-colors font-bold cursor-pointer text-lg leading-none"
            >‹</button>
            <span className="font-semibold w-28 sm:w-32 text-center text-sm sm:text-base">{format(monthDate, 'MMMM yyyy')}</span>
            <button 
              onClick={() => setActiveMonthStr(format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1), 'yyyy-MM'))}
              className="p-1 hover:text-primary transition-colors font-bold cursor-pointer text-lg leading-none"
            >›</button>
          </div>
        </div>

        {/* Custom Bar Chart */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 sm:mb-6 text-muted-foreground text-sm sm:text-base">Cash Flow Over Time</h3>
          <div className="h-48 sm:h-64 relative w-full flex items-end gap-[1px] sm:gap-1">
            {chartData.data.map(d => {
              const incomeHeight = `${(d.income / chartData.maxVal) * 100}%`;
              const expenseHeight = `${(d.expense / chartData.maxVal) * 100}%`;
              return (
                <div key={d.day} className="flex-1 flex flex-col justify-end items-center h-full group relative">
                  
                  <div className="absolute -top-10 bg-popover border border-border text-popover-foreground text-xs p-1.5 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 w-max text-center">
                    <span className="block font-bold mb-0.5">Day {d.day}</span>
                    {d.income > 0 && <span className="text-income block">+{formatCurrency(d.income, currency)}</span>}
                    {d.expense > 0 && <span className="text-expense block">−{formatCurrency(d.expense, currency)}</span>}
                    {d.income === 0 && d.expense === 0 && <span className="text-muted-foreground">—</span>}
                  </div>

                  <div className="w-full flex gap-[1px] h-full items-end justify-center">
                    <div className="w-1/2 bg-income/80 rounded-t-sm transition-all group-hover:bg-income" style={{ height: incomeHeight }}></div>
                    <div className="w-1/2 bg-expense/80 rounded-t-sm transition-all group-hover:bg-expense" style={{ height: expenseHeight }}></div>
                  </div>
                  <div className="h-4 mt-1 text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">
                    {d.day % 5 === 0 || d.day === 1 ? d.day : ''}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-income shrink-0"></span> Income
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-expense shrink-0"></span> Expense
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Spending by Category</h2>
          
          {categoryStats.length === 0 ? (
             <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 text-center text-muted-foreground text-sm">
               No expenses this month.
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {categoryStats.map((cat) => (
                <div key={cat.id} className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="text-xl sm:text-2xl shrink-0">{cat.icon}</div>
                      <span className="font-semibold text-foreground text-sm sm:text-base truncate">{cat.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-bold text-foreground text-sm sm:text-base">{formatCurrency(cat.amount, currency)}</span>
                      <span className="text-xs font-medium text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 sm:h-2.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: `${cat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
