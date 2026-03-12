import React from 'react';

export default function ResultCard({ icon, title, value, unit, color, dimColor, barPct = 0 }) {
  return (
    <div className="bg-sp-card border border-sp-border rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl group">
      <div className="absolute -top-px left-[20%] right-[20%] h-0.5 rounded-b opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: color, boxShadow: `0 0 20px ${color}` }} />
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4 text-lg" style={{ background: dimColor, color }}>
        {icon}
      </div>
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sp-t2 mb-2.5">{title}</div>
      <div className="font-mono text-[2rem] font-bold leading-none mb-1" style={{ color }}>{value}</div>
      <div className="text-xs text-sp-t2 font-medium">{unit}</div>
      <div className="mt-3.5 h-1 bg-sp-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(barPct, 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
      </div>
    </div>
  );
}
