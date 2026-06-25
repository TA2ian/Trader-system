import React, { useState } from "react";
import { useInventory } from "../hooks/useInventory";
import { 
  Plus, AlertTriangle, Filter, TrendingUp, Edit3, 
  RefreshCw, Scale, Ruler, Grid, Archive, ShoppingCart, DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AddProductModal } from "../components/AddProductModal";
import { EditProductModal } from "../components/EditProductModal";
import { SaleModal } from "../components/SaleModal";
import { inventoryService } from "../services/inventoryService";

export function InventoryView() {
  const { items, loading, refresh } = useInventory();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleProduct, setSaleProduct] = useState<any | null>(null);
  
  // Tabs for Filter (Categories & Advanced types)
  const [activeTab, setActiveTab] = useState<'all' | 'سلع استهلاكية' | 'ألبسة وأحذية' | 'مواد بناء وحديد' | 'كهربائيات وإلكترونيات' | 'أدوية ومستلزمات'>('all');
  
  // Bulk Price and Stock Adjuster (بوابة تعديل الأسعار وتقلب الأسواق)
  const [bulkCategory, setBulkCategory] = useState<string>('all');
  const [bulkAdjustmentPercent, setBulkAdjustmentPercent] = useState<string>("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");

  // Calculations
  const totalValueUSD = items.reduce((sum, item) => {
    return sum + (item.unitPriceUSD * item.quantity);
  }, 0);

  const totalItemsCount = items.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);

  const lowStockItems = items.filter(item => item.quantity < 10);

  // Detailed unit-based inventory breakdown according to Syrian merchant standards
  let totalPieces = 0;
  let totalPackages = 0;
  let totalLoosePieces = 0;
  let totalWeightKg = 0;
  let totalWeightG = 0;
  let totalDimMeter = 0;
  let totalDimCm = 0;
  let totalDimMm = 0;

  items.forEach(item => {
    const uType = item.unit_type || 'piece';
    if (item.has_packages || uType === 'package') {
      const pPerPkg = item.pieces_per_package || 1;
      const pQty = item.packages_qty !== undefined ? item.packages_qty : Math.floor(item.quantity / pPerPkg);
      const sQty = item.single_pieces_qty !== undefined ? item.single_pieces_qty : (item.quantity % pPerPkg);
      totalPackages += pQty;
      totalLoosePieces += sQty;
    } else if (uType === 'piece') {
      totalPieces += item.quantity;
    } else if (uType === 'weight') {
      const wUnit = item.weight_unit || 'kg';
      if (wUnit === 'kg') {
        totalWeightKg += item.quantity;
      } else {
        totalWeightG += item.quantity;
      }
    } else if (uType === 'dimension') {
      const dUnit = item.dimension_unit || 'meter';
      if (dUnit === 'meter') {
        totalDimMeter += item.quantity;
      } else if (dUnit === 'cm') {
        totalDimCm += item.quantity;
      } else {
        totalDimMm += item.quantity;
      }
    }
  });

  const filteredItems = items.filter(item => {
    if (activeTab === 'all') return true;
    return (item.category || 'سلع استهلاكية') === activeTab;
  });

  // Handle instant bulk pricing adjustment (حماية ضد التضخم وتقلبات السوق السورية اللحظية)
  const handleBulkPriceAdjustment = async () => {
    const percent = parseFloat(bulkAdjustmentPercent);
    if (isNaN(percent) || percent === 0) return;
    
    setIsBulkUpdating(true);
    setBulkSuccessMsg("");
    try {
      const itemsToUpdate = items.filter(item => {
        if (bulkCategory === 'all') return true;
        return item.category === bulkCategory;
      });

      for (const item of itemsToUpdate) {
        // Adjust standard price
        const newPrice = Math.max(0, item.unitPriceUSD * (1 + percent / 100));
        
        // Adjust package/piece prices if active
        const newPkgPrice = item.price_per_package_usd 
          ? Math.max(0, item.price_per_package_usd * (1 + percent / 100)) 
          : undefined;
        const newPiecePrice = item.price_per_piece_usd 
          ? Math.max(0, item.price_per_piece_usd * (1 + percent / 100)) 
          : undefined;

        await inventoryService.updateProduct(item.id, {
          unitPriceUSD: parseFloat(newPrice.toFixed(2)),
          price_per_package_usd: newPkgPrice ? parseFloat(newPkgPrice.toFixed(2)) : undefined,
          price_per_piece_usd: newPiecePrice ? parseFloat(newPiecePrice.toFixed(2)) : undefined,
        });
      }

      setBulkSuccessMsg(`تم بنجاح تعديل أسعار ${itemsToUpdate.length} صنف بنسبة ${percent}%`);
      setBulkAdjustmentPercent("");
      refresh();
      
      setTimeout(() => {
        setBulkSuccessMsg("");
      }, 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="p-3 md:p-6 flex flex-col gap-6 text-right" dir="rtl">
      {/* Modals */}
      <AddProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={refresh} 
      />

      <EditProductModal
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        onSuccess={refresh}
        product={selectedProduct}
      />

      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setSaleProduct(null);
        }}
        onSuccess={refresh}
        initialProduct={saleProduct}
      />

      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-indigo-400">إدارة المخازن والمستودع المتطور</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-wider">
            نظام فرز ذكي، جرد الطرود والفرط، والتحكم بالأوزان والمقاييس الذهبية للتجار
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-none h-11 px-5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-xs cursor-pointer shadow-lg shadow-indigo-500/15"
          >
            <Plus className="w-4 h-4" /> إضافة بضاعة جديدة
          </button>
        </div>
      </header>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Value */}
        <div className="p-5 frosted-glass rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-white/40 font-black tracking-wider uppercase block mb-1">إجمالي رأس المال بالمستودع</span>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-emerald-300 to-emerald-400 font-mono tracking-tight">
              ${totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <p className="text-[9px] text-white/30 mt-2">مقوم بالدولار الأمريكي لحمايتك من التضخم</p>
        </div>

        {/* Total Quantities & Packages */}
        <div className="p-5 frosted-glass rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-white/40 font-black tracking-wider uppercase block mb-1">حجم البضائع الإجمالي بالمستودع</span>
            <div className="flex justify-between items-baseline mb-2">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-l from-indigo-300 to-indigo-400 font-mono tracking-tight">
                {totalItemsCount.toLocaleString()} <span className="text-xs text-white/50 font-normal">وحدة معادلة</span>
              </h2>
            </div>

            {/* Detailed Unit-by-Unit Breakdown */}
            <div className="space-y-1 bg-black/20 p-2 rounded-xl border border-white/5 mt-1.5 max-h-[120px] overflow-y-auto">
              {totalPieces > 0 && (
                <div className="flex justify-between items-center text-[10px] border-b border-white/5 last:border-none pb-1 last:pb-0 mb-1 last:mb-0">
                  <div className="flex items-center gap-1 text-white/50">
                    <Grid className="w-3 h-3 text-emerald-400" />
                    <span>قطع منفردة:</span>
                  </div>
                  <span className="font-mono text-emerald-300 font-bold">{totalPieces.toLocaleString()} قطعة</span>
                </div>
              )}

              {(totalPackages > 0 || totalLoosePieces > 0) && (
                <div className="flex justify-between items-center text-[10px] border-b border-white/5 last:border-none pb-1 last:pb-0 mb-1 last:mb-0">
                  <div className="flex items-center gap-1 text-white/50">
                    <Archive className="w-3 h-3 text-indigo-400" />
                    <span>طرود وكراتين:</span>
                  </div>
                  <span className="font-mono text-indigo-300 font-bold">
                    {totalPackages.toLocaleString()} طرد {totalLoosePieces > 0 && `+ ${totalLoosePieces} فرط`}
                  </span>
                </div>
              )}

              {(totalWeightKg > 0 || totalWeightG > 0) && (
                <div className="flex justify-between items-center text-[10px] border-b border-white/5 last:border-none pb-1 last:pb-0 mb-1 last:mb-0">
                  <div className="flex items-center gap-1 text-white/50">
                    <Scale className="w-3 h-3 text-amber-400" />
                    <span>مواد بالوزن:</span>
                  </div>
                  <span className="font-mono text-amber-300 font-bold">
                    {totalWeightKg > 0 && `${totalWeightKg.toLocaleString()} كغ`}
                    {totalWeightKg > 0 && totalWeightG > 0 && " و "}
                    {totalWeightG > 0 && `${totalWeightG.toLocaleString()} غ`}
                  </span>
                </div>
              )}

              {(totalDimMeter > 0 || totalDimCm > 0 || totalDimMm > 0) && (
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1 text-white/50">
                    <Ruler className="w-3 h-3 text-sky-400" />
                    <span>أطوال وأبعاد:</span>
                  </div>
                  <span className="font-mono text-sky-300 font-bold">
                    {totalDimMeter > 0 && `${totalDimMeter.toLocaleString()} م`}
                    {totalDimMeter > 0 && (totalDimCm > 0 || totalDimMm > 0) && " و "}
                    {totalDimCm > 0 && `${totalDimCm.toLocaleString()} سم`}
                    {totalDimCm > 0 && totalDimMm > 0 && " و "}
                    {totalDimMm > 0 && `${totalDimMm.toLocaleString()} مم`}
                  </span>
                </div>
              )}

              {totalPieces === 0 && totalPackages === 0 && totalLoosePieces === 0 && totalWeightKg === 0 && totalWeightG === 0 && totalDimMeter === 0 && totalDimCm === 0 && totalDimMm === 0 && (
                <div className="text-center py-1 text-[9px] text-white/20">
                  لا توجد بضائع مخزنة
                </div>
              )}
            </div>
          </div>
          <p className="text-[9px] text-white/30 mt-1.5">مفصل تلقائياً على حسب وحدة القياس المحددة لكل صنف</p>
        </div>

        {/* Low Stock Watchdog */}
        <div className="p-5 frosted-glass rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-white/40 font-black tracking-wider uppercase block mb-1">مراقبة المخزون الحرج</span>
            <div className="flex items-center gap-2">
              <h2 className={`text-3xl font-black font-mono tracking-tight ${lowStockItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {lowStockItems.length}
              </h2>
              <span className="text-xs text-white/50">أصناف شارفت على النفاد</span>
            </div>
          </div>
          <div className="text-[9px] text-amber-300 flex items-center gap-1 mt-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            انتبه! يحتاج المستودع لتوريد دفعات جديدة فوراً لتجنب فقدان مبيعاتك.
          </div>
        </div>
      </div>

      {/* Bulk Price & Market Volatility Control Panel (أداة تعديل الأسعار وتقلب الأسواق اللحظية) */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/10 rounded-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-indigo-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400 animate-pulse" />
              بوابة تعديل الأسعار الفورية وتأثير تقلب الأسواق السورية
            </h3>
            <p className="text-[10px] text-white/50 mt-1">
              عند حدوث طفرات مفاجئة في الصرف، يمكنك زيادة أو نقصان أسعار البضائع لجميع المنتجات أو لتصنيف معين بثوانٍ معدودة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Category selection */}
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
            >
              <option value="all">كل المستودع</option>
              <option value="سلع استهلاكية">سلع استهلاكية</option>
              <option value="ألبسة وأحذية">ألبسة وأحذية</option>
              <option value="مواد بناء وحديد">مواد بناء وحديد</option>
              <option value="كهربائيات وإلكترونيات">كهربائيات وإلكترونيات</option>
              <option value="أدوية ومستلزمات">أدوية ومستلزمات</option>
            </select>

            {/* Adjustment Percent */}
            <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden h-9">
              <span className="text-white/40 px-2.5 text-xs font-mono font-bold">%</span>
              <input 
                type="number"
                step="any"
                value={bulkAdjustmentPercent}
                onChange={(e) => setBulkAdjustmentPercent(e.target.value)}
                placeholder="مثال: 10 أو -5"
                className="bg-transparent text-left outline-none text-xs w-24 pr-2 font-mono text-white"
              />
            </div>

            {/* Fire Action */}
            <button
              onClick={handleBulkPriceAdjustment}
              disabled={isBulkUpdating || !bulkAdjustmentPercent}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBulkUpdating ? 'animate-spin' : ''}`} />
              تعديل الأسعار الآن
            </button>
          </div>
        </div>

        {bulkSuccessMsg && (
          <div className="mt-3 p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold text-center">
            {bulkSuccessMsg}
          </div>
        )}
      </div>



      {/* Filters and List */}
      <div className="flex flex-col gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-2">
          {[
            { key: 'all', label: 'كل البضائع' },
            { key: 'سلع استهلاكية', label: 'غذائيات ومواد عامة' },
            { key: 'ألبسة وأحذية', label: 'ألبسة وأحذية' },
            { key: 'مواد بناء وحديد', label: 'مواد بناء وحديد' },
            { key: 'كهربائيات وإلكترونيات', label: 'كهربائيات وإلكترونيات' },
            { key: 'أدوية ومستلزمات', label: 'أدوية ومستلزمات طبية' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-indigo-500 text-white font-black shadow-md shadow-indigo-500/10'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-white/40">جاري تحميل بيانات وجرد المستودع...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 border border-dashed border-white/5 rounded-3xl text-center">
            <Archive className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-xs text-white/40">لا توجد بضائع مدرجة حالياً تحت هذا التبويب.</p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="mt-3 text-xs text-indigo-400 font-bold underline"
            >
              إضافة أول مادة الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item, index) => {
              const isLowStock = item.quantity < 10;
              
              // Handle package calculation descriptions
              const showPackageDetail = item.has_packages || item.unit_type === 'package';
              const isWeight = item.unit_type === 'weight' && item.weight_value;
              const isDimension = item.unit_type === 'dimension' && item.dimension_value;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-4 frosted-glass rounded-2xl border transition-all flex flex-col justify-between group ${
                    isLowStock ? 'border-amber-500/20 bg-amber-500/[0.01]' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div>
                    {/* Badge and Low Stock Status */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                        {item.category || 'سلع عامة'}
                      </span>

                      {isLowStock && (
                        <span className="flex items-center gap-1 text-[8px] text-amber-400 font-extrabold bg-amber-400/5 px-2 py-0.5 rounded-md border border-amber-400/10">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          مخزون حرج!
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="font-extrabold text-sm text-white tracking-tight text-right flex-1">
                        {item.name}
                      </h3>
                      {item.profit_margin_percent !== undefined && item.profit_margin_percent > 0 && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded font-black font-mono shrink-0">
                          +{item.profit_margin_percent.toFixed(0)}% ربح
                        </span>
                      )}
                    </div>

                    {/* Logistics metadata */}
                    <div className="flex flex-wrap gap-2 mb-3 text-[9px] text-white/30">
                      {(item.product_code || item.sku) && (
                        <span>كود: <span className="font-mono text-white/50 font-bold">{item.product_code || item.sku}</span></span>
                      )}
                      {item.batch_number && <span>لوت: <span className="font-mono text-white/50">{item.batch_number}</span></span>}
                    </div>

                    {/* Weight & dimension specifications tags */}
                    {(isWeight || isDimension) && (
                      <div className="flex gap-1.5 mb-3">
                        {isWeight && (
                          <span className="flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/10 font-bold">
                            <Scale className="w-3 h-3" />
                            الوزن: {item.weight_value} {item.weight_unit === 'gram' ? 'جرام' : 'كغ'}
                          </span>
                        )}
                        {isDimension && (
                          <span className="flex items-center gap-1 text-[9px] bg-sky-500/10 text-sky-400 px-2 py-1 rounded-lg border border-sky-500/10 font-bold">
                            <Ruler className="w-3 h-3" />
                            المقاس: {item.dimension_value} {item.dimension_unit === 'mm' ? 'مم' : item.dimension_unit === 'cm' ? 'سم' : 'متر'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Dual counting and price for Packages & Pieces */}
                    {showPackageDetail ? (
                      <div className="p-3 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-xl space-y-2 mb-3">
                        <span className="text-[9px] text-indigo-300 font-black flex items-center gap-1">
                          <Grid className="w-3 h-3 text-indigo-400" />
                          جرد الطرود والقطع
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2 text-right">
                          <div className="bg-black/30 p-1.5 rounded-lg border border-white/5">
                            <span className="text-[8px] text-white/40 block">الطرود والفرط</span>
                            <span className="text-[10px] font-black text-white font-mono">
                              {item.packages_qty || 0} طرد + {item.single_pieces_qty || 0} قطع فرط
                            </span>
                          </div>
                          
                          <div className="bg-black/30 p-1.5 rounded-lg border border-white/5">
                            <span className="text-[8px] text-white/40 block">مكافئ القطع الكلي</span>
                            <span className="text-[10px] font-black text-white font-mono">
                              {item.quantity} قطعة
                            </span>
                          </div>
                        </div>

                        {/* Custom package / pieces prices display */}
                        {(item.price_per_package_usd || item.price_per_piece_usd || item.selling_price_usd) && (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[9px]">
                            {item.price_per_package_usd && (
                              <span className="text-white/40">
                                طرد (شراء): <span className="font-mono text-emerald-400 font-bold">${item.price_per_package_usd}</span>
                              </span>
                            )}
                            {item.price_per_piece_usd && (
                              <span className="text-white/40">
                                قطعة (شراء): <span className="font-mono text-emerald-400 font-bold">${item.price_per_piece_usd}</span>
                              </span>
                            )}
                            {item.selling_price_usd && (
                              <span className="text-indigo-300 font-bold col-span-2 text-center bg-indigo-500/10 py-1 rounded-md mt-1">
                                سعر مبيع القطعة: <span className="font-mono">${item.selling_price_usd}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Standard individual / base pricing */
                      <div className="grid grid-cols-3 gap-1.5 my-3">
                        <div className="p-1.5 bg-white/[0.02] rounded-xl border border-white/5 text-right">
                          <span className="block text-[8px] text-white/30 uppercase">الكمية</span>
                          <span className={`text-[11px] font-mono font-black ${isLowStock ? 'text-amber-400' : 'text-white'}`}>
                            {item.quantity} {item.unit_type === 'piece' ? 'قطعة' : item.unit_type === 'weight' ? 'وزنة' : 'وحدة'}
                          </span>
                        </div>
                        
                        <div className="p-1.5 bg-white/[0.02] rounded-xl border border-white/5 text-right">
                          <span className="block text-[8px] text-white/30 uppercase">شراء</span>
                          <span className="text-[11px] font-mono font-black text-emerald-400">
                            ${item.unitPriceUSD.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                          </span>
                        </div>

                        <div className="p-1.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-right">
                          <span className="block text-[8px] text-indigo-300/60 uppercase">مبيع</span>
                          <span className="text-[11px] font-mono font-black text-indigo-300">
                            ${(item.selling_price_usd || item.unitPriceUSD).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center gap-1.5">
                    <button 
                      onClick={() => setSelectedProduct(item)}
                      className="text-[10px] text-indigo-400 font-black flex items-center gap-1 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      تعديل وتحكم <Edit3 className="w-3 h-3" />
                    </button>

                    <button 
                      onClick={() => {
                        setSaleProduct(item);
                        setIsSaleModalOpen(true);
                      }}
                      className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/15 font-black flex items-center gap-1 transition-all cursor-pointer"
                    >
                      تسجيل بيع <ShoppingCart className="w-3 h-3" />
                    </button>
                    
                    <span className="text-[8px] text-white/10 font-mono">
                      ID: {item.id.slice(0, 5)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
