import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, User, MapPin, Phone, ShieldCheck, AlertTriangle, Trash2 } from "lucide-react";
import { Customer } from "../types";
import { useAuth } from "../context/AuthContext";

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onUpdate: (id: string, updatedData: Partial<Customer>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditCustomerModal({ isOpen, onClose, customer, onUpdate, onDelete }: EditCustomerModalProps) {
  const { user } = useAuth();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Sync state with customer when opened
  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setPhone(customer.phone || "");
      setRegion(customer.region || "");
      setAddress(customer.address || "");
      setCreditLimit(customer.credit_limit?.toString() || "0");
      setShowConfirmDelete(false);
    }
  }, [customer, isOpen]);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onUpdate(customer.id, {
      name: name.trim(),
      phone: phone.trim(),
      region: region.trim(),
      address: address.trim(),
      credit_limit: parseFloat(creditLimit) || 0
    });
    
    onClose();
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    await onDelete(customer.id);
    setIsDeleting(false);
    setShowConfirmDelete(false);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  // Calculate limit utilization percentage
  const currentBalance = customer.balance_usd || 0;
  const tempLimit = parseFloat(creditLimit) || 1;
  const utilization = Math.max(0, Math.min(100, (Math.abs(currentBalance) / tempLimit) * 100));

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-[#0e0e16]/95 border border-white/10 rounded-[30px] shadow-2xl p-6 md:p-8 overflow-hidden my-auto"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors order-first"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
              <div className="text-right">
                <h2 className="text-lg font-black text-indigo-400 tracking-tight">تعديل حساب العميل</h2>
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Edit Customer Ledger</p>
              </div>
            </div>

            {showConfirmDelete ? (
              /* Danger Zone Delete Confirmation Screen */
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center py-6 relative z-10"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-red-400">تأكيد حذف العميل نهائياً؟</h3>
                  <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto">
                    إن حذف العميل <strong className="text-white font-extrabold">{customer.name}</strong> سيقوم بإزالته فوراً وتصفية كشوفاته. لا يمكن التراجع عن هذه العملية!
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 hover:scale-[1.02]"
                  >
                    {isDeleting ? "جاري الحذف..." : "حذف نهائي فوري"}
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/85 rounded-2xl text-xs font-bold transition-all"
                  >
                    تراجع، لا تحذف
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Normal Form view */
              <form onSubmit={handleSubmit} className="space-y-5 text-right relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="col-span-full">
                    <label className="block text-[10px] text-white/40 mb-2 uppercase tracking-widest font-bold">اسم العميل بالكامل</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="أبو أحمد - حلب..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-11 outline-none focus:border-indigo-500/50 transition-all text-right text-xs"
                      />
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    </div>
                  </div>

                  {/* Phone field */}
                  <div>
                    <label className="block text-[10px] text-white/40 mb-2 uppercase tracking-widest font-bold font-mono">رقم الهاتف السوري</label>
                    <div className="relative font-mono">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0933112233"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-11 outline-none focus:border-indigo-500/50 transition-all text-right text-xs"
                      />
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    </div>
                  </div>

                  {/* Region of Syria text field */}
                  <div>
                    <label className="block text-[10px] text-white/40 mb-2 uppercase tracking-widest font-bold">المنطقة والمحافظة</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="مثال: دمشق، حلب..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-11 outline-none focus:border-indigo-500/50 transition-all text-right text-xs text-white"
                      />
                      <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    </div>
                  </div>

                  {/* Physical Address */}
                  <div className="col-span-full">
                    <label className="block text-[10px] text-white/40 mb-2 uppercase tracking-widest font-bold">العنوان التفصيلي للتسليمات</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="دمشق - حي الميدان - مقابل السوق التجاري"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all text-right text-xs"
                    />
                  </div>

                  {/* Business Credit Ceiling Controls */}
                  <div className="col-span-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        <span>حد السقف الائتماني (الآجل)</span>
                      </div>
                      <span className="text-[10px] font-bold text-white/40 font-mono">AUTHORIZED CONTROL</span>
                    </div>

                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max="50000"
                          step="1000"
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(e.target.value)}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                      <div className="w-24 relative">
                        <input
                          type="number"
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-center font-mono font-bold text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-white/30 font-bold">$</span>
                      </div>
                    </div>

                    {/* Utilization Indicator metrics */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] text-white/40">
                        <span>نسبة استهلاك السقف الائتماني:</span>
                        <span className="font-mono font-bold text-white/80">{utilization.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            utilization >= 90 ? 'bg-red-500' : utilization >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                      <p className="text-[8px] text-white/30">
                        الرصيد المشغول للعميل حالياً: <strong className="text-white/60 font-mono">{Math.abs(currentBalance).toLocaleString()}$</strong> من أصل سقف <strong className="text-white/60 font-mono">{tempLimit.toLocaleString()}$</strong> مسموح به لقرض البضائع.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform shadow-lg shadow-indigo-950/40 active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> حفظ التعديلات السحابية
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="py-3 px-4 bg-red-600/10 text-red-400 border border-red-500/20 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-600/20 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف العقد
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
