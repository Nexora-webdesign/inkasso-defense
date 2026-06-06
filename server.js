/**
 * Inkasso-Defense – Backend
 * Express + multer (memory storage) + @anthropic-ai/sdk (Claude Vision)
 *
 * POST /api/analyze  – nimmt Foto/PDF einer Inkasso-Forderung entgegen,
 *   leitet das Bild direkt per Vision an die Anthropic API weiter und
 *   erzwingt strukturiertes JSON (stammdaten / berechnung / posten / emailTemplate).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY ist nicht gesetzt – /api/analyze wird fehlschlagen.');
}

const anthropic = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung
const MODEL = 'claude-opus-4-8';   // aktuelles Modell (claude-api Skill)

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_PDF = 'application/pdf';

// ── multer: alles im RAM (keine Datei landet auf Platte) ────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === ALLOWED_PDF || ALLOWED_IMAGE.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Nicht unterstützter Dateityp. Erlaubt: JPG, PNG, GIF, WEBP, PDF.'));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  System-Prompt (vom Betreiber vorgegeben) – per Prompt-Caching wiederverwendet.
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Du bist das Kern-KI-Modul von "Inkasso-Defense". Deine Aufgabe ist es, das hochgeladene Bild eines Inkassobriefs per Vision-Analyse fehlerfrei auszulesen und nach deutschem Verbraucherrecht zu analysieren.

Gib AUSSCHLIESSLICH ein valides JSON-Objekt in folgendem Format zurück (kein Markdown, kein umschließender Text):
{
  "stammdaten": {
    "inkassoName": "String",
    "glaeubiger": "String",
    "aktenzeichen": "String",
    "originalSumme": 0.00
  },
  "berechnung": {
    "fairerKern": 0.00,
    "ersparnis": 0.00,
    "vorgeschlageneRate": 50.00,
    "laufzeitMonate": 0
  },
  "posten": [
    {
      "name": "Name des Postens (z.B. Geschäftsgebühr, Grundgebühr)",
      "betrag": 0.00,
      "status": "RECHTENS" | "NICHT_RECHTENS" | "GEKUERZT",
      "wieso": "Kurze, verständliche Erklärung auf Deutsch, warum dieser Posten (nicht) rechtens ist.",
      "paragraph": "z.B. § 275 BGB, § 254 BGB oder BGH Az. III ZR 57/14"
    }
  ],
  "emailTemplate": "Ein vollständiger, juristisch wasserdichter E-Mail-Text für den Teilwiderspruch, personalisiert mit den ermittelten Daten, inklusive Tilgungsbestimmung (§ 366 Abs. 1 BGB) und SCHUFA-Untersagung (§ 31 BDSG)."
}

Prüfregeln für die Posten:
1. Grundgebühren nach einer dokumentierten Vollsperrung des Anschlusses/Dienstes sind NICHT_RECHTENS (BGH Az. III ZR 57/14).
2. Schadensersatz-Pauschalen für Restlaufzeiten sind um 50% zu KÜRZEN (§ 254 BGB).
3. Nachträgliche Gebührenerhöhungen (z.B. von 0,5 auf 1,3) wegen eines Widerspruchs sind NICHT_RECHTENS (Schadensminderungspflicht).
4. Einigungsgebühren für reine Ratenzahlungen ohne echten Vergleich sind NICHT_RECHTENS.`;

// ─────────────────────────────────────────────────────────────────────────────
//  JSON-Schema für Structured Outputs – spiegelt exakt das geforderte Format.
//  (additionalProperties:false überall, required gesetzt, keine min/max.)
// ─────────────────────────────────────────────────────────────────────────────
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

// Vision-Content-Block je nach Upload-Typ (Bild vs. PDF), base64.
function buildDocumentBlock(file) {
  const data = file.buffer.toString('base64');
  if (file.mimetype === ALLOWED_PDF) {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: file.mimetype, data } };
}

// ── Statisches Frontend ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL, keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY) });
});

// ── Analyse-Route ────────────────────────────────────────────────────────────
app.post('/api/analyze', (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const msg = uploadErr.code === 'LIMIT_FILE_SIZE' ? 'Die Datei ist zu groß (max. 10 MB).' : uploadErr.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen. Erwartet wird das Feld "file".' });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Server ist nicht konfiguriert: ANTHROPIC_API_KEY fehlt.' });

    try {
      const documentBlock = buildDocumentBlock(req.file);

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'high',
          format: { type: 'json_schema', schema: ANALYSE_SCHEMA },
        },
        messages: [
          {
            role: 'user',
            content: [
              documentBlock,
              { type: 'text', text: 'Hier ist das Bild des Inkassobriefs. Lies es per Vision-Analyse aus und gib das Ergebnis ausschließlich im vorgegebenen JSON-Schema zurück.' },
            ],
          },
        ],
      });

      if (response.stop_reason === 'refusal') {
        return res.status(422).json({ error: 'Die Analyse wurde abgelehnt. Bitte lade ein anderes Dokument hoch.' });
      }
      if (response.stop_reason === 'max_tokens') {
        return res.status(502).json({ error: 'Die Antwort wurde abgeschnitten. Bitte versuche es erneut.' });
      }

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock) return res.status(502).json({ error: 'Unerwartete Antwort des Analyse-Dienstes.' });

      const result = JSON.parse(textBlock.text);

      const u = response.usage || {};
      console.log(`analyze ok – cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0}`);

      return res.json(result);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: 'API-Schlüssel ungültig.' });
      if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.' });
      if (err instanceof SyntaxError) return res.status(502).json({ error: 'Die Analyse-Antwort war kein gültiges JSON.' });
      console.error('analyze error:', err);
      return res.status(500).json({ error: 'Bei der Analyse ist ein Fehler aufgetreten.' });
    }
  });
});

app.listen(PORT, () => console.log(`✅ Inkasso-Defense läuft auf http://localhost:${PORT}`));
