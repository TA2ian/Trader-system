import React from "react";

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
}

export function QuickAction({ icon, title, subtitle, onClick }: QuickActionProps) {
  return (
    <button 
      onClick={onClick}
      className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all hover:border-white/20 group text-right flex items-center justify-between active:scale-95"
    >
      <div className="flex flex-col">
        <span className="block text-[9px] text-white/40 mb-0.5 uppercase tracking-tighter group-hover:text-white/60">{subtitle}</span>
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="p-1.5 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-4 h-4" })}
      </div>
    </button>
  );
}
