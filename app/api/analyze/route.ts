// app/api/analyze/route.ts
// -----------------------------------------------------------------------------
// Nimmt das vom Frontend gesendete FormData (Feld "file", optional "onboarding"),
// ruft Claude mit Structured Outputs auf und liefert IMMER eine stabile Hülle:
//   { ok: true, data: <FrontendPayload> }  oder  { ok: false, error: "..." }
// Das Frontend muss dadurch nie JSON "raten" – der "string did not match"-Fehler
// kann nicht mehr entstehen.
// -----------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_JSON_SCHEMA,
  SYSTEM_PROMPT,
  DEFAULT_ONBOARDING,
  buildUserContext,
  buildPayload,
  isWellFormed,
  type Onboarding,
} from "@/lib/inkasso-analysis";

// Vision + längere Dokumente brauchen mehr als 10s -> Node-Runtime, erhöhtes Limit.
export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic(); // ANTHROPIC_API_KEY aus der Env

// Free-Tier günstig/schnell (Haiku), Premium/Härtefälle genauer (Sonnet/Opus).
// Default schnell, damit es sicher unter dem Vercel-Limit bleibt; via Env umschaltbar.
const MODEL = process.env.ANALYZE_MODEL || "claude-haiku-4-5";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function parseOnboarding(raw: unknown): Onboarding {
  if (typeof raw !== "string") return DEFAULT_ONBOARDING;
  try {
    const o = JSON.parse(raw);
    return {
      ersterBrief: o.ersterBrief !== false,
      bereitsWidersprochen: o.bereitsWidersprochen === true,
      bereitsGezahltEur: Number(o.bereitsGezahltEur) > 0 ? Number(o.bereitsGezahltEur) : 0,
    };
  } catch {
    return DEFAULT_ONBOARDING;
  }
}

export async function POST(req: Request) {
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
    return json({ ok: false, error: "Bitte ein Foto (JPG/PNG/WebP) oder PDF hochladen." }, 415);
  }

  const onboarding = parseOnboarding(form.get("onboarding"));
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const documentBlock = isPdf
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 } };

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: [documentBlock, { type: "text", text: buildUserContext(onboarding) }] }],
      // DER Punkt: schemakonformes JSON per constrained decoding erzwingen.
      output_config: { format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA } },
    });

    if (res.stop_reason === "refusal") {
      return json({ ok: false, error: "Das Dokument konnte aus Sicherheitsgründen nicht verarbeitet werden." }, 422);
    }
    if (res.stop_reason === "max_tokens") {
      return json({ ok: false, error: "Das Dokument ist zu umfangreich für eine vollständige Analyse." }, 413);
    }

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ ok: false, error: "Leere Modellantwort." }, 502);
    }

    const parsed = JSON.parse(textBlock.text); // dank Structured Outputs garantiert valide
    if (!isWellFormed(parsed)) {
      return json({ ok: false, error: "Die Analyse hatte ein unerwartetes Format." }, 502);
    }
    if (!parsed.dokument_erkannt) {
      return json({ ok: false, error: "Auf dem Bild war kein Inkasso- oder Forderungsschreiben erkennbar." }, 422);
    }

    // Modell -> Frontend-Schema, Mathematik serverseitig erzwungen.
    const data = buildPayload(parsed, onboarding);
    return json({ ok: true, data });
  } catch (err) {
    console.error("[/api/analyze] Fehler:", err);
    return json({ ok: false, error: "Die Analyse ist fehlgeschlagen. Bitte erneut versuchen." }, 500);
  }
}
