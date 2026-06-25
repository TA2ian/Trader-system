import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  X, ShoppingCart, User, Package, DollarSign, Save, 
  Search, Trash2, Plus, Minus, AlertCircle, Check, Coins, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InventoryItem, Customer } from "../types";
import { customerService } from "../services/customerService";
import { inventoryService } from "../services/inventoryService";
import { debtService } from "../services/debtService";
import { useAuth } from "../context/AuthContext";

interface MultiSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CartItem {
  product: InventoryItem;
  quantity: number;
  sellingPriceUSD: number;
  sellUnit: 'piece' | 'package';
}

export function MultiSaleModal({ isOpen, onClose, onSuccess }: MultiSaleModalProps) {
  const { user, currentRates } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Data lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Selections
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const damascusRate = currentRates?.damascus || 15100;

  // Load active customers and inventory on open
  useEffect(() => {
    if (isOpen) {
      loadData();
      // Reset state
      setSelectedCustomerId("");
      setSearchQuery("");
      setCart([]);
      setNotes("");
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [customersData, inventoryData] = await Promise.all([
        customerService.getCustomers(),
        inventoryService.getItems()
      ]);
      
      // Multi-tenancy check: filter by company_id if defined
      const companyId = user?.company_id || "1";
      const filteredCustomers = customersData.filter(c => c.company_id === companyId);
      const filteredInventory = inventoryData.filter(i => i.company_id === companyId);
      
      setCustomers(filteredCustomers);
      setInventory(filteredInventory);
    } catch (error) {
      console.error("Error loading data for sale modal:", error);
    }
  };

  // Live product search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = inventory.filter(item => {
      const nameMatch = item.name?.toLowerCase().includes(query);
      const skuMatch = item.sku?.toLowerCase().includes(query);
      const codeMatch = item.product_code?.toLowerCase().includes(query);
      return nameMatch || skuMatch || codeMatch;
    });

    setSearchResults(filtered);
  }, [searchQuery, inventory]);

  // Click outside search results to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddToCart = (product: InventoryItem) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    const hasPkgOption = product.has_packages || product.unit_type === 'package';
    const initialUnit: 'piece' | 'package' = hasPkgOption ? 'package' : 'piece';
    
    const singlePrice = product.selling_price_usd || product.unitPriceUSD || 0;
    const piecesPerPkg = product.pieces_per_package || 1;
    const initialPrice = initialUnit === 'package' 
      ? (product.price_per_package_usd ? product.price_per_package_usd * 1.2 : singlePrice * piecesPerPkg)
      : singlePrice;
    
    if (existingIndex > -1) {
      const currentItem = cart[existingIndex];
      const unitFactor = currentItem.sellUnit === 'package' ? piecesPerPkg : 1;
      const currentPieces = currentItem.quantity * unitFactor;
      
      if (currentPieces + unitFactor > product.quantity) {
        // Can't add more than available stock
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      if (product.quantity <= 0) return; // out of stock
      setCart([...cart, {
        product,
        quantity: 1,
        sellingPriceUSD: Number(initialPrice.toFixed(2)),
        sellUnit: initialUnit
      }]);
    }
    
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleToggleUnit = (productId: string) => {
    const itemIndex = cart.findIndex(item => item.product.id === productId);
    if (itemIndex === -1) return;
    
    const updatedCart = [...cart];
    const item = updatedCart[itemIndex];
    const product = item.product;
    const currentUnit = item.sellUnit;
    const nextUnit = currentUnit === 'piece' ? 'package' : 'piece';
    const piecesPerPkg = product.pieces_per_package || 1;
    
    item.sellUnit = nextUnit;
    
    if (nextUnit === 'package') {
      const singlePrice = product.selling_price_usd || product.unitPriceUSD || 0;
      item.sellingPriceUSD = Number((singlePrice * piecesPerPkg).toFixed(2));
      
      const rawPkgQty = item.quantity / piecesPerPkg;
      const maxPkgQty = Math.floor(product.quantity / piecesPerPkg);
      item.quantity = Math.max(1, Math.min(maxPkgQty, Math.round(rawPkgQty)));
    } else {
      const singlePrice = product.selling_price_usd || product.unitPriceUSD || 0;
      item.sellingPriceUSD = singlePrice;
      
      const rawPieceQty = item.quantity * piecesPerPkg;
      item.quantity = Math.min(product.quantity, rawPieceQty);
    }
    
    setCart(updatedCart);
  };

  const handleUpdateQty = (productId: string, val: number) => {
    const itemIndex = cart.findIndex(item => item.product.id === productId);
    if (itemIndex === -1) return;
    
    const item = cart[itemIndex];
    const isPkg = item.sellUnit === 'package';
    const unitFactor = isPkg ? (item.product.pieces_per_package || 1) : 1;
    
    const maxQty = isPkg 
      ? Math.floor(item.product.quantity / unitFactor)
      : item.product.quantity;
      
    const newQty = Math.max(0.1, Math.min(maxQty, val));
    
    const updatedCart = [...cart];
    updatedCart[itemIndex].quantity = Number(newQty.toFixed(2));
    setCart(updatedCart);
  };

  const handleUpdatePrice = (productId: string, price: number) => {
    const itemIndex = cart.findIndex(item => item.product.id === productId);
    if (itemIndex === -1) return;
    
    const updatedCart = [...cart];
    updatedCart[itemIndex].sellingPriceUSD = Math.max(0, price);
    setCart(updatedCart);
  };

  // Calculations
  const totalUSD = cart.reduce((sum, item) => sum + (item.quantity * item.sellingPriceUSD), 0);
  const totalSYP = totalUSD * damascusRate;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || cart.length === 0) return;

    setLoading(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (!customer) throw new Error("Customer not found");

      // 1. Check and deduct inventory sequentially
      for (const item of cart) {
        const isPkg = item.sellUnit === 'package';
        const unitFactor = isPkg ? (item.product.pieces_per_package || 1) : 1;
        const piecesToDeduct = item.quantity * unitFactor;
        
        const remainingStock = Math.max(0, item.product.quantity - piecesToDeduct);
        
        // Formulate correct multi-unit update payload
        const updatePayload: Partial<InventoryItem> = {
          quantity: remainingStock
        };
        
        if (item.product.has_packages || item.product.pieces_per_package) {
          const piecesPerPkg = item.product.pieces_per_package || 1;
          updatePayload.packages_qty = Math.floor(remainingStock / piecesPerPkg);
          updatePayload.single_pieces_qty = remainingStock % piecesPerPkg;
        }

        await inventoryService.updateProduct(item.product.id, updatePayload);
      }

      // 2. Format details notes in Arabic for Damascus/Syria merchants
      const itemsDetailStr = cart.map(item => {
        const unitLabel = item.sellUnit === 'package' ? 'طرد كرتونة' : 'قطعة مفردة';
        return `- ${item.product.name} (عدد ${item.quantity} ${unitLabel} بسعر $${item.sellingPriceUSD} لـ ${unitLabel})`;
      }).join("\n");

      const invoiceNotes = `سلة مبيعات مجمَّعة (تحتوي على طرود وقطع مفردة):\n${itemsDetailStr}\n\nملاحظات: ${notes || "لا يوجد"}`;

      // 3. Record transaction in Debt / Sales (out transaction)
      // Standard Syrian practice: Log exact USD amount, rates, original amount in SYP
      await debtService.addDebt({
        customer_id: customer.id,
        clientName: customer.name,
        amount: totalUSD,
        type: 'out', // credit/debt given as merchandise
        timestamp: new Date().toISOString(),
        notes: invoiceNotes,
        company_id: user?.company_id || "1",
        original_currency: 'USD',
        original_amount: totalUSD,
        exchange_rate: damascusRate
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating multi-sale transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          {/* Main Container */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-2xl bg-[#0a0a14]/95 border border-white/10 rounded-3xl shadow-2xl p-6 my-auto flex flex-col max-h-[90vh] overflow-hidden text-right"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">تسجيل مبيعات جديدة (سلة المبيعات)</h2>
                  <p className="text-[10px] text-white/40">بيع لعدة منتجات دفعة واحدة وتحريك دقيق للمخازن</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content wrapper */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pl-1">
              {/* Form & Search container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Right Column: Customer Selection & Notes */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-indigo-300 font-extrabold mb-1.5 uppercase tracking-wider">
                      1. تحديد العميل المستلم
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 pr-10 outline-none focus:border-emerald-500/50 text-right text-xs font-bold text-white appearance-none"
                      >
                        <option value="" className="bg-slate-900">-- اختر العميل --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id} className="bg-slate-900">
                            {c.name} ({c.region || "منطقة غير محددة"})
                          </option>
                        ))}
                      </select>
                      <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    </div>
                  </div>

                  {selectedCustomer && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-[11px] space-y-1"
                    >
                      <div className="flex justify-between">
                        <span className="text-white/40">رصيد ديون العميل الحالي:</span>
                        <span className="font-bold text-rose-400 font-mono">${(selectedCustomer.balance_usd || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">السقف الائتماني الأقصى:</span>
                        <span className="font-bold text-white/70 font-mono">${(selectedCustomer.credit_limit || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-1 mt-1 text-[10px]">
                        <span className="text-white/40">حالة سقف السحب:</span>
                        { (selectedCustomer.balance_usd || 0) >= (selectedCustomer.credit_limit || 0) ? (
                          <span className="text-red-400 font-bold">⚠️ متجاوز للحد الائتماني</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">🟢 سليم - ضمن السقف</span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-[10px] text-indigo-300 font-extrabold mb-1.5 uppercase tracking-wider">
                      ملاحظات أو رقم الفاتورة الورقية
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="مثال: تسليم مباشر بالسيارة، تم الاتفاق على السداد خلال شهر..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-right text-xs text-white h-[100px] resize-none outline-none focus:border-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Left Column: Real-time Live Stock Search */}
                <div className="flex flex-col h-full" ref={searchContainerRef}>
                  <label className="block text-[10px] text-emerald-400 font-extrabold mb-1.5 uppercase tracking-wider">
                    2. البحث بالاسم أو كود الصنف بالمستودع
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setIsSearchFocused(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchFocused(true);
                      }}
                      placeholder="أدخل اسم المادة أو كود الباركود/الرقم..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 outline-none focus:border-emerald-500/50 text-right text-xs font-medium text-white"
                    />
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />

                    {/* Dropdown of search results or suggested products */}
                    <AnimatePresence>
                      {isSearchFocused && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute left-0 right-0 z-[150] mt-1 bg-[#0c0c16]/98 border border-white/10 rounded-2xl shadow-2xl p-2 max-h-[250px] overflow-y-auto space-y-1"
                        >
                          {searchQuery.trim() ? (
                            searchResults.length > 0 ? (
                              searchResults.map(item => {
                                const isOutOfStock = item.quantity <= 0;
                                const isInCart = cart.some(cartItem => cartItem.product.id === item.id);
                                
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => handleAddToCart(item)}
                                    className={`w-full text-right p-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between gap-2 text-xs transition-all ${
                                      isOutOfStock ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                                    }`}
                                  >
                                    <div className="text-left font-mono">
                                      <span className="text-emerald-400 font-black text-xs block">${item.selling_price_usd || item.unitPriceUSD}</span>
                                      {(item.product_code || item.sku) && (
                                        <span className="block text-[8px] text-white/30 mt-0.5">{item.product_code || item.sku}</span>
                                      )}
                                    </div>
                                    <div className="text-right flex-1 min-w-0">
                                      <span className="block font-bold text-white truncate">{item.name}</span>
                                      <span className={`text-[8px] font-bold ${
                                        isOutOfStock ? 'text-red-400' : item.quantity < 20 ? 'text-amber-400' : 'text-emerald-400'
                                      }`}>
                                        {isOutOfStock ? 'منتهي الصنف' : `متوفر: ${item.quantity} ${item.unit_type === 'piece' ? 'قطعة' : item.unit_type === 'weight' ? 'وزنة' : 'وحدة'}`}
                                      </span>
                                    </div>
                                    {isInCart && (
                                      <div className="w-5 h-5 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-4 text-center text-[11px] text-white/30">
                                لا توجد مواد تطابق هذا البحث في مخزونك.
                              </div>
                            )
                          ) : (
                            /* Quick suggest first 5 in stock products */
                            <div className="space-y-1">
                              <div className="px-2.5 py-1.5 text-[9px] text-indigo-300 font-bold border-b border-white/5 mb-1">
                                💡 أصناف سريعة متوفرة بالمستودع:
                              </div>
                              {inventory.filter(i => i.quantity > 0).slice(0, 6).map(item => {
                                const isInCart = cart.some(cartItem => cartItem.product.id === item.id);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleAddToCart(item)}
                                    className="w-full text-right p-2 rounded-xl hover:bg-white/5 flex items-center justify-between gap-2 text-xs transition-all cursor-pointer"
                                  >
                                    <div className="text-left font-mono">
                                      <span className="text-emerald-400 font-bold">${item.selling_price_usd || item.unitPriceUSD}</span>
                                    </div>
                                    <div className="text-right flex-1 min-w-0">
                                      <span className="block font-bold text-white truncate">{item.name}</span>
                                      <span className="text-[8px] text-white/40 block">
                                        المتاح: {item.quantity} {item.unit_type === 'piece' ? 'قطعة' : item.unit_type === 'weight' ? 'وزنة' : 'وحدة'}
                                      </span>
                                    </div>
                                    {isInCart && (
                                      <div className="w-4 h-4 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center shrink-0">
                                        <Check className="w-2.5 h-2.5" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                              {inventory.filter(i => i.quantity > 0).length === 0 && (
                                <div className="p-3 text-center text-[10px] text-white/30">
                                  لا توجد أصناف كافية متوفرة في المخازن حالياً.
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Placeholder box if cart is empty */}
                  {cart.length === 0 && (
                    <div className="flex-1 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-white/30 mt-3 min-h-[160px]">
                      <ShoppingCart className="w-8 h-8 text-white/10 mb-2" />
                      <p className="text-xs font-bold">سلة المبيعات فارغة</p>
                      <p className="text-[10px] mt-1 text-white/20">ابحث عن المواد بالأعلى وأضفها للسلة لبدء ترحيل الفاتورة</p>
                    </div>
                  )}

                  {/* Cart Summary if items added */}
                  {cart.length > 0 && (
                    <div className="mt-3 p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-2">
                      <span className="text-[9px] font-bold text-emerald-400 block uppercase">ملخص المبيعات والحساب المالي:</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/50">إجمالي المبيع بالدولار:</span>
                        <span className="font-extrabold text-white font-mono text-sm">${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-white/5 pt-1.5">
                        <span className="text-emerald-300 font-bold flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" /> المقابل التقريبي بالليرة (ل.س):
                        </span>
                        <span className="font-extrabold text-emerald-400 font-mono text-sm">
                          {totalSYP.toLocaleString(undefined, { maximumFractionDigits: 0 })} ل.س
                        </span>
                      </div>
                      <p className="text-[8px] text-white/25 leading-snug">
                        * تم احتساب سعر الصرف المعتمد في دمشق اليوم في لحظة الفاتورة: <strong>{damascusRate.toLocaleString()} ل.س</strong>
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Cart List Items Section */}
              {cart.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[10px] text-indigo-300 font-extrabold mb-2 uppercase">
                    3. إدارة بنود السلة والمخزون الحالي ({cart.length} أصناف)
                  </h3>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {cart.map((item, index) => {
                      const piecesPerPkg = item.product.pieces_per_package || 1;
                      const hasPkgOption = item.product.has_packages || item.product.pieces_per_package || item.product.unit_type === 'package';
                      const isPkg = item.sellUnit === 'package';
                      
                      const maxStockInPieces = item.product.quantity;
                      const maxStockInPkgs = Math.floor(maxStockInPieces / piecesPerPkg);
                      const maxStock = isPkg ? maxStockInPkgs : maxStockInPieces;
                      
                      const isQtyWarning = item.quantity >= maxStock;

                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={item.product.id}
                          className="p-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3"
                        >
                          {/* Item Info */}
                          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 text-right">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block font-extrabold text-xs text-white truncate">{item.product.name}</span>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span className="text-[8px] text-white/40">
                                  كود: <span className="font-mono text-white/50">{item.product.product_code || "N/A"}</span>
                                </span>
                                <span className="text-[8px] text-white/40">|</span>
                                <span className="text-[8px] text-white/40">
                                  المخزون الإجمالي المتاح: <strong className="text-emerald-400 font-mono">{maxStockInPieces} قطعة</strong>
                                  {hasPkgOption && (
                                    <span className="text-indigo-300 font-bold mr-1">
                                      ({maxStockInPkgs} طرد كامل)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Controls (Qty & Price) */}
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                            
                            {/* Live Unit Switcher (Piece vs Package) */}
                            {hasPkgOption && (
                              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleUnit(item.product.id)}
                                  className={`px-2 py-1 rounded-md text-[8px] font-black transition-all cursor-pointer ${
                                    isPkg 
                                      ? 'bg-indigo-500/20 text-indigo-300 border-none' 
                                      : 'text-white/40 hover:text-white/60'
                                  }`}
                                >
                                  طرد 📦
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUnit(item.product.id)}
                                  className={`px-2 py-1 rounded-md text-[8px] font-black transition-all cursor-pointer ${
                                    !isPkg 
                                      ? 'bg-emerald-500/20 text-emerald-300 border-none' 
                                      : 'text-white/40 hover:text-white/60'
                                  }`}
                                >
                                  قطعة 🍬
                                </button>
                              </div>
                            )}

                            {/* Unit Price Control */}
                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                              <span className="text-[8px] text-white/30">سعر الـ{isPkg ? 'طرد' : 'قطعة'}:</span>
                              <input
                                type="number"
                                step="any"
                                value={item.sellingPriceUSD}
                                onChange={(e) => handleUpdatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                                className="w-14 bg-transparent border-none outline-none font-mono text-xs font-bold text-emerald-400 text-center"
                              />
                              <span className="text-[9px] text-white/30">$</span>
                            </div>

                            {/* Quantity Control */}
                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                                className="p-1 hover:bg-white/5 text-white/40 hover:text-white rounded transition-all cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              
                              <input
                                type="number"
                                step="any"
                                max={maxStock}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQty(item.product.id, parseFloat(e.target.value) || 0)}
                                className="w-12 bg-transparent border-none outline-none font-mono text-xs font-extrabold text-white text-center"
                              />
                              
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                                className="p-1 hover:bg-white/5 text-white/40 hover:text-white rounded transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Trash Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Submit Action Block */}
            <div className="mt-5 pt-3 border-t border-white/5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !selectedCustomerId || cart.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform shadow-lg shadow-emerald-500/15 active:scale-95 text-xs disabled:opacity-30 disabled:scale-100 disabled:shadow-none cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> ترحيل الفاتورة وتعديل الأرصدة والمخزون
                  </>
                )}
              </button>
              
              <div className="text-[9px] text-white/30 text-center leading-normal">
                * عند التأكيد، سيقوم النظام تلقائياً بتخفيض الكمية المبيعة من المخزن وتقييد المجموع كذمة مالية على حساب المشتري بالدولار مع أرشفة التفاصيل.
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
