// app/konto/page.tsx – Konto + Fall-Begleitung aktivieren (geschützt).
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getPremiumUntil } from "@/lib/premium";
import { SiteHeader } from "@/components/blog/SiteHeader";
import { ActivateForm } from "@/components/account/ActivateForm";

export const metadata: Metadata = { title: "Mein Konto", robots: { index: false } };

function fmt(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function KontoPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/konto");

  const premiumUntil = await getPremiumUntil(supabase, user.id);
  const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        <h1 className="font-display text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
          Mein Konto
        </h1>
        <p className="mt-3 text-slate-400">
          Angemeldet als <strong className="font-semibold text-white">{user.email}</strong>.
        </p>

        {/* Premium-Status */}
        <section className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mint-light">Fall-Begleitung</p>
          {isPremium ? (
            <p className="mt-2 text-slate-200">
              ✅ Aktiv bis <strong className="font-semibold text-white">{fmt(premiumUntil!)}</strong> –
              Fristen-Erinnerungen und Eskalations-Assistent sind freigeschaltet.
            </p>
          ) : (
            <>
              <p className="mt-2 text-slate-300">
                Noch nicht aktiv. Mit einem Freischaltcode (90 Tage Begleitung) erhältst du
                Fristen-Erinnerungen und den Eskalations-Assistenten für deinen Fall.
              </p>
              <ActivateForm />
            </>
          )}
        </section>

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
