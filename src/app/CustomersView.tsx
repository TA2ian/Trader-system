import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useCustomers } from "../hooks/useCustomers";
import { useDebts } from "../hooks/useDebts";
import { CustomerCard } from "../components/CustomerCard";
import { UserPlus, Search, PlusCircle, Sparkles, Receipt, Banknote, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AddCustomerModal } from "../components/AddCustomerModal";
import { EditCustomerModal } from "../components/EditCustomerModal";
import { AddDebtModal } from "../components/AddDebtModal";
import { Customer } from "../types";

export function CustomersView({ onOpenStatement }: { onOpenStatement?: (c: any) => void }) {
  const { customers, loading, refresh, editCustomer, removeCustomer } = useCustomers();
  const { addDebt } = useDebts();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debtor' | 'creditor'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'recent' | 'old'>('all');

  const handleUpdateCustomer = async (id: string, updatedData: Partial<Customer>) => {
    await editCustomer(id, updatedData);
    refresh();
  };

  const handleDeleteCustomer = async (id: string) => {
    await removeCustomer(id);
    refresh();
  };

  const handleAddDebtTransaction = async (debtData: any) => {
    await addDebt(debtData);
    refresh(); // Refresh customer balances
  };

  // Filter customers by search input query and advanced filters
  const filteredCustomers = customers.filter(c => {
    const term = searchQuery.toLowerCase().trim();
    
    // Search filter
    const matchesSearch = !term || (
      c.name.toLowerCase().includes(term) ||
      (c.region && c.region.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term))
    );

    // Balance filter
    const matchesBalance = balanceFilter === 'all' || 
      (balanceFilter === 'debtor' ? c.balance_usd > 0 : c.balance_usd < 0);

    // Date filter
    const matchesDate = dateFilter === 'all' || !c.last_transaction_date ? true : (() => {
        const lastDate = new Date(c.last_transaction_date);
        const now = new Date();
        const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
        return dateFilter === 'recent' ? diffDays <= 30 : diffDays > 30;
    })();

    return matchesSearch && matchesBalance && matchesDate;
  });

  return (
    <div className="p-3 md:p-6 flex flex-col gap-6 relative" dir="rtl">
      {/* 1. Add Customer Modal */}
      <AddCustomerModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={refresh}
      />

      {/* 2. Edit/Delete Customer Modal */}
      <EditCustomerModal
        isOpen={selectedCustomerForEdit !== null}
        onClose={() => setSelectedCustomerForEdit(null)}
        customer={selectedCustomerForEdit}
        onUpdate={handleUpdateCustomer}
        onDelete={handleDeleteCustomer}
      />

      {/* 3. Record Payment/Debt Modal */}
      <AddDebtModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        onAdd={handleAddDebtTransaction}
      />

      {/* Header section with Stats and Page controls */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div className="text-right">
          <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-indigo-300">أرشيف ودليل العملاء</h1>
          <p className="text-white/40 text-[10px] mt-1 font-bold uppercase tracking-wider">
            مجموع العملاء المسجلين بالشركة: {customers.length} عَميل
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          {/* Real-time search with visual cue */}
          <div className="relative flex-1 md:w-64 min-w-[200px]">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، المحافظة أو الهاتف..."
              className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl pr-10 pl-3 outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all text-right text-xs text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                مسح
              </button>
            )}
          </div>

          <select value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value as any)} className="h-11 bg-white/5 border border-white/10 rounded-2xl px-3 outline-none text-white text-xs">
            <option value="all">كل الأرصدة</option>
            <option value="debtor">مدين</option>
            <option value="creditor">دائن</option>
          </select>

          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)} className="h-11 bg-white/5 border border-white/10 rounded-2xl px-3 outline-none text-white text-xs">
            <option value="all">كل التواريخ</option>
            <option value="recent">آخر 30 يوم</option>
            <option value="old">أقدم من 30 يوم</option>
          </select>

          <button 
            onClick={() => refresh()}
            className="h-11 w-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="h-11 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-black rounded-2xl font-extrabold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-xs"
          >
            <UserPlus className="w-4 h-4 shrink-0" /> إضافة عميل جديد
          </button>
        </div>
      </header>

      {/* Grid of customers cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
          ))
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-3">
            <p className="text-sm text-white/40">لا يوجد أي تجار أو عملاء يطابقون مدخلات البحث الحالية.</p>
            <button 
              onClick={() => setSearchQuery("")}
              className="text-xs text-indigo-400 font-bold hover:underline"
            >
              عرض كافة العملاء
            </button>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard 
              key={customer.id}
              customer={customer} 
              onOpenStatement={onOpenStatement} 
              onOpenEdit={(c) => setSelectedCustomerForEdit(c)}
            />
          ))
        )}
      </div>

      {/* Floating Action FAB for quick transactions inside client section */}
      {typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-[82px] left-4 md:bottom-8 md:left-8 z-[45]" dir="rtl">
          <motion.button
            onClick={() => setIsDebtModalOpen(true)}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.45, 
              ease: [0.16, 1, 0.3, 1],
              delay: 0.2
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 h-11 px-3.5 md:px-4 rounded-2xl backdrop-blur-xl bg-black/50 hover:bg-[#10101c]/90 border border-white/10 hover:border-emerald-500/35 text-white shadow-xl shadow-black/50 transition-all group cursor-pointer"
            title="تسجيل حركة مالية أو ذمة جديدة"
          >
            {/* Pulsing indicator light */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>

            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5 rtl:space-x-reverse">
                <Receipt className="w-3.5 h-3.5 text-white/75 shrink-0 group-hover:rotate-12 transition-transform" />
                <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <span className="text-[11px] font-black tracking-tight text-white/90 select-none">
                تسجيل ذمة / دفعة
              </span>
            </div>
            
            <PlusCircle className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform shrink-0" />
          </motion.button>
        </div>,
        document.body
      )}
    </div>
  );
}
