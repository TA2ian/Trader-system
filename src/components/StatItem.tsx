import React from "react";
import { motion } from "framer-motion";

interface StatItemProps {
  label: string;
  value: string;
  percentage: number;
  color: 'emerald' | 'indigo' | 'amber' | 'rose';
}

export function StatItem({ label, value, percentage, color }: StatItemProps) {
  const colors = {
    emerald: 'bg-emerald-400',
    indigo: 'bg-indigo-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400'
  };

  return (
    <div className="p-2 bg-white/5 rounded-xl border border-white/5 transition-all hover:bg-white/10 group text-right">
      <div className="flex justify-between items-center text-[10px] mb-1.5">
        <span className="text-white/60 group-hover:text-white transition-colors">{label}</span>
        <span className={`${color === 'emerald' ? 'text-emerald-400' : color === 'indigo' ? 'text-indigo-400' : color === 'rose' ? 'text-rose-400' : 'text-amber-400'} font-bold`}>{value}</span>
      </div>
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${colors[color]}`}
        />
      </div>
    </div>
  );
}
