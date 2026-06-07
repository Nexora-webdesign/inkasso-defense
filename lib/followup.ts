// lib/followup.ts
// -----------------------------------------------------------------------------
// Klassifikation von FOLGESCHREIBEN in einem laufenden Inkasso-Fall.
// Die KI ordnet NUR ein und fasst NEUTRAL zusammen (keine Rechtsberatung,
// keine Empfehlungen) – die Handlungs-Schritte kommen deterministisch aus
// lib/letter-guide.ts. Gleiches Structured-Output-Muster wie lib/facts.ts.
// -----------------------------------------------------------------------------

export type LetterType =
  | "zahlungserinnerung"
  | "mahnung"
  | "inkasso"
  | "mahnbescheid"
  | "vollstreckungsbescheid"
  | "glaeubiger_antwort"
  | "sonstiges";

export const LETTER_TYPES: LetterType[] = [
  "zahlungserinnerung",
  "mahnung",
  "inkasso",
  "mahnbescheid",
  "vollstreckungsbescheid",
  "glaeubiger_antwort",
  "sonstiges",
];

export interface FollowupFacts {
  dokument_erkannt: boolean;
  letter_type: LetterType;
  kurzzusammenfassung: string;
  absender_name: string;
  aktenzeichen: string;
  ist_gerichtlich: boolean;
  genannte_frist_tage: number;
  zustelldatum: string;
  fordert_zahlung: boolean;
}

// JSON-Schema (Structured Outputs): ALLE Felder required, additionalProperties:false,
// Enum für letter_type, KEINE union-Typen.
export const FOLLOWUP_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "dokument_erkannt",
    "letter_type",
    "kurzzusammenfassung",
    "absender_name",
    "aktenzeichen",
    "ist_gerichtlich",
    "genannte_frist_tage",
    "zustelldatum",
    "fordert_zahlung",
  ],
  properties: {
    dokument_erkannt: { type: "boolean" },
    letter_type: { type: "string", enum: LETTER_TYPES },
    kurzzusammenfassung: { type: "string" },
    absender_name: { type: "string" },
    aktenzeichen: { type: "string" },
    ist_gerichtlich: { type: "boolean" },
    genannte_frist_tage: { type: "number" },
    zustelldatum: { type: "string" },
    fordert_zahlung: { type: "boolean" },
  },
} as const;

export function isFollowupFacts(v: unknown): v is FollowupFacts {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.dokument_erkannt === "boolean" &&
    typeof o.letter_type === "string" &&
    (LETTER_TYPES as string[]).includes(o.letter_type) &&
    typeof o.kurzzusammenfassung === "string"
  );
}

export const FOLLOWUP_SYSTEM_PROMPT = `Du bist ein nüchterner Extraktions- und Klassifikations-Assistent für deutsche Inkasso-/Forderungs-/Gerichtsschreiben. Der Nutzer befindet sich bereits in einem laufenden Inkasso-Fall und lädt ein WEITERES Schreiben hoch. Deine EINZIGE Aufgabe: das Schreiben einordnen und seinen Inhalt NEUTRAL zusammenfassen.

ABSOLUT VERBOTEN:
- Keine rechtliche Wertung, keine Empfehlungen, keine Einschätzung "berechtigt/unberechtigt". Handlungsempfehlungen erstellt ein anderes System deterministisch.
- Nichts erfinden. Übernimm Namen/Aktenzeichen/Daten exakt aus dem Dokument.

KLASSIFIKATION ("letter_type"), wähle GENAU einen Wert:
- "zahlungserinnerung": freundliche erste Erinnerung/Zahlungserinnerung.
- "mahnung": außergerichtliche Mahnung (1., 2., letzte Mahnung) von Gläubiger/Inkasso.
- "inkasso": Forderungs-/Inkassoschreiben eines Inkassobüros/Anwalts (außergerichtlich).
- "mahnbescheid": GERICHTLICHER Mahnbescheid (Amtsgericht/Mahngericht, mit Widerspruchsformular/-frist).
- "vollstreckungsbescheid": Vollstreckungsbescheid des Gerichts (nach unwidersprochenem Mahnbescheid) oder Zwangsvollstreckungs-Ankündigung.
- "glaeubiger_antwort": Antwort/Reaktion des Gläubigers/Inkassos auf einen Widerspruch des Schuldners (z. B. Übersendung von Belegen, Zurückweisung des Widerspruchs).
- "sonstiges": alles andere oder unklar.

WEITERE FELDER (true/Zahl/Text NUR bei ausdrücklichem Beleg, sonst false/0/""):
- "ist_gerichtlich": true, wenn das Schreiben von einem Gericht stammt (Amtsgericht, Mahngericht, Vollstreckungsgericht).
- "genannte_frist_tage": ausdrücklich genannte Frist in Tagen (z. B. 14). Wenn keine Tagesfrist genannt, 0.
- "zustelldatum": Datum der Zustellung/des Schreibens im Format JJJJ-MM-TT, falls erkennbar; sonst "".
- "fordert_zahlung": true, wenn zur Zahlung aufgefordert wird.
- "absender_name", "aktenzeichen": wörtlich aus dem Dokument; sonst "".
- "kurzzusammenfassung": 1-3 sachliche Sätze, WAS in dem Schreiben steht (neutral, ohne Rat).

UNSICHERHEIT / ERKENNUNG:
- "dokument_erkannt": false, wenn es sich erkennbar NICHT um ein Inkasso-/Forderungs-/Gerichtsschreiben in dieser Sache handelt.
- Im Zweifel "letter_type" = "sonstiges".`;
