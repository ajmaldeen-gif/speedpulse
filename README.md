# ⚡ SpeedPulse — by Ajmal

Professional network speed test application built with React + Vite + Tailwind CSS.

## Features

- **Real speed measurement** — 8 parallel multi-stream connections to Cloudflare CDN
- **ISP detection** — auto-detects your IP, ISP name, location via multiple APIs
- **Bilingual** — English / Arabic with full RTL support
- **Dark / Light theme** — toggle between themes
- **Server selector** — choose test server region
- **Share results** — copy text or download result card as PNG image
- **Live chart** — real-time throughput visualization
- **Test history** — logs all tests with ISP, speeds, and grade
- **Network grading** — A+ through D grade based on all metrics

## Tech Stack

- React 18 + Vite 5
- Tailwind CSS 3.4
- Cloudflare Speed Test CDN (`speed.cloudflare.com`)
- html2canvas for result image export

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for Production

```bash
npm run build
```

Output in `dist/` — deploy to Vercel, Netlify, or any static host.

## Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo to Vercel for auto-deployment.

## Project Structure

```
speedpulse/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── main.jsx            # Entry point
│   ├── App.jsx              # Main app component
│   ├── index.css            # Global styles + theme vars
│   ├── components/
│   │   ├── Gauge.jsx        # Speed gauge SVG
│   │   ├── ResultCard.jsx   # Metric result card
│   │   ├── LiveChart.jsx    # Real-time canvas chart
│   │   ├── ShareModal.jsx   # Share results modal
│   │   └── ServerSelector.jsx
│   ├── utils/
│   │   └── engine.js        # Speed test engine (ping, dl, ul, ISP)
│   └── i18n/
│       └── translations.js  # EN + AR translations
└── package.json
```

## How It Works

1. **Ping**: 25 round-trip measurements to Cloudflare edge, trimmed 15% outliers
2. **Download**: 8 parallel `fetch()` streams reading binary data from `speed.cloudflare.com/__down`, adaptive chunk sizing (1MB–25MB)
3. **Upload**: 8 parallel `POST` streams sending binary blobs to `speed.cloudflare.com/__up`, adaptive payload sizing
4. **Grade**: Composite score from download, upload, ping, and jitter

Built by Ajmal — © 2026
