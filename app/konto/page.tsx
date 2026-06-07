// app/konto/page.tsx – Konto: zustandsbewusst (Neukunde vs. Stammkunde) + Fall-Begleitung.
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

function fmt(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  widerspruch_gesendet: "Widerspruch gesendet",
  mahnbescheid_erhalten: "Mahnbescheid erhalten",
  erledigt: "Erledigt",
};

const STEPS = [
  { t: "Forderung prüfen", d: "Lade dein Inkasso-Schreiben hoch – die Analyse ist kostenlos und ohne Konto." },
  { t: "Ergebnis als Fall speichern", d: "Sichere das Ergebnis in deinem Konto, um es jederzeit wiederzufinden." },
  { t: "Fall-Begleitung freischalten", d: "Optional: Fristen-Erinnerungen + Eskalations-Assistent für deinen Fall." },
];

const BENEFITS = [
  "Fristen-Erinnerungen (z. B. 14-Tage-Widerspruchsfrist)",
  "Eskalations-Assistent für die nächsten Schritte",
  "Alle deine Fälle an einem Ort",
];

function Steps() {
  return (
    <ol className="mt-4 grid gap-3 md:grid-cols-3">
      {STEPS.map((step, i) => (
        <li key={step.t} className="rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint/15 font-bold text-mint-light">
            {i + 1}
          </span>
          <p className="mt-3 font-bold text-white">{step.t}</p>
          <p className="mt-1 text-sm text-slate-400">{step.d}</p>
        </li>
      ))}
    </ol>
  );
}

export default async function KontoPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/konto");

  const premiumUntil = await getPremiumUntil(supabase, user.id);
  const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();

  // Letzte Fälle + Gesamtzahl in einem Query.
  const { data: recentCases, count } = await supabase
    .from("cases")
    .select("id,title,status,created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);
  const total = count ?? recentCases?.length ?? 0;
  const hasCases = total > 0;

  // Lemon-Squeezy Checkout der „Fall-Begleitung" (öffentlich, per Env überschreibbar).
  const checkoutUrl =
    process.env.NEXT_PUBLIC_LS_CASE_CHECKOUT_URL ||
    "https://nexora-services.lemonsqueezy.com/checkout/buy/3199fec3-f4da-40c1-b5e0-82aa071e7038";

  const PremiumCard = (
    <section className="mt-8 rounded-4xl border border-mint/25 bg-night-surface/60 p-6 bezel-soft">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Fall-Begleitung</p>
      <p className="mt-2 text-slate-200">
        ✅ Aktiv bis <strong className="font-semibold text-white">{fmt(premiumUntil!)}</strong> –
        Fristen-Erinnerungen und Eskalations-Assistent sind freigeschaltet.
      </p>
    </section>
  );

  const BuyCard = (
    <section className="mt-8 rounded-4xl border border-mint/20 bg-gradient-to-br from-mint/10 via-night-surface to-night-inset p-6 bezel-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Fall-Begleitung</p>
        <p className="text-sm font-semibold text-white">{CASE_PRICE_LABEL}</p>
      </div>
      <p className="mt-2 text-slate-300">
        Optionaler Mehrwert für deinen Fall – die Analyse selbst bleibt immer kostenlos.
        Die Freischaltung passiert nach dem Kauf <strong className="font-semibold text-white">automatisch</strong>.
      </p>
      <ul className="mt-4 space-y-2">
        {BENEFITS.map((b) => (
          <li key={b} className="flex gap-2.5 text-sm text-slate-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-mint-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
            {b}
          </li>
        ))}
      </ul>
      <BuyAndActivate checkoutUrl={checkoutUrl} priceLabel={CASE_PRICE_LABEL} />
    </section>
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-mint-light">Dein Konto</span>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
          {hasCases ? "Willkommen zurück" : "Willkommen – dein Konto ist aktiv"}
        </h1>
        <p className="mt-3 text-slate-400">
          Eingeloggt als <strong className="font-semibold text-white">{user.email}</strong>.
        </p>

        {hasCases ? (
          /* ─────────────────── Stammkunde: Fälle zuerst ─────────────────── */
          <>
            {isPremium ? PremiumCard : null}

            <section className="mt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                  Deine Fälle{total > recentCases!.length ? ` (${total})` : ""}
                </h2>
                <a href="/" className="text-sm font-semibold text-mint-light hover:underline">
                  + Neue Forderung prüfen
                </a>
              </div>
              <ul className="mt-4 space-y-3">
                {recentCases!.map((c) => (
                  <li key={c.id as string}>
                    <Link
                      href={`/fall/${c.id}`}
                      className="group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-mint/60"
                    >
                      <span>
                        <span className="font-bold text-white">{(c.title as string) || "Fall"}</span>
                        <span className="mt-0.5 block text-sm text-slate-400">
                          {STATUS_LABEL[c.status as string] || (c.status as string)}
                          {" · "}
                          {fmt(new Date(c.created_at as string))}
                        </span>
                      </span>
                      <span className="text-mint-light">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {total > recentCases!.length ? (
                <Link href="/faelle" className="mt-4 inline-block text-sm font-semibold text-mint-light hover:underline">
                  Alle {total} Fälle ansehen →
                </Link>
              ) : null}
            </section>

            {!isPremium ? BuyCard : null}

            {/* Onboarding für Stammkunden eingeklappt */}
            <details className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
              <summary className="cursor-pointer text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                So funktioniert's
              </summary>
              <Steps />
            </details>
          </>
        ) : (
          /* ─────────────────── Neukunde: volles Onboarding ──────────────── */
          <>
            {isPremium ? PremiumCard : null}

            <section className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">So funktioniert's</h2>
              <Steps />
            </section>

            <section className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
              <p className="text-slate-300">
                Noch kein Fall gespeichert. Starte mit einer <strong className="font-semibold text-white">kostenlosen Analyse</strong> –
                das Ergebnis kannst du danach hier in deinem Konto sichern.
              </p>
              <a
                href="/"
                className="btn-press mt-4 inline-flex items-center gap-2 rounded-full bg-mint px-6 py-3 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
              >
                Forderung prüfen
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </section>

            {!isPremium ? BuyCard : null}
          </>
        )}

        {/* ── Footer-Aktionen ─────────────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/faelle"
            className="btn-press rounded-full border border-white/10 bg-night-surface px-5 py-2.5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
          >
            Meine Fälle
          </Link>
          <form action="/auth/signout" method="post">
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
