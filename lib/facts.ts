// lib/facts.ts
// -----------------------------------------------------------------------------
// Extraktionsvertrag für die KI: Sie liefert AUSSCHLIESSLICH Tatsachen
// (Structured Outputs), niemals eine rechtliche Wertung. Die juristische
// Bewertung passiert deterministisch in lib/rule-engine.ts (siehe CLAUDE.md).
// -----------------------------------------------------------------------------

// === Typen ===================================================================
export type PostenArt =
  | "hauptforderung"
  | "grundgebuehr"
  | "geschaeftsgebuehr"
  | "einigungsgebuehr"
  | "mahnkosten"
  | "verzugszinsen"
  | "verzugspauschale"
  | "auslagen"
  | "sonstiges";

export const POSTEN_ARTEN: PostenArt[] = [
  "hauptforderung",
  "grundgebuehr",
  "geschaeftsgebuehr",
  "einigungsgebuehr",
  "mahnkosten",
  "verzugszinsen",
  "verzugspauschale",
  "auslagen",
  "sonstiges",
];

export type Vertrauensgrad = "hoch" | "mittel" | "niedrig";

export interface Faktenposten {
  art: PostenArt;
  /** Wortlaut/Bezeichnung des Postens genau wie im Dokument. */
  bezeichnung_im_text: string;
  /** Betrag in EUR exakt wie im Dokument. */
  betrag_eur: number;
  /** Gebührensatz (z. B. 1.3) – 0, wenn im Dokument nicht ausdrücklich genannt. */
  gebuehrensatz: number;
  /** true NUR, wenn der Posten ausdrücklich als Verwaltungs-/Bearbeitungs-/IT-/Personalkostenpauschale beschrieben ist. */
  pauschale_aus_verwaltungskosten: boolean;
  /** Kurzer wörtlicher Beleg/Fundstelle aus dem Dokument. */
  beleg: string;
}

export interface Fakten {
  dokument_erkannt: boolean;
  absender_name: string;
  urspruenglicher_glaeubiger: string;
  aktenzeichen: string;
  forderungssumme_eur: number;
  posten: Faktenposten[];
  /** true nur, wenn eine Telekommunikations-Vollsperrung im Dokument ausdrücklich belegt ist. */
  telekommunikationssperre_belegt: boolean;
  /** true nur, wenn ausdrücklich eine reine Ratenzahlung OHNE echten Vergleich belegt ist. */
  nur_ratenzahlung_kein_vergleich: boolean;
  /** true nur, wenn besondere Umstände (z. B. für erhöhte Gebühr) ausdrücklich belegt sind. */
  besondere_umstaende_belegt: boolean;
  /** true nur, wenn das Schreiben erkennen lässt, dass der Schuldner die Forderung bestritten hat. */
  forderung_bestritten: boolean;
  /** true = Verbraucher (Default); false nur, wenn der Schuldner klar ein Unternehmen/Gewerbe ist. */
  ist_verbraucher: boolean;
  /** Ausgewiesener jährlicher Verzugszinssatz in % – 0, wenn nicht genannt. */
  verzugszins_prozent: number;
  /** true nur, wenn zusätzlich zur Inkasso-Geschäftsgebühr eine separate Anwalts-Geschäftsgebühr für dieselbe Sache berechnet wird. */
  zweite_anwalts_geschaeftsgebuehr: boolean;
  vertrauensgrad: Vertrauensgrad;
}

export interface Onboarding {
  ersterBrief: boolean;
  bereitsWidersprochen: boolean;
  bereitsGezahltEur: number;
}

export const DEFAULT_ONBOARDING: Onboarding = {
  ersterBrief: true,
  bereitsWidersprochen: false,
  bereitsGezahltEur: 0,
};

// === JSON-Schema für Structured Outputs ======================================
// Regeln: ALLE Felder required, additionalProperties:false auf jedem Objekt,
// Enums für art & vertrauensgrad, KEINE union-Typen (kein anyOf/oneOf).
export const FACTS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "dokument_erkannt",
    "absender_name",
    "urspruenglicher_glaeubiger",
    "aktenzeichen",
    "forderungssumme_eur",
    "posten",
    "telekommunikationssperre_belegt",
    "nur_ratenzahlung_kein_vergleich",
    "besondere_umstaende_belegt",
    "forderung_bestritten",
    "ist_verbraucher",
    "verzugszins_prozent",
    "zweite_anwalts_geschaeftsgebuehr",
    "vertrauensgrad",
  ],
  properties: {
    dokument_erkannt: { type: "boolean" },
    absender_name: { type: "string" },
    urspruenglicher_glaeubiger: { type: "string" },
    aktenzeichen: { type: "string" },
    forderungssumme_eur: { type: "number" },
    posten: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "art",
          "bezeichnung_im_text",
          "betrag_eur",
          "gebuehrensatz",
          "pauschale_aus_verwaltungskosten",
          "beleg",
        ],
        properties: {
          art: {
            type: "string",
            enum: [
              "hauptforderung",
              "grundgebuehr",
              "geschaeftsgebuehr",
              "einigungsgebuehr",
              "mahnkosten",
              "verzugszinsen",
              "verzugspauschale",
              "auslagen",
              "sonstiges",
            ],
          },
          bezeichnung_im_text: { type: "string" },
          betrag_eur: { type: "number" },
          gebuehrensatz: { type: "number" },
          pauschale_aus_verwaltungskosten: { type: "boolean" },
          beleg: { type: "string" },
        },
      },
    },
    telekommunikationssperre_belegt: { type: "boolean" },
    nur_ratenzahlung_kein_vergleich: { type: "boolean" },
    besondere_umstaende_belegt: { type: "boolean" },
    forderung_bestritten: { type: "boolean" },
    ist_verbraucher: { type: "boolean" },
    verzugszins_prozent: { type: "number" },
    zweite_anwalts_geschaeftsgebuehr: { type: "boolean" },
    vertrauensgrad: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
  },
} as const;

// === System-Prompt (reine Faktenextraktion, KEINE Wertung) ===================
export const EXTRACTION_SYSTEM_PROMPT = `Du bist ein nüchterner Extraktions-Assistent für deutsche Inkasso- und Kanzleischreiben. Deine EINZIGE Aufgabe ist es, die im Dokument enthaltenen TATSACHEN zu erfassen.

ABSOLUT VERBOTEN:
- Keine rechtliche Wertung, keine Einschätzung "berechtigt/unberechtigt", keine Empfehlungen. Die juristische Bewertung erfolgt an anderer Stelle deterministisch.
- Nichts erfinden oder schätzen. Übernimm Beträge und Bezeichnungen exakt aus dem Dokument.

REGELN:
- Erfasse jeden einzelnen Geldposten als Eintrag in "posten" mit "art", "bezeichnung_im_text" (Wortlaut), "betrag_eur" (Zahl), "gebuehrensatz" und "beleg" (kurze wörtliche Fundstelle).
- "gebuehrensatz": nur eintragen, wenn im Dokument ausdrücklich ein Satz genannt ist (z. B. 1,3). Andernfalls 0.
- "betrag_eur" und "forderungssumme_eur": exakt wie im Dokument. Rechne KEINE Summen selbst nach – das übernimmt das System.
- Ordne "art" einem der erlaubten Werte zu; wenn unklar, nutze "sonstiges". Nutze "verzugspauschale" für eine pauschale Verzugs-/Schadenspauschale (z. B. 40 EUR), NICHT für laufende Verzugszinsen.
- "pauschale_aus_verwaltungskosten": pro Posten nur true, wenn der Posten ausdrücklich als Verwaltungs-, Bearbeitungs-, IT- oder Personalkostenpauschale bezeichnet ist. Im Zweifel false.

SACHVERHALTS-FLAGS (true NUR bei ausdrücklichem Beleg im Dokument, sonst false):
- "telekommunikationssperre_belegt": nur true, wenn eine vollständige Sperrung des Telekommunikations-/Internetanschlusses ausdrücklich erwähnt ist.
- "nur_ratenzahlung_kein_vergleich": nur true, wenn ausdrücklich von einer reinen Ratenzahlung OHNE echten Vergleich/gegenseitiges Nachgeben die Rede ist.
- "besondere_umstaende_belegt": nur true, wenn besondere Umstände (z. B. zur Rechtfertigung einer erhöhten Gebühr) ausdrücklich dargelegt sind.
- "forderung_bestritten": nur true, wenn das Schreiben erkennen lässt, dass der Schuldner die Forderung bereits bestritten hat. Im Zweifel false.
- "ist_verbraucher": Default true. Nur false, wenn der Schuldner klar ein Unternehmen/Gewerbe ist (z. B. Firmenbezeichnung, Gewerbeadresse, Anrede als Firma). Im Zweifel true.
- "verzugszins_prozent": der ausdrücklich ausgewiesene jährliche Verzugszinssatz in Prozent (nur die Zahl, z. B. 5 oder 9). Wenn kein Satz genannt ist, 0.
- "zweite_anwalts_geschaeftsgebuehr": nur true, wenn zusätzlich zur Inkasso-Geschäftsgebühr eine SEPARATE Anwalts-Geschäftsgebühr für dieselbe Sache berechnet wird. Im Zweifel false.

UNSICHERHEIT:
- Im Zweifel ein Flag auf false setzen und "vertrauensgrad" auf "niedrig".
- "dokument_erkannt": false, wenn es sich erkennbar nicht um ein Inkasso-/Forderungsschreiben handelt.

AUSGABE:
- Antworte ausschließlich als JSON gemäß vorgegebenem Schema. Alle Texte auf Deutsch. Kein Markdown, kein Fließtext außerhalb des JSON.`;

// === Kontext aus dem Onboarding (reine Tatsachen-Chronologie) ================
export function buildExtractionContext(o: Onboarding): string {
  return [
    "Chronologischer Kontext (Tatsachen, vom Nutzer angegeben):",
    `- Erstes Schreiben in dieser Sache: ${o.ersterBrief ? "ja" : "nein"}`,
    `- Es wurde bereits widersprochen: ${o.bereitsWidersprochen ? "ja" : "nein"}`,
    `- Es wurde bereits gezahlt: ${o.bereitsGezahltEur > 0 ? o.bereitsGezahltEur.toFixed(2) + " EUR" : "nein"}`,
    "",
    "Extrahiere ausschließlich die Tatsachen aus dem beigefügten Schreiben und gib das JSON-Objekt zurück.",
  ].join("\n");
}

// === Typguard ================================================================
export function isFakten(x: unknown): x is Fakten {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.dokument_erkannt === "boolean" &&
    typeof o.absender_name === "string" &&
    typeof o.urspruenglicher_glaeubiger === "string" &&
    typeof o.aktenzeichen === "string" &&
    typeof o.forderungssumme_eur === "number" &&
    Array.isArray(o.posten) &&
    typeof o.telekommunikationssperre_belegt === "boolean" &&
    typeof o.nur_ratenzahlung_kein_vergleich === "boolean" &&
    typeof o.besondere_umstaende_belegt === "boolean" &&
    typeof o.forderung_bestritten === "boolean" &&
    typeof o.ist_verbraucher === "boolean" &&
    typeof o.verzugszins_prozent === "number" &&
    typeof o.zweite_anwalts_geschaeftsgebuehr === "boolean" &&
    (o.vertrauensgrad === "hoch" || o.vertrauensgrad === "mittel" || o.vertrauensgrad === "niedrig")
  );
}
