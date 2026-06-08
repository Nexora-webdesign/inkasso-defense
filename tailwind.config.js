/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark Mode über die .dark-Klasse am <html>-Tag (vom Theme-Toggle gesetzt).
  darkMode: 'class',

  // Nur tatsächlich genutzte Klassen landen im Build → schlank & performant.
  content: [
    './public/**/*.html',
    './public/app.js',
    // Next.js-Blog (App Router + MDX) – damit die Utility-Klassen in styles.css landen.
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.mdx',
  ],

  theme: {
    extend: {
      // ── Design-Tokens ──────────────────────────────────────────────
      colors: {
        // Trust-Navy (Headlines, dunkle Flächen im Light Mode)
        ink: {
          50: '#eef1f8',
          100: '#dfe3f0',
          700: '#2a3358',
          800: '#1c2347',
          900: '#111634',
          950: '#0a0f24',
        },
        // Digital Mint Green (Erfolg / Ersparnis / Akzent)
        mint: {
          DEFAULT: '#12b886',
          dark: '#0c8f6a',
          light: '#6ee7c4',
          tint: '#eafaf4',
        },
        // Deep Cyber Blue (Dark-Mode-Flächen)
        night: {
          DEFAULT: '#0b0f19', // Seite
          surface: '#161f30', // Karten / Bento
          inset: '#0e1424',   // eingelassene Kerne
          hair: '#243047',    // feine Border
        },

        // ── B2B-Portal „Editorial Legal-Tech" (hell) ──────────────────
        // Werte als CSS-Variablen aus .portal-theme (src/input.css) → eine Quelle.
        // Eigene Namen, damit ink/mint/night (Blog/Funnel) unberührt bleiben.
        papier: 'var(--papier)',                                   // Hintergrund
        karte: 'var(--karte)',                                     // Karten
        tinte: { DEFAULT: 'var(--tinte)', soft: 'var(--tinte-soft)' }, // Text
        haar: 'var(--haar)',                                       // Haarlinien
        akten: { DEFAULT: 'var(--akten)', soft: 'var(--akten-soft)' }, // Marke/Aktionen
        // Status NUR für rechtliche Bedeutung:
        berechtigt: { DEFAULT: 'var(--berechtigt)', bg: 'var(--berechtigt-bg)' },
        fraglich: { DEFAULT: 'var(--fraglich)', bg: 'var(--fraglich-bg)' },
        ueberhoeht: { DEFAULT: 'var(--ueberhoeht)', bg: 'var(--ueberhoeht-bg)' },
      },

      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        // Portal-Schriften (next/font-Variablen, gesetzt im (portal)-Layout):
        akte: ['var(--font-spectral)', 'Georgia', 'serif'],       // Überschriften
        ui: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'], // UI/Text
        zahl: ['var(--font-plex-mono)', 'monospace'],             // Zahlen, §, Az.
      },

      letterSpacing: {
        tightest: '-0.04em',
      },

      boxShadow: {
        float: '0 24px 60px -20px rgba(10, 15, 36, 0.22)',
      },

      borderRadius: {
        '4xl': '2rem',
      },
    },
  },

  plugins: [],
};
