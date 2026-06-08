// app/api/cases/route.ts – Speichert ein berechnetes Analyse-Ergebnis als Fall
// im Konto des angemeldeten Nutzers. Datenarm: nur result_json (kein Rohdokument),
// nur mit ausdrücklicher Einwilligung. Log-Hygiene: keine PII/Inhalte loggen.
import { cookies } from "next/headers";
import { json } from "@/lib/http";
import { createClient } from "@/utils/supabase/server";
import { resolveKanzleiId, mandantBelongsToKanzlei } from "@/lib/kanzlei";
import { buildReminderRows, WIDERSPRUCH_FRIST_TAGE } from "@/lib/reminders";
import { RULES_VERSION } from "@/lib/rules";

export const runtime = "nodejs";
export const maxDuration = 15;


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

  let body: { result?: unknown; consent?: unknown; kanzleiId?: unknown; mandantId?: unknown };
  try {
    body = (await req.json()) as typeof body;
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

  // Kanzlei serverseitig auflösen (Anti-Spoofing: Client-Wunsch nur, wenn Mitglied).
  // Kein „1 Fall pro Konto" mehr – eine Kanzlei verwaltet beliebig viele Akten.
  const requestedKanzlei = typeof body.kanzleiId === "string" ? body.kanzleiId : undefined;
  const kres = await resolveKanzleiId(supabase, user.id, requestedKanzlei);
  if (!kres.ok) {
    if (kres.code === "no_kanzlei")
      return json({ ok: false, code: kres.code, error: "Dein Konto ist keiner Kanzlei zugeordnet." }, 409);
    if (kres.code === "ambiguous_kanzlei")
      return json({ ok: false, code: kres.code, error: "Bitte Kanzlei wählen." }, 400);
    if (kres.code === "forbidden_kanzlei")
      return json({ ok: false, code: kres.code, error: "Kein Zugriff auf diese Kanzlei." }, 403);
    return json({ ok: false, error: "Kanzlei konnte nicht ermittelt werden." }, 500);
  }
  const kanzleiId = kres.kanzleiId;

  // Optionaler Mandantenbezug (nullable): wenn gesetzt, muss er zur Kanzlei gehören
  // (verhindert Cross-Tenant-Verknüpfung; cases-INSERT-Policy prüft nur die Rolle).
  const mandantId = typeof body.mandantId === "string" && body.mandantId ? body.mandantId : null;
  if (mandantId && !(await mandantBelongsToKanzlei(supabase, mandantId, kanzleiId))) {
    return json({ ok: false, error: "Der gewählte Mandant gehört nicht zu dieser Kanzlei." }, 400);
  }

  // Vorgabe 4: Kanzlei-Akten unterliegen KEINER Auto-Löschung -> auto_delete_at bleibt null.
  const { data, error } = await supabase
    .from("cases")
    .insert({
      kanzlei_id: kanzleiId,
      created_by: user.id,
      mandant_id: mandantId,
      title: deriveTitle(result),
      result_json: result,
      status: "offen",
      rules_version: RULES_VERSION,
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

  // Mehrstufige Fristen-Erinnerungen planen (nicht-fatal). Versand per Cron nur
  // bei aktiver Fall-Begleitung & solange Fall offen. Mehrere Stufen (7/2/0 Tage
  // vor der 14-Tage-Frist), damit ein einzelner Ausfall nicht zum Fristverlust führt.
  const remRows = buildReminderRows(data.id as string, WIDERSPRUCH_FRIST_TAGE, Date.now(), user.id);
  const { error: remErr } = await supabase.from("reminders").insert(remRows);
  if (remErr) {
    console.error("[api/cases] reminder insert error:", (remErr as { code?: string }).code);
  }

  return json({ ok: true, id: data.id });
}
