// app/fall/[id]/page.tsx – Fall-Detail (geschützt):
// gespeicherte Analyse + Status-Maschine + Eskalations-Assistent (Premium).
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getPremiumUntil } from "@/lib/premium";
import { getEscalation, isCaseStatus, type CaseStatus } from "@/lib/escalation";
import { SiteHeader } from "@/components/blog/SiteHeader";
import { CaseStatusControl } from "@/components/account/CaseStatusControl";
import { CopyEmail } from "@/components/account/CopyEmail";

export const metadata: Metadata = { title: "Fall", robots: { index: false } };

type Posten = { name: string; status: string; betrag: number; paragraph: string; wieso: string };
type ResultJson = {
  stammdaten?: { inkassoName?: string; glaeubiger?: string; aktenzeichen?: string; originalSumme?: number };
  berechnung?: { fairerKern?: number; ersparnis?: number };
  posten?: Posten[];
  emailTemplate?: string;
  hinweise?: string[];
};

const eur = (n: unknown) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const POSTEN_BADGE: Record<string, { label: string; cls: string }> = {
  RECHTENS: { label: "Rechtens", cls: "bg-mint/15 text-mint-light" },
  GEKUERZT: { label: "Gekürzt", cls: "bg-amber-400/15 text-amber-300" },
  NICHT_RECHTENS: { label: "Nicht rechtens", cls: "bg-rose-400/15 text-rose-300" },
};

export default async function FallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/fall/${id}`);

  // RLS stellt sicher, dass nur eigene Fälle sichtbar sind.
  const { data: fall } = await supabase
    .from("cases")
    .select("id,title,status,result_json,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!fall) notFound();

  const premiumUntil = await getPremiumUntil(supabase, user.id);
  const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();

  const status: CaseStatus = isCaseStatus(fall.status) ? fall.status : "offen";
  const guide = getEscalation(status);

  const result = (fall.result_json ?? {}) as ResultJson;
  const stamm = result.stammdaten ?? {};
  const ber = result.berechnung ?? {};
  const posten = Array.isArray(result.posten) ? result.posten : [];
  const hinweise = Array.isArray(result.hinweise) ? result.hinweise : [];

  const orig = Number(stamm.originalSumme) || 0;
  const fair = Number(ber.fairerKern) || 0;
  const saving = ber.ersparnis != null ? Number(ber.ersparnis) : Math.max(0, orig - fair);
  const pct = orig > 0 ? Math.round((saving / orig) * 100) : 0;

  const az =
    stamm.aktenzeichen && String(stamm.aktenzeichen).toLowerCase() !== "unbekannt" ? stamm.aktenzeichen : "";
  const subject = az ? `Teilwiderspruch – Aktenzeichen ${az}` : "Teilwiderspruch gegen Ihre Forderung";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        <Link href="/faelle" className="text-sm font-semibold text-slate-400 hover:text-mint-light">
          ← Meine Fälle
        </Link>
        <h1 className="font-display mt-6 text-3xl font-semibold tracking-tightest text-white sm:text-4xl">
          {(fall.title as string) || stamm.inkassoName || stamm.glaeubiger || "Fall"}
        </h1>
        {az ? <p className="mt-2 text-slate-400">Az. {az}</p> : null}

        {/* ── Status-Maschine ─────────────────────────────────────────── */}
        <section className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Status</p>
          <p className="mt-2 text-sm text-slate-400">Wo steht dein Fall gerade? Tippe an, um zu aktualisieren.</p>
          <div className="mt-4">
            <CaseStatusControl caseId={fall.id as string} status={status} />
          </div>
        </section>

        {/* ── Eskalations-Assistent ───────────────────────────────────── */}
        <section
          className={
            "mt-8 rounded-4xl border p-6 bezel-soft " +
            (guide.urgent
              ? "border-rose-400/30 bg-rose-400/5"
              : "border-mint/20 bg-gradient-to-br from-mint/10 via-night-surface to-night-inset")
          }
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Eskalations-Assistent</p>
            {guide.deadlineDays ? (
              <p className={"text-sm font-semibold " + (guide.urgent ? "text-rose-300" : "text-slate-300")}>
                {guide.urgent ? "⏰ " : ""}Frist: {guide.deadlineDays} Tage
              </p>
            ) : null}
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold text-white">{guide.headline}</h2>
          <p className="mt-2 leading-relaxed text-slate-300">{guide.intro}</p>

          {isPremium ? (
            <ol className="mt-5 space-y-4">
              {guide.steps.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-mint/15 text-sm font-bold text-mint-light">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-bold text-white">{step.title}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-slate-400">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-3xl border border-white/10 bg-night/60 p-5">
              <p className="text-sm text-slate-300">
                🔒 Die geführten nächsten Schritte sind Teil der <strong className="font-semibold text-white">Fall-Begleitung</strong>.
                Schalte sie frei, um den Eskalations-Assistenten und Fristen-Erinnerungen für diesen Fall zu nutzen.
              </p>
              <Link
                href="/konto"
                className="btn-press mt-4 inline-flex items-center gap-2 rounded-full bg-mint px-6 py-3 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
              >
                Fall-Begleitung freischalten
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
          )}
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Hinweis: Dies ist eine technische Orientierungshilfe und keine Rechtsberatung. Bei
            gerichtlichen Schritten oder Unsicherheit wende dich an eine Verbraucherzentrale oder einen Rechtsanwalt.
          </p>
        </section>

        {/* ── Gespeicherte Analyse ────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Gespeicherte Analyse</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft">
              <p className="text-xs text-slate-500">Geforderte Summe</p>
              <p className="mt-1 font-display text-2xl font-semibold text-white">{eur(orig)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft">
              <p className="text-xs text-slate-500">Fairer Kern</p>
              <p className="mt-1 font-display text-2xl font-semibold text-mint-light">{eur(fair)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft">
              <p className="text-xs text-slate-500">Ersparnis</p>
              <p className="mt-1 font-display text-2xl font-semibold text-white">
                {eur(saving)} {pct > 0 ? <span className="text-base text-mint-light">(−{pct}%)</span> : null}
              </p>
            </div>
          </div>

          {posten.length ? (
            <div className="mt-4 grid gap-3">
              {posten.map((p, i) => {
                const badge = POSTEN_BADGE[p.status] || POSTEN_BADGE.GEKUERZT;
                return (
                  <div key={`${p.name}-${i}`} className="rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-white">{p.name}</p>
                        {p.paragraph ? <p className="mt-0.5 text-xs font-medium text-slate-400">{p.paragraph}</p> : null}
                      </div>
                      <span className={"flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold " + badge.cls}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-white">
                      {p.status === "NICHT_RECHTENS" ? (
                        <>
                          <span className="text-slate-500 line-through">{eur(p.betrag)}</span> → {eur(0)}
                        </>
                      ) : (
                        eur(p.betrag)
                      )}
                    </p>
                    {p.wieso ? <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.wieso}</p> : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {hinweise.length ? (
            <div className="mt-4 rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Hinweise</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {hinweise.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ── Fertige Antwort-E-Mail ──────────────────────────────────── */}
        {result.emailTemplate ? (
          <section className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
            <h2 className="font-display text-xl font-semibold tracking-tightest text-white">Fertige Antwort-E-Mail</h2>
            <p className="mt-1 text-sm text-slate-400">Kopiere sie und sende sie an das Inkassobüro.</p>
            <div className="mt-4">
              <CopyEmail subject={subject} body={result.emailTemplate} />
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
