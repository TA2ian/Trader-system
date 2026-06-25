import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ShoppingCart, User, Package, DollarSign, Save, Scale, Ruler, Grid, Layers, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InventoryItem, Customer } from "../types";
import { customerService } from "../services/customerService";
import { inventoryService } from "../services/inventoryService";
import { debtService } from "../services/debtService";
import { useAuth } from "../context/AuthContext";

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: InventoryItem | null;
}

export function SaleModal({ isOpen, onClose, onSuccess, initialProduct }: SaleModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      if (initialProduct) {
        setPrice(String(initialProduct.selling_price_usd || initialProduct.unitPriceUSD || ""));
      }
    }
  }, [isOpen, initialProduct]);

  const loadCustomers = async () => {
    const data = await customerService.getCustomers();
    setCustomers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialProduct || !selectedCustomerId) return;
    
    setLoading(true);
    try {
      const sellQty = parseFloat(quantity) || 0;
      const sellPrice = parseFloat(price) || 0;
      const totalAmount = sellQty * sellPrice;
      const customer = customers.find(c => c.id === selectedCustomerId);

      if (!customer) throw new Error("Customer not found");

      // 1. Update Inventory
      await inventoryService.updateProduct(initialProduct.id, {
        quantity: initialProduct.quantity - sellQty
      });

      // 2. Add Debt Transaction
      await debtService.addDebt({
        customer_id: customer.id,
        clientName: customer.name,
        amount: totalAmount,
        type: 'out', // Debt given (merchandise sold on credit)
        timestamp: new Date().toISOString(),
        notes: `بيع بضاعة: ${initialProduct.name} (كمية: ${sellQty}) - ${notes}`,
        company_id: user?.company_id || "1"
      });

      // 3. Save to Sales History (we'll use debts table but with specific notes for now, or we can add a sales table later)
      // For this task, recording it in the customer's debt card with details is sufficient.

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error processing sale:", error);
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md frosted-glass rounded-3xl shadow-2xl p-6 border border-white/10 my-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-emerald-400">عملية بيع من المخزن</h2>
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            {initialProduct && (
              <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                    {initialProduct.product_code || 'بدون كود'}
                  </span>
                  <Package className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{initialProduct.name}</h3>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40">المتوفر حالياً:</span>
                  <span className="text-white font-mono">{initialProduct.quantity} قطعة</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Customer */}
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">اختيار العميل</label>
                <div className="relative">
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-indigo-500/50 text-right text-sm text-white appearance-none"
                  >
                    <option value="" className="bg-slate-900">-- اختر العميل --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                  <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">الكمية المباعة</label>
                  <input
                    type="number"
                    step="any"
                    required
                    max={initialProduct?.quantity || 0}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-right text-sm font-mono text-white"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">سعر البيع للوحدة ($)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-right text-sm font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">ملاحظات إضافية</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: تسليم مباشر، دفعة أولى..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-right text-xs text-white h-20 resize-none outline-none focus:border-indigo-500/30"
                />
              </div>

              {/* Total Display */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-bold text-white/60">إجمالي قيمة البيع:</span>
                <span className="text-lg font-black text-emerald-400 font-mono tracking-tight">
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedCustomerId || (parseFloat(quantity) || 0) <= 0}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20 active:scale-95 text-sm disabled:opacity-50 disabled:scale-100 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> تأكيد عملية البيع وتسجيلها
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
