import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, User, Info, Search, Check, UserPlus, Phone, MapPin, AlertCircle } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import { useAuth } from "../context/AuthContext";

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (debt: {
    customer_id?: string;
    clientName: string;
    amount: number;
    company_id: string;
    timestamp: string;
    notes?: string;
  }) => void;
}

export function AddDebtModal({ isOpen, onClose, onAdd }: AddDebtModalProps) {
  const { customers, addCustomer } = useCustomers();
  const { user, currentRates } = useAuth();
  
  const damascusRate = currentRates?.damascus ?? 15100;
  const sypgRate = damascusRate / 100; // Damascus rate divided by 100 as the standard ل.س.ج
  
  const [customerId, setCustomerId] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  
  // States for on-the-fly client creation
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerRegion, setNewCustomerRegion] = useState("دمشق");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const container = document.getElementById("customer-search-container");
      if (container && !container.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter customers by search term
  const filteredCustomers = customers.filter(c => {
    const term = clientSearchTerm.toLowerCase().trim();
    if (!term) return true;
    return c.name.toLowerCase().includes(term);
  });

  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerBalanceUSD = selectedCustomer ? (selectedCustomer.balance_usd || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount || "0");
    if (isNaN(numAmount) || numAmount <= 0) return;

    let finalCustomerId = customerId;
    let finalClientName = clientSearchTerm.trim();

    if (!finalClientName) return;

    setLoadingCustomer(true);
    try {
      // Check if we need to create a new customer on-the-fly
      if (isAddingNewCustomer || customerId === "new" || !customerId) {
        // Double check if there is an exact case-insensitive match first to prevent duplicate accounts
        const exactMatch = customers.find(c => c.name.toLowerCase() === finalClientName.toLowerCase());
        
        if (exactMatch) {
          finalCustomerId = exactMatch.id;
          finalClientName = exactMatch.name;
        } else {
          // Add new customer through the hook
          const newCust = await addCustomer({
            name: finalClientName,
            phone: newCustomerPhone,
            region: newCustomerRegion,
            address: newCustomerRegion,
            credit_limit: 5000, // default limit
            balance_usd: 0,
            company_id: user?.company_id || "1"
          });
          finalCustomerId = newCust.id;
          finalClientName = newCust.name;
        }
      }

      onAdd({
        customer_id: finalCustomerId || undefined,
        clientName: finalClientName,
        amount: numAmount,
        company_id: user?.company_id || "1",
        timestamp: new Date().toISOString(),
        notes
      });

      // Reset and close
      setCustomerId("");
      setClientSearchTerm("");
      setAmount("");
      setNotes("");
      setNewCustomerPhone("");
      setNewCustomerRegion("دمشق");
      setIsAddingNewCustomer(false);
      onClose();
    } catch (err) {
      console.error("Error creating customer/debt on-the-fly:", err);
    } finally {
      setLoadingCustomer(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#0e0e16]/95 border border-white/10 rounded-[32px] shadow-2xl p-7 overflow-hidden my-auto"
          >
            {/* Ambient Background Light */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                type="button"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
              <div className="text-right">
                <h2 className="text-xl font-black text-emerald-400 tracking-tight">تسجيل حركة مالية</h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">New Financial Transaction</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-right relative z-10">
              <div className="grid grid-cols-1 gap-4">
                
                {/* Searchable / Autocomplete Customer Field */}
                <div className="col-span-full relative" id="customer-search-container">
                  <label className="block text-[10px] text-white/40 mb-2 uppercase tracking-widest font-bold">اسم العميل</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={clientSearchTerm}
                      onChange={(e) => {
                        setClientSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                        
                        // Check if typed name has exact match
                        const exact = customers.find(c => c.name.toLowerCase() === e.target.value.toLowerCase().trim());
                        if (exact) {
                          setCustomerId(exact.id);
                          setIsAddingNewCustomer(false);
                        } else {
                          setCustomerId("");
                        }
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="ابحث عن اسم العميل أو اكتب اسماً جديداً..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-11 pl-10 outline-none focus:border-emerald-500/50 transition-all text-right text-sm text-white"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    
                    {clientSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearchTerm("");
                          setCustomerId("");
                          setIsAddingNewCustomer(false);
                          setNewCustomerPhone("");
                          setNewCustomerRegion("دمشق");
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors text-xs font-bold"
                      >
                        مسح
                      </button>
                    )}
                  </div>

                  {/* Badges and Feedback Info */}
                  {customerId && (
                    <div className="mt-2 flex items-center justify-between text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>عميل مسجل: {customers.find(c => c.id === customerId)?.name}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-md">المحافظة: {customers.find(c => c.id === customerId)?.region || "غير محدد"}</span>
                    </div>
                  )}

                  {isAddingNewCustomer && (
                    <div className="mt-2 flex items-center justify-between text-xs text-indigo-400 bg-indigo-500/5 border border-indigo-500/15 px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-1.5 font-bold">
                        <UserPlus className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span>سيتم إنشاء حساب عميل جديد باسم: <strong className="text-white">{clientSearchTerm}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Dropdown Suggestions Overlay */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-[#141423]/95 border border-white/10 rounded-2xl z-50 shadow-2xl backdrop-blur-md divide-y divide-white/5 custom-scrollbar">
                      {filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(c.id);
                            setClientSearchTerm(c.name);
                            setIsAddingNewCustomer(false);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-right px-4 py-3 hover:bg-white/10 flex justify-between items-center transition-all text-xs text-white cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md font-mono">مسجل</span>
                            {c.id === customerId && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white/95">{c.name}</p>
                            <p className="text-[9px] text-white/40">{c.region || "دمشق"} {c.phone ? `• ${c.phone}` : ""}</p>
                          </div>
                        </button>
                      ))}

                      {/* Create New Client Option inside the list */}
                      {clientSearchTerm.trim().length > 0 && !customers.some(c => c.name.toLowerCase() === clientSearchTerm.toLowerCase().trim()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId("new");
                            setIsAddingNewCustomer(true);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-right px-4 py-3.5 hover:bg-indigo-500/10 flex justify-between items-center transition-all text-xs bg-indigo-500/[0.04] text-indigo-300 hover:text-white cursor-pointer"
                        >
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg font-black">+ إنشاء فوراً</span>
                          <div className="text-right">
                            <p className="font-black">تسجيل {clientSearchTerm} كعميل جديد</p>
                            <p className="text-[9px] opacity-70">املأ رقم الهاتف ومحافظة العميل بالأسفل</p>
                          </div>
                        </button>
                      )}

                      {filteredCustomers.length === 0 && !clientSearchTerm.trim() && (
                        <div className="px-4 py-4 text-center text-xs text-white/30">
                          اكتب اسم العميل للبحث أو التسجيل المباشر
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline New Customer Details Form Section */}
                <AnimatePresence>
                  {isAddingNewCustomer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="col-span-full border border-indigo-500/20 bg-indigo-500/[0.02] p-4 rounded-2xl space-y-4 overflow-hidden"
                    >
                      <div className="text-[10px] font-black text-indigo-400 border-b border-white/5 pb-2 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>بيانات العميل الجديد المطلوبة للتسجيل</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">رقم الهاتف</label>
                          <div className="relative font-mono">
                            <input
                              type="tel"
                              value={newCustomerPhone}
                              onChange={(e) => setNewCustomerPhone(e.target.value)}
                              placeholder="09xx xxx xxx"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-indigo-500/50 transition-all text-right text-xs text-white"
                            />
                            <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">المحافظة والمنطقة</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={newCustomerRegion}
                              onChange={(e) => setNewCustomerRegion(e.target.value)}
                              placeholder="مثال: دمشق، حلب..."
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-indigo-500/50 transition-all text-right text-xs text-white"
                            />
                            <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selected Customer Standing, Quick Payments & AI Assist */}
                <AnimatePresence>
                  {selectedCustomer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="col-span-full"
                    >
                      <div className="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl p-4 space-y-3 text-right">
                        {/* Heading & Status */}
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">ملخص ذمة العميل الحالي</span>
                          </div>
                          <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-lg ${
                            customerBalanceUSD > 0 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : customerBalanceUSD < 0 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-white/10 text-white/60'
                          }`}>
                            {customerBalanceUSD > 0 
                              ? `مطلوب منه: $${customerBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`
                              : customerBalanceUSD < 0
                                ? `له رصيد دائن: $${Math.abs(customerBalanceUSD).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`
                                : "الحساب متوازن"
                            }
                          </span>
                        </div>

                        {/* Local Syrian Pound equivalent */}
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-white/40 font-bold font-sans text-[10px]">المعادل بالعملة المعتمدة لدمشق:</span>
                          <span className={`font-extrabold text-[11px] ${customerBalanceUSD > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {(Math.abs(customerBalanceUSD) * sypgRate).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ل.س.ج
                          </span>
                        </div>

                        {/* Quick-Fill buttons if they owe us money */}
                        {customerBalanceUSD > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] text-white/30 font-bold block">اضغط لتعبئة مبلغ السداد تلقائياً وتعديله:</span>
                            <div className="grid grid-cols-3 gap-1.5 font-mono">
                              <button
                                type="button"
                                onClick={() => setAmount(customerBalanceUSD.toString())}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl py-1 text-[10px] font-bold text-center transition-all cursor-pointer active:scale-95"
                              >
                                💵 كامل الذمة
                              </button>
                              <button
                                type="button"
                                onClick={() => setAmount((customerBalanceUSD / 2).toFixed(2))}
                                className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 rounded-xl py-1 text-[10px] font-bold text-center transition-all cursor-pointer active:scale-95"
                              >
                                🌗 نصف الذمة
                              </button>
                              <button
                                type="button"
                                onClick={() => setAmount((customerBalanceUSD / 4).toFixed(2))}
                                className="bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-xl py-1 text-[10px] font-bold text-center transition-all cursor-pointer active:scale-95"
                              >
                                ⏳ ربع الذمة
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Amount input field */}
                <div>
                  <label className="block text-[10px] text-white/40 mb-2 uppercase tracking-widest font-bold">المبلغ ($)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-all text-left font-mono font-bold text-base text-emerald-400"
                  />
                </div>

                {/* Notes/Invoice ID input */}
                <div>
                  <label className="block text-[10px] text-white/40 mb-2 uppercase tracking-widest font-bold">ملاحظات إضافية</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: فاتورة مبيعات، تسديد دفعة نقدية..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-all text-right text-xs text-white"
                  />
                </div>
              </div>

              {/* Submit trigger button */}
              <button
                type="submit"
                disabled={loadingCustomer}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-[1.01] transition-all shadow-xl shadow-emerald-500/10 active:scale-95 text-xs text-center cursor-pointer disabled:opacity-50"
              >
                {loadingCustomer ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> 
                    <span>تأكيد وحفظ العملية</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
