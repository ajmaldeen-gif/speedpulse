/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sp: {
          bg: 'var(--sp-bg)',
          bg2: 'var(--sp-bg2)',
          card: 'var(--sp-card)',
          cardHover: 'var(--sp-card-hover)',
          border: 'var(--sp-border)',
          t1: 'var(--sp-t1)',
          t2: 'var(--sp-t2)',
          t3: 'var(--sp-t3)',
        },
        cyan: { DEFAULT: '#00e5ff', dim: '#00e5ff33' },
        mag: { DEFAULT: '#ff006e', dim: '#ff006e33' },
        grn: { DEFAULT: '#00ff88', dim: '#00ff8833' },
        amb: { DEFAULT: '#ffab00', dim: '#ffab0033' },
      },
      fontFamily: {
        display: ['"Clash Display"', '"Outfit"', 'sans-serif'],
        body: ['"Outfit"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'float': 'float 14s ease-in-out infinite alternate',
        'float-slow': 'float 18s ease-in-out infinite alternate-reverse',
        'pulse-dot': 'pulse-dot 2s infinite',
        'scan': 'scan 2s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'isp-pulse': 'isp-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        float: { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(40px,-30px) scale(1.15)' } },
        'pulse-dot': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        scan: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
        'fade-up': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'isp-pulse': { '0%,100%': { opacity: 0.5 }, '50%': { opacity: 1 } },
      }
    },
  },
  plugins: [],
}
