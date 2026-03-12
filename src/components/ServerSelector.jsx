import React from 'react';

const FLAGS = { auto: '🌐', us: '🇺🇸', eu: '🇪🇺', asia: '🌏', me: '🇰🇼' };

export default function ServerSelector({ servers, selected, onChange, t, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-sp-card border border-sp-border rounded-2xl p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-sp-t3 hover:text-sp-t1 transition-colors text-xl">✕</button>
        <h3 className="text-lg font-bold mb-2">{t.selectServer}</h3>
        <p className="text-sp-t3 text-sm mb-6">{t.serverLocation}</p>
        <div className="flex flex-col gap-2">
          {Object.entries(servers).map(([key, srv]) => (
            <button key={key}
              onClick={() => { onChange(key); onClose(); }}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                selected === key
                  ? 'border-cyan bg-cyan/10 text-cyan'
                  : 'border-sp-border hover:border-sp-t3 text-sp-t2 hover:text-sp-t1'
              }`}>
              <span className="text-xl">{FLAGS[key] || '🌐'}</span>
              <span className="font-medium text-sm">{key === 'auto' ? t.autoDetect : srv.name}</span>
              {selected === key && <span className="ml-auto text-cyan">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
