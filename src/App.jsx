import { useState, useEffect, useCallback } from 'react';
import { translations } from './i18n/translations';
import { detectISP, measurePing, measureDownload, measureUpload, calculateGrade, getServers } from './utils/engine';
import Gauge from './components/Gauge';
import ResultCard from './components/ResultCard';
import LiveChart from './components/LiveChart';
import ShareModal from './components/ShareModal';
import ServerSelector from './components/ServerSelector';

const STREAMS = 8;

export default function App() {
  // ═══ STATE ═══
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [testing, setTesting] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [phaseIdx, setPhaseIdx] = useState(-1);
  const [gaugeVal, setGaugeVal] = useState(0);
  const [gaugeMax, setGaugeMax] = useState(100);
  const [gaugeType, setGaugeType] = useState('download');
  const [gaugeLabel, setGaugeLabel] = useState('');
  const [gaugeUnit, setGaugeUnit] = useState('Mbps');
  const [results, setResults] = useState({ dl: '—', ul: '—', ping: '—', jitter: '—' });
  const [conn, setConn] = useState({ ip: '…', isp: '…', org: '—', city: '—', country: '', cc: '', tz: '—', as: '—' });
  const [grade, setGrade] = useState({ grade: '—', color: '#3d4560', stabilityKey: 'fair' });
  const [dlData, setDlData] = useState([]);
  const [ulData, setUlData] = useState([]);
  const [pingData, setPingData] = useState([]);
  const [history, setHistory] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [server, setServer] = useState('auto');

  const t = translations[lang];
  const servers = getServers();

  // ═══ THEME ═══
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // ═══ LANG / RTL ═══
  useEffect(() => {
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang;
  }, [lang, t.dir]);

  // ═══ ISP DETECTION ═══
  useEffect(() => {
    detectISP().then(info => {
      setConn({
        ip: info.ip, isp: info.isp || 'Unknown ISP', org: info.org || info.isp || '—',
        city: info.city, country: info.country, cc: info.cc,
        tz: info.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
        as: info.as || '—'
      });
    });
  }, []);

  // ═══ RUN TEST ═══
  const runTest = useCallback(async () => {
    if (testing) return;
    setTesting(true);
    setDlData([]); setUlData([]); setPingData([]);
    setResults({ dl: '—', ul: '—', ping: '—', jitter: '—' });
    setGrade({ grade: '—', color: '#3d4560', stabilityKey: 'fair' });
    let peak = 0;

    try {
      // PING
      setPhase('ping'); setPhaseIdx(0);
      setGaugeLabel(t.latency); setGaugeUnit(t.ms); setGaugeType('ping');
      const { ping, jitter, samples } = await measurePing(server, (val, all) => {
        const avg = all.reduce((a, b) => a + b, 0) / all.length;
        setGaugeVal(avg); setGaugeMax(200);
        setPingData([...all]);
      });
      const safePing = isFinite(ping) ? ping : 0;
      const safeJitter = isFinite(jitter) ? jitter : 0;
      setResults(r => ({ ...r, ping: safePing.toFixed(1), jitter: safeJitter.toFixed(1) }));
      await new Promise(r => setTimeout(r, 300));

      // DOWNLOAD
      setPhase('download'); setPhaseIdx(1);
      setGaugeLabel(t.download); setGaugeUnit(t.mbps); setGaugeType('download');
      peak = 0;
      const dl = await measureDownload(server, STREAMS, 14000, (speed, arr) => {
        if (isFinite(speed)) {
          peak = Math.max(peak, speed);
          setGaugeVal(speed); setGaugeMax(Math.max(peak * 1.15, 50));
          setDlData(arr);
        }
      });
      const safeDl = isFinite(dl) ? dl : 0;
      setResults(r => ({ ...r, dl: safeDl.toFixed(1) }));
      await new Promise(r => setTimeout(r, 300));

      // UPLOAD
      setPhase('upload'); setPhaseIdx(2);
      setGaugeLabel(t.upload); setGaugeUnit(t.mbps); setGaugeType('upload');
      peak = 0;
      const ul = await measureUpload(server, STREAMS, 12000, (speed, arr) => {
        if (isFinite(speed)) {
          peak = Math.max(peak, speed);
          setGaugeVal(speed); setGaugeMax(Math.max(peak * 1.15, 30));
          setUlData(arr);
        }
      });
      const safeUl = isFinite(ul) ? ul : 0;
      setResults(r => ({ ...r, ul: safeUl.toFixed(1) }));
      await new Promise(r => setTimeout(r, 200));

      // COMPLETE
      setPhase('done'); setPhaseIdx(3);
      setGaugeLabel(t.download); setGaugeUnit(t.mbps); setGaugeType('download');
      setGaugeVal(safeDl); setGaugeMax(Math.max(safeDl * 1.15, 50));

      const g = calculateGrade(safeDl, safeUl, safePing, safeJitter);
      setGrade(g);

      const now = new Date();
      setHistory(h => [{
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        dl: safeDl.toFixed(1), ul: safeUl.toFixed(1), ping: safePing.toFixed(1), jitter: safeJitter.toFixed(1),
        grade: g.grade, isp: conn.isp
      }, ...h].slice(0, 20));

    } catch (err) {
      console.error('[SpeedPulse] Test error:', err);
      setPhase('done'); setPhaseIdx(3);
    }

    setTesting(false);
  }, [testing, server, conn.isp, t]);

  const phases = [t.latency, t.download, t.upload, t.complete];
  const locStr = conn.city && conn.country ? `${conn.city}, ${conn.country}` : conn.country || '—';

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-400">
      {/* Aurora BG */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30 dark:opacity-35">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-dim blur-[120px] -top-[15%] -left-[10%] animate-float" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-mag-dim blur-[120px] -bottom-[20%] -right-[10%] animate-float-slow" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[#6c3aff22] blur-[120px] top-[40%] left-[50%]" style={{ animation: 'float 16s ease-in-out infinite alternate', animationDelay: '-8s' }} />
      </div>

      {/* Grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 dark:opacity-25"
        style={{
          backgroundImage: 'linear-gradient(var(--sp-border) 1px, transparent 1px), linear-gradient(90deg, var(--sp-border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 70%)'
        }} />

      <div className="relative z-10 max-w-[1320px] mx-auto px-7 py-6 pb-16">
        {/* ═══ HEADER ═══ */}
        <header className="flex items-center justify-between py-4 mb-10 border-b border-sp-border animate-fade-up">
          <div className="flex items-center gap-3.5">
            <div className="w-[46px] h-[46px] rounded-xl bg-gradient-to-br from-cyan to-mag flex items-center justify-center shadow-[0_0_24px_var(--cyan-dim)] relative overflow-hidden">
              <div className="absolute inset-[2px] rounded-[10px] bg-sp-bg" />
              <span className="relative z-10 text-xl">⚡</span>
            </div>
            <div>
              <span className="font-extrabold text-[1.45rem] tracking-tight">Speed<span className="text-cyan">Pulse</span></span>
              <span className="font-mono text-[0.6rem] font-semibold px-2 py-0.5 rounded ml-2 bg-cyan-dim text-cyan tracking-wider uppercase align-super">{t.tagline}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="font-mono text-[0.7rem] font-semibold px-3 py-1.5 rounded-lg border border-sp-border text-sp-t2 hover:text-sp-t1 hover:border-sp-t3 transition-all">
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>

            {/* Theme toggle */}
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-lg border border-sp-border flex items-center justify-center text-sp-t2 hover:text-sp-t1 hover:border-sp-t3 transition-all text-lg">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Server selector */}
            <button onClick={() => setShowServer(true)}
              className="font-mono text-[0.7rem] text-grn bg-grn-dim px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-grn animate-pulse-dot" />
              {conn.isp !== '…' ? conn.isp : t.detecting}
            </button>
          </div>
        </header>

        {/* ═══ HERO ═══ */}
        <section className="flex flex-col items-center py-4 pb-10 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <Gauge value={gaugeVal} max={gaugeMax} type={gaugeType} label={gaugeLabel || t.ready} unit={gaugeUnit} />

          {/* ISP Banner */}
          <div className="mt-5 text-center">
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-sp-t3">{t.yourIsp}</div>
            <div className={`font-mono text-[1.05rem] font-bold text-cyan px-7 py-2 rounded-full bg-cyan-dim border border-cyan/10 mt-1 inline-block shadow-[0_0_20px_rgba(0,229,255,0.07)] max-w-[90vw] truncate transition-all ${conn.isp === '…' ? 'animate-isp-pulse !text-sp-t2 !bg-sp-card !border-sp-border' : ''}`}>
              {conn.isp === '…' ? t.detectingIsp : conn.isp}
            </div>
          </div>

          <button onClick={runTest} disabled={testing}
            className="mt-8 px-14 py-4 rounded-full font-bold text-[1.05rem] tracking-wider uppercase text-sp-bg bg-gradient-to-br from-cyan to-[#00b8d4] shadow-[0_4px_30px_var(--cyan-dim)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_8px_40px_var(--cyan-dim)] active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100">
            {testing ? t.testing : t.startTest}
          </button>

          {/* Share button */}
          {phase === 'done' && (
            <button onClick={() => setShowShare(true)}
              className="mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-mag bg-mag-dim border border-mag/20 hover:bg-mag/20 transition-colors">
              📤 {t.shareResults}
            </button>
          )}

          {/* Phase dots */}
          <div className="flex gap-1.5 mt-6 items-center">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-2 rounded transition-all duration-400 ${
                i < phaseIdx ? 'w-2 rounded-full bg-grn' :
                i === phaseIdx ? 'w-7 rounded bg-cyan shadow-[0_0_12px_var(--cyan)]' :
                'w-2 rounded-full bg-sp-t3'
              }`} />
            ))}
            <span className="text-[0.72rem] text-sp-t2 ms-2.5 font-medium tracking-wider uppercase">
              {phaseIdx >= 0 ? phases[phaseIdx] : t.idle}
            </span>
          </div>
        </section>

        {/* ═══ RESULT CARDS ═══ */}
        <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <ResultCard icon="↓" title={t.download} value={results.dl} unit={t.mbps} color="#00e5ff" dimColor="#00e5ff33" barPct={parseFloat(results.dl) / 5 || 0} />
          <ResultCard icon="↑" title={t.upload} value={results.ul} unit={t.mbps} color="#ff006e" dimColor="#ff006e33" barPct={parseFloat(results.ul) / 3 || 0} />
          <ResultCard icon="◷" title={t.ping} value={results.ping} unit={t.ms} color="#00ff88" dimColor="#00ff8833" barPct={parseFloat(results.ping) || 0} />
          <ResultCard icon="∿" title={t.jitter} value={results.jitter} unit={t.ms} color="#ffab00" dimColor="#ffab0033" barPct={(parseFloat(results.jitter) || 0) * 2} />
        </div>

        {/* ═══ CHART ═══ */}
        <div className="mt-7 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <LiveChart dlData={dlData} ulData={ulData} pingData={pingData} title={t.liveThroughput} labels={{ download: t.download, upload: t.upload, ping: t.ping }} />
        </div>

        {/* ═══ DETAIL CARDS ═══ */}
        <div className="grid grid-cols-3 gap-4 mt-4 max-md:grid-cols-1 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <div className="bg-sp-card border border-sp-border rounded-2xl p-6">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-sp-t2 mb-3.5">{t.connectionInfo}</div>
            {[[t.ipAddress, conn.ip], [t.isp, conn.isp], [t.organization, conn.org], [t.asn, conn.as], [t.location, locStr], [t.timezone, conn.tz]].map(([k, v], i, arr) => (
              <div key={k} className={`flex justify-between py-1.5 ${i < arr.length - 1 ? 'border-b border-sp-border' : ''}`}>
                <span className="text-[0.78rem] text-sp-t2">{k}</span>
                <span className="font-mono text-[0.78rem] text-sp-t1 font-semibold truncate max-w-[50%] text-end">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-sp-card border border-sp-border rounded-2xl p-6">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-sp-t2 mb-3.5">{t.networkQuality}</div>
            {[[t.grade, grade.grade, grade.color], [t.stability, t[grade.stabilityKey] || '—'], [t.packetLoss, '0.0%']].map(([k, v, c], i, arr) => (
              <div key={k} className={`flex justify-between py-1.5 ${i < arr.length - 1 ? 'border-b border-sp-border' : ''}`}>
                <span className="text-[0.78rem] text-sp-t2">{k}</span>
                <span className="font-mono text-[0.78rem] font-semibold" style={{ color: c || 'var(--sp-t1)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-sp-card border border-sp-border rounded-2xl p-6">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-sp-t2 mb-3.5">{t.serverDetails}</div>
            {[[t.testServer, conn.cc ? `${conn.city || 'Auto'} ${conn.cc}-01` : 'Cloudflare Edge'], [t.protocol, 'HTTPS/2 Multi-Stream'], [t.connections, t.parallel.replace('{n}', STREAMS)]].map(([k, v], i, arr) => (
              <div key={k} className={`flex justify-between py-1.5 ${i < arr.length - 1 ? 'border-b border-sp-border' : ''}`}>
                <span className="text-[0.78rem] text-sp-t2">{k}</span>
                <span className="font-mono text-[0.78rem] text-sp-t1 font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ HISTORY ═══ */}
        <div className="mt-7 bg-sp-card border border-sp-border rounded-2xl p-7 overflow-auto animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex justify-between items-center mb-5">
            <div className="text-[0.95rem] font-bold">{t.testHistory}</div>
            <button onClick={() => setHistory([])}
              className="text-[0.72rem] text-sp-t2 px-3 py-1.5 rounded-md border border-sp-border bg-transparent font-medium hover:border-mag hover:text-mag transition-all">
              {t.clearAll}
            </button>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {[t.date, t.isp, t.download, t.upload, t.ping, t.jitter, t.grade].map(h => (
                  <th key={h} className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-sp-t3 text-start px-3 pb-3 border-b border-sp-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-sp-t3 text-sm">{t.noTests}</td></tr>
              ) : history.map((h, i) => (
                <tr key={i}>
                  <td className="font-mono text-[0.78rem] px-3 py-3 border-b border-sp-border text-sp-t2">{h.date} {h.time}</td>
                  <td className="font-mono text-[0.72rem] px-3 py-3 border-b border-sp-border text-sp-t1 font-semibold max-w-[150px] truncate">{h.isp}</td>
                  <td className="font-mono text-[0.78rem] px-3 py-3 border-b border-sp-border text-cyan font-semibold">{h.dl} {t.mbps}</td>
                  <td className="font-mono text-[0.78rem] px-3 py-3 border-b border-sp-border text-mag font-semibold">{h.ul} {t.mbps}</td>
                  <td className="font-mono text-[0.78rem] px-3 py-3 border-b border-sp-border text-grn font-semibold">{h.ping} {t.ms}</td>
                  <td className="font-mono text-[0.78rem] px-3 py-3 border-b border-sp-border text-amb font-semibold">{h.jitter} {t.ms}</td>
                  <td className="font-mono text-[0.78rem] px-3 py-3 border-b border-sp-border font-bold">{h.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer className="mt-12 pt-6 border-t border-sp-border flex justify-between items-center animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="text-[0.72rem] text-sp-t3">{t.copyright}</div>
          <div className="flex gap-4">
            {[t.privacy, t.terms, t.api].map(l => <span key={l} className="text-[0.72rem] text-sp-t3 cursor-pointer hover:text-sp-t2 transition-colors">{l}</span>)}
          </div>
        </footer>
      </div>

      {/* ═══ MODALS ═══ */}
      {showShare && <ShareModal results={results} conn={conn} grade={grade} t={t} onClose={() => setShowShare(false)} />}
      {showServer && <ServerSelector servers={servers} selected={server} onChange={setServer} t={t} onClose={() => setShowServer(false)} />}
    </div>
  );
}
