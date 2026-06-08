// app/api/cases/[id]/route.ts – Fall löschen (DSGVO-Self-Service).
// Entfernt den Fall; zugehörige Schreiben (case_letters) und Erinnerungen
// (reminders) werden per ON DELETE CASCADE automatisch mitgelöscht.
import { cookies } from "next/headers";
import { json } from "@/lib/http";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";


export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "Bitte zuerst anmelden." }, 401);

  // RLS (Kanzlei-Mitgliedschaft, Rolle inhaber/anwalt) stellt sicher, dass nur
  // berechtigte Nutzer Akten der eigenen Kanzlei löschen können.
  const { data, error } = await supabase
    .from("cases")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[api/cases DELETE] error:", (error as { code?: string }).code);
    return json({ ok: false, error: "Löschen fehlgeschlagen. Bitte erneut versuchen." }, 500);
  }
  if (!data) return json({ ok: false, error: "Fall nicht gefunden." }, 404);

  return json({ ok: true });
}
