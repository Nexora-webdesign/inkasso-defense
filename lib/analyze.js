/**
 * Inkasso-Defense – gemeinsame Analyse-Logik (Claude Vision).
 * Wird von server.js (lokaler Express) UND api/analyze.js (Vercel Serverless) genutzt,
 * damit die KI-Verarbeitung an einer einzigen Stelle gepflegt wird.
 */

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung
// Schnelles Standardmodell für die Live-Latenz; via Env überschreibbar.
const MODEL = process.env.ANALYZE_MODEL || 'claude-haiku-4-5';

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_PDF = 'application/pdf';

/** Fehler mit HTTP-Status + nutzerfreundlicher Meldung. */
class AnalyzeError extends Error {
  constructor(httpStatus, message) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

// ── System-Prompt (Betreiber-Vorgabe) – per Prompt-Caching wiederverwendet ───
const SYSTEM_PROMPT = `Du bist das Analyse-Modul von "Inkasso-Defense". Lies den Inkassobrief (Bild/PDF) per Vision und prüfe jeden Forderungsposten nach deutschem Verbraucherrecht.

Antworte AUSSCHLIESSLICH mit dem JSON nach Schema – keine Einleitung, kein Markdown, kein Text außerhalb des JSON. Arbeite schnell und faktenbasiert.

Stil (wichtig für Tempo):
- "wieso": maximal 1 kurzer, sachlicher Satz. Keine Floskeln, keine Wiederholung des Gesetzestextes.
- "paragraph": nur die Norm, z. B. "§ 254 BGB" oder "BGH III ZR 57/14".
- "emailTemplate": knapper, höflicher Teilwiderspruch mit den ermittelten Daten; enthält zwingend eine Tilgungsbestimmung (§ 366 Abs. 1 BGB) und die SCHUFA-Untersagung (§ 31 BDSG). Kompakt halten, keine langen Herleitungen.

Status je Posten:
- "RECHTENS" = zulässig, "GEKUERZT" = überhöht (auf angemessenes Maß kürzen), "NICHT_RECHTENS" = unzulässig.

Prüfregeln:
1. Grundgebühr nach dokumentierter Vollsperrung = NICHT_RECHTENS (BGH III ZR 57/14).
2. Schadensersatz-/Restlaufzeit-Pauschalen um 50 % kürzen = GEKUERZT (§ 254 BGB).
3. Nachträgliche Gebührenerhöhung wegen Widerspruchs = NICHT_RECHTENS (Schadensminderungspflicht).
4. Einigungsgebühr für reine Ratenzahlung ohne echten Vergleich = NICHT_RECHTENS.
5. Sonst übliche unzulässige/überhöhte Posten bewerten: Bearbeitungs-/Kontoführungsgebühren (unzulässig), überhöhte Mahn-/Inkassokosten und Zinsen (kürzen, § 288 BGB / RDGEG-RVG).

Berechnung: fairerKern = Summe aller zulässigen + gekürzten Beträge; ersparnis = originalSumme − fairerKern; vorgeschlageneRate und laufzeitMonate (1–12) sinnvoll wählen.`;

// ── JSON-Schema für Structured Outputs (erzwingt valides JSON) ───────────────
const ANALYSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stammdaten: {
      type: 'object',
      additionalProperties: false,
      properties: {
        inkassoName: { type: 'string', description: 'Name des Inkassobüros / Absenders.' },
        glaeubiger: { type: 'string', description: 'Name des ursprünglichen Gläubigers.' },
        aktenzeichen: { type: 'string', description: 'Aktenzeichen / Referenz. "unbekannt", falls nicht lesbar.' },
        originalSumme: { type: 'number', description: 'Insgesamt geforderter Betrag in EUR.' },
      },
      required: ['inkassoName', 'glaeubiger', 'aktenzeichen', 'originalSumme'],
    },
    berechnung: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fairerKern: { type: 'number', description: 'Rechtmäßig geschuldeter Gesamtbetrag.' },
        ersparnis: { type: 'number', description: 'originalSumme - fairerKern.' },
        vorgeschlageneRate: { type: 'number', description: 'Empfohlene Monatsrate in EUR.' },
        laufzeitMonate: { type: 'integer', description: 'Empfohlene Laufzeit in Monaten (1–12).' },
      },
      required: ['fairerKern', 'ersparnis', 'vorgeschlageneRate', 'laufzeitMonate'],
    },
    posten: {
      type: 'array',
      description: 'Alle erkannten Einzelposten mit Bewertung.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'Bezeichnung des Postens.' },
          betrag: { type: 'number', description: 'Geforderter Betrag dieses Postens.' },
          status: { type: 'string', enum: ['RECHTENS', 'NICHT_RECHTENS', 'GEKUERZT'] },
          wieso: { type: 'string', description: 'Verständliche Begründung auf Deutsch.' },
          paragraph: { type: 'string', description: 'Rechtsgrundlage, z. B. "§ 254 BGB" oder "BGH Az. III ZR 57/14".' },
        },
        required: ['name', 'betrag', 'status', 'wieso', 'paragraph'],
      },
    },
    emailTemplate: { type: 'string', description: 'Vollständiger E-Mail-Text für den Teilwiderspruch.' },
  },
  required: ['stammdaten', 'berechnung', 'posten', 'emailTemplate'],
};

function isAllowed(mimetype) {
  return mimetype === ALLOWED_PDF || ALLOWED_IMAGE.includes(mimetype);
}

/**
 * Robustes JSON-Extrahieren: nimmt sauberes JSON, aber auch in ```json … ```
 * verpackte oder von Begleittext umgebene Antworten. Gibt null zurück, wenn
 * sich nichts Valides finden lässt.
 */
function extractJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) s = fence[1].trim();
  try { return JSON.parse(s); } catch (_) { /* weiter unten Fallback */ }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch (_) { /* aufgeben */ }
  }
  return null;
}

// Vision-Content-Block je nach Upload-Typ (Bild vs. PDF), base64.
function buildDocumentBlock(buffer, mimetype) {
  const data = buffer.toString('base64');
  if (mimetype === ALLOWED_PDF) {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: mimetype, data } };
}

/**
 * Analysiert einen Datei-Buffer per Claude Vision und gibt das geprüfte JSON zurück.
 * Wirft AnalyzeError mit passendem HTTP-Status bei bekannten Fehlern.
 */
async function analyzeFile(buffer, mimetype) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AnalyzeError(500, 'Server ist nicht konfiguriert: ANTHROPIC_API_KEY fehlt.');
  }
  if (!buffer || !buffer.length) {
    throw new AnalyzeError(400, 'Keine Datei hochgeladen. Erwartet wird das Feld "file".');
  }
  if (!isAllowed(mimetype)) {
    throw new AnalyzeError(400, 'Nicht unterstützter Dateityp. Erlaubt: JPG, PNG, GIF, WEBP, PDF.');
  }

  // Tempo: Standard ist das schnelle Haiku 4.5 (Vision + Structured Outputs).
  // Über ANALYZE_MODEL (Vercel-Env) auf 'claude-sonnet-4-6' / 'claude-opus-4-8'
  // umstellbar, wenn mehr juristische Tiefe gewünscht ist.
  const params = {
    model: MODEL,
    max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: ANALYSE_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          buildDocumentBlock(buffer, mimetype),
          { type: 'text', text: 'Hier ist der Inkassobrief. Lies ihn per Vision aus und gib das Ergebnis ausschließlich im vorgegebenen JSON-Schema zurück.' },
        ],
      },
    ],
  };
  // 'effort' und adaptives Thinking unterstützt Haiku nicht -> nur bei größeren Modellen.
  if (!MODEL.includes('haiku')) {
    params.thinking = { type: 'disabled' };
    params.output_config.effort = 'low';
  }

  let response;
  try {
    response = await anthropic.messages.create(params);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AnalyzeError(500, 'API-Schlüssel ungültig.');
    if (err instanceof Anthropic.RateLimitError) throw new AnalyzeError(429, 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.');
    console.error('anthropic error:', err);
    throw new AnalyzeError(502, 'Der Analyse-Dienst ist derzeit nicht erreichbar.');
  }

  if (response.stop_reason === 'refusal') {
    throw new AnalyzeError(422, 'Die Analyse wurde abgelehnt. Bitte lade ein anderes Dokument hoch.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AnalyzeError(502, 'Die Antwort wurde abgeschnitten. Bitte versuche es erneut.');
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new AnalyzeError(502, 'Unerwartete Antwort des Analyse-Dienstes.');

  const result = extractJson(textBlock.text);
  if (!result || typeof result !== 'object') {
    throw new AnalyzeError(502, 'Die Analyse-Antwort war kein gültiges JSON.');
  }

  const u = response.usage || {};
  console.log(`analyze ok – cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0}`);

  return result;
}

module.exports = {
  MODEL,
  ALLOWED_IMAGE,
  ALLOWED_PDF,
  AnalyzeError,
  isAllowed,
  analyzeFile,
  SYSTEM_PROMPT,
  ANALYSE_SCHEMA,
  extractJson,
};
