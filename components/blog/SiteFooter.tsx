// components/blog/SiteFooter.tsx
import Link from "next/link";

const linkCls =
  "rounded text-slate-400 outline-none transition-colors hover:text-mint-light focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-night-surface/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-sm sm:flex-row sm:justify-between">
        <p className="text-slate-500">
          © Inkasso·Defense · Technische Orientierungshilfe, keine Rechtsberatung.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Rechtliches">
          <Link href="/blog" className={linkCls}>Blog</Link>
          <a href="/" className={linkCls}>Analyse-Tool</a>
          <Link href="/datenschutz" className={linkCls}>Datenschutz</Link>
          <Link href="/impressum" className={linkCls}>Impressum</Link>
        </nav>
      </div>
    </footer>
  );
}
