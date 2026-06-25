import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Package,
  History, 
  Bot, 
  Settings,
  BarChart3,
  LogOut,
  Wifi,
  WifiOff,
  User,
  Crown,
  Database,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ViewType } from "../types";
import { useAuth } from "../context/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const { 
    user, 
    isOffline, 
    setOffline, 
    logout, 
    login, 
    currentRates, 
    setRates, 
    setCompanyId, 
    setRole 
  } = useAuth();

  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [activeCompanyInput, setActiveCompanyInput] = useState(user?.company_id || '1');
  const [seeding, setSeeding] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Quick rate controls
  const [damascusRate, setDamascusRate] = useState(currentRates?.damascus || 15100);
  const [aleppoRate, setAleppoRate] = useState(currentRates?.aleppo || 15200);
  const [idlibRate, setIdlibRate] = useState(currentRates?.idlib || 15500);

  // Sync state with rates from context
  useEffect(() => {
    if (currentRates) {
      setDamascusRate(currentRates.damascus);
      setAleppoRate(currentRates.aleppo);
      setIdlibRate(currentRates.idlib);
    }
  }, [currentRates]);

  // Sync activeCompanyInput when user session updates
  useEffect(() => {
    if (user) {
      setActiveCompanyInput(user.company_id);
    }
  }, [user]);

  const isDeveloperUser = user?.email?.trim().toLowerCase() === 'ma7m0ud.love1997@gmail.com';

  const handleUpdateRates = () => {
    setRates({
      damascus: Number(damascusRate),
      aleppo: Number(aleppoRate),
      idlib: Number(idlibRate)
    });
    showToast('تم تحديث أسعار الصرف السورية محلياً بنجاح!', 'success');
  };

  const handleApplyCompany = () => {
    setCompanyId(activeCompanyInput);
    showToast(`تم تحويل النظام لمحاكاة التاجر / الشركة ذات الكود: ${activeCompanyInput}`, 'info');
    window.dispatchEvent(new Event('app-data-cleared')); // Trigger hook refresh
  };

  const handleSeedDemographicData = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      // Clear current local structures first for clean testing
      localStorage.removeItem('local_customers');
      localStorage.removeItem('local_debts');
      localStorage.removeItem('local_inventory');

      // Seed Syrian customers across diverse geographies ( Aleppo / Damascus / Idlib / Homs )
      const syrianCustomers = [
        {
          id: 'c_damascus_1',
          company_id: user.company_id,
          name: 'مجموعة الميدان الاستهلاكية (أبو أحمد)',
          region: 'دمشق',
          address: 'دمشق - السوق القديم - مدخل سوق مدحت باشا',
          phone: '0933112233',
          credit_limit: 10000,
          balance_usd: 8500 // In danger zone! (85% usage)
        },
        {
          id: 'c_aleppo_1',
          company_id: user.company_id,
          name: 'شركة الشهباء لمواد البناء (الحاج بكري)',
          region: 'حلب',
          address: 'حلب - العرقوب الصناعية - تقاطع المشتل',
          phone: '0944998877',
          credit_limit: 25000,
          balance_usd: 3400 // Safe zone
        },
        {
          id: 'c_idlib_1',
          company_id: user.company_id,
          name: 'بصمة الشام للمنظفات (أبو الفوز)',
          region: 'إدلب',
          address: 'إدلب الحرّة - ساحة الساعة الرئيسية',
          phone: '0991443322',
          credit_limit: 6000,
          balance_usd: 6800 // Critical Alert! Over the credit limit (113% usage)
        },
        {
          id: 'c_homs_1',
          company_id: user.company_id,
          name: 'أولاد الرواس للأقمشة (طريف الرواس)',
          region: 'حمص',
          address: 'حمص - حي الحولاني - خلف جامع خالد بن الوليد',
          phone: '0955667788',
          credit_limit: 15000,
          balance_usd: 0 // Clean account - No current debts
        }
      ];

      // Seed debt items with realistic aging days (0-30, 31-60, 60+ days) and SYP conversions
      const now = new Date();
      const createDateAgo = (days: number) => {
        const d = new Date();
        d.setDate(now.getDate() - days);
        return d.toISOString();
      };

      const groupDebts = [
        // Group 1: Damascus Client (Aging 0-30 days & payments)
        {
          id: 'd_dama_1',
          company_id: user.company_id,
          clientName: 'مجموعة الميدان الاستهلاكية (أبو أحمد)',
          customer_id: 'c_damascus_1',
          amount: 5000,
          notes: 'فاتورة سلع غذائية مستوردة (شحنة أولى)',
          timestamp: createDateAgo(10), // 10 days ago
          type: 'out' as const,
          original_currency: 'USD' as const,
          original_amount: 5000,
          exchange_rate: 15100
        },
        {
          id: 'd_dama_2',
          company_id: user.company_id,
          clientName: 'مجموعة الميدان الاستهلاكية (أبو أحمد)',
          customer_id: 'c_damascus_1',
          amount: 4500,
          notes: 'شراء زيوت وتونة نخب أول بالآجل',
          timestamp: createDateAgo(25), // 25 days ago
          type: 'out' as const,
          original_currency: 'TRY' as const,
          original_amount: 150000,
          exchange_rate: 15100
        },
        {
          id: 'd_dama_3',
          company_id: user.company_id,
          clientName: 'مجموعة الميدان الاستهلاكية (أبو أحمد)',
          customer_id: 'c_damascus_1',
          amount: -1000, // payment received
          notes: 'دفعة نقدية مسلَّمة للمندوب بدمشق',
          timestamp: createDateAgo(5),
          type: 'in' as const,
          original_currency: 'USD' as const,
          original_amount: 1000,
          exchange_rate: 15100
        },

        // Group 2: Aleppo Client (Aging 31-60 days)
        {
          id: 'd_alep_1',
          company_id: user.company_id,
          clientName: 'شركة الشهباء لمواد البناء (الحاج بكري)',
          customer_id: 'c_aleppo_1',
          amount: 3400,
          notes: 'توريد حديد واسمنت وطوب للوجبة د',
          timestamp: createDateAgo(45), // 45 days ago -> tests 31-60 aging bucket
          type: 'out' as const,
          original_currency: 'USD' as const,
          original_amount: 3400,
          exchange_rate: 15200
        },

        // Group 3: Idlib Client (Critical Aging 60+ days)
        {
          id: 'd_idlb_1',
          company_id: user.company_id,
          clientName: 'بصمة الشام للمنظفات (أبو الفوز)',
          customer_id: 'c_idlib_1',
          amount: 3100,
          notes: 'فاتورة شامبو وصابون ديتول مستورد من تركيا',
          timestamp: createDateAgo(75), // 75 days ago -> tests 61+ critical aging bucket
          type: 'out' as const,
          original_currency: 'TRY' as const,
          original_amount: 105000,
          exchange_rate: 15500
        },
        {
          id: 'd_idlb_2',
          company_id: user.company_id,
          clientName: 'بصمة الشام للمنظفات (أبو الفوز)',
          customer_id: 'c_idlib_1',
          amount: 3700,
          notes: 'مواد تنظيف مساحيق ومعطرات جو فرنسية',
          timestamp: createDateAgo(90), // 90 days ago -> tests 61+ critical aging bucket
          type: 'out' as const,
          original_currency: 'USD' as const,
          original_amount: 3700,
          exchange_rate: 15500
        }
      ];

      // Inventory mock items
      const groupProducts = [
        {
          id: 'p1',
          company_id: user.company_id,
          name: 'زيت دوار الشمس سعة 5 لتر',
          quantity: 240,
          unitPriceUSD: 7.5
        },
        {
          id: 'p2',
          company_id: user.company_id,
          name: 'صابون الغار الحلبي الأصيل - نخب أول',
          quantity: 1100,
          unitPriceUSD: 0.8
        },
        {
          id: 'p3',
          company_id: user.company_id,
          name: 'شامبو أطفال عبوة اقتصادية (بيروت)',
          quantity: 350,
          unitPriceUSD: 2.2
        },
        {
          id: 'p4',
          company_id: user.company_id,
          name: 'منظف أواني منزلي عملاق 10 لتر',
          quantity: 180,
          unitPriceUSD: 4.1
        }
      ];

      // Save seeded data to local storage for local engine
      localStorage.setItem('local_customers', JSON.stringify(syrianCustomers));
      localStorage.setItem('local_debts', JSON.stringify(groupDebts));
      localStorage.setItem('local_inventory', JSON.stringify(groupProducts));

      // Mock Local physical visits mapping for Idlib and Aleppo clients
      const mockVisitsIdlib = [
        {
          id: 'v_idlb_1',
          date: createDateAgo(3).split('T')[0],
          delegateName: 'المندوب: رامي السباعي',
          status: 'completed',
          notes: 'التقيت بأبو الفوز، معتذر عن الدفع حالياً بسبب موسم القطاف وركود السوق ولكنه يعد بسداد 2000$ الأسبوع القادم.',
          coordinates: '35.9329, 36.6341' // Idlib clocktower coordinates
        },
        {
          id: 'v_idlb_2',
          date: createDateAgo(14).split('T')[0],
          delegateName: 'المندوب: رامي السباعي',
          status: 'refused',
          notes: 'العميل رفض المقابلة بحجة مرضه وضغوط الديون المتراكمة من تجار أخرين.',
          coordinates: '35.9329, 36.6341'
        }
      ];
      localStorage.setItem('customer_visits_c_idlib_1', JSON.stringify(mockVisitsIdlib));
      localStorage.setItem('customer_geo_c_idlib_1', '35.9329, 36.6341'); // Preserved GPS pin for Georouting

      const mockVisitsDamascus = [
        {
          id: 'v_dama_1',
          date: createDateAgo(2).split('T')[0],
          delegateName: 'المهندس الميداني: فايز الصباغ',
          status: 'completed',
          notes: 'سداد مبلغ 1000$ نقداً وتقييدها بالدفتر اليومي. المتجر نشط ويبدو مسروراً بالعرض الأخير.',
          coordinates: '33.5138, 36.2913' // Damascus midan coordinates
        }
      ];
      localStorage.setItem('customer_visits_c_damascus_1', JSON.stringify(mockVisitsDamascus));
      localStorage.setItem('customer_geo_c_damascus_1', '33.5138, 36.2913');

      showToast('تم ضخ مصفوفة بيانات التجار السوريين المتكاملة بنجاح! تم توزيع مستويات تقادم الديون والربط الجغرافي للمندوبين بنجاح ✔️', 'success');
      window.dispatchEvent(new Event('app-data-cleared')); // Force refresh hooks
    } catch (e) {
      console.error(e);
      showToast('خطأ في توليد مصفوفة الماكيت التجريبية!', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'customers', label: 'العملاء', icon: <Users className="w-5 h-5" /> },
    { id: 'inventory', label: 'المخزون', icon: <Package className="w-5 h-5" /> },
    { id: 'sales-analytics', label: 'المبيعات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'audit-log', label: 'سجل العمليات', icon: <History className="w-5 h-5" /> },
    { id: 'ai', label: 'الذكاء الاصطناعي', icon: <Bot className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
  ] as const;

  const handleLogoutToggle = () => {
    if (user) {
      logout();
      showToast("تم تسجيل الخروج بنجاح.", 'info');
    } else {
      login('ma7m0ud.love1997@gmail.com', 'محمود المطور الأقدم');
      showToast("مرحباً بعودتك! تم تسجيل الدخول مجدداً بحساب المطور الأقدم محمود.", 'success');
      window.dispatchEvent(new Event('app-data-cleared'));
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-dark text-white font-sans ring-1 ring-white/5">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 border-ie border-white/5 flex-col p-5 frosted-glass z-20 shrink-0">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3 transition-all hover:scale-[1.02] cursor-pointer">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-bold rotate-12 transition-transform">S</div>
            <span className="font-bold text-base tracking-tighter text-emerald-400">SURYA ERP</span>
          </div>
          
          {/* Active Network Status Indicator */}
          <div className="flex items-center gap-1.5" title={isOffline ? "وضع أوفلاين المطور (محاكاة)" : "متصل أونلاين"}>
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'}`}></span>
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
        </div>

        {/* Developer / User Identity Card */}
        {user ? (
          <div className="mb-5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2 relative overflow-hidden group">
            {user.role === 'developer' && (
              <div className="absolute -top-1.5 -left-1.5 w-10 h-10 bg-indigo-500/10 rounded-full blur-md"></div>
            )}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                {user.role === 'developer' ? <Crown className="w-4 h-4 text-indigo-400" /> : <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <h4 className="text-xs font-black text-white/95 truncate leading-snug">{user.name}</h4>
                <span className="text-[9px] text-white/40 truncate block font-mono mt-0.5">{user.email}</span>
              </div>
            </div>

            <div className="mt-1.5 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-white/50 relative z-10">
              <span>الرتبة: <strong className="text-emerald-400 font-bold">{user.role === 'developer' ? 'مطور أقدم' : user.role === 'owner' ? 'مالك الشركة' : 'مندوب ميداني'}</strong></span>
              <span>التاجر ID: <strong className="text-indigo-400 font-mono font-bold">{user.company_id}</strong></span>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleLogoutToggle}
            className="mb-5 p-3.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 flex items-center justify-center text-xs font-bold gap-2 transition-all leading-relaxed text-right"
          >
            <Crown className="w-4 h-4" />
            أنقر لتسجيل دخول المطور الـ Senior
          </button>
        )}

        <nav className="space-y-0.5 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ViewType)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-right ${
                currentView === item.id 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <span className={`transition-transform duration-300 ${currentView === item.id ? "scale-110" : ""}`}>
                {item.icon}
              </span>
              <span className="flex-1 font-medium text-xs">{item.label}</span>
              {currentView === item.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="w-1.5 h-1.5 bg-emerald-400 rounded-full" 
                />
              )}
            </button>
          ))}
        </nav>

        <div className="pt-4 mt-4 border-t border-white/5">
          <button 
            onClick={handleLogoutToggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all text-right group"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span className="flex-1 font-medium text-xs">{user ? "تسجيل الخروج" : "تسجيل الدخول"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto flex flex-col">
        {/* Top Bar - Company Info & Status */}
        <div className="w-full border-b border-white/5 bg-[#0a0a14]/60 backdrop-blur-md z-40">
          <div className="flex items-center justify-between px-4 py-1.5 gap-3">
              <div className="flex items-center gap-2">
                 <img src={JSON.parse(localStorage.getItem('company_profile') || '{"logo": ""}').logo || "/logo.png"} alt="شعار" className="w-6 h-6 rounded-full object-cover" />
                 <span className="text-sm font-bold text-white">{JSON.parse(localStorage.getItem('company_profile') || '{"name": "شركة غير معرفة"}').name}</span>
              </div>
              
              {/* Active Network Status Badge */}
              <button 
                onClick={() => {
                  const newOffline = !isOffline;
                  setOffline(newOffline);
                  showToast(
                    newOffline 
                      ? 'تم قطع اتصال الإنترنت للسيستم! جميع العمليات ستعمل بدون مشاكل بالذاكرة المحلية (أوفلاين-فورست).' 
                      : 'تم الاتصال بالإنترنت! جاري ترحيل ومعالجة الذمم المعلقة والزيارات في الخلفية تلقائياً...',
                    'info'
                  );
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] transition-all cursor-pointer ${
                  isOffline 
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-400 hover:bg-amber-500/25' 
                    : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25'
                }`}
                title="اضغط لتبديل وضع الاتصال بالإنترنت"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                <span className="font-semibold">{isOffline ? 'أوفلاين' : 'متصل'}</span>
              </button>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden gpu-accelerated">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px] gpu-accelerated"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 rounded-full blur-[120px] gpu-accelerated"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-6xl mx-auto pb-28 md:pb-6 gpu-accelerated px-4 md:px-0 flex-1 pt-6">
           {children}
        </div>

        {/* Mobile Nav - Fixed Bottom */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 z-50 bg-gradient-to-t from-bg-dark via-bg-dark/80 to-transparent pt-6">
          <nav className="h-14 frosted-glass border border-white/10 rounded-2xl flex items-center justify-around px-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ViewType)}
                className={`p-2.5 rounded-xl transition-all ${
                  currentView === item.id 
                    ? "bg-emerald-500/10 text-emerald-400 scale-110" 
                    : "text-white/30"
                }`}
              >
                {item.icon}
              </button>
            ))}
          </nav>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4"
          >
            <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center justify-between gap-3 text-right dir-rtl ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse' 
                : toast.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            }`}>
              <div className="flex-1 text-xs font-bold leading-relaxed">{toast.message}</div>
              <button 
                onClick={() => setToast(null)}
                className="text-[10px] opacity-40 hover:opacity-100 px-1.5 py-0.5 rounded-md hover:bg-white/5 transition-all font-sans font-normal"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
