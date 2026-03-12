import React, { useRef, useState } from 'react';

export default function ShareModal({ results, conn, grade, t, onClose }) {
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const shareText = `${t.shareTitle}\n⬇ ${t.download}: ${results.dl} ${t.mbps}\n⬆ ${t.upload}: ${results.ul} ${t.mbps}\n🏓 ${t.ping}: ${results.ping} ${t.ms}\n📊 ${t.grade}: ${grade.grade}\n🌐 ${t.isp}: ${conn.isp}\n\nTested with SpeedPulse — speedpulse.dev`;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function downloadImage() {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#07080c', scale: 2 });
      const link = document.createElement('a');
      link.download = 'speedpulse-results.png';
      link.href = canvas.toDataURL();
      link.click();
    } catch (e) { console.log('Image export failed:', e); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-sp-card border border-sp-border rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-sp-t3 hover:text-sp-t1 transition-colors text-xl">✕</button>
        <h3 className="text-lg font-bold mb-6">{t.shareResults}</h3>

        {/* Result card preview */}
        <div ref={cardRef} className="bg-[#0a0c14] rounded-xl p-6 mb-6 border border-sp-border">
          <div className="text-center mb-4">
            <div className="font-bold text-lg">Speed<span className="text-cyan">Pulse</span></div>
            <div className="text-sp-t3 text-xs">{conn.isp}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-[0.65rem] uppercase text-sp-t3 tracking-wider">{t.download}</div>
              <div className="font-mono text-2xl font-bold text-cyan">{results.dl}</div>
              <div className="text-[0.65rem] text-sp-t3">{t.mbps}</div>
            </div>
            <div className="text-center">
              <div className="text-[0.65rem] uppercase text-sp-t3 tracking-wider">{t.upload}</div>
              <div className="font-mono text-2xl font-bold text-mag">{results.ul}</div>
              <div className="text-[0.65rem] text-sp-t3">{t.mbps}</div>
            </div>
            <div className="text-center">
              <div className="text-[0.65rem] uppercase text-sp-t3 tracking-wider">{t.ping}</div>
              <div className="font-mono text-2xl font-bold text-grn">{results.ping}</div>
              <div className="text-[0.65rem] text-sp-t3">{t.ms}</div>
            </div>
            <div className="text-center">
              <div className="text-[0.65rem] uppercase text-sp-t3 tracking-wider">{t.grade}</div>
              <div className="font-mono text-2xl font-bold" style={{ color: grade.color }}>{grade.grade}</div>
              <div className="text-[0.65rem] text-sp-t3">{t[grade.stabilityKey]}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={copyText}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-cyan/20 text-cyan border border-cyan/20 hover:bg-cyan/30 transition-colors">
            {copied ? '✓ ' + t.copied : '📋 Copy Text'}
          </button>
          <button onClick={downloadImage}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-mag/20 text-mag border border-mag/20 hover:bg-mag/30 transition-colors">
            📸 {t.downloadImage}
          </button>
        </div>
      </div>
    </div>
  );
}
