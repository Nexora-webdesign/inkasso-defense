// app/fall/[id]/page.tsx – Fall-Detail (geschützt). Minimal in diesem Slice;
// Status-Maschine, Fristen & Reminder folgen im nächsten Schritt.
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SiteHeader } from "@/components/blog/SiteHeader";

export const metadata: Metadata = { title: "Fall", robots: { index: false } };

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
    .select("id,title,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!fall) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        <Link href="/faelle" className="text-sm font-semibold text-slate-400 hover:text-mint-light">
          ← Meine Fälle
        </Link>
        <h1 className="font-display mt-6 text-3xl font-semibold tracking-tightest text-white sm:text-4xl">
          {(fall.title as string) || "Fall"}
        </h1>
        <p className="mt-3 text-slate-400">
          Detailansicht mit Status-Maschine, Fristen und Erinnerungen folgt im nächsten Schritt.
        </p>
      </main>
    </>
  );
}
