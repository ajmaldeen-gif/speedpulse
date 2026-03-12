import React from 'react';

const COLORS = { download: ['#00e5ff', '#80f0ff'], upload: ['#ff006e', '#ff6eb4'], ping: ['#00ff88', '#80ffbb'] };
const MAX_ARC = 566;

export default function Gauge({ value = 0, max = 100, type = 'download', label = 'Ready', unit = 'Mbps' }) {
  const pct = Math.min(value / Math.max(max, 1), 1);
  const offset = 754 - MAX_ARC * pct;
  const [c1, c2] = COLORS[type] || COLORS.download;
  const gradId = `gauge-grad-${type}`;
  const displayVal = (typeof value === 'number' && isFinite(value) && value > 0) ? value.toFixed(1) : '0.00';

  return (
    <div className="relative w-[340px] h-[340px] flex items-center justify-center max-w-[90vw] aspect-square">
      <div className="absolute inset-0 rounded-full border-2 border-sp-border" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)' }} />
      <svg viewBox="0 0 260 260" className="absolute inset-0" style={{ transform: 'rotate(-135deg)' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <circle cx="130" cy="130" r="120" fill="none" stroke="var(--sp-border)" strokeWidth="6" strokeLinecap="round" strokeDasharray="754" strokeDashoffset="188" />
        <circle cx="130" cy="130" r="120" fill="none" stroke={`url(#${gradId})`} strokeWidth="7" strokeLinecap="round" strokeDasharray="754" strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.3s ease-out', filter: `drop-shadow(0 0 12px ${c1})` }} />
      </svg>
      <div className="relative z-10 text-center">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-sp-t2 mb-1.5">{label}</div>
        <div className="font-mono text-[3.8rem] font-bold leading-none tracking-tight min-w-[160px]"
          style={{
            color: c1,
            textShadow: `0 0 40px ${c1}44`
          }}>
          {displayVal}
        </div>
        <div className="text-sm text-sp-t2 font-medium mt-1.5">{unit}</div>
      </div>
    </div>
  );
}
