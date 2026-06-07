// components/blog/AffiliateBlock.tsx
// Kontextbezogene Empfehlungen (zulässige Partner). Provisions-Partner sind mit
// "Anzeige" gekennzeichnet; Links mit rel="sponsored nofollow".
import { pickAffiliates, type AffiliateSignal } from "@/lib/affiliates";

export function AffiliateBlock({
  signals = ["hohe_ersparnis", "schufa", "ratenzahlung"],
  title = "Hilfreiche Empfehlungen",
}: {
  signals?: AffiliateSignal[];
  title?: string;
}) {
  const items = pickAffiliates(signals, 3);
  if (!items.length) return null;

  return (
    <aside className="not-prose mt-12 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((a) => (
          <li key={a.id} className="rounded-2xl border border-white/10 bg-night-inset/50 p-4">
            <a
              href={a.url}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="group flex items-center justify-between gap-4 rounded outline-none focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night"
            >
              <span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-white">{a.name}</span>
                  {a.kommission ? (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Anzeige
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-sm text-slate-400">{a.claim}</span>
              </span>
              <svg
                className="btn-icon h-5 w-5 flex-shrink-0 text-mint-light"
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
            {a.kommission ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Partner-Empfehlung – bei Abschluss erhalten wir ggf. eine Provision. Für dich ohne Mehrkosten.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
