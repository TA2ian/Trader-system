import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, Save, MapPin, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { customerService } from "../services/customerService";
import { useAuth } from "../context/AuthContext";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCustomerModal({ isOpen, onClose, onSuccess }: AddCustomerModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(() => localStorage.getItem("addCustomer_name") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("addCustomer_phone") || "");
  const [region, setRegion] = useState(() => localStorage.getItem("addCustomer_region") || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("addCustomer_name", name);
    localStorage.setItem("addCustomer_phone", phone);
    localStorage.setItem("addCustomer_region", region);
  }, [name, phone, region]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await customerService.addCustomer({
        name,
        phone,
        region,
        address: region, // Use region as address for simplicity or add field
        credit_limit: 5000, // Defaut limit
        balance_usd: 0,
        company_id: user?.company_id || "1"
      });
      onSuccess();
      onClose();
      setName("");
      setPhone("");
      setRegion("");
      localStorage.removeItem("addCustomer_name");
      localStorage.removeItem("addCustomer_phone");
      localStorage.removeItem("addCustomer_region");
    } catch (error) {
      console.error("Error adding customer:", error);
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm frosted-glass rounded-3xl shadow-2xl p-6 overflow-hidden my-auto"
          >
            <div className="flex justify-between items-center mb-5">
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
              <h2 className="text-lg font-bold text-emerald-400">إضافة عميل جديد</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">الاسم الكامل</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسم العميل"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-emerald-500/50 transition-all text-right text-sm"
                  />
                  <UserPlus className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">رقم الهاتف</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-emerald-500/50 transition-all text-right text-sm font-mono"
                  />
                  <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">المنطقة / العنوان</label>
                <div className="relative">
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="مثال: دمشق - الحريقة"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-emerald-500/50 transition-all text-right text-sm"
                  />
                  <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-500 text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20 active:scale-95 text-sm disabled:opacity-50 disabled:scale-100 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> حفظ العميل
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
