// app/api/cases/[id]/letters/route.ts
// Folgeschreiben zu einem Fall hochladen → KI ordnet ein → Analyse speichern.
// Premium-pflichtig (Fall-Begleitung). Speichert NUR die Analyse, kein Rohdokument.
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getPremiumUntil } from "@/lib/premium";
import {
  FOLLOWUP_SYSTEM_PROMPT,
  FOLLOWUP_JSON_SCHEMA,
  isFollowupFacts,
  type FollowupFacts,
} from "@/lib/followup";
import { getLetterGuide, isStatusAdvance } from "@/lib/letter-guide";
import { letterMatchesCase, type CaseStamm } from "@/lib/casematch";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const client = new Anthropic();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "Bitte zuerst anmelden." }, 401);

  // Fall laden (RLS: nur eigener Fall sichtbar).
  const { data: fall } = await supabase
    .from("cases")
    .select("id,status,result_json")
    .eq("id", id)
    .maybeSingle();
  if (!fall) return json({ ok: false, error: "Fall nicht gefunden." }, 404);

  // Premium-Pflicht (Fall-Begleitung).
  const premiumUntil = await getPremiumUntil(supabase, user.id);
  const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();
  if (!isPremium) {
    return json({ ok: false, error: "Dafür ist die Fall-Begleitung nötig." }, 402);
  }

  // Datei lesen + validieren.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, error: "Ungültiger Upload." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ ok: false, error: "Es wurde kein Dokument übermittelt." }, 400);
  }
  const mediaType = file.type || "application/octet-stream";
  const isPdf = mediaType === "application/pdf";
  if (!isPdf && !IMAGE_TYPES.includes(mediaType)) {
    return json({ ok: false, error: "Bitte ein Foto (JPG/PNG/WebP/GIF) oder PDF hochladen." }, 415);
  }
  if (file.size > 10 * 1024 * 1024) {
    return json({ ok: false, error: "Die Datei ist zu groß (max. 10 MB)." }, 413);
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const documentBlock = isPdf
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
    : {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: base64,
        },
      };

  // KI: nur Klassifikation + neutrale Zusammenfassung (Structured Outputs).
  let res;
  try {
    res = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0,
      system: FOLLOWUP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: [documentBlock, { type: "text", text: "Ordne dieses Folgeschreiben ein." }] }],
      output_config: { format: { type: "json_schema", schema: FOLLOWUP_JSON_SCHEMA } },
    });
  } catch (err) {
    console.error("[api/cases/letters] LLM-Fehler:", (err as Error)?.message);
    return json({ ok: false, error: "Die Analyse ist fehlgeschlagen. Bitte erneut versuchen." }, 502);
  }

  if (res.stop_reason === "refusal") {
    return json({ ok: false, error: "Das Dokument konnte aus Sicherheitsgründen nicht verarbeitet werden." }, 422);
  }
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return json({ ok: false, error: "Leere Modellantwort." }, 502);
  }
  let facts: unknown;
  try {
    facts = JSON.parse(textBlock.text);
  } catch {
    return json({ ok: false, error: "Die Analyse hatte ein unerwartetes Format." }, 502);
  }
  if (!isFollowupFacts(facts)) {
    return json({ ok: false, error: "Die Analyse hatte ein unerwartetes Format." }, 502);
  }
  const f = facts as FollowupFacts;
  if (!f.dokument_erkannt) {
    return json({ ok: false, error: "Auf dem Dokument war kein Schreiben in dieser Sache erkennbar." }, 422);
  }

  // Zugehörigkeit prüfen: Folgebrief muss vom selben Inkasso/Gläubiger ODER
  // mit dem gleichen Aktenzeichen stammen wie der Fall – sonst ablehnen.
  const stamm = ((fall.result_json ?? {}) as { stammdaten?: CaseStamm }).stammdaten ?? {};
  const match = letterMatchesCase(stamm, { absender_name: f.absender_name, aktenzeichen: f.aktenzeichen });
  if (!match.ok) {
    return json(
      {
        ok: false,
        code: "case_mismatch",
        error:
          "Diese PDF gehört nicht zu diesem Fall – sie stammt von einem anderen Inkasso oder hat ein anderes Aktenzeichen. Bitte lade nur Schreiben zu genau diesem Fall hoch.",
      },
      422,
    );
  }

  const analysis = {
    letterType: f.letter_type,
    summary: f.kurzzusammenfassung,
    absender: f.absender_name,
    aktenzeichen: f.aktenzeichen,
    istGerichtlich: f.ist_gerichtlich,
    fristTage: Number(f.genannte_frist_tage) || 0,
    zustelldatum: f.zustelldatum || "",
    fordertZahlung: f.fordert_zahlung,
  };

  const { data: inserted, error: insErr } = await supabase
    .from("case_letters")
    .insert({
      case_id: id,
      user_id: user.id,
      letter_type: f.letter_type,
      summary: f.kurzzusammenfassung,
      analysis_json: analysis,
    })
    .select("id, created_at")
    .single();
  if (insErr || !inserted) {
    console.error("[api/cases/letters] insert error:", (insErr as { code?: string } | null)?.code);
    return json({ ok: false, error: "Speichern fehlgeschlagen. Bitte erneut versuchen." }, 500);
  }

  // Status-Fortschritt: erkannter Gerichtsbrief bewegt den Fall ggf. weiter.
  const guide = getLetterGuide(f.letter_type);
  let statusChanged = false;
  if (guide.suggestNext && isStatusAdvance(String(fall.status), guide.suggestNext)) {
    const { error: stErr } = await supabase
      .from("cases")
      .update({ status: guide.suggestNext, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (!stErr) statusChanged = true;
  }

  // Erinnerung anlegen, wenn eine Tagesfrist genannt ist (Versand via Cron, nur Premium).
  if (analysis.fristTage > 0) {
    const lead = analysis.fristTage > 3 ? analysis.fristTage - 3 : analysis.fristTage;
    const dueAt = new Date(Date.now() + lead * 86_400_000).toISOString();
    await supabase
      .from("reminders")
      .insert({ case_id: id, user_id: user.id, type: "widerspruch_14tage", due_at: dueAt });
  }

  console.log(`[api/cases/letters] saved type=${f.letter_type} statusChanged=${statusChanged}`);
  return json({ ok: true, id: inserted.id, letterType: f.letter_type, statusChanged });
}
