// app/faelle/page.tsx – Liste der gespeicherten Fälle (geschützt).
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SiteHeader } from "@/components/blog/SiteHeader";

export const metadata: Metadata = { title: "Meine Fälle", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  widerspruch_gesendet: "Widerspruch gesendet",
  mahnbescheid_erhalten: "Mahnbescheid erhalten",
  erledigt: "Erledigt",
};

export default async function FaellePage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/faelle");

  const { data: cases } = await supabase
    .from("cases")
    .select("id,title,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        <h1 className="font-display text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
          Meine Fälle
        </h1>

        {cases && cases.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {cases.map((c) => (
              <li key={c.id as string}>
                <Link
                  href={`/fall/${c.id}`}
                  className="group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-night-surface/60 p-5 bezel-soft outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-mint/60"
                >
                  <span>
                    <span className="font-bold text-white">{(c.title as string) || "Fall"}</span>
                    <span className="mt-0.5 block text-sm text-slate-400">
                      {STATUS_LABEL[c.status as string] || (c.status as string)}
                    </span>
                  </span>
                  <span className="text-mint-light">→</span>
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
      </main>
    </>
  );
}
