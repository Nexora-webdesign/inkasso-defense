// app/api/cases/route.ts – Speichert ein berechnetes Analyse-Ergebnis als Fall
// im Konto des angemeldeten Nutzers. Datenarm: nur result_json (kein Rohdokument),
// nur mit ausdrücklicher Einwilligung. Log-Hygiene: keine PII/Inhalte loggen.
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const RETENTION_DAYS = 90;
const REMINDER_DAYS = 7;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type ResultShape = {
  stammdaten?: { inkassoName?: unknown; glaeubiger?: unknown; aktenzeichen?: unknown };
  berechnung?: unknown;
};

function deriveTitle(result: ResultShape): string {
  const s = result.stammdaten ?? {};
  const name = String(s.inkassoName || s.glaeubiger || "Forderung").trim().slice(0, 80) || "Forderung";
  const azRaw = s.aktenzeichen != null ? String(s.aktenzeichen).trim() : "";
  const az = azRaw && azRaw.toLowerCase() !== "unbekannt" ? ` · Az. ${azRaw}` : "";
  return (name + az).slice(0, 120);
}

export async function POST(req: Request) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "Bitte zuerst anmelden." }, 401);

  let body: { result?: unknown; consent?: unknown };
  try {
    body = (await req.json()) as { result?: unknown; consent?: unknown };
  } catch {
    return json({ ok: false, error: "Ungültiger Request-Body." }, 400);
  }

  if (body?.consent !== true) {
    return json({ ok: false, error: "Einwilligung erforderlich." }, 400);
  }

  const result = body?.result as ResultShape | undefined;
  if (
    !result ||
    typeof result !== "object" ||
    typeof result.stammdaten !== "object" ||
    result.stammdaten === null ||
    typeof result.berechnung !== "object" ||
    result.berechnung === null
  ) {
    return json({ ok: false, error: "Kein gültiges Analyse-Ergebnis." }, 400);
  }

  const autoDeleteAt = new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("cases")
    .insert({
      user_id: user.id,
      title: deriveTitle(result),
      result_json: result,
      status: "offen",
      auto_delete_at: autoDeleteAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[api/cases] insert error:", (error as { code?: string } | null)?.code);
    return json({ ok: false, error: "Speichern fehlgeschlagen. Bitte erneut versuchen." }, 500);
  }

  // Einwilligungs-Zeitstempel im Profil festhalten (nicht-fatal: Fall ist gespeichert).
  const { error: consentErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, consent_storage_at: new Date().toISOString() }, { onConflict: "id" });
  if (consentErr) {
    console.error("[api/cases] consent stamp error:", (consentErr as { code?: string }).code);
  }

  // Fristen-Erinnerung planen (nicht-fatal). Versand erfolgt per Cron nur bei
  // aktiver Fall-Begleitung; fällig nach REMINDER_DAYS Tagen, solange Fall offen.
  const dueAt = new Date(Date.now() + REMINDER_DAYS * 86_400_000).toISOString();
  const { error: remErr } = await supabase.from("reminders").insert({
    case_id: data.id,
    user_id: user.id,
    type: "widerspruch_14tage",
    due_at: dueAt,
  });
  if (remErr) {
    console.error("[api/cases] reminder insert error:", (remErr as { code?: string }).code);
  }

  return json({ ok: true, id: data.id });
}
