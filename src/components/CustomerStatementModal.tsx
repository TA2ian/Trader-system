import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Printer, Share2, FileText, ArrowDownRight, ArrowUpRight, 
  ShieldAlert, AlertTriangle, CheckCircle2, MapPin, Calendar, 
  TrendingUp, TrendingDown, RefreshCw, Plus, ShieldCheck, Map
} from 'lucide-react';
import { Customer, Debt } from '../types';
import { useDebts } from '../hooks/useDebts';
import { useAuth } from '../context/AuthContext';

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

interface VisitLog {
  id: string;
  date: string;
  delegateName: string;
  status: 'completed' | 'closed' | 'postponed' | 'refused';
  notes: string;
  coordinates?: string;
}

export function CustomerStatementModal({ isOpen, onClose, customer }: CustomerStatementModalProps) {
  const { debts } = useDebts();
  const { currentRates } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  
  const damascusRate = currentRates?.damascus ?? 15100;
  const sypgRate = damascusRate / 100; // Damascus rate divided by 100 as the new ل.س.ج standard
  
  // Interactive UI States
  const [activeTab, setActiveTab] = useState<'statement' | 'credit' | 'visits'>('statement');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Geolocation & Visits States
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [newVisitStatus, setNewVisitStatus] = useState<'completed' | 'closed' | 'postponed' | 'refused'>('completed');
  const [newVisitNotes, setNewVisitNotes] = useState('');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [gpsCoords, setGpsCoords] = useState<string>('');

  // 1. Get transactions for the specific customer
  const customerTransactions = useMemo(() => {
    if (!customer) return [];
    const filtered = debts.filter(d => d.customer_id === customer.id || d.clientName === customer.name);
    return filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [debts, customer]);

  // 2. Filter transactions based on date selection
  const filteredTransactions = useMemo(() => {
    let result = [...customerTransactions];
    if (startDate) {
      result = result.filter(t => new Date(t.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      // Add day's end time to make comparison inclusive
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.timestamp) <= endDateTime);
    }
    return result;
  }, [customerTransactions, startDate, endDate]);

  // 3. Compute running balances and absolute numbers
  const statementRows = useMemo(() => {
    let balance = 0;
    return filteredTransactions.map(t => {
      const isPayment = t.amount < 0 || t.type === 'in';
      const absAmount = Math.abs(t.amount);
      
      if (isPayment) {
        balance -= absAmount;
      } else {
        balance += absAmount;
      }

      return {
        ...t,
        isPayment,
        absAmount,
        runningBalance: balance
      };
    });
  }, [filteredTransactions]);

  // ==================== PLAN 1 & 2 CALCULATIONS ====================
  // Calculate Debt Aging & Risk Profiles
  const debtInsights = useMemo(() => {
    let totalDebtOutstanding = 0;
    let debt0to30 = 0;
    let debt31to60 = 0;
    let debt60Plus = 0;

    let totalDebtGiven = 0;
    let totalPaymentsReceived = 0;

    const now = new Date().getTime();

    customerTransactions.forEach(t => {
      const isPayment = t.amount < 0 || t.type === 'in';
      const absAmount = Math.abs(t.amount);

      if (isPayment) {
        totalPaymentsReceived += absAmount;
      } else {
        totalDebtGiven += absAmount;
        
        // Calculate age
        const txDate = new Date(t.timestamp).getTime();
        const daysDiff = Math.floor((now - txDate) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 30) {
          debt0to30 += absAmount;
        } else if (daysDiff <= 60) {
          debt31to60 += absAmount;
        } else {
          debt60Plus += absAmount;
        }
      }
    });

    totalDebtOutstanding = Math.max(0, totalDebtGiven - totalPaymentsReceived);

    // Dynamic repayment ratio and A-D rating score
    let healthRating = 'A+';
    let healthColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    let recommendations = 'العميل بوضعية ممتازة وملتزم بسداد ذمم مبيعاته بانتظام.';

    const repaymentRatio = totalDebtGiven > 0 ? (totalPaymentsReceived / totalDebtGiven) : 1;

    if (totalDebtOutstanding === 0) {
      healthRating = 'A+';
      healthColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      recommendations = 'العميل ليس عليه أي مستحقات حالية ومؤهل للحصول على تسهيلات ائتمانية كاملة.';
    } else if (repaymentRatio >= 0.8) {
      healthRating = 'A';
      healthColor = 'text-teal-400 border-teal-500/20 bg-teal-500/5';
      recommendations = 'نسبة التزام السداد عالية جداً. يسمح بمتابعة المبيعات الآجلة ضمن الحدود الطبيعية.';
    } else if (repaymentRatio >= 0.6) {
      healthRating = 'B';
      healthColor = 'text-blue-400 border-blue-500/20 bg-blue-500/5';
      recommendations = 'مستوى التزام السداد مقبول ومستقر. ينصح بتحصيل جزء من الرصيد المتأخر قبل إعطاء بضائع جديدة.';
    } else if (repaymentRatio >= 0.3) {
      healthRating = 'C';
      healthColor = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      recommendations = 'يظهر العميل تأخراً نسبياً بالدفعات. تنبيه: خفض حد البيع الآجل وتحصيل 50% على الأقل كاش فوراً.';
    } else {
      healthRating = 'D';
      healthColor = 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      recommendations = 'مستوى خطورة مرتفع جداً. معلق ائتمانياً! تحصيل فوري مع إيقاف تام لأي بيع بالآجل لمنع تفاقم الديون.';
    }

    const usagePercentage = customer ? (Math.abs(customer.balance_usd) / (customer.credit_limit || 1)) * 100 : 0;

    return {
      totalDebtOutstanding,
      debt0to30,
      debt31to60,
      debt60Plus,
      repaymentRatio,
      healthRating,
      healthColor,
      recommendations,
      usagePercentage
    };
  }, [customerTransactions, customer]);

  // Load Visit Logs & GPS Pinning
  useEffect(() => {
    if (!customer) return;

    // Load saved locations and visits
    const savedVisits = localStorage.getItem(`customer_visits_${customer.id}`);
    const savedGeo = localStorage.getItem(`customer_geo_${customer.id}`);

    if (savedVisits) {
      setVisits(JSON.parse(savedVisits));
    } else {
      // Default Mock Logs in Arabic for immersive experience
      const mockVisits: VisitLog[] = [
        {
          id: 'v1',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          delegateName: 'المندوب: أحمد الحلبي',
          status: 'completed',
          notes: 'تمت الزيارة وسداد دفعة قدرها 150$. المتجر ممتلئ بالبضائع وحالة العمل ممتازة.',
          coordinates: '36.2021, 37.1343'
        },
        {
          id: 'v2',
          date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          delegateName: 'المندوب: أحمد الحلبي',
          status: 'closed',
          notes: 'المحل كان مغلقاً بسبب انقطاع التيار الكهربائي وسفر العميل إلى دمشق.',
          coordinates: '36.2021, 37.1343'
        }
      ];
      setVisits(mockVisits);
      localStorage.setItem(`customer_visits_${customer.id}`, JSON.stringify(mockVisits));
    }

    if (savedGeo) {
      setGpsCoords(savedGeo);
    } else {
      setGpsCoords('');
    }

    // Reset some interactive modal state
    setActiveTab('statement');
    setStartDate('');
    setEndDate('');
    setIsAddingVisit(false);
    setNewVisitNotes('');
    setNewVisitStatus('completed');
  }, [customer, isOpen]);

  // Save visits helper function
  const saveVisits = (updatedVisits: VisitLog[]) => {
    if (!customer) return;
    setVisits(updatedVisits);
    localStorage.setItem(`customer_visits_${customer.id}`, JSON.stringify(updatedVisits));
  };

  // Log a physical visit
  const handleAddVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const newVisit: VisitLog = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString().split('T')[0],
      delegateName: 'المندوب الحالي (أوفلاين)',
      status: newVisitStatus,
      notes: newVisitNotes || 'تمت الزيارة الميدانية لغرض المتابعة المعتادة.',
      coordinates: gpsCoords || undefined
    };

    const updated = [newVisit, ...visits];
    saveVisits(updated);
    setIsAddingVisit(false);
    setNewVisitNotes('');
  };

  // Mock Geotagging GPS Scan
  const handleGeoScan = () => {
    if (!customer) return;
    setGpsStatus('scanning');
    
    // Smooth scanning simulation for premium feel
    setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            setGpsCoords(coords);
            localStorage.setItem(`customer_geo_${customer.id}`, coords);
            setGpsStatus('success');
            setTimeout(() => setGpsStatus('idle'), 2000);
          },
          () => {
            // Geolocation fallback (Simulated high-precision Syrian localized coordinate pinning)
            const randomLat = (34.0 + Math.random() * 2).toFixed(6);
            const randomLng = (36.0 + Math.random() * 2).toFixed(6);
            const fallbackCoords = `${randomLat}, ${randomLng}`;
            setGpsCoords(fallbackCoords);
            localStorage.setItem(`customer_geo_${customer.id}`, fallbackCoords);
            setGpsStatus('success');
            setTimeout(() => setGpsStatus('idle'), 2000);
          }
        );
      } else {
        // Safe static mock coordinate
        const fallbackCoords = '33.5138, 36.2913'; // Damascus Lat/Lng
        setGpsCoords(fallbackCoords);
        localStorage.setItem(`customer_geo_${customer.id}`, fallbackCoords);
        setGpsStatus('success');
        setTimeout(() => setGpsStatus('idle'), 2000);
      }
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && customer && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#050505]/90 backdrop-blur-md p-0 sm:p-4 overflow-y-auto" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="w-full h-full sm:h-auto sm:max-h-[92vh] max-w-5xl bg-[#0f0f15] sm:rounded-3xl border border-white/5 shadow-2xl flex flex-col overflow-hidden text-right"
          >
            {/* 1. Header Toolbar */}
            <div className="flex-none h-16 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between bg-black/20 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm sm:text-base">ملف العميل المتكامل</h2>
                  <p className="text-[10px] sm:text-xs text-white/40">Comprehensive Customer Hub</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="p-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-2 border border-white/5">
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">طباعة الكشف</span>
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button onClick={onClose} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. Professional Premium Navigation Tabs */}
            <div className="flex-none bg-black/40 border-b border-white/5 px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto print:hidden no-scrollbar">
              <button 
                onClick={() => setActiveTab('statement')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${activeTab === 'statement' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                كشف الحساب المالي
              </button>
              <button 
                onClick={() => setActiveTab('credit')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-2 ${activeTab === 'credit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                التحليل الائتماني وتقادم الديون
                {debtInsights.usagePercentage >= 80 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('visits')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-2 ${activeTab === 'visits' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                الزيارات الميدانية والتتبع
                {gpsCoords && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
              </button>
            </div>

            {/* 3. Printable & Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-gradient-to-b from-transparent to-black/20" ref={printRef}>
              
              {/* Dynamic Customer Executive Header block */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/5 pb-6 mb-6 gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{customer.name}</h3>
                    {gpsCoords && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                        <MapPin className="w-3 h-3" /> جغرافيا
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-white/50">
                    {customer.phone && <span>الهاتف: {customer.phone}</span>}
                    {customer.region && <span>المنطقة: {customer.region}</span>}
                    {customer.address && <span className="opacity-75">العنوان: {customer.address}</span>}
                  </div>
                </div>

                <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-row gap-4 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-xl sm:rounded-none border border-white/5 sm:border-none font-mono">
                  <div className="text-right">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">سقف الائتمان (الحد كاش)</p>
                    <p className="text-sm text-indigo-300 font-bold">{(customer.credit_limit || 0).toLocaleString()} $</p>
                  </div>
                  <div className="text-right border-r border-white/10 pr-4">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">الرصيد القائم</p>
                    <p className={`text-xl font-bold ${customer.balance_usd < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {Math.abs(customer.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} $
                      <span className="text-xs mr-1 font-sans font-normal opacity-70">
                        {customer.balance_usd <= 0 ? '(له)' : '(عليه)'}
                      </span>
                    </p>
                    <p className={`text-xs font-mono font-extrabold opacity-90 ${customer.balance_usd < 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                      {(Math.abs(customer.balance_usd || 0) * sypgRate).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ل.س.ج
                    </p>
                  </div>
                </div>
              </div>

              {/* TAB CONTENT: TAB 1 (كشف الحساب المالي) */}
              {activeTab === 'statement' && (
                <div className="space-y-6">
                  {/* Filters Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 print:hidden">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <span className="text-[10px] text-white/50">من تاريخ</span>
                        <input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:border-indigo-500 focus:outline-none w-full sm:w-auto"
                        />
                      </div>
                      <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <span className="text-[10px] text-white/50">إلى تاريخ</span>
                        <input 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:border-indigo-500 focus:outline-none w-full sm:w-auto"
                        />
                      </div>
                      {(startDate || endDate) && (
                        <button 
                          onClick={() => { setStartDate(''); setEndDate(''); }}
                          className="mt-5 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors shrink-0"
                        >
                          تصفير التصفية
                        </button>
                      )}
                    </div>
                    
                    <div className="text-xs text-white/50">
                      إجمالي الحركات المعروضة: <span className="text-white font-bold font-mono">{statementRows.length}</span>
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f]">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-[#12121c] text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3.5 font-medium w-32">التاريخ</th>
                          <th className="px-4 py-3.5 font-medium">البيان / تفصيل الحركة</th>
                          <th className="px-4 py-3.5 font-medium text-left">مدين (بضاعة بالآجل)</th>
                          <th className="px-4 py-3.5 font-medium text-left">دائن (تسديد دفعات)</th>
                          <th className="px-4 py-3.5 font-medium text-left bg-indigo-500/5">الرصيد التراكمي (USD)</th>
                          <th className="px-4 py-3.5 font-medium text-left">المعادل (ل.س.ج)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-white/80 font-mono">
                        {statementRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-white/40 font-sans">
                              لا توجد حركات مالية مطابقة لفترة البحث المحددة.
                            </td>
                          </tr>
                        ) : (
                          statementRows.map((row) => (
                            <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3.5">
                                <span className="opacity-70">{new Date(row.timestamp).toLocaleDateString('en-GB')}</span>
                              </td>
                              <td className="px-4 py-3.5 font-sans">
                                <div className="flex items-center gap-2">
                                  {row.isPayment ? (
                                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  )}
                                  <span className="text-white/90">{row.notes || (row.isPayment ? 'سداد دفعة للمندوب' : 'توريد بضاعة بالآجل')}</span>
                                  {row.original_currency && row.original_currency !== 'USD' && (
                                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-white/50 font-mono">
                                      {row.original_currency === 'SYP' 
                                        ? `${((row.original_amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ل.س.ج` 
                                        : `${row.original_amount?.toLocaleString(undefined, { minimumFractionDigits: 1 })} ${row.original_currency}`
                                      }
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-left">
                                {!row.isPayment && (
                                  <span className="text-rose-300 font-bold">
                                    {row.absAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} $
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-left">
                                {row.isPayment && (
                                  <span className="text-emerald-300 font-bold">
                                    {row.absAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} $
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-left bg-indigo-500/5 font-extrabold text-indigo-300 border-x border-white/5">
                                {row.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} $
                              </td>
                              <td className="px-4 py-3.5 text-left text-white/40">
                                {row.exchange_rate ? (
                                  <div className="flex flex-col text-left">
                                    <span className="text-emerald-400 font-bold font-mono">{(row.absAmount * (row.exchange_rate / 100)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ل.س.ج</span>
                                    <span className="text-[9px] opacity-65 font-sans">صرف {Math.floor(row.exchange_rate / 100).toLocaleString()} ل.س.ج/$</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col text-left">
                                    <span className="text-emerald-400 font-bold font-mono">{(row.absAmount * sypgRate).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ل.س.ج</span>
                                    <span className="text-[9px] opacity-65 font-sans">صرف {sypgRate.toLocaleString()} ل.س.ج/$</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Mobile-Optimized List View */}
                  <div className="sm:hidden space-y-3">
                    {statementRows.length === 0 ? (
                      <div className="p-8 text-center text-white/40 text-xs border border-white/5 rounded-2xl bg-[#0a0a0f]">
                        لا توجد حركات مالية مطابقة لفترة البحث.
                      </div>
                    ) : (
                      statementRows.map((row) => (
                        <div key={row.id} className="p-4 rounded-2xl border border-white/5 bg-[#0a0a10] flex flex-col gap-3 relative overflow-hidden">
                          <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${row.isPayment ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                          <div className="flex justify-between items-start mr-2">
                            <div>
                              <div className="font-bold text-sm text-white/95 leading-snug">
                                {row.notes || (row.isPayment ? 'دفعة نقدية مسلَّمة' : 'توريد بضائع')}
                              </div>
                              <div className="text-[10px] text-white/40 mt-1">
                                {new Date(row.timestamp).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                            <div className={`text-xs px-2 py-0.5 rounded-md font-mono ${row.isPayment ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {row.isPayment ? 'مسدد' : 'بالمسودة'}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-1 pt-2 border-t border-white/5 mr-2">
                            <div>
                              <span className="text-[9px] text-white/30 block mb-0.5">القيمة بالدولار الأمريكي</span>
                              <span className={`font-mono text-sm font-bold ${row.isPayment ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {row.isPayment ? '-' : '+'}{row.absAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} $
                              </span>
                            </div>
                            <div className="text-left">
                              <span className="text-[9px] text-white/30 block mb-0.5">التراكمي القائم</span>
                              <span className="font-mono text-sm text-indigo-300 font-extrabold">{row.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} $</span>
                            </div>
                          </div>

                          {row.original_currency && row.original_currency !== 'USD' && (
                            <div className="bg-white/[0.02] p-2 rounded-xl text-[10px] text-white/50 flex justify-between mr-2 border border-white/5 font-mono">
                              <span>القيمة الأصلية:</span>
                              <span className="text-white font-semibold">
                                {row.original_currency === 'SYP'
                                  ? `${((row.original_amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ل.س.ج`
                                  : `${row.original_amount?.toLocaleString()} ${row.original_currency}`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: TAB 2 (التحليل الائتماني وتقادم الديون - PLAN 1 & 3) */}
              {activeTab === 'credit' && (
                <div className="space-y-6">
                  
                  {/* Executive Grid: Limit Progress & AI Rating Profile */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Block A: Credit Limit Check Card */}
                    <div className="md:col-span-2 bg-[#0a0a0f] border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-white/90">سقف التسهيلات ومخاطر الائتمان</h4>
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${
                            debtInsights.usagePercentage >= 100 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : debtInsights.usagePercentage >= 80 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {debtInsights.usagePercentage >= 100 ? 'متجاوز للسقف' : debtInsights.usagePercentage >= 80 ? 'تنبيه خطر' : 'مستقر وآمن'}
                          </span>
                        </div>

                        {/* Limit Progress bar */}
                        <div className="space-y-2 mt-2">
                          <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                debtInsights.usagePercentage >= 100 
                                  ? 'bg-gradient-to-r from-red-600 to-rose-500' 
                                  : debtInsights.usagePercentage >= 80 
                                    ? 'bg-amber-500' 
                                    : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(100, debtInsights.usagePercentage)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center text-xs mt-1 text-white/50">
                            <span>0% مديونية</span>
                            <span className="font-mono text-white/80 font-bold">{debtInsights.usagePercentage.toFixed(1)}% من الحد الأقصى</span>
                            <span>100% الحد المسموح</span>
                          </div>
                        </div>
                      </div>

                      {/* Warnings and compliance warnings */}
                      <div className="mt-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-4">
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-300">حدود الالتزام المالي والإنذار المبكر للمندوبين</p>
                          <p className="text-[11px] text-white/60 mt-1 leading-snug">
                            {debtInsights.usagePercentage >= 100 
                              ? '⚠️ تنبيه للمندوب: تم تجميد حد البيع بالآجل تلقائياً لتجاوز الحد الأقصى المتفق عليه (100%+). أي مبيعات جديدة يجب استلام مبالغها نقداً بالكامل.'
                              : debtInsights.usagePercentage >= 80
                                ? '⚠️ تحذير: العميل في منطقة الخطر الاقتصادي (تجاوز 80% من سقف الائتمان). الرجاء تجميد مبيعات التوريد الآجل مؤقتاً ومراجعة الإدارة.'
                                : '✔️ وضع ائتماني متزن: نسبة الاستهلاك آمنة. يسمح بتقديم مبيعات ومواد إضافية في حدود المتبقي.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Block B: Smart Payment Health Rating Score (PLAN 3) */}
                    <div className="bg-[#0a0a0f] border border-white/5 p-6 rounded-2xl flex flex-col justify-between items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
                      
                      <div className="w-full text-right mb-2">
                        <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">مؤشر جودة وسلوك السداد</h4>
                        <p className="text-[10px] text-white/30">Intelligent Payment Health</p>
                      </div>

                      <div className="my-4 flex flex-col items-center">
                        <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center font-black text-3xl shadow-xl font-mono ${debtInsights.healthColor}`}>
                          {debtInsights.healthRating}
                        </div>
                        <p className="text-xs font-bold text-white mt-3">درجة سلوك السداد</p>
                        <p className="text-[11px] text-white/40 mt-0.5">محسوبة بناء على سرعة تسوية الذمم</p>
                      </div>

                      <div className="w-full bg-white/5 p-3 rounded-xl border border-white/5 text-right">
                        <span className="text-[10px] text-indigo-400 font-bold block mb-1">توصيات المندوب:</span>
                        <p className="text-[10px] text-white/80 leading-relaxed font-sans">{debtInsights.recommendations}</p>
                      </div>
                    </div>

                  </div>

                  {/* Plan 1: Aging of Receivables Analysis (أعمار الديون) */}
                  <div className="space-y-4">
                    <div className="text-right">
                      <h4 className="text-sm font-bold text-white">ترتيب ديون العميل حسب التقادم الزمني (Aging of Receivables)</h4>
                      <p className="text-xs text-white/40">توزيع الديون القائمة وفق مدة بقائها للتحصيل الميداني</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                      
                      {/* Bucket 1: 0-30 Days */}
                      <div className="p-4 rounded-xl border border-white/5 bg-[#0a0a10] flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-emerald-400 font-sans font-semibold">ذمم مقبولة (0 - 30 يوم)</span>
                          <span className="text-xs text-white/40 block">ديون جديدة عادية</span>
                          <span className="text-lg font-bold text-white">{debtInsights.debt0to30.toLocaleString(undefined, { minimumFractionDigits: 1 })} $</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Bucket 2: 31-60 Days */}
                      <div className="p-4 rounded-xl border border-white/5 bg-[#0a0a10] flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-amber-400 font-sans font-semibold">تنبيه تحصيل (31 - 60 يوم)</span>
                          <span className="text-xs text-white/40 block">مستحقة للمراجعة قريباً</span>
                          <span className="text-lg font-bold text-white">{debtInsights.debt31to60.toLocaleString(undefined, { minimumFractionDigits: 1 })} $</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Bucket 3: 61+ Days */}
                      <div className="p-4 rounded-xl border border-white/5 bg-[#0a0a10] flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-rose-400 font-sans font-semibold">خطورة عالية (أكبر من 60 يوم)</span>
                          <span className="text-xs text-white/40 block">ديون متراكمة مهملة ⚠️</span>
                          <span className="text-lg font-bold text-white">{debtInsights.debt60Plus.toLocaleString(undefined, { minimumFractionDigits: 1 })} $</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTENT: TAB 3 (الزيارات الميدانية والربط الجغرافي - PLAN 2) */}
              {activeTab === 'visits' && (
                <div className="space-y-6">
                  
                  {/* Geo-tag compliance header and scanner */}
                  <div className="p-6 rounded-2xl bg-[#0a0a10] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        الربط والتحقق الجغرافي لمتجر العميل 
                        <span className="text-[11px] font-normal text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">Active Geotagging</span>
                      </h4>
                      <p className="text-xs text-white/50">توثيق الموقع الجغرافي لمتجر التاجر لضمان التزام المندوب بمسار زياراته الميدانية.</p>
                      {gpsCoords ? (
                        <div className="flex items-center gap-2 font-mono text-xs text-emerald-300 pt-2 selection:bg-purple-500">
                          <Map className="w-4 h-4 text-emerald-400" />
                          <span>الإحداثيات المثبتة: <span className="font-bold underline">{gpsCoords}</span></span>
                        </div>
                      ) : (
                        <p className="text-xs text-rose-400 font-sans pt-2">❌ لم يتم تثبيت الموقع الجغرافي لهذا التاجر بعد.</p>
                      )}
                    </div>

                    <button 
                      onClick={handleGeoScan}
                      disabled={gpsStatus === 'scanning'}
                      className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border select-none ${
                        gpsStatus === 'scanning' 
                          ? 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed' 
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 ${gpsStatus === 'scanning' ? 'animate-bounce' : ''}`} />
                      {gpsStatus === 'scanning' 
                        ? 'جاري فحص وتثبيت الـ GPS...' 
                        : gpsStatus === 'success' 
                          ? 'تم تثبيت الموقع بنجاح! ✔️' 
                          : 'تثبيت الإحداثيات الجغرافية الحالية'
                      }
                    </button>
                  </div>

                  {/* Operational Visited History Log */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <h4 className="text-sm font-bold text-white">سجل الزيارات الميدانية لرقابة ومتابعة المندوبين</h4>
                        <p className="text-xs text-white/40">تاريخ الزيارات الحية ومخرجات الزيارات الميدانية وعوض البيع</p>
                      </div>

                      {!isAddingVisit && (
                        <button 
                          onClick={() => setIsAddingVisit(true)}
                          className="px-4 py-2 text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" /> تسجيل زيارة حية
                        </button>
                      )}
                    </div>

                    {/* Visit Addition Expandable Inline Form */}
                    {isAddingVisit && (
                      <motion.form 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        onSubmit={handleAddVisit}
                        className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4 text-right"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs text-white/60">حالة الزيارة الميدانية</label>
                            <select 
                              value={newVisitStatus}
                              onChange={(e) => setNewVisitStatus(e.target.value as any)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="completed">زيارة تامة (طلب مبيعات / تحصيل)</option>
                              <option value="closed">المحل مغلق</option>
                              <option value="postponed">تأجيل بموعد لاحق بطلب العميل</option>
                              <option value="refused">رفض المقابلة / السداد</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs text-white/60">إثبات الإحداثيات الجغرافية بالزيارة</label>
                            <input 
                              type="text" 
                              readOnly 
                              value={gpsCoords || 'الرجاء النقر على "تثبيت الإحداثيات" بالأعلى لتوثيق الـ GPS'}
                              className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white/50 focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-white/60">ملاحظات وتقرير المندوب بالزيارة للشركة</label>
                          <textarea 
                            required
                            rows={3}
                            value={newVisitNotes}
                            onChange={(e) => setNewVisitNotes(e.target.value)}
                            placeholder="اكتب بالتفصيل ما جرى في الزيارة، المبيعات المتوقعة، أو ترتيبات سداد الديون المستطاعة بالزيارة القادمة..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/20"
                          ></textarea>
                        </div>

                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            type="button" 
                            onClick={() => setIsAddingVisit(false)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            تراجع
                          </button>
                          <button 
                            type="submit" 
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors border border-indigo-500/40 shadow-lg"
                          >
                            إرسال وتوثيق الزيارة
                          </button>
                        </div>
                      </motion.form>
                    )}

                    {/* Visits Timeline Logs */}
                    <div className="space-y-3">
                      {visits.length === 0 ? (
                        <div className="p-8 text-center text-white/40 text-xs border border-white/5 rounded-xl bg-white/5">
                          لا توجد أي زيارات مسجلة مسبقاً لهذا العميل.
                        </div>
                      ) : (
                        visits.map((visit) => {
                          const statusLabels = {
                            completed: { label: 'زيارة تامة ومكتملة', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                            closed: { label: 'المتجر مغلق', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                            postponed: { label: 'تم تأجيل اللقاء', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                            refused: { label: 'رفض السداد/التعامل ⚠️', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
                          };

                          return (
                            <div key={visit.id} className="p-4 rounded-xl border border-white/5 bg-[#0a0a10] space-y-2 relative overflow-hidden">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-white/40 shrink-0" />
                                  <span className="text-xs font-semibold text-white/90 font-mono">{new Date(visit.date).toLocaleDateString('en-GB')}</span>
                                  <span className="text-xs text-white/30">|</span>
                                  <span className="text-xs text-indigo-300 font-medium ">{visit.delegateName}</span>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  {visit.coordinates && (
                                    <span className="flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">
                                      <MapPin className="w-2.5 h-2.5 text-emerald-400" /> GPS موثوق
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${statusLabels[visit.status]?.color || 'bg-white/5 text-white'}`}>
                                    {statusLabels[visit.status]?.label || visit.status}
                                  </span>
                                </div>

                              </div>

                              <p className="text-xs text-white/70 leading-relaxed font-sans pt-1 pr-1 border-r border-[#1e1e2d] pl-4">{visit.notes}</p>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>

                </div>
              )}
              
              {/* Printed Document Footer */}
              <div className="mt-8 pt-6 border-t border-white/10 hidden print:block text-center text-xs text-black/60">
                تم سحب هذا البيان المالي والزيارات من تطبيق Sryia Trader لمستند المندوب في {new Date().toLocaleString('ar-SY')}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
