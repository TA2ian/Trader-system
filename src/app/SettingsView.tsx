import React, { useState, useRef, useEffect } from "react";
import { Settings, Database, Building, Lock, Upload, Download, Camera, X, Save, Sliders, Cloud, LogOut, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { customerService } from "../services/customerService";
import { debtService } from "../services/debtService";
import { inventoryService } from "../services/inventoryService";
import { backupService } from "../services/backupService";
import { useAuth } from "../context/AuthContext";
import { Modal } from "../components/Modal";
import { db } from "../lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

export function SettingsView() {
  const { user, logout, isOffline } = useAuth();

  const [successMsg, setSuccessMsg] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  
  const [exportPassword, setExportPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState("");

  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('company_profile') || '{"name": "اسم الشركة", "desc": "", "taxId": "", "logo": "", "debtLimit": 5000}'));
  const [exchangeRates, setExchangeRates] = useState(() => JSON.parse(localStorage.getItem('exchange_rates') || '{"USD": 1, "SAR": 3.75}'));
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('company_profile', JSON.stringify(profile));
    localStorage.setItem('exchange_rates', JSON.stringify(exchangeRates));
  }, [profile, exchangeRates]);

  const handleExportJSON = () => {
    if (!exportPassword) {
        setPasswordError("يرجى إدخال كلمة مرور لتشفير النسخة الاحتياطية.");
        return;
    }
    setPasswordError("");
    const data = {
        customers: customerService.getLocalCustomers(),
        debts: debtService.getLocalDebts(),
        inventory: inventoryService.getLocalItems(),
        profile
    };
    backupService.encryptAndExport(data, exportPassword);
    setSuccessMsg('تم تصدير النسخة الاحتياطية المشفرة بنجاح.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const password = prompt("يرجى إدخال كلمة المرور المستخدمة لتشفير ملف النسخة الاحتياطية:");
    if (!password) {
        setImportStatus('error');
        setImportMessage('يجب إدخال كلمة مرور للاستيراد.');
        return;
    }

    setImportStatus('importing');
    setImportMessage('عملية الاستعادة قيد التقدم...');

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = backupService.decryptAndImport(event.target?.result as string, password);
            
            localStorage.setItem('local_customers', JSON.stringify(data.customers));
            localStorage.setItem('local_debts', JSON.stringify(data.debts));
            localStorage.setItem('local_inventory', JSON.stringify(data.inventory));
            localStorage.setItem('company_profile', JSON.stringify(data.profile));
            setProfile(data.profile);
            
            setImportStatus('success');
            setImportMessage('تم استيراد البيانات بنجاح. يرجى إعادة تحميل الصفحة.');
            setTimeout(() => {
                setImportStatus('idle');
                setImportMessage('');
            }, 5000);
        } catch (err) {
            setImportStatus('error');
            setImportMessage('فشل استيراد البيانات - كلمة مرور خاطئة أو ملف تالف');
        }
    };
    reader.readAsText(file);
  };

  const handleCloudBackup = async () => {
    if (!confirm("هل أنت متأكد من أخذ نسخة احتياطية سحابية لجميع البيانات؟")) return;
    try {
        const data = {
            customers: customerService.getLocalCustomers(),
            debts: debtService.getLocalDebts(),
            inventory: inventoryService.getLocalItems(),
            profile
        };
        await backupService.createCloudSnapshot(data);
        setSuccessMsg('تم أخذ نسخة احتياطية سحابية بنجاح.');
        setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
        alert('فشل أخذ النسخة السحابية.');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
          setProfile(p => ({...p, logo: reader.result as string}));
      }
      reader.readAsDataURL(file);
  }

  return (
    <div className="p-3 md:p-6 flex flex-col gap-6">
      <header className="text-right flex items-center justify-between">
        <div className={`flex items-center gap-2 text-xs font-bold ${!isOffline ? 'text-emerald-400' : 'text-red-400'}`}>
            {!isOffline ? 'متصل بالسحابة' : 'غير متصل (Offline)'}
            <div className={`w-2 h-2 rounded-full ${!isOffline ? 'bg-emerald-400' : 'bg-red-400'}`} />
        </div>
        <h1 className="text-2xl font-black text-white flex items-center justify-end gap-2.5">
          الإعدادات
          <Settings className="w-6 h-6 text-white/20" />
        </h1>
      </header>

      {successMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-2xl text-right">
          {successMsg}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={() => setIsProfileModalOpen(true)} className="frosted-glass border border-white/5 p-6 rounded-3xl text-right flex items-center justify-end gap-4 hover:bg-white/5 transition-all">
            <span className="text-white font-bold">ملف الشركة</span>
            <Building className="w-6 h-6 text-emerald-400" />
        </button>
        <button onClick={() => setIsSecurityModalOpen(true)} className="frosted-glass border border-white/5 p-6 rounded-3xl text-right flex items-center justify-end gap-4 hover:bg-white/5 transition-all">
            <span className="text-white font-bold">أمان الحساب</span>
            <Lock className="w-6 h-6 text-indigo-400" />
        </button>
        <button onClick={() => setIsDataModalOpen(true)} className="frosted-glass border border-white/5 p-6 rounded-3xl text-right flex items-center justify-end gap-4 hover:bg-white/5 transition-all">
            <span className="text-white font-bold">البيانات والنسخ الاحتياطي</span>
            <Database className="w-6 h-6 text-amber-400" />
        </button>
        <button onClick={() => setIsRatesModalOpen(true)} className="frosted-glass border border-white/5 p-6 rounded-3xl text-right flex items-center justify-end gap-4 hover:bg-white/5 transition-all">
            <span className="text-white font-bold">أسعار الصرف</span>
            <Sliders className="w-6 h-6 text-purple-400" />
        </button>
      </div>

      <AnimatePresence>
        {isProfileModalOpen && (
          <Modal key="profile" isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)}>
            <div className="frosted-glass w-full max-w-lg rounded-3xl p-6 text-right">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setIsProfileModalOpen(false)}><X className="text-white/50" /></button>
                    <h2 className="text-xl font-bold text-white">تعديل ملف الشركة</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-end items-center gap-4">
                        <button onClick={() => logoInputRef.current?.click()} className="p-4 rounded-full bg-white/5 hover:bg-white/10">
                            <Camera className="text-white" />
                        </button>
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        <label className="text-white">تغيير الشعار</label>
                    </div>
                    <input type="text" value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))} placeholder="اسم الشركة" className="w-full bg-white/5 p-3 rounded-lg border border-white/10 text-white text-sm text-right" />
                    <textarea value={profile.desc} onChange={e => setProfile(p => ({...p, desc: e.target.value}))} placeholder="وصف الشركة" className="w-full bg-white/5 p-3 rounded-lg border border-white/10 text-white text-sm h-24 text-right" />
                    <input type="text" value={profile.taxId} onChange={e => setProfile(p => ({...p, taxId: e.target.value}))} placeholder="الرقم الضريبي" className="w-full bg-white/5 p-3 rounded-lg border border-white/10 text-white text-sm text-right" />
                    <input type="number" value={profile.debtLimit || 5000} onChange={e => setProfile(p => ({...p, debtLimit: Number(e.target.value)}))} placeholder="سقف الدين (USD)" className="w-full bg-white/5 p-3 rounded-lg border border-white/10 text-white text-sm text-right" />
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="w-full mt-6 bg-emerald-500 text-white p-3 rounded-xl font-bold">حفظ</button>
            </div>
          </Modal>
        )}

        {isSecurityModalOpen && (
          <Modal key="security" isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)}>
            <div className="frosted-glass w-full max-w-lg rounded-3xl p-6 text-right">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setIsSecurityModalOpen(false)}><X className="text-white/50" /></button>
                    <h2 className="text-xl font-bold text-white">أمان الحساب</h2>
                </div>
                <div className="space-y-4">
                  <input type="text" placeholder="اسم المستخدم الجديد" className="w-full bg-white/5 p-3 rounded-lg border border-white/10 text-white text-sm text-right" />
                  <input type="password" placeholder="كلمة المرور الجديدة" className="w-full bg-white/5 p-3 rounded-lg border border-white/10 text-white text-sm text-right" />
                  <button className="flex items-center justify-center w-full gap-2 bg-indigo-500 text-white p-3 rounded-xl font-bold text-sm">
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                  </button>
                  <button onClick={logout} className="flex items-center justify-center w-full gap-2 bg-red-500/10 text-red-500 p-3 rounded-xl font-bold text-sm hover:bg-red-500/20">
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
                </div>
            </div>
          </Modal>
        )}

        {isDataModalOpen && (
          <Modal key="data" isOpen={isDataModalOpen} onClose={() => setIsDataModalOpen(false)}>
            <div className="frosted-glass w-full max-w-lg rounded-3xl p-6 text-right">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setIsDataModalOpen(false)}><X className="text-white/50" /></button>
                    <h2 className="text-xl font-bold text-white">إدارة البيانات</h2>
                </div>
                <div className="flex flex-col gap-4">
                    <input 
                      type="password" 
                      placeholder="كلمة مرور التشفير (مطلوبة)" 
                      value={exportPassword} 
                      onChange={(e) => {
                          setExportPassword(e.target.value);
                          if (passwordError) setPasswordError("");
                      }} 
                      className={`w-full bg-white/5 p-3 rounded-lg border ${passwordError ? 'border-red-500' : 'border-white/10'} text-white text-sm text-right`} 
                    />
                    {passwordError && <p className="text-red-400 text-xs text-right mt-1">{passwordError}</p>}
                    <button onClick={handleExportJSON} className="flex items-center justify-end gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-6 py-4 rounded-xl font-bold text-sm">
                        تصدير مشفر (JSON)
                        <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-end gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-6 py-4 rounded-xl font-bold text-sm">
                        استيراد مشفر (JSON)
                        <Upload className="w-4 h-4" />
                    </button>
                    {importMessage && (
                        <div className={`p-3 rounded-lg text-xs font-bold text-right ${importStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400' : importStatus === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {importMessage}
                        </div>
                    )}
                    <button onClick={handleCloudBackup} className="flex items-center justify-end gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-6 py-4 rounded-xl font-bold text-sm">
                        نسخ احتياطي سحابي
                        <Cloud className="w-4 h-4" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportJSON} className="hidden" accept=".json,.enc,.txt" />
                    <button onClick={() => { if(confirm("هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.")) { localStorage.clear(); window.location.reload(); } }} className="flex items-center justify-end gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-4 rounded-xl font-bold text-sm hover:bg-red-500/20">
                      حذف جميع بيانات التطبيق
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
            </div>
          </Modal>
        )}

        {isRatesModalOpen && (
          <Modal key="rates" isOpen={isRatesModalOpen} onClose={() => setIsRatesModalOpen(false)}>
            <div className="frosted-glass w-full max-w-lg rounded-3xl p-6 text-right">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setIsRatesModalOpen(false)}><X className="text-white/50" /></button>
                    <h2 className="text-xl font-bold text-white">إدارة أسعار الصرف</h2>
                </div>
                <div className="space-y-4">
                  {Object.entries(exchangeRates).map(([currency, rate]) => (
                      <div key={currency} className="flex gap-4">
                          <input type="number" value={rate as number} onChange={e => setExchangeRates(r => ({...r, [currency]: Number(e.target.value)}))} className="flex-1 bg-white/5 p-3 rounded-lg border border-white/10 text-white text-sm text-right" />
                          <span className="text-white font-bold w-16 text-right py-3">{currency}</span>
                      </div>
                  ))}
                </div>
                <button onClick={() => setIsRatesModalOpen(false)} className="w-full mt-6 bg-purple-500 text-white p-3 rounded-xl font-bold">حفظ</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
}
