// app/layout.tsx
// Root-Layout für die Next.js-gerenderten Seiten (Blog). Die statischen Seiten
// in public/ (index.html, dashboard.html) werden davon NICHT berührt.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/blog-shared";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Inkasso·Defense", template: "%s – Inkasso·Defense" },
  description:
    "Wissen rund um Inkasso, Gebühren und Verbraucherrecht – verständlich erklärt vom Team hinter dem Inkasso-Analyse-Tool.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark scroll-smooth">
      <head>
        <meta name="theme-color" content="#0b0f19" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body className="relative min-h-[100dvh] overflow-x-hidden bg-night font-sans text-slate-100 antialiased selection:bg-mint/25">
        {/* Atmosphäre: weiche Mint-/Indigo-Auren + Film-Grain (wie die App) */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 h-[34rem] w-[34rem] rounded-full bg-mint/10 blur-[120px]" />
          <div className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-indigo-500/10 blur-[130px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-night/40 via-night/60 to-night" />
        </div>
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
