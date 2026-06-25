import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Package, 
  Activity,
  LayoutDashboard,
  Wallet,
  ArrowUpRight,
  Users,
  ShoppingCart
} from "lucide-react";
import { StatItem } from "../components/StatItem";
import { QuickAction } from "../components/QuickAction";
import { TransactionItem } from "../components/TransactionItem";
import { useDebts } from "../hooks/useDebts";
import { useCustomers } from "../hooks/useCustomers";
import { useInventory } from "../hooks/useInventory";
import { AddDebtModal } from "../components/AddDebtModal";
import { AddProductModal } from "../components/AddProductModal";
import { CustomerCard } from "../components/CustomerCard";
import { MultiSaleModal } from "../components/MultiSaleModal";
import { AlertsPanel } from "../components/AlertsPanel";
import { ViewType } from "../types";

export default function Dashboard({ onNavigate, onOpenStatement }: { onNavigate?: (view: ViewType) => void, onOpenStatement?: (c: any) => void }) {
  const { debts, loading: debtsLoading, addDebt, refresh: refreshDebts } = useDebts();
  const { customers, loading: customersLoading, refresh: refreshCustomers } = useCustomers();
  const { items, loading: inventoryLoading, refresh: refreshInventory } = useInventory();
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMultiSaleModalOpen, setIsMultiSaleModalOpen] = useState(false);

  const loading = debtsLoading || customersLoading || inventoryLoading;
  
  // Find low stock items
  const lowStockItem = items.find(item => item.quantity < 50);

  // Real KPI Calculations
  const totalDebtUSD = debts.reduce((acc, d) => acc + (d.amount || 0), 0);
  const inventoryValue = items.reduce((acc, item) => acc + ((item.unitPriceUSD || 0) * (item.quantity || 0)), 0);
  
  // Sales today
  const today = new Date().toISOString().split('T')[0];
  const todaySales = debts.filter(d => d.type === 'out' && d.timestamp.startsWith(today)).reduce((acc, d) => acc + (d.amount || 0), 0);

  // 25% expected profit margin on current inventory
  const expectedProfit = inventoryValue * 0.25; 

  // Collection in the last 30 days (mock based on debts added)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const monthlyCollection = debts
    .filter(d => new Date(d.timestamp || d.created_at) >= thirtyDaysAgo)
    .reduce((acc, d) => acc + (d.amount || 0), 0);

  // KPIs percentages (health indicators)
  const debtHealth = inventoryValue > 0 ? Math.max(0, Math.min(100, 100 - (totalDebtUSD / (inventoryValue * 1.5)) * 100)) : 0;
  const inventoryHealth = Math.min(100, (inventoryValue / 15000) * 100) || 0; // Assuming 15k is the target capacity
  const collectionHealth = totalDebtUSD > 0 ? Math.min(100, (monthlyCollection / Math.max(totalDebtUSD, 1)) * 100) : 0;
  const profitHealth = Math.min(100, (expectedProfit / 5000) * 100) || 0; // Assuming 5k is the profit target
  
  const recentTransactions = debts.slice(0, 3);
  const topCustomers = customers.slice(0, 4);

  const handleAddDebt = async (debtData: any) => {
    await addDebt(debtData);
    refreshDebts();
    refreshCustomers(); // Update customer balances
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden p-3 md:p-6 flex flex-col font-sans text-white">
      {/* Modals */}
      <AddDebtModal 
        isOpen={isDebtModalOpen} 
        onClose={() => setIsDebtModalOpen(false)} 
        onAdd={handleAddDebt} 
      />

      <AddProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={refreshInventory}
      />

      <MultiSaleModal
        isOpen={isMultiSaleModalOpen}
        onClose={() => setIsMultiSaleModalOpen(false)}
        onSuccess={() => {
          refreshInventory();
          refreshDebts();
          refreshCustomers();
        }}
      />

      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 z-10 gap-3">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 frosted-glass rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300"
          >
            <span className="text-emerald-400 font-bold text-xl">S</span>
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-right">سيريا تريدر <span className="text-white/40 font-light text-lg">| Syria Trader ERP</span></h1>
            <p className="text-[10px] text-white/50 tracking-widest uppercase text-right">منصة إدارة الديون والمخزون الذكية</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">

          <div className="px-4 py-2 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 rounded-full text-xs font-medium text-indigo-300 flex items-center justify-center">
            {loading ? "جاري التحديث..." : <Activity className="w-3 h-3" />}
          </div>
        </div>
      </header>

      {/* Alerts Panel */}
      <div className="mb-4 z-10">
        <AlertsPanel />
      </div>

      {/* Main Workspace Grid */}
      <main className="grid grid-cols-12 gap-4 flex-1 z-10">
        
        {/* Statistics Panel */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 frosted-glass rounded-2xl flex-1 flex flex-col"
          >
            <h2 className="text-xs font-semibold mb-4 flex items-center gap-2 text-indigo-300 uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              مؤشرات الأداء المالي
            </h2>
            <div className="space-y-3">
              <StatItem 
                label="إجمالي الديون" 
                value={`${totalDebtUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`} 
                percentage={debtHealth} 
                color="rose" 
              />
              <StatItem 
                label="قيمة المخزون" 
                value={`${inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`} 
                percentage={inventoryHealth} 
                color="indigo" 
              />
              <StatItem 
                label="معدل التحصيل (30 يوم)" 
                value={`${monthlyCollection.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`} 
                percentage={collectionHealth} 
                color="emerald" 
              />
              <StatItem 
                label="تقدير ربحية المخزون" 
                value={`${expectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`} 
                percentage={profitHealth} 
                color="amber" 
              />
            </div>
            
            <div className="mt-6">
              <p className="text-[9px] text-white/30 uppercase tracking-widest mb-3">العملة الأساسية</p>
              <div className="flex flex-wrap gap-1.5 text-xs text-[10px]">
                <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/10">USD - دولار</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Operations View */}
        <section className="col-span-12 lg:col-span-6 flex flex-col gap-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] flex flex-col shadow-2xl overflow-hidden relative"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded-full border border-emerald-500/30 uppercase">
                نظرة عامة على النشاط اليومي
              </div>
              <div className="h-[1px] flex-1 bg-white/10"></div>
            </div>
            
            <h3 className="text-2xl font-light leading-snug mb-4 text-right">
              مرحباً بك، <span className="font-semibold text-emerald-400">إدارة العمليات</span> تبدأ من هنا.
            </h3>

            <div className="space-y-3 text-white/70 text-base leading-relaxed mb-6 border-s-2 border-emerald-500/40 ps-5 text-right">
              <p>لديك {debts.length} حركات مسجلة في النظام حالياً.</p>
              {lowStockItem && (
                <p className="text-xs opacity-60">تنبيه: مخزون "{lowStockItem.name}" قد وصل للحد الأدنى ({lowStockItem.quantity} قطعة متبقية).</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <QuickAction 
                onClick={() => setIsMultiSaleModalOpen(true)}
                icon={<ShoppingCart className="w-5 h-5 text-emerald-400" />} 
                title="سلة مبيعات جديدة" 
                subtitle="تسجيل فاتورة بيع مجمّعة" 
              />
              <QuickAction 
                onClick={() => setIsDebtModalOpen(true)}
                icon={<Wallet className="w-5 h-5" />} 
                title="تسجيل دفعة جديدة" 
                subtitle="قبض من عميل" 
              />
              <QuickAction 
                onClick={() => setIsProductModalOpen(true)}
                icon={<Package className="w-5 h-5" />} 
                title="تحديث المخزون" 
                subtitle="إضافة بضاعة واصلة" 
              />
            </div>
          </motion.div>

          {/* Customers Quick Section */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold flex items-center justify-end gap-2 text-indigo-300 px-2 uppercase tracking-wider">
              قائمة العملاء المميزين
              <Users className="w-4 h-4" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topCustomers.map(customer => (
                <CustomerCard key={customer.id} customer={customer} onOpenStatement={onOpenStatement} />
              ))}
            </div>
          </div>
        </section>

        {/* Transactions Panel */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 frosted-glass rounded-2xl flex-1 flex flex-col"
          >
            <h2 className="text-xs font-semibold mb-4 flex items-center gap-2 text-indigo-300 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              آخر الحركات المالية
            </h2>
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map(debt => (
                  <TransactionItem 
                    key={debt.id} 
                    title={debt.clientName || "غير معروف"} 
                    amount={`$${(debt.amount || 0).toLocaleString()}`} 
                    time={debt.timestamp} 
                    type={debt.amount > 0 ? 'in' : 'out'} 
                  />
                ))
              ) : (
                <p className="text-[10px] text-white/30 text-center py-4">لا توجد حركات مؤخراً</p>
              )}
            </div>

            <div className="mt-auto pt-6">
              <div className="p-3 bg-indigo-600/20 border border-indigo-400/20 rounded-xl">
                <p className="text-[9px] text-indigo-200 leading-relaxed italic text-right">
                  "تلميحة: سجل سعر الصرف فور استلام المبلغ بالليرة السورية لتجنب خسائر التذبذب."
                </p>
              </div>
            </div>
          </motion.div>
        </section>

      </main>

      {/* Footer Interface */}
      <footer className="mt-6 z-10 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[9px] text-white/30 font-mono">
          <span>LATENCY: 14ms</span>
          <span>DATABASE: SUPABASE</span>
          <span>STATUS: ONLINE</span>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => onNavigate?.('settings')}
            className="flex-1 md:flex-none px-6 py-2.5 frosted-glass rounded-xl text-xs font-semibold hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" /> الإعدادات
          </button>
          <button 
            onClick={() => onNavigate?.('ai')}
            className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-500 text-black rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(52,211,153,0.2)] hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" /> تقرير جديد
          </button>
        </div>
      </footer>

      {/* Floating Action Button for Sales */}
      {typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-24 sm:bottom-8 left-6 sm:left-8 z-[120]" dir="rtl">
          <motion.button
            onClick={() => setIsMultiSaleModalOpen(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.6)] cursor-pointer transition-shadow relative group"
          >
            <ShoppingCart className="w-6 h-6 text-black font-bold" />
            {/* Pulsing glow ring */}
            <span className="absolute -inset-1 rounded-full border border-emerald-400/30 animate-ping pointer-events-none"></span>
            {/* Tooltip */}
            <span className="absolute right-16 bg-[#0a0a14] border border-white/10 text-white text-[10px] font-black py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none">
              تسجيل مبيعات سريعة 🛒
            </span>
          </motion.button>
        </div>,
        document.body
      )}

    </div>
  );
}
