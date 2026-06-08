// app/faelle/page.tsx – Liste der gespeicherten Fälle (geschützt, Dashboard-Shell).
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getPremiumUntil } from "@/lib/premium";
import { fmtDate, STATUS_LABEL, STATUS_CLS } from "@/lib/format";
import { DashboardShell } from "@/components/account/DashboardShell";

export const metadata: Metadata = { title: "Meine Fälle", robots: { index: false } };

export default async function FaellePage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/faelle");

  const premiumUntil = await getPremiumUntil(supabase, user.id);
  const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();
  const premiumLabel = premiumUntil ? fmtDate(premiumUntil) : "";

  const { data: cases } = await supabase
    .from("cases")
    .select("id,title,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell email={user.email} premiumActive={isPremium} premiumLabel={premiumLabel}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-mint-light">Übersicht</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tightest text-white sm:text-4xl">Meine Fälle</h1>
        </div>
        <a
          href="/"
          className="btn-press inline-flex items-center gap-2 rounded-full bg-mint px-5 py-2.5 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
        >
          Forderung prüfen
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>

      {cases && cases.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {cases.map((c) => (
            <li key={c.id as string}>
              <Link
                href={`/fall/${c.id}`}
                className="group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-mint/60"
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold text-white">{(c.title as string) || "Fall"}</span>
                  <span className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + (STATUS_CLS[c.status as string] || "bg-white/10 text-slate-300")}>
                      {STATUS_LABEL[c.status as string] || (c.status as string)}
                    </span>
                    <span>{fmtDate(new Date(c.created_at as string))}</span>
                  </span>
                </span>
                <span className="text-mint-light transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-8 text-center bezel-soft">
          <p className="text-slate-300">Du hast noch keinen Fall gespeichert.</p>
          <p className="mt-2 text-sm text-slate-500">
            Starte mit einer kostenlosen Analyse und speichere das Ergebnis als Fall.
          </p>
          <a
            href="/"
            className="btn-press mt-5 inline-flex rounded-full bg-mint px-6 py-3 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
          >
            Forderung prüfen
          </a>
        </div>
      )}
    </DashboardShell>
  );
}
