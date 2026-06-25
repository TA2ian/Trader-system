import React from "react";
import { User, MapPin, Phone, CreditCard, Settings2 } from "lucide-react";
import { Customer } from "../types";

interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
  onOpenStatement?: (customer: Customer) => void;
  onOpenEdit?: (customer: Customer) => void;
  key?: React.Key;
}

export function CustomerCard({ customer, onClick, onOpenStatement, onOpenEdit }: CustomerCardProps) {
  return (
    <div 
      onClick={onClick}
      className="p-3 frosted-glass rounded-xl hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-1.5 items-center">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <User className="w-4 h-4" />
          </div>
          {onOpenEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenEdit(customer);
              }}
              className="p-1 px-1.5 bg-white/5 hover:bg-[#1a1b2e] hover:text-indigo-400 rounded-lg text-white/30 transition-all border border-white/5 active:scale-90"
              title="تعديل حساب العميل والسقف الائتماني"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-right flex-1 min-w-0 pr-2">
          <h4 className="font-bold text-xs text-white truncate">{customer.name}</h4>
          <div className="flex items-center justify-end gap-1 text-[9px] text-white/40 mt-0.5">
            <span>{customer.region}</span>
            <MapPin className="w-2.5 h-2.5 text-white/30" />
          </div>
        </div>
      </div>
      
      <div className="space-y-1.5 text-right mt-2 pb-1">
        <div className="flex justify-between items-center text-[10px] bg-white/[0.02] p-2 rounded-lg border border-white/5">
          <span className="text-emerald-400 font-mono font-black">{(customer.balance_usd || 0).toLocaleString()}$</span>
          <span className="text-white/40 font-bold">الرصيد المستحق</span>
        </div>
        
        {/* Visual progress mapping limit ratio */}
        <div className="flex justify-between items-center text-[8px] text-white/30 px-1 pt-0.5">
          <span>السقف الائتماني: <strong className="font-mono text-white/45">{customer.credit_limit ? `${customer.credit_limit.toLocaleString()}$` : 'غير محدد'}</strong></span>
          {customer.credit_limit ? (
            <span>مستعمل: {Math.min(100, Math.round((Math.abs(customer.balance_usd || 0) / customer.credit_limit) * 100))}%</span>
          ) : null}
        </div>
        {customer.credit_limit ? (
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                (Math.abs(customer.balance_usd || 0) / customer.credit_limit) >= 0.9 ? 'bg-red-500' : 'bg-indigo-500/60'
              }`}
              style={{ width: `${Math.min(100, (Math.abs(customer.balance_usd || 0) / customer.credit_limit) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-3 pt-2 border-t border-white/5 flex gap-1.5" onClick={e => e.stopPropagation()}>
        <a 
          href={`tel:${customer.phone}`}
          className="flex-1 py-1 h-7 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] transition-colors flex items-center justify-center gap-1 text-white/70"
        >
          <Phone className="w-2.5 h-2.5 text-emerald-400" /> {customer.phone ? "اتصال" : "بدون هاتف"}
        </a>
        <button 
          onClick={() => onOpenStatement?.(customer)}
          className="flex-1 py-1 h-7 bg-indigo-500/20 text-indigo-300 rounded-lg text-[9px] transition-colors flex items-center justify-center gap-1 hover:bg-indigo-500/30 font-black"
        >
          <CreditCard className="w-2.5 h-2.5" /> كشف حساب
        </button>
      </div>
    </div>
  );
}
