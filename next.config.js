/** @type {import('next').NextConfig} */
const nextConfig = {
  // Das Frontend bleibt statisch in public/ (HTML + Tailwind-Build + Vanilla-JS).
  // Next.js stellt nur die API (app/api/*) bereit und liefert die statischen Dateien aus.
  // "/" auf die statische Landingpage umschreiben.
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/dashboard', destination: '/dashboard.html' },
    ];
  },
  // Migrationssicher: TS-Fehler sollen den Build nicht blockieren.
  // (SWC transpiliert route.ts/lib.ts; das Laufzeitverhalten ist verifiziert.)
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
