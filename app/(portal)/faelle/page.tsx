// app/(portal)/faelle/page.tsx – Akten-Übersicht der Kanzlei (hell, "Editorial
// Legal-Tech"). Liest die Akten der Kanzlei AUSSCHLIESSLICH über die RLS-Policies
// (kein user_id-Filter). Reine Darstellung – kein Rechtskern, keine API.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AktenCard } from "@/components/portal/AktenCard";

export const metadata: Metadata = { title: "Akten", robots: { index: false } };

type MandantEmbed = { name: string | null; typ: string | null };
type CaseRow = {
  id: string;
  aktenzeichen: string | null;
  status: string;
  frist_widerspruch: string | null;
  created_at: string;
  result_json: {
    stammdaten?: { glaeubiger?: string; inkassoName?: string; aktenzeichen?: string };
    berechnung?: { ersparnis?: number };
  } | null;
  // PostgREST liefert die to-one-Relation als Objekt (oder null); defensiv auch Array.
  mandanten: MandantEmbed | MandantEmbed[] | null;
};

function oneMandant(m: CaseRow["mandanten"]): MandantEmbed | null {
  if (!m) return null;
  return Array.isArray(m) ? (m[0] ?? null) : m;
}

export default async function FaellePage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/faelle");

  // Nur RLS regelt die Sichtbarkeit (Kanzlei-Mitgliedschaft) – kein zusätzlicher Filter.
  const { data } = await supabase
    .from("cases")
    .select("id, aktenzeichen, status, frist_widerspruch, created_at, result_json, mandanten(name, typ)")
    .order("created_at", { ascending: false });
  const cases = (data ?? []) as unknown as CaseRow[];

  return (
    <>
      <header>
        <p className="font-zahl text-xs uppercase tracking-[0.18em] text-akten">Übersicht</p>
        <h1 className="mt-1.5 font-akte text-3xl font-semibold tracking-[-0.01em] text-tinte sm:text-4xl">
          Akten
        </h1>
        {cases.length > 0 ? (
          <p className="mt-1 text-sm text-tinte-soft">
            {cases.length} {cases.length === 1 ? "Akte" : "Akten"} in dieser Kanzlei.
          </p>
        ) : null}
      </header>

      {cases.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {cases.map((c) => {
            const stamm = c.result_json?.stammdaten ?? {};
            const m = oneMandant(c.mandanten);
            const typ = m?.typ === "verbraucher" || m?.typ === "unternehmer" ? m.typ : null;
            return (
              <li key={c.id}>
                <AktenCard
                  id={c.id}
                  aktenzeichen={c.aktenzeichen ?? stamm.aktenzeichen ?? null}
                  glaeubiger={stamm.glaeubiger || stamm.inkassoName || null}
                  mandantName={m?.name ?? null}
                  mandantTyp={typ}
                  status={c.status}
                  fristWiderspruch={c.frist_widerspruch}
                  beanstandbar={c.result_json?.berechnung?.ersparnis ?? null}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8 rounded-xl border border-haar bg-karte p-10 text-center shadow-akte">
          <p className="font-akte text-lg font-medium text-tinte">Noch keine Akten</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tinte-soft">
            Neue Akten entstehen aus der Forderungsprüfung. Die Eingangsprüfung wird in Kürze direkt
            ins Portal integriert – dann legen Sie hier Ihre erste Akte an.
          </p>
        </div>
      )}
    </>
  );
}
