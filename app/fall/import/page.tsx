"use client";

// app/fall/import/page.tsx – Brücke vom Gratis-Flow ins Konto:
// liest das in localStorage zwischengespeicherte Analyse-Ergebnis,
// holt die DSGVO-Einwilligung ein und speichert es als Fall.
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/blog/SiteHeader";

const KEY = "inkassoPendingCase";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h

type Result = {
  stammdaten?: { inkassoName?: string; glaeubiger?: string; aktenzeichen?: string; originalSumme?: number };
  berechnung?: { fairerKern?: number; ersparnis?: number };
};

const eur = (n: unknown) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export default function ImportCasePage() {
  const [result, setResult] = useState<Result | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { v?: number; ts?: number; result?: Result };
        const fresh = typeof parsed?.ts === "number" && Date.now() - parsed.ts < MAX_AGE_MS;
        if (parsed?.v === 1 && fresh && parsed.result?.stammdaten && parsed.result?.berechnung) {
          setResult(parsed.result);
        }
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  async function save() {
    if (!result || !consent) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ result, consent: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        try { localStorage.removeItem(KEY); } catch { /* ignore */ }
        window.location.assign("/faelle");
      } else {
        setError(j?.error || "Speichern fehlgeschlagen. Bitte erneut versuchen.");
      }
    } catch {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  const s = result?.stammdaten ?? {};
  const b = result?.berechnung ?? {};

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-24 pt-14 sm:pt-20">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tightest text-white sm:text-4xl">
          Fall im Konto speichern
        </h1>

        {!loaded ? (
          <p className="mt-6 text-slate-400">Lädt …</p>
        ) : !result ? (
          <div className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-8 text-center bezel-soft">
            <p className="text-slate-300">Kein Analyse-Ergebnis gefunden.</p>
            <p className="mt-2 text-sm text-slate-500">
              Starte mit einer kostenlosen Analyse – das Ergebnis kannst du danach hier speichern.
            </p>
            <a
              href="/"
              className="btn-press mt-5 inline-flex rounded-full bg-mint px-6 py-3 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
            >
              Forderung prüfen
            </a>
          </div>
        ) : (
          <>
            <p className="mt-3 leading-relaxed text-slate-400">
              Speichere dein Analyse-Ergebnis in deinem Konto, um es später wiederzufinden und – mit
              der Fall-Begleitung – Fristen-Erinnerungen und den Eskalations-Assistenten zu nutzen.
            </p>

            {/* Zusammenfassung */}
            <div className="mt-6 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Dein Fall</p>
              <p className="mt-2 text-lg font-bold text-white">
                {s.inkassoName || s.glaeubiger || "Forderung"}
              </p>
              {s.aktenzeichen && s.aktenzeichen.toLowerCase() !== "unbekannt" ? (
                <p className="text-sm text-slate-400">Az. {s.aktenzeichen}</p>
              ) : null}
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Geforderte Summe</dt>
                  <dd className="mt-0.5 font-semibold text-white">{eur(s.originalSumme)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Fairer Kern</dt>
                  <dd className="mt-0.5 font-semibold text-mint-light">{eur(b.fairerKern)}</dd>
                </div>
              </dl>
            </div>

            {/* Einwilligung */}
            <label className="mt-6 flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-night p-4">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 flex-shrink-0 accent-mint"
              />
              <span className="text-sm text-slate-300">
                Ich willige ein, dass mein Analyse-Ergebnis in meinem Konto gespeichert wird. Das
                hochgeladene Dokument wird nicht gespeichert. Ich kann den Fall jederzeit löschen.
              </span>
            </label>

            <button
              type="button"
              onClick={save}
              disabled={!consent || saving}
              className="btn-press mt-5 w-full rounded-2xl bg-mint py-3.5 text-base font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
            >
              {saving ? "Speichern …" : "Fall speichern"}
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            <p className="mt-6 text-sm text-slate-500">
              <a href="/" className="text-mint-light underline underline-offset-2">Abbrechen &amp; zurück</a>
              {" · "}
              <a href="/datenschutz" className="text-mint-light underline underline-offset-2">Datenschutz</a>
            </p>
          </>
        )}
      </main>
    </>
  );
}
