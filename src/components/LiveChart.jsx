import React, { useRef, useEffect } from 'react';

const COLORS = { border: '#1a1e2e' };

export default function LiveChart({ dlData = [], ulData = [], pingData = [], title = 'Live Throughput Monitor', labels = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i + 15;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const datasets = [
      { data: dlData, color: '#00e5ff', glow: '#00e5ff44' },
      { data: ulData, color: '#ff006e', glow: '#ff006e44' },
      { data: pingData, color: '#00ff88', glow: '#00ff8844', scale: 2 },
    ];

    datasets.forEach(ds => {
      if (ds.data.length < 2) return;
      const maxVal = Math.max(...ds.data, 1);
      const sc = ds.scale || 1;
      const pts = ds.data.map((v, i) => ({
        x: (i / (ds.data.length - 1)) * w,
        y: h - 10 - ((v * sc) / maxVal) * (h - 30)
      }));

      // Glow fill
      ctx.beginPath(); ctx.moveTo(pts[0].x, h);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, h); ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, ds.glow); grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.fill();

      // Line
      ctx.beginPath(); ctx.strokeStyle = ds.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // End dot
      const last = pts[pts.length - 1];
      ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2); ctx.fillStyle = ds.color; ctx.fill();
    });
  }, [dlData, ulData, pingData]);

  return (
    <div className="bg-sp-card border border-sp-border rounded-2xl p-7 relative overflow-hidden">
      <div className="flex justify-between items-center mb-5">
        <div className="text-[0.95rem] font-bold">{title}</div>
        <div className="flex gap-5">
          {[
            [labels.download || 'Download', '#00e5ff'],
            [labels.upload || 'Upload', '#ff006e'],
            [labels.ping || 'Ping', '#00ff88']
          ].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1.5 text-[0.72rem] text-sp-t2 font-medium">
              <div className="w-2 h-2 rounded-sm" style={{ background: c }} />{l}
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-[200px] overflow-hidden">
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}
