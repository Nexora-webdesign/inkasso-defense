// components/blog/CtaBlock.tsx
// Call-to-Action am Ende jedes Artikels: führt zum Inkasso-Analyse-Tool.
export function CtaBlock() {
  return (
    <aside className="not-prose relative mt-16 overflow-hidden rounded-4xl border border-mint/20 bg-gradient-to-br from-mint/15 via-night-surface to-night-inset p-8 bezel-soft sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-mint/20 blur-[90px]" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-mint-light">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6l8-3z" />
          </svg>
          Kostenlose Analyse
        </span>

        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Inkasso-Schreiben erhalten? Prüfe in Sekunden, was du wirklich zahlen musst.
        </h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          Lade dein Schreiben hoch – die <strong className="font-semibold text-white">regelbasierte Analyse</strong>{" "}
          erkennt die Posten, berechnet den fairen Kern nach BGB &amp; RVG und erstellt dir einen
          fertigen Widerspruch.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <a
            href="/"
            className="btn-press group inline-flex items-center gap-2 rounded-full bg-mint px-6 py-3 text-base font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night"
          >
            Jetzt Inkassoschreiben sicher analysieren
            <svg className="btn-icon h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <span className="text-sm text-slate-400">Ohne Anmeldung · in unter 1 Minute</span>
        </div>
      </div>
    </aside>
  );
}
