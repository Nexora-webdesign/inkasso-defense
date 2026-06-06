// app/api/analyze/route.ts
// -----------------------------------------------------------------------------
// Flow: KI extrahiert NUR Fakten (Structured Outputs, temperature 0) ->
// deterministische Bewertung in lib/rule-engine.ts. Antwort immer als
// stabile Hülle { ok, data } / { ok, error } (siehe CLAUDE.md).
// -----------------------------------------------------------------------------
import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  FACTS_JSON_SCHEMA,
  DEFAULT_ONBOARDING,
  buildExtractionContext,
  isFakten,
  type Onboarding,
} from "@/lib/facts";
import { evaluate } from "@/lib/rule-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic(); // ANTHROPIC_API_KEY aus der Env

// MODELL: für reproduzierbare Ergebnisse vor Produktiveinsatz auf einen
// datierten Snapshot pinnen (z. B. "claude-haiku-4-5-YYYYMMDD").
const MODEL = "claude-haiku-4-5";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function bad(error: string, status = 400) {
  return json({ ok: false, error }, status);
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
    return bad("Ungültiger Upload.");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return bad("Es wurde kein Dokument übermittelt.");
  }

  const mediaType = file.type || "application/octet-stream";
  const isPdf = mediaType === "application/pdf";
  if (!isPdf && !IMAGE_TYPES.includes(mediaType)) {
    return bad("Bitte ein Foto (JPG/PNG/WebP/GIF) oder PDF hochladen.", 415);
  }

  const onboarding = parseOnboarding(form.get("onboarding"));
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

  let res;
  try {
    res = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: [documentBlock, { type: "text", text: buildExtractionContext(onboarding) }] },
      ],
      // Structured Outputs: schemakonformes JSON per constrained decoding erzwingen.
      output_config: { format: { type: "json_schema", schema: FACTS_JSON_SCHEMA } },
    });
  } catch (err) {
    console.error("[/api/analyze] LLM-Fehler:", err);
    return bad("Die Analyse ist fehlgeschlagen. Bitte erneut versuchen.", 502);
  }

  if (res.stop_reason === "refusal") {
    return bad("Das Dokument konnte aus Sicherheitsgründen nicht verarbeitet werden.", 422);
  }
  if (res.stop_reason === "max_tokens") {
    return bad("Das Dokument ist zu umfangreich für eine vollständige Analyse.", 413);
  }

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return bad("Leere Modellantwort.", 502);
  }

  let fakten: unknown;
  try {
    fakten = JSON.parse(textBlock.text); // dank Structured Outputs valide
  } catch {
    return bad("Die Analyse hatte ein unerwartetes Format.", 502);
  }
  if (!isFakten(fakten)) {
    return bad("Die Analyse hatte ein unerwartetes Format.", 502);
  }
  if (!fakten.dokument_erkannt) {
    return bad("Auf dem Dokument war kein Inkasso- oder Forderungsschreiben erkennbar.", 422);
  }

  // Deterministische Bewertung – die KI hat NICHT gewertet.
  const data = evaluate(fakten, onboarding);
  console.info("[/api/analyze] audit:", JSON.stringify(data.audit));

  return json({ ok: true, data });
}
