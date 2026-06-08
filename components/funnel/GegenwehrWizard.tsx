"use client";

// components/funnel/GegenwehrWizard.tsx
// Geführter 5-Schritte-Funnel: Scan → Fakten → KI-Analyse → Ergebnis → Gegenwehr.
// Mobile-first, KEIN horizontaler Scroll. Nutzt die bestehende Live-Logik:
//   POST /api/analyze (file + onboarding) -> FrontendPayload (KI + Regel-Engine)
//   POST /api/widerspruch-pdf, "Fall speichern"-Brücke (localStorage -> /fall/import).
import { useRef, useState } from "react";
import Link from "next/link";
import type { FrontendPayload } from "@/lib/rule-engine";
import { eur } from "@/lib/format";
import { CopyEmail } from "@/components/account/CopyEmail";

const STEPS = [
  { key: "scan", label: "Dokumenten-Scan" },
  { key: "fakten", label: "Fakten-Check" },
  { key: "analyse", label: "KI-Analyse" },
  { key: "ergebnis", label: "Ergebnis" },
  { key: "gegenwehr", label: "Gegenwehr" },
] as const;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

const POSTEN_BADGE: Record<string, { label: string; cls: string }> = {
  RECHTENS: { label: "Rechtens", cls: "bg-mint/15 text-mint-light" },
  GEKUERZT: { label: "Gekürzt", cls: "bg-amber-400/15 text-amber-300" },
  NICHT_RECHTENS: { label: "Nicht rechtens", cls: "bg-rose-400/15 text-rose-300" },
};

function parseEur(s: string): number {
  let v = String(s || "").trim().replace(/[€\s]/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

// Handy-Fotos vor Upload verkleinern (hält die Anfrage unter Vercels Body-Limit).
async function maybeDownscale(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    return blob ? new File([blob], "dokument.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

type Onb = { ersterBrief: boolean | null; bereitsWidersprochen: boolean | null; bereitsGezahlt: boolean | null; betrag: string };

export function GegenwehrWizard() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [onb, setOnb] = useState<Onb>({ ersterBrief: null, bereitsWidersprochen: null, bereitsGezahlt: null, betrag: "" });
  const [result, setResult] = useState<FrontendPayload | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const stamm = result?.stammdaten;
  const ber = result?.berechnung;
  const orig = Number(stamm?.originalSumme) || 0;
  const fair = Number(ber?.fairerKern) || 0;
  const saving = ber?.ersparnis != null ? Number(ber.ersparnis) : Math.max(0, orig - fair);
  const pct = orig > 0 ? Math.round((saving / orig) * 100) : 0;
  const az = stamm?.aktenzeichen && stamm.aktenzeichen.toLowerCase() !== "unbekannt" ? stamm.aktenzeichen : "";
  const subject = az ? `Teilwiderspruch – Aktenzeichen ${az}` : "Teilwiderspruch gegen Ihre Forderung";

  function pickFile(f: File | null) {
    setError("");
    if (!f) return;
    if (!ALLOWED.includes(f.type)) { setError("Bitte ein Foto (JPG/PNG) oder PDF hochladen."); return; }
    if (f.size > MAX_BYTES) { setError("Die Datei ist zu groß (max. 10 MB)."); return; }
    setFile(f);
  }

  async function runAnalyse() {
    if (!file || !consent) return;
    setError("");
    setStep(2);
    try {
      const toSend = await maybeDownscale(file);
      const fd = new FormData();
      fd.append("file", toSend);
      fd.append("onboarding", JSON.stringify({
        ersterBrief: onb.ersterBrief !== false,
        bereitsWidersprochen: onb.bereitsWidersprochen === true,
        bereitsGezahltEur: onb.bereitsGezahlt ? parseEur(onb.betrag) : 0,
      }));
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const text = await res.text();
      let data: { ok?: boolean; data?: FrontendPayload; error?: string } | null = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!res.ok || !data || data.ok !== true || !data.data) {
        throw new Error(data?.error || `Die Analyse ist fehlgeschlagen (Status ${res.status}).`);
      }
      setResult(data.data);
      setStep(3);
    } catch (e) {
      setError((e as Error).message || "Die Analyse ist fehlgeschlagen. Bitte erneut versuchen.");
      setStep(1);
    }
  }

  function saveCase() {
    if (!result) return;
    try {
      localStorage.setItem("inkassoPendingCase", JSON.stringify({ v: 1, ts: Date.now(), result }));
    } catch { /* ignore */ }
    window.location.href = "/fall/import";
  }

  // ── Render: Akte (Sidebar/Accordion) ─────────────────────────────────────
  const akteRows: [string, string, boolean][] = [
    ["Inkassobüro", stamm?.inkassoName || stamm?.glaeubiger || "", true],
    ["Aktenzeichen", az, false],
    ["Geforderte Summe", result ? eur(orig) : "", false],
    ["Fairer Kern", result ? eur(fair) : "", false],
  ];
  const akteBody = (
    <div className="grid gap-2.5">
      {akteRows.map(([k, v, accent]) => (
        <div key={k} className="rounded-2xl border border-white/10 bg-night-inset/60 px-3 py-2.5">
          <p className="text-[11px] text-slate-500">{k}</p>
          <p className={"mt-0.5 break-words font-bold tabular-nums " + (v ? (accent ? "text-mint-light" : "text-white") : "text-slate-500 font-medium")}>
            {v || "—"}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-dvh overflow-x-hidden bg-night text-slate-200">
      {/* ── 1) Sticky Header / Fortschritt ─────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-night/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex flex-shrink-0 items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-mint/60 rounded-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint/15 text-mint-light">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>
            </span>
            <span className="text-[15px] font-extrabold tracking-tightest text-white">Inkasso<span className="text-mint-light">·Defense</span></span>
          </Link>

          {/* Desktop-Stepper */}
          <nav className="ml-2 hidden flex-1 items-center gap-1.5 lg:flex" aria-label="Fortschritt">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex min-w-0 items-center gap-1.5">
                <div className="flex min-w-0 items-center gap-2" aria-current={i === step ? "step" : undefined}>
                  <span className={"flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition " +
                    (i < step ? "bg-mint/15 text-mint-light" : i === step ? "bg-mint text-night" : "border border-white/10 bg-night-inset text-slate-500")}>
                    {i < step ? (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : i + 1}
                  </span>
                  <span className={"truncate text-[13px] font-semibold " + (i === step ? "text-white" : "text-slate-500")}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 ? <span className={"h-0.5 min-w-[10px] flex-1 rounded " + (i < step ? "bg-mint/50" : "bg-white/10")} /> : null}
              </div>
            ))}
          </nav>

          {/* Mobile-Fortschritt: Text + Punkte (kein Scroll) */}
          <div className="flex flex-1 items-center justify-between gap-3 lg:hidden">
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-mint-light">Schritt {step + 1}/5</span>
              <span className="block truncate text-sm font-bold text-white">{STEPS[step].label}</span>
            </span>
            <span className="flex flex-shrink-0 gap-1.5" aria-hidden="true">
              {STEPS.map((s, i) => (
                <span key={s.key} className={"h-1.5 rounded-full transition-all " + (i === step ? "w-4 bg-mint" : i < step ? "w-1.5 bg-mint/60" : "w-1.5 bg-white/15")} />
              ))}
            </span>
          </div>
        </div>
      </header>

      {/* ── 2)+3) Layout: Akte + Main (mobil vertikal, Desktop Grid) ────── */}
      <div className="mx-auto max-w-5xl px-4 py-5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6 lg:py-7">
        {/* Akte: Desktop = Sidebar (order-2), Mobile = Accordion oben */}
        <aside className="mb-4 lg:order-2 lg:mb-0 lg:sticky lg:top-[88px]">
          <details className="rounded-4xl border border-white/10 bg-night-surface/60 bezel-soft" open>
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 lg:cursor-default [&::-webkit-details-marker]:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300" aria-hidden="true">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
              </span>
              <span className="flex-1 text-[11px] font-bold uppercase tracking-[0.16em] text-mint-light">Intelligente Akte</span>
            </summary>
            <div className="px-4 pb-1 lg:pb-4">{akteBody}</div>
          </details>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-col gap-4 lg:order-1">
          {error ? (
            <p className="rounded-2xl border border-rose-400/30 bg-rose-400/5 px-4 py-3 text-sm text-rose-300">{error}</p>
          ) : null}

          {/* Schritt 1 — Scan */}
          {step === 0 ? (
            <section className="rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint-light">Schritt 1</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tightest text-white sm:text-3xl">Dokument scannen</h1>
              <p className="mt-2 text-slate-400">Lade ein Foto oder PDF deiner Inkasso-Forderung hoch – die Analyse ist kostenlos.</p>

              <label className="mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-3xl border border-dashed border-mint/40 bg-night px-4 py-10 text-center transition-colors hover:border-mint/60">
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/15 text-mint-light">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0L8 8m4-4l4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                </span>
                <span className="font-bold text-white">{file ? file.name : "Brief auswählen oder hierher ziehen"}</span>
                <span className="text-xs text-slate-500">JPG, PNG oder PDF · max. 10 MB</span>
              </label>

              <label className="mt-4 flex cursor-pointer gap-3 text-sm leading-relaxed text-slate-400">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 accent-mint" />
                <span>Ich willige ein, dass mein Dokument zur Analyse verarbeitet und an einen Dienstleister (Anthropic, USA) übermittelt wird. Es wird nicht dauerhaft gespeichert. (<Link href="/datenschutz" className="text-mint-light underline underline-offset-2">Datenschutz</Link>)</span>
              </label>

              <button type="button" onClick={() => setStep(1)} disabled={!file || !consent}
                className="btn-press mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-mint px-6 text-base font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-50">
                Weiter zum Fakten-Check
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </section>
          ) : null}

          {/* Schritt 2 — Fakten */}
          {step === 1 ? (
            <section className="rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint-light">Schritt 2</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tightest text-white sm:text-3xl">Fakten-Check</h1>
              <p className="mt-2 text-slate-400">Drei kurze Angaben für eine genauere Einschätzung.</p>

              <div className="mt-5 grid gap-3">
                <Question label="Ist das der erste Brief in dieser Sache?" value={onb.ersterBrief} onChange={(v) => setOnb((o) => ({ ...o, ersterBrief: v }))} />
                <Question label="Hast du bereits widersprochen?" value={onb.bereitsWidersprochen} onChange={(v) => setOnb((o) => ({ ...o, bereitsWidersprochen: v }))} />
                <Question label="Hast du bereits (teilweise) gezahlt?" value={onb.bereitsGezahlt} onChange={(v) => setOnb((o) => ({ ...o, bereitsGezahlt: v }))} />
                {onb.bereitsGezahlt ? (
                  <label className="rounded-2xl border border-white/10 bg-night p-4 text-sm text-slate-300">
                    Bereits gezahlter Betrag
                    <input inputMode="decimal" value={onb.betrag} onChange={(e) => setOnb((o) => ({ ...o, betrag: e.target.value }))} placeholder="50,00 €"
                      className="mt-2 w-full max-w-[12rem] rounded-xl border border-white/10 bg-night-inset px-3 py-2.5 text-white outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40" />
                  </label>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(0)} className="btn-press min-h-12 flex-1 rounded-2xl border border-white/10 bg-night-surface px-5 font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-mint/60">Zurück</button>
                <button type="button" onClick={runAnalyse} className="btn-press min-h-12 flex-1 rounded-2xl bg-mint px-5 font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60">KI-Analyse starten</button>
              </div>
            </section>
          ) : null}

          {/* Schritt 3 — Analyse läuft */}
          {step === 2 ? (
            <section className="rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint-light">Schritt 3</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tightest text-white sm:text-3xl">KI-Analyse läuft</h1>
              <div className="mt-5 flex items-center gap-3">
                <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/15 border-t-mint motion-reduce:animate-none" aria-hidden="true" />
                <p className="text-slate-400">Die Fakten werden nach geltendem Verbraucherrecht geprüft …</p>
              </div>
            </section>
          ) : null}

          {/* Schritt 4 — Ergebnis */}
          {step === 3 && result ? (
            <section className="rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-3 py-1 text-xs font-bold text-sky-300">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6l8-3z" /></svg>
                Basiert auf geltendem Verbraucherrecht
              </span>
              <h1 className="mt-3 font-display text-2xl font-semibold tracking-tightest text-white sm:text-3xl">Das musst du wirklich zahlen.</h1>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-night-inset/60 p-5"><p className="text-xs text-slate-500">Geforderte Summe</p><p className="mt-1 font-display text-2xl font-semibold text-white tabular-nums">{eur(orig)}</p></div>
                <div className="rounded-3xl border border-white/10 bg-night-inset/60 p-5"><p className="text-xs text-slate-500">Fairer Kern</p><p className="mt-1 font-display text-2xl font-semibold text-mint-light tabular-nums">{eur(fair)}</p></div>
                <div className="rounded-3xl border border-white/10 bg-night-inset/60 p-5"><p className="text-xs text-slate-500">Ersparnis</p><p className="mt-1 font-display text-2xl font-semibold text-white tabular-nums">{eur(saving)}{pct > 0 ? <span className="text-base text-mint-light"> (−{pct}%)</span> : null}</p></div>
              </div>

              {Array.isArray(result.posten) && result.posten.length ? (
                <div className="mt-4 grid gap-3">
                  {result.posten.map((p, i) => {
                    const badge = POSTEN_BADGE[p.status] || POSTEN_BADGE.GEKUERZT;
                    return (
                      <div key={`${p.name}-${i}`} className="rounded-3xl border border-white/10 bg-night-inset/60 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="font-bold text-white">{p.name}</p>{p.paragraph ? <p className="mt-0.5 text-xs font-medium text-slate-400">{p.paragraph}</p> : null}</div>
                          <span className={"flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold " + badge.cls}>{badge.label}</span>
                        </div>
                        {p.wieso ? <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.wieso}</p> : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-press min-h-12 flex-1 rounded-2xl border border-white/10 bg-night-surface px-5 font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-mint/60">Zurück</button>
                <button type="button" onClick={() => setStep(4)} className="btn-press min-h-12 flex-1 rounded-2xl bg-mint px-5 font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60">Zur Gegenwehr</button>
              </div>
            </section>
          ) : null}

          {/* Schritt 5 — Gegenwehr */}
          {step === 4 && result ? (
            <>
              <section className="rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint-light">Schritt 5</p>
                <h1 className="mt-2 font-display text-2xl font-semibold tracking-tightest text-white sm:text-3xl">Deine Gegenwehr</h1>
                <p className="mt-2 text-slate-400">Fertige Antwort – kopieren und an das Inkassobüro senden.</p>
                <div className="mt-4">
                  <CopyEmail subject={subject} body={result.emailTemplate || ""} />
                </div>
              </section>

              <section className="rounded-4xl border border-mint/25 bg-gradient-to-br from-mint/10 via-night-surface to-night-inset p-6 bezel-soft">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Fall sichern</p>
                <p className="mt-2 text-slate-300">Speichere dein Ergebnis im kostenlosen Konto, um Fristen-Erinnerungen und den Eskalations-Assistenten zu nutzen.</p>
                <button type="button" onClick={saveCase} className="btn-press mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-mint px-6 font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60">
                  Fall in das Schutz-Dashboard übernehmen
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">Automatisierte Ersteinschätzung basierend auf geltenden Gesetzen – ersetzt keine anwaltliche Rechtsberatung.</p>
              </section>
              <button type="button" onClick={() => setStep(3)} className="btn-press min-h-12 self-start rounded-2xl border border-white/10 bg-night-surface px-5 font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-mint/60">Zurück zum Ergebnis</button>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Question({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night p-4">
      <p className="text-sm font-semibold text-white">{label}</p>
      <div className="mt-2 inline-flex rounded-full bg-white/5 p-1" role="group" aria-label={label}>
        {[["Ja", true], ["Nein", false]].map(([t, v]) => (
          <button key={t as string} type="button" onClick={() => onChange(v as boolean)} aria-pressed={value === v}
            className={"min-h-10 rounded-full px-5 text-sm font-bold transition " + (value === v ? "bg-mint text-night" : "text-slate-300 hover:text-white")}>
            {t as string}
          </button>
        ))}
      </div>
    </div>
  );
}
