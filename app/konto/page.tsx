// app/konto/page.tsx – Ruhiges Übersichts-Dashboard (Stress-reduzierend) +
// ehrliche Conversion-Nudges für die Fall-Begleitung (9,90 €).
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getPremiumUntil } from "@/lib/premium";
import { CASE_PRICE_LABEL } from "@/lib/pricing";
import { SiteHeader } from "@/components/blog/SiteHeader";
import { BuyAndActivate } from "@/components/account/BuyAndActivate";

export const metadata: Metadata = { title: "Mein Konto", robots: { index: false } };

const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
const eur = (n: unknown) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  widerspruch_gesendet: "Widerspruch gesendet",
  mahnbescheid_erhalten: "Mahnbescheid erhalten",
  erledigt: "Erledigt",
};
const STATUS_CLS: Record<string, string> = {
  offen: "bg-mint/15 text-mint-light",
  widerspruch_gesendet: "bg-sky-400/15 text-sky-300",
  mahnbescheid_erhalten: "bg-amber-400/15 text-amber-300",
  erledigt: "bg-white/10 text-slate-300",
};

const BENEFITS = [
  "Wir erinnern dich automatisch an Fristen (z. B. 14-Tage-Widerspruch)",
  "Eskalations-Assistent: was bei jedem neuen Brief zu tun ist",
  "Weitere Schreiben hochladen – durchgehende Begleitung",
];

const Check = () => (
  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-mint-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
);
const Arrow = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

type CaseRow = {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  result_json: { berechnung?: { ersparnis?: number } } | null;
};

export default async function KontoPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/konto");

  const premiumUntil = await getPremiumUntil(supabase, user.id);
  const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();
  const premiumLabel = premiumUntil ? fmt(premiumUntil) : "";

  // Fälle (für Übersicht + Ersparnis-Anker).
  const { data: casesData, count } = await supabase
    .from("cases")
    .select("id,title,status,created_at,result_json", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const cases = (casesData ?? []) as CaseRow[];
  const total = count ?? cases.length;
  const hasCases = total > 0;
  const recent = cases.slice(0, 5);
  const totalErsparnis = cases.reduce((s, c) => s + (Number(c.result_json?.berechnung?.ersparnis) || 0), 0);
  const openCases = cases.filter((c) => c.status !== "erledigt").length;

  // Nächste offene Frist (für ruhige Orientierung + ehrliche Verlustaversion).
  const { data: nextRem } = await supabase
    .from("reminders")
    .select("due_at")
    .eq("user_id", user.id)
    .is("sent_at", null)
    .order("due_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  let fristText = "Keine offene Frist";
  let fristUrgent = false;
  if (nextRem?.due_at) {
    const days = Math.ceil((new Date(nextRem.due_at as string).getTime() - Date.now()) / 86_400_000);
    if (days <= 0) {
      fristText = "Jetzt fällig";
      fristUrgent = true;
    } else {
      fristText = `in ${days} ${days === 1 ? "Tag" : "Tagen"}`;
      fristUrgent = days <= 3;
    }
  }

  const checkoutUrl =
    process.env.NEXT_PUBLIC_LS_CASE_CHECKOUT_URL ||
    "https://nexora-services.lemonsqueezy.com/checkout/buy/3199fec3-f4da-40c1-b5e0-82aa071e7038";

  // ── Conversion-Karte (nur Nicht-Premium mit Fällen): ehrliche Nudges ──────
  const ConversionCard = (
    <section className="mt-6 overflow-hidden rounded-4xl border border-mint/25 bg-gradient-to-br from-mint/12 via-night-surface to-night-inset p-6 bezel-soft sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Fall-Begleitung</p>
        <p className="text-sm font-semibold text-white tabular-nums">{CASE_PRICE_LABEL}</p>
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tightest text-white">
        Sichere deinen Fall ab – wir behalten die Fristen im Blick.
      </h2>

      {/* Anchoring: echte Ersparnis vs. kleiner Einmalpreis */}
      {totalErsparnis > 0 ? (
        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3 rounded-3xl border border-white/10 bg-night/50 p-5">
          <div>
            <p className="text-xs text-slate-400">Bereits erkannt – zu viel gefordert</p>
            <p className="font-display text-3xl font-semibold text-mint-light tabular-nums">{eur(totalErsparnis)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Deine Absicherung dafür</p>
            <p className="font-display text-3xl font-semibold text-white tabular-nums">9,90 €</p>
            <p className="text-xs text-slate-500">einmalig · ≈ 0,11 € pro Tag</p>
          </div>
        </div>
      ) : null}

      {/* Verlustaversion – an ECHTEN Fristen */}
      <p className="mt-5 leading-relaxed text-slate-300">
        Inkasso-Fristen sind kurz – oft nur <strong className="font-semibold text-white">14 Tage</strong>.
        Verpasst du sie, drohen Mahnbescheid und zusätzliche Kosten. Mit der Fall-Begleitung
        erinnern wir dich <strong className="font-semibold text-white">automatisch</strong> und sagen dir bei
        jedem neuen Brief, was zu tun ist.
      </p>

      <ul className="mt-4 space-y-2">
        {BENEFITS.map((b) => (
          <li key={b} className="flex gap-2.5 text-sm text-slate-300">
            <Check />
            {b}
          </li>
        ))}
      </ul>

      <BuyAndActivate checkoutUrl={checkoutUrl} priceLabel={CASE_PRICE_LABEL} />

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>Sichere Zahlung über Lemon Squeezy</span>
        <span aria-hidden="true">·</span>
        <span>Einmalkauf, kein Abo</span>
        <span aria-hidden="true">·</span>
        <span>90 Tage Begleitung</span>
      </p>
    </section>
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        {/* Ruhiger Header */}
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-mint-light">Dein Dashboard</span>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
          {hasCases ? "Du hast alles im Blick." : "Willkommen – dein Konto ist startklar."}
        </h1>
        <p className="mt-3 text-slate-400">
          {hasCases
            ? "Hier siehst du den Stand deiner Fälle und anstehende Fristen – ruhig und übersichtlich."
            : "Prüfe dein Inkasso-Schreiben kostenlos und behalte deinen Fall hier im Überblick."}
        </p>

        {/* ── Auf einen Blick ─────────────────────────────────────────── */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft">
            <p className="text-xs text-slate-400">Offene Fälle</p>
            <p className="mt-1 font-display text-3xl font-semibold text-white tabular-nums">{openCases}</p>
            {total > openCases ? <p className="text-xs text-slate-500">{total} insgesamt</p> : null}
          </div>
          <div className={"rounded-3xl border p-5 bezel-soft " + (fristUrgent ? "border-amber-400/30 bg-amber-400/5" : "border-white/10 bg-night-surface/60")}>
            <p className="text-xs text-slate-400">Nächste Frist</p>
            <p className={"mt-1 font-display text-3xl font-semibold tabular-nums " + (fristUrgent ? "text-amber-300" : "text-white")}>{fristText}</p>
            {!isPremium && nextRem?.due_at ? <p className="text-xs text-slate-500">Erinnerung mit Fall-Begleitung</p> : null}
          </div>
          <div className="rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft">
            <p className="text-xs text-slate-400">Fall-Begleitung</p>
            <p className={"mt-1 font-display text-2xl font-semibold " + (isPremium ? "text-mint-light" : "text-slate-300")}>
              {isPremium ? "Aktiv" : "Nicht aktiv"}
            </p>
            {isPremium ? <p className="text-xs text-slate-500">bis {premiumLabel}</p> : null}
          </div>
        </section>

        {hasCases ? (
          <>
            {/* ── Fälle-Übersicht ───────────────────────────────────────── */}
            <section className="mt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Deine Fälle</h2>
                <a href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-mint-light hover:underline">
                  Neue Forderung prüfen
                </a>
              </div>
              <ul className="mt-4 space-y-3">
                {recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/fall/${c.id}`}
                      className="group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-mint/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-white">{c.title || "Fall"}</span>
                        <span className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                          <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + (STATUS_CLS[c.status] || "bg-white/10 text-slate-300")}>
                            {STATUS_LABEL[c.status] || c.status}
                          </span>
                          <span>{fmt(new Date(c.created_at))}</span>
                        </span>
                      </span>
                      <span className="text-mint-light transition-transform group-hover:translate-x-0.5">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {total > recent.length ? (
                <Link href="/faelle" className="mt-4 inline-block text-sm font-semibold text-mint-light hover:underline">
                  Alle {total} Fälle ansehen →
                </Link>
              ) : null}
            </section>

            {isPremium ? (
              <section className="mt-8 rounded-4xl border border-mint/25 bg-night-surface/60 p-6 bezel-soft">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">
                  <Check /> Fall-Begleitung aktiv
                </p>
                <p className="mt-2 text-slate-200">
                  Aktiv bis <strong className="font-semibold text-white">{premiumLabel}</strong>. Wir behalten deine
                  Fristen im Blick – lad einfach jedes neue Schreiben beim jeweiligen Fall hoch.
                </p>
              </section>
            ) : (
              ConversionCard
            )}
          </>
        ) : (
          <>
            {/* ── Neukunde: ruhiger Start ───────────────────────────────── */}
            <section className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft sm:p-7">
              <h2 className="font-display text-2xl font-semibold tracking-tightest text-white">In 2 Minuten Klarheit</h2>
              <p className="mt-2 leading-relaxed text-slate-300">
                Lade dein Inkasso-Schreiben hoch – die <strong className="font-semibold text-white">Analyse ist kostenlos</strong> und
                zeigt dir, welche Posten überhöht sind. Das Ergebnis sicherst du danach hier in deinem Konto.
              </p>
              <a
                href="/"
                className="btn-press mt-5 inline-flex items-center gap-2 rounded-full bg-mint px-6 py-3 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
              >
                Forderung kostenlos prüfen
                <Arrow />
              </a>
            </section>

            {!isPremium ? (
              <section className="mt-6 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Später: Fall-Begleitung</p>
                  <p className="text-sm font-semibold text-white tabular-nums">{CASE_PRICE_LABEL}</p>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Sobald du einen Fall gespeichert hast, kannst du die optionale Begleitung freischalten:
                  automatische Fristen-Erinnerungen, Eskalations-Assistent und das Hochladen weiterer Briefe.
                </p>
              </section>
            ) : null}
          </>
        )}

        {/* ── Footer-Aktionen ─────────────────────────────────────────── */}
        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/5 pt-6">
          <Link
            href="/faelle"
            className="btn-press rounded-full border border-white/10 bg-night-surface px-5 py-2.5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
          >
            Meine Fälle
          </Link>
          <span className="text-xs text-slate-500">{user.email}</span>
          <form action="/auth/signout" method="post" className="ml-auto">
            <button
              type="submit"
              className="btn-press rounded-full px-5 py-2.5 text-sm font-semibold text-slate-400 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-mint/60"
            >
              Abmelden
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
