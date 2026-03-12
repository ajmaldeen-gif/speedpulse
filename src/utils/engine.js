// ═══════════════════════════════════════════════════════
// SpeedPulse Engine — Real multi-stream speed measurement
// Uses Cloudflare's speed test CDN infrastructure
// ═══════════════════════════════════════════════════════

const SERVERS = {
  auto: { name: 'Auto-Detect', dl: 'https://speed.cloudflare.com/__down', ul: 'https://speed.cloudflare.com/__up', meta: 'https://speed.cloudflare.com/meta' },
  // Cloudflare edge is global — same endpoint routes to nearest POP
  // These are "logical" server choices for the UI; all use Cloudflare's anycast
  us: { name: 'United States', dl: 'https://speed.cloudflare.com/__down', ul: 'https://speed.cloudflare.com/__up' },
  eu: { name: 'Europe', dl: 'https://speed.cloudflare.com/__down', ul: 'https://speed.cloudflare.com/__up' },
  asia: { name: 'Asia Pacific', dl: 'https://speed.cloudflare.com/__down', ul: 'https://speed.cloudflare.com/__up' },
  me: { name: 'Middle East', dl: 'https://speed.cloudflare.com/__down', ul: 'https://speed.cloudflare.com/__up' },
};

export function getServers() { return SERVERS; }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══ ISP DETECTION ═══
export async function detectISP() {
  const apis = [
    {
      url: 'https://speed.cloudflare.com/meta',
      parse: d => ({ ip: d.clientIp, isp: d.asOrganization, org: d.asOrganization, city: d.city, country: d.country, cc: d.country, tz: d.timezone, as: d.asn ? 'AS' + d.asn : '' })
    },
    {
      url: 'https://ipwho.is/',
      parse: d => ({ ip: d.ip, isp: d.connection?.isp || d.connection?.org, org: d.connection?.org, city: d.city, country: d.country, cc: d.country_code, tz: d.timezone?.id, as: d.connection?.asn ? 'AS' + d.connection.asn : '' })
    },
    {
      url: 'https://ipapi.co/json/',
      parse: d => ({ ip: d.ip, isp: d.org, org: d.org, city: d.city, country: d.country_name, cc: d.country_code, tz: d.timezone, as: d.asn || '' })
    }
  ];

  for (const api of apis) {
    try {
      const r = await Promise.race([
        fetch(api.url, { cache: 'no-store' }),
        sleep(5000).then(() => { throw new Error('timeout'); })
      ]);
      const d = await r.json();
      const p = api.parse(d);
      if (p.ip && p.isp) return { ...p, ready: true };
    } catch { continue; }
  }

  return {
    ip: '—', isp: 'Unknown ISP', org: '', city: '', country: '', cc: '',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone, as: '', ready: true
  };
}

// ═══ PING ═══
export async function measurePing(server = 'auto', onSample) {
  const url = SERVERS[server]?.dl || SERVERS.auto.dl;
  const pings = [];

  // Warm-up
  for (let i = 0; i < 3; i++) {
    try { await fetch(url + '?bytes=0&_w=' + Date.now() + i, { cache: 'no-store' }); } catch {}
  }
  await sleep(150);

  for (let i = 0; i < 25; i++) {
    const s = performance.now();
    try {
      await fetch(url + '?bytes=0&_p=' + Date.now() + '_' + i, { cache: 'no-store' });
      const elapsed = performance.now() - s;
      pings.push(elapsed);
      onSample?.(elapsed, pings);
    } catch {}
    await sleep(40);
  }

  if (!pings.length) return { ping: 0, jitter: 0, samples: [] };

  const sorted = [...pings].sort((a, b) => a - b);
  const trim = Math.max(1, Math.floor(sorted.length * 0.15));
  const trimmed = sorted.slice(trim, sorted.length - trim);
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  const jitter = trimmed.slice(1).reduce((acc, p, i) => acc + Math.abs(p - trimmed[i]), 0) / Math.max(trimmed.length - 1, 1);

  return { ping: avg, jitter, samples: pings };
}

// ═══ DOWNLOAD ═══
export async function measureDownload(server = 'auto', streams = 8, duration = 14000, onProgress) {
  const url = SERVERS[server]?.dl || SERVERS.auto.dl;
  const shared = { bytes: 0, start: 0, running: true, samples: [] };

  function chunkSize(elapsed, speed) {
    if (elapsed < 1) return 1_000_000;
    if (speed > 200) return 25_000_000;
    if (speed > 100) return 10_000_000;
    if (speed > 30) return 5_000_000;
    return 2_000_000;
  }

  async function stream(id) {
    while (shared.running) {
      const elapsed = (performance.now() - shared.start) / 1000;
      const speed = elapsed > 0 ? (shared.bytes * 8) / elapsed / 1e6 : 0;
      try {
        const r = await fetch(url + '?bytes=' + chunkSize(elapsed, speed) + '&_=' + Date.now() + '_' + id + '_' + Math.random(), { cache: 'no-store' });
        if (!r.ok || !shared.running) break;
        const reader = r.body?.getReader();
        if (reader) {
          while (shared.running) {
            const { done, value } = await reader.read();
            if (done) break;
            shared.bytes += value.byteLength;
          }
        } else {
          const buf = await r.arrayBuffer();
          shared.bytes += buf.byteLength;
        }
      } catch {
        if (!shared.running) break;
        await sleep(100);
      }
    }
  }

  // Warm-up
  try { await fetch(url + '?bytes=10000&_=w' + Date.now(), { cache: 'no-store' }); } catch {}

  shared.start = performance.now();
  for (let i = 0; i < streams; i++) stream(i);

  const iv = setInterval(() => {
    const elapsed = (performance.now() - shared.start) / 1000;
    if (elapsed > 0.1) {
      const speed = (shared.bytes * 8) / elapsed / 1e6;
      shared.samples.push(speed);
      onProgress?.(speed, [...shared.samples]);
    }
  }, 250);

  await sleep(duration);
  shared.running = false;
  clearInterval(iv);

  const elapsed = (performance.now() - shared.start) / 1000;
  const overall = (shared.bytes * 8) / elapsed / 1e6;

  // Trimmed stable average
  const stable = shared.samples.slice(Math.floor(shared.samples.length * 0.35));
  if (stable.length >= 3) {
    const s = [...stable].sort((a, b) => a - b);
    const t = Math.max(1, Math.floor(s.length * 0.1));
    const tr = s.slice(t, s.length - t);
    if (tr.length) return Math.max(overall, tr.reduce((a, b) => a + b, 0) / tr.length * 0.95);
  }
  return overall;
}

// ═══ UPLOAD ═══
export async function measureUpload(server = 'auto', streams = 8, duration = 12000, onProgress) {
  const url = SERVERS[server]?.ul || SERVERS.auto.ul;
  const shared = { bytes: 0, start: 0, running: true, samples: [] };

  function makePayload(size) {
    const buf = new ArrayBuffer(size);
    const view = new Uint8Array(buf);
    for (let i = 0; i < Math.min(4096, view.length); i++) view[i] = Math.random() * 256 | 0;
    return new Blob([buf]);
  }

  const payloads = {
    s: makePayload(500_000), m: makePayload(2_000_000),
    l: makePayload(5_000_000), x: makePayload(10_000_000)
  };

  function getPayload(speed) {
    if (speed > 200) return { blob: payloads.x, size: 10_000_000 };
    if (speed > 80) return { blob: payloads.l, size: 5_000_000 };
    if (speed > 20) return { blob: payloads.m, size: 2_000_000 };
    return { blob: payloads.s, size: 500_000 };
  }

  async function stream(id) {
    while (shared.running) {
      const elapsed = (performance.now() - shared.start) / 1000;
      const speed = elapsed > 0 ? (shared.bytes * 8) / elapsed / 1e6 : 0;
      const { blob, size } = getPayload(speed);
      try {
        await fetch(url + '?_=' + Date.now() + '_' + id + '_' + Math.random(), { method: 'POST', body: blob, cache: 'no-store' });
        if (!shared.running) break;
        shared.bytes += size;
      } catch {
        if (!shared.running) break;
        await sleep(100);
      }
    }
  }

  // Warm-up
  try { await fetch(url + '?_=w' + Date.now(), { method: 'POST', body: makePayload(10000), cache: 'no-store' }); } catch {}

  shared.start = performance.now();
  for (let i = 0; i < streams; i++) stream(i);

  const iv = setInterval(() => {
    const elapsed = (performance.now() - shared.start) / 1000;
    if (elapsed > 0.1) {
      const speed = (shared.bytes * 8) / elapsed / 1e6;
      shared.samples.push(speed);
      onProgress?.(speed, [...shared.samples]);
    }
  }, 250);

  await sleep(duration);
  shared.running = false;
  clearInterval(iv);

  const elapsed = (performance.now() - shared.start) / 1000;
  const overall = (shared.bytes * 8) / elapsed / 1e6;
  const stable = shared.samples.slice(Math.floor(shared.samples.length * 0.35));
  if (stable.length >= 3) {
    const s = [...stable].sort((a, b) => a - b);
    const t = Math.max(1, Math.floor(s.length * 0.1));
    const tr = s.slice(t, s.length - t);
    if (tr.length) return Math.max(overall, tr.reduce((a, b) => a + b, 0) / tr.length * 0.95);
  }
  return overall;
}

// ═══ GRADING ═══
export function calculateGrade(dl, ul, ping, jitter) {
  let score = 0;
  if (dl > 300) score += 40; else if (dl > 100) score += 30; else if (dl > 50) score += 20; else score += 10;
  if (ul > 100) score += 25; else if (ul > 50) score += 20; else if (ul > 20) score += 15; else score += 5;
  if (ping < 15) score += 20; else if (ping < 50) score += 15; else if (ping < 100) score += 10; else score += 3;
  if (jitter < 5) score += 15; else if (jitter < 15) score += 10; else if (jitter < 30) score += 5; else score += 1;

  if (score >= 85) return { grade: 'A+', color: '#00ff88', stabilityKey: 'excellent' };
  if (score >= 70) return { grade: 'A', color: '#00e5ff', stabilityKey: 'veryGood' };
  if (score >= 55) return { grade: 'B+', color: '#80f0ff', stabilityKey: 'good' };
  if (score >= 40) return { grade: 'B', color: '#ffab00', stabilityKey: 'fair' };
  if (score >= 25) return { grade: 'C', color: '#ff6e40', stabilityKey: 'moderate' };
  return { grade: 'D', color: '#ff006e', stabilityKey: 'poor' };
}
