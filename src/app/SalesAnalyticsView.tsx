import React, { useState, useMemo } from "react";
import { useDebts } from "../hooks/useDebts";
import { BarChart3, Calendar, Filter } from "lucide-react";
import { motion } from "framer-motion";

export function SalesAnalyticsView() {
  const { debts } = useDebts();
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  
  const sales = useMemo(() => debts.filter(d => d.type === 'out'), [debts]);

  const stats = useMemo(() => {
    const now = new Date();
    let filtered = sales;
    
    if (filter === 'daily') {
      const today = now.toISOString().split('T')[0];
      filtered = sales.filter(s => s.timestamp.startsWith(today));
    } else if (filter === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      filtered = sales.filter(s => new Date(s.timestamp) >= oneWeekAgo);
    } else if (filter === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      filtered = sales.filter(s => new Date(s.timestamp) >= oneMonthAgo);
    }

    const totalSales = filtered.reduce((acc, s) => acc + (s.amount || 0), 0);
    // Assuming 20% profit margin as a placeholder, until a proper cost model is implemented
    const estimatedProfit = totalSales * 0.20; 

    return { totalSales, estimatedProfit };
  }, [sales, filter]);

  return (
    <div className="p-3 md:p-6 flex flex-col gap-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-emerald-400">تحليل المبيعات والأرباح</h1>
          <p className="text-white/40 text-[10px] text-right uppercase tracking-wider">مراقبة الأداء المالي</p>
        </div>
        
        <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map(f => (
                <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`h-10 px-5 border rounded-xl font-bold transition-all text-xs ${filter === f ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                >
                    {f === 'daily' ? 'اليوم' : f === 'weekly' ? 'أسبوع' : 'شهر'}
                </button>
            ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 frosted-glass rounded-3xl border border-white/5">
            <h3 className="text-white/50 text-xs font-bold mb-2">إجمالي المبيعات</h3>
            <p className="text-4xl font-black text-white font-mono">${stats.totalSales.toLocaleString()}</p>
        </div>
        <div className="p-6 frosted-glass rounded-3xl border border-white/5">
            <h3 className="text-white/50 text-xs font-bold mb-2">الأرباح التقديرية (20%)</h3>
            <p className="text-4xl font-black text-emerald-400 font-mono">${stats.estimatedProfit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
