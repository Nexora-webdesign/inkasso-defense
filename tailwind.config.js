/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark Mode über die .dark-Klasse am <html>-Tag (vom Theme-Toggle gesetzt).
  darkMode: 'class',

  // Nur tatsächlich genutzte Klassen landen im Build → schlank & performant.
  content: [
    './public/**/*.html',
    './public/app.js',
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
      },

      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
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
