// components/blog/mdx.tsx
// Styling-Map für MDX-Inhalte (kein @tailwindcss/typography – bewusst manuell,
// um keine weitere Build-Abhängigkeit einzuführen) + Platzhalter-Komponenten
// für Bilder und Charts (Daten-Visualisierung).
import type { ReactNode } from "react";

/** Gerahmter Bild-Platzhalter mit Schatten – wie die Screenshots im Nexora-Artikel. */
export function Figure({ src, alt, caption }: { src?: string; alt?: string; caption?: string }) {
  return (
    <figure className="not-prose my-9">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-night-surface bezel-soft">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className="w-full" />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-night-inset via-night-surface to-night-inset">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 15l5-4 4 3 3-4 6 6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="8.5" cy="9" r="1.5" />
              </svg>
              <span className="text-xs">{alt || "Bild-Platzhalter"}</span>
            </div>
          </div>
        )}
      </div>
      {caption ? <figcaption className="mt-3 text-center text-sm text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}

/** Schlichter Balken-Chart-Platzhalter (reines SVG, keine Lib) für Daten-Fokus. */
export function Chart({
  title,
  caption,
  values = [48, 72, 35, 90, 61, 78],
}: {
  title?: string;
  caption?: string;
  values?: number[];
}) {
  const max = Math.max(1, ...values);
  // Screen-Reader-Zusammenfassung statt rein visueller Balken (WCAG).
  const summary = [title, caption, `Werte: ${values.join(", ")}.`].filter(Boolean).join(" ");
  return (
    <figure
      role="img"
      aria-label={summary || "Balkendiagramm"}
      className="not-prose my-9 overflow-hidden rounded-3xl border border-white/10 bg-night-surface p-6 bezel-soft"
    >
      {title ? (
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-mint-light">{title}</p>
      ) : null}
      <div className="flex h-44 items-end gap-3" aria-hidden="true">
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-mint/40 to-mint"
              style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
            />
            <span className="text-[10px] text-slate-500">{i + 1}</span>
          </div>
        ))}
      </div>
      {caption ? <figcaption className="mt-4 text-sm text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}

/** Rechtlicher Hinweis (RDG) – wiederverwendbar in jedem Artikel. */
export function Disclaimer() {
  return (
    <aside
      role="note"
      className="not-prose my-10 flex gap-3 rounded-3xl border border-white/10 bg-night-inset/60 p-5 text-sm leading-relaxed text-slate-400"
    >
      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v4h1" />
      </svg>
      <p>
        <strong className="font-semibold text-slate-300">Rechtlicher Hinweis:</strong> Dieser Beitrag ist
        eine allgemeine, technische Orientierungshilfe und stellt <strong className="font-semibold text-slate-300">keine
        Rechtsberatung</strong> dar. Er ersetzt nicht die Prüfung des Einzelfalls durch eine fachkundige Stelle
        oder einen Rechtsanwalt. Die Nutzung erfolgt auf eigene Gefahr.
      </p>
    </aside>
  );
}

export const mdxComponents = {
  h2: (p: { children?: ReactNode }) => (
    <h2 className="mt-12 scroll-mt-24 text-2xl font-extrabold tracking-tight text-white sm:text-3xl" {...p} />
  ),
  h3: (p: { children?: ReactNode }) => (
    <h3 className="mt-9 text-xl font-bold tracking-tight text-white" {...p} />
  ),
  p: (p: { children?: ReactNode }) => (
    <p className="mt-5 text-[1.0625rem] leading-relaxed text-slate-300" {...p} />
  ),
  ul: (p: { children?: ReactNode }) => (
    <ul className="mt-5 space-y-2.5 pl-1 text-slate-300" {...p} />
  ),
  ol: (p: { children?: ReactNode }) => (
    <ol className="mt-5 list-decimal space-y-2.5 pl-6 text-slate-300 marker:text-mint-light" {...p} />
  ),
  li: (p: { children?: ReactNode }) => (
    <li className="relative flex gap-3 leading-relaxed [ol_&]:list-item [ol_&]:pl-0">
      <span className="mt-2 hidden h-1.5 w-1.5 flex-shrink-0 rounded-full bg-mint [ul_&]:block" aria-hidden="true" />
      <span>{p.children}</span>
    </li>
  ),
  a: (p: { children?: ReactNode; href?: string }) => (
    <a
      className="rounded font-semibold text-mint-light underline decoration-mint/40 underline-offset-2 outline-none transition hover:decoration-mint focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night"
      {...p}
    />
  ),
  strong: (p: { children?: ReactNode }) => <strong className="font-bold text-white" {...p} />,
  blockquote: (p: { children?: ReactNode }) => (
    <blockquote className="my-8 border-l-4 border-mint/70 bg-night-surface/50 py-2 pl-5 pr-4 text-lg italic text-slate-200" {...p} />
  ),
  hr: () => <hr className="my-10 border-white/10" />,
  // In MDX direkt verfügbar:
  Figure,
  Chart,
  Disclaimer,
};
