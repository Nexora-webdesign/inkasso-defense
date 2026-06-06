// components/blog/SiteHeader.tsx
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)_+_0.75rem)] sm:pt-6">
      <nav className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-full border border-white/10 bg-night-surface/80 py-2 pl-4 pr-2 shadow-float backdrop-blur-xl">
        <Link
          href="/blog"
          className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night-surface"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint/15">
            <svg
              className="h-4 w-4 text-mint-light"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6l8-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <span className="whitespace-nowrap text-[15px] font-extrabold tracking-tightest text-white">
            Inkasso<span className="text-mint-light">·Defense</span>
          </span>
        </Link>

        <a
          href="/"
          className="btn-press inline-flex items-center gap-1.5 rounded-full bg-mint px-4 py-2 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night-surface"
        >
          Forderung prüfen
          <svg
            className="btn-icon h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </nav>
    </header>
  );
}
