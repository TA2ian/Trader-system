import React from "react";

interface TransactionItemProps {
  title: string;
  amount: string;
  time: string;
  type: 'in' | 'out';
  key?: React.Key;
}

export function TransactionItem({ title, amount, time, type }: TransactionItemProps) {
  const formattedTime = React.useMemo(() => {
    if (!time) return "";
    try {
      return new Date(time).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(time);
    }
  }, [time]);
  return (
    <div className="flex flex-row gap-3 group cursor-default text-right">
      <div className={`w-0.5 h-6 rounded-full transition-all group-hover:h-8 ${type === 'in' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`}></div>
      <div className="flex-1">
        <p className="text-[11px] font-medium group-hover:text-emerald-300 transition-colors uppercase leading-tight">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[9px] text-white/30">{formattedTime}</p>
          <span className={`text-[10px] font-bold ${type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>{amount}</span>
        </div>
      </div>
    </div>
  );
}
