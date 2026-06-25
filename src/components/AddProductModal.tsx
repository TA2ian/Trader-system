import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Package, Save, DollarSign, List, Scale, Ruler, Grid, Layers, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { inventoryService } from "../services/inventoryService";
import { useAuth } from "../context/AuthContext";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("سلع استهلاكية");
  const [sku, setSku] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [loading, setLoading] = useState(false);

  // Advanced Trading Golden Units
  const [unitType, setUnitType] = useState<'piece' | 'package' | 'weight' | 'dimension' | 'liquid'>('piece');
  
  // Weight detail
  const [weightUnit, setWeightUnit] = useState<'gram' | 'kg'>('kg');
  const [weightValue, setWeightValue] = useState("");

  // Dimension detail
  const [dimensionUnit, setDimensionUnit] = useState<'mm' | 'cm' | 'meter' | 'inch' | 'foot' | 'yard'>('meter');
  const [dimensionValue, setDimensionValue] = useState("");

  // Liquid detail
  const [liquidUnit, setLiquidUnit] = useState<'ml' | 'liter' | 'gallon'>('liter');
  const [liquidValue, setLiquidValue] = useState("");

  // Package container details (طرد يحتوي قطع)
  const [hasPackages, setHasPackages] = useState(false);
  const [packageUnit, setPackageUnit] = useState<'package' | 'dozen' | 'roll' | 'bag' | 'box'>('package');
  const [packagesQty, setPackagesQty] = useState("");
  const [piecesPerPackage, setPiecesPerPackage] = useState("");
  const [singlePiecesQty, setSinglePiecesQty] = useState("");
  const [pricePerPackageUsd, setPricePerPackageUsd] = useState("");
  const [pricePerPieceUsd, setPricePerPieceUsd] = useState("");

  const [quantity, setQuantity] = useState("");
  const [unitPriceUSD, setUnitPriceUSD] = useState("");
  const [sellingPriceUSD, setSellingPriceUSD] = useState("");
  const [productNumber, setProductNumber] = useState("");

  const getCategoryPrefix = (cat: string) => {
    switch (cat) {
      case "سلع استهلاكية": return "CONS";
      case "ألبسة وأحذية": return "CLOT";
      case "مواد بناء وحديد": return "BLDG";
      case "كهربائيات وإلكترونيات": return "ELEC";
      case "أدوية ومستلزمات": return "MED";
      default: return "ITEM";
    }
  };

  const productCode = `${getCategoryPrefix(category)}-${productNumber || '000'}`;

  // Calculate profit margin
  const basePrice = (hasPackages || unitType === 'package')
    ? (parseFloat(pricePerPieceUsd) || 0)
    : (parseFloat(unitPriceUSD) || 0);
  const sellPrice = parseFloat(sellingPriceUSD) || 0;
  const profitMargin = basePrice > 0 ? ((sellPrice - basePrice) / basePrice) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate total pieces representation if package setup is enabled
      let finalQuantity = parseFloat(quantity) || 0;
      let finalPrice = parseFloat(unitPriceUSD) || 0;

      if (unitType === 'package' || hasPackages) {
        const pkgs = parseFloat(packagesQty) || 0;
        const inner = parseFloat(piecesPerPackage) || 1;
        const loose = parseFloat(singlePiecesQty) || 0;
        finalQuantity = (pkgs * inner) + loose; // Represents total equivalent pieces
        finalPrice = parseFloat(pricePerPieceUsd) || (parseFloat(pricePerPackageUsd) ? (parseFloat(pricePerPackageUsd) / inner) : 0);
      }

      await inventoryService.addProduct({
        name,
        category,
        sku: sku || productCode,
        product_code: productCode,
        product_number: parseInt(productNumber) || 0,
        batch_number: batchNumber || undefined,
        quantity: finalQuantity,
        unitPriceUSD: finalPrice,
        selling_price_usd: sellPrice,
        profit_margin_percent: profitMargin,
        unit_type: unitType,
        weight_unit: unitType === 'weight' ? weightUnit : undefined,
        weight_value: unitType === 'weight' ? (parseFloat(weightValue) || 0) : undefined,
        dimension_unit: unitType === 'dimension' ? dimensionUnit : undefined,
        dimension_value: unitType === 'dimension' ? (parseFloat(dimensionValue) || 0) : undefined,
        liquid_unit: unitType === 'liquid' ? liquidUnit : undefined,
        liquid_value: unitType === 'liquid' ? (parseFloat(liquidValue) || 0) : undefined,
        has_packages: hasPackages || unitType === 'package',
        package_unit: (hasPackages || unitType === 'package') ? packageUnit : undefined,
        packages_qty: (hasPackages || unitType === 'package') ? (parseFloat(packagesQty) || 0) : undefined,
        pieces_per_package: (hasPackages || unitType === 'package') ? (parseFloat(piecesPerPackage) || 0) : undefined,
        single_pieces_qty: (hasPackages || unitType === 'package') ? (parseFloat(singlePiecesQty) || 0) : undefined,
        price_per_package_usd: (hasPackages || unitType === 'package') ? (parseFloat(pricePerPackageUsd) || 0) : undefined,
        price_per_piece_usd: (hasPackages || unitType === 'package') ? (parseFloat(pricePerPieceUsd) || 0) : undefined,
        company_id: user?.company_id || "1"
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCategory("سلع استهلاكية");
    setSku("");
    setBatchNumber("");
    setUnitType('piece');
    setWeightUnit('kg');
    setWeightValue("");
    setDimensionUnit('meter');
    setDimensionValue("");
    setLiquidUnit('liter');
    setLiquidValue("");
    setHasPackages(false);
    setPackageUnit('package');
    setPackagesQty("");
    setPiecesPerPackage("");
    setSinglePiecesQty("");
    setPricePerPackageUsd("");
    setPricePerPieceUsd("");
    setQuantity("");
    setUnitPriceUSD("");
    setSellingPriceUSD("");
    setProductNumber("");
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg frosted-glass rounded-3xl shadow-2xl p-6 overflow-hidden my-auto border border-white/10"
          >
            <div className="flex justify-between items-center mb-5">
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
              <h2 className="text-lg font-black text-indigo-400">إضافة صنف تجاري جديد بالمستودع</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-right max-h-[80vh] overflow-y-auto px-1">
              
              {/* Row 1: Category, Product Number & Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">التصنيف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/50 text-right text-sm text-white appearance-none"
                  >
                    <option value="سلع استهلاكية" className="bg-slate-900 text-white">سلع استهلاكية</option>
                    <option value="ألبسة وأحذية" className="bg-slate-900 text-white">ألبسة وأحذية</option>
                    <option value="مواد بناء وحديد" className="bg-slate-900 text-white">مواد بناء وحديد</option>
                    <option value="كهربائيات وإلكترونيات" className="bg-slate-900 text-white">كهربائيات</option>
                    <option value="أدوية ومستلزمات" className="bg-slate-900 text-white">أدوية</option>
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">رقم المنتج</label>
                  <input
                    type="number"
                    required
                    value={productNumber}
                    onChange={(e) => setProductNumber(e.target.value)}
                    placeholder="001"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/50 text-right text-sm font-mono text-white"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">كود المادة المولد</label>
                  <div className="w-full bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3.5 py-2.5 text-center text-xs font-mono text-indigo-300 font-bold">
                    {productCode}
                  </div>
                </div>

                <div className="col-span-full">
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">اسم المادة / المنتج بالتفصيل</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="زيت نباتي، لوت كابلات، حديد مبروم 12ملم..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-indigo-500/50 text-right text-sm text-white"
                    />
                    <Package className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>
                </div>
              </div>

              {/* Row 2: Golden Units Selector */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <div>
                  <span className="text-[10px] text-amber-400 font-extrabold flex items-center gap-1">
                    <Grid className="w-3.5 h-3.5" />
                    وحدات قياس ومقاييس التاجر الذهبية
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { key: 'piece', label: 'قطع فردية' },
                    { key: 'package', label: 'طرود وتعبئة' },
                    { key: 'weight', label: 'أوزان' },
                    { key: 'dimension', label: 'مقاييس/طول' },
                    { key: 'liquid', label: 'سوائل' }
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setUnitType(t.key as any);
                        if (t.key === 'package') setHasPackages(true);
                      }}
                      className={`py-2 px-0.5 rounded-xl text-[9px] font-black border transition-all cursor-pointer text-center ${
                        unitType === t.key
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/5'
                          : 'bg-black/30 border-white/5 text-white/40 hover:border-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Conditional Units Rendering */}
                {unitType === 'weight' && (
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-white/50 mb-1">وحدة الوزن</label>
                      <div className="flex gap-2">
                        {['gram', 'kg'].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWeightUnit(w as any)}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all text-center ${
                              weightUnit === w 
                                ? 'bg-amber-500/20 border-amber-500 text-white font-extrabold' 
                                : 'bg-black/40 border-white/5 text-white/40'
                            }`}
                          >
                            {w === 'gram' ? 'غرام (g)' : 'كيلوغرام (Kg)'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-white/50 mb-1">الوزن للوحدة الواحدة</label>
                      <input
                        type="number"
                        step="any"
                        value={weightValue}
                        onChange={(e) => setWeightValue(e.target.value)}
                        placeholder="مثال: 500"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-right text-xs font-mono text-amber-300"
                      />
                    </div>
                  </div>
                )}

                {unitType === 'dimension' && (
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    <div className="col-span-full">
                      <label className="block text-[9px] text-white/50 mb-1">وحدة القياس / الطول</label>
                      <div className="grid grid-cols-6 gap-1">
                        {[
                          { key: 'mm', label: 'مم' },
                          { key: 'cm', label: 'سم' },
                          { key: 'meter', label: 'متر' },
                          { key: 'inch', label: 'إنش' },
                          { key: 'foot', label: 'قدم' },
                          { key: 'yard', label: 'ياردة' }
                        ].map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => setDimensionUnit(d.key as any)}
                            className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all text-center ${
                              dimensionUnit === d.key 
                                ? 'bg-amber-500/20 border-amber-500 text-white font-extrabold' 
                                : 'bg-black/40 border-white/5 text-white/40'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-full">
                      <label className="block text-[9px] text-white/50 mb-1">المقاس / الطول الفعلي</label>
                      <input
                        type="number"
                        step="any"
                        value={dimensionValue}
                        onChange={(e) => setDimensionValue(e.target.value)}
                        placeholder="مثال: 12"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-right text-xs font-mono text-amber-300"
                      />
                    </div>
                  </div>
                )}

                {unitType === 'liquid' && (
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-white/50 mb-1">وحدة السوائل</label>
                      <div className="flex gap-1">
                        {[
                          { key: 'ml', label: 'مليلتر (مل)' },
                          { key: 'liter', label: 'ليتر' },
                          { key: 'gallon', label: 'غالون' }
                        ].map((l) => (
                          <button
                            key={l.key}
                            type="button"
                            onClick={() => setLiquidUnit(l.key as any)}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all text-center ${
                              liquidUnit === l.key 
                                ? 'bg-amber-500/20 border-amber-500 text-white font-extrabold' 
                                : 'bg-black/40 border-white/5 text-white/40'
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-white/50 mb-1">السعة / الحجم الفعلي</label>
                      <input
                        type="number"
                        step="any"
                        value={liquidValue}
                        onChange={(e) => setLiquidValue(e.target.value)}
                        placeholder="مثال: 1"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-right text-xs font-mono text-amber-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Packages and Inner Content Logic */}
              <div className="p-4 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-indigo-400 font-extrabold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    تعبئة الطرود والكراتين (مفرد وجملة)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/40">تفعيل تقسيم الطرود</span>
                    <input
                      type="checkbox"
                      checked={hasPackages || unitType === 'package'}
                      disabled={unitType === 'package'}
                      onChange={(e) => setHasPackages(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 bg-black/40"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-white/40 leading-relaxed">
                  عند تفعيل هذا الخيار، يمكنك إدارة وبيع الصنف كـ "طرد كامل" أو "قطع سائبة منفردة" تم فتحها من الطرد.
                </p>

                {(hasPackages || unitType === 'package') && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2"
                  >
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                      <label className="block text-[9px] text-white/50">نوع التعبئة والتغليف (الجملة)</label>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { key: 'package', label: 'طرد' },
                          { key: 'dozen', label: 'دزينة' },
                          { key: 'roll', label: 'رول' },
                          { key: 'bag', label: 'كيس' },
                          { key: 'box', label: 'علبة' }
                        ].map((pkg) => (
                          <button
                            key={pkg.key}
                            type="button"
                            onClick={() => setPackageUnit(pkg.key as any)}
                            className={`py-1 rounded-lg text-[9px] font-bold border transition-all text-center ${
                              packageUnit === pkg.key 
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-extrabold' 
                                : 'bg-black/40 border-white/5 text-white/40 hover:text-white/60'
                            }`}
                          >
                            {pkg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] text-white/50 mb-1">عدد الطرود الكاملة</label>
                        <input
                          type="number"
                          value={packagesQty}
                          onChange={(e) => setPackagesQty(e.target.value)}
                          placeholder="مثال: 50 طرد"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-right text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-white/50 mb-1">القطع داخل كل طرد</label>
                        <input
                          type="number"
                          value={piecesPerPackage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPiecesPerPackage(val);
                            const pkgPrice = parseFloat(pricePerPackageUsd);
                            const piecesCount = parseFloat(val);
                            if (!isNaN(pkgPrice) && !isNaN(piecesCount) && piecesCount > 0) {
                              const computedPiecePrice = Number((pkgPrice / piecesCount).toFixed(2));
                              setPricePerPieceUsd(computedPiecePrice.toString());
                              const defaultSelling = Number((computedPiecePrice * 1.2).toFixed(2));
                              setSellingPriceUSD(defaultSelling.toString());
                            }
                          }}
                          placeholder="مثال: 12 قطعة"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-right text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-white/50 mb-1">قطع مفردة وسائبة خارج الطرود</label>
                        <input
                          type="number"
                          value={singlePiecesQty}
                          onChange={(e) => setSinglePiecesQty(e.target.value)}
                          placeholder="مثال: 5 قطع"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-right text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[9px] text-white/50 mb-1">سعر الطرد الكامل ($)</label>
                      <input
                        type="number"
                        step="any"
                        value={pricePerPackageUsd}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPricePerPackageUsd(val);
                          const pkgPrice = parseFloat(val);
                          const piecesCount = parseFloat(piecesPerPackage);
                          if (!isNaN(pkgPrice) && !isNaN(piecesCount) && piecesCount > 0) {
                            const computedPiecePrice = Number((pkgPrice / piecesCount).toFixed(2));
                            setPricePerPieceUsd(computedPiecePrice.toString());
                            const defaultSelling = Number((computedPiecePrice * 1.2).toFixed(2));
                            setSellingPriceUSD(defaultSelling.toString());
                          }
                        }}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-right text-xs font-mono text-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-white/50 mb-1">سعر شراء القطعة ($)</label>
                      <input
                        type="number"
                        step="any"
                        value={pricePerPieceUsd}
                        onChange={(e) => setPricePerPieceUsd(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-right text-xs font-mono text-emerald-400"
                      />
                    </div>
                    <div className="col-span-full flex items-center justify-between text-[9px] text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                      <span>💡 تم ربط سعر الطرد بالقطعة تلقائياً</span>
                      <span className="font-mono">سعر القطعة = سعر الطرد ÷ عدد قطع الطرد</span>
                    </div>
                    <div className="col-span-full">
                      <label className="block text-[9px] text-white/50 mb-1">سعر البيع النهائي للقطعة ($)</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="any"
                            value={sellingPriceUSD}
                            onChange={(e) => setSellingPriceUSD(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-black/40 border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-right text-xs font-mono text-indigo-300 font-bold"
                          />
                        </div>
                        <div className={`w-24 flex items-center justify-center rounded-xl text-[10px] font-black border ${profitMargin >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                          {profitMargin.toFixed(1)}% ربح
                        </div>
                      </div>
                    </div>
                  </div>
                  </motion.div>
                )}
              </div>

              {/* Traditional fallback quantity and price for standard pieces */}
              {!(hasPackages || unitType === 'package') && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="col-span-full mb-2">
                    <span className="text-[10px] text-indigo-400 font-extrabold flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      الكميات والأسعار المباشرة
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">الكمية بالمخزن</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/50 text-right text-sm font-mono text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">سعر الشراء ($)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={unitPriceUSD}
                      onChange={(e) => setUnitPriceUSD(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/50 text-right text-sm font-mono text-emerald-400"
                    />
                  </div>

                  <div className="col-span-full pt-2">
                    <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">سعر البيع المقترح ($)</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="any"
                          required
                          value={sellingPriceUSD}
                          onChange={(e) => setSellingPriceUSD(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-right text-sm font-mono text-white font-bold"
                        />
                      </div>
                      <div className={`w-28 flex items-center justify-center rounded-xl text-xs font-black border ${profitMargin >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        {profitMargin.toFixed(1)}% ربح
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Row: SKU & Batch for logistics and warehouse sorting */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">كود المادة (SKU)</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SKU-102"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-right text-xs font-mono text-white/80"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">رقم الدفعة / لوت التوريد</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="B-2026-X"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-right text-xs font-mono text-white/80"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-500/20 active:scale-95 text-sm disabled:opacity-50 disabled:scale-100 mt-4 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> حفظ الصنف بالمخزن
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
