// inkasso-analysis.ts
// -----------------------------------------------------------------------------
// Schema + neutraler System Prompt + deterministische Übersetzung in das
// Frontend-Schema (stammdaten / berechnung / posten / emailTemplate).
//
// Trennung der Verantwortung:
//   - Das MODELL liefert die neutrale Analyse (per Structured Outputs erzwungen).
//   - Der SERVER rechnet die Summen in Cent nach und baut den Widerspruchstext
//     aus einer festen Vorlage (kein vom Modell frei formulierter Rechtstext).
// -----------------------------------------------------------------------------

// === 1) JSON-Schema, das die Claude-API per output_config.format erzwingt =====
// Alle Felder required + additionalProperties:false + keine union-Typen
// -> bleibt weit unter den Komplexitätslimits der Structured Outputs.
export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "dokument_erkannt",
    "absender_name",
    "urspruenglicher_glaeubiger",
    "aktenzeichen",
    "geforderte_gesamtsumme_eur",
    "posten",
    "vertrauensgrad",
  ],
  properties: {
    dokument_erkannt: { type: "boolean" },
    absender_name: { type: "string" },
    urspruenglicher_glaeubiger: { type: "string" },
    aktenzeichen: { type: "string" }, // "" wenn nicht gefunden
    geforderte_gesamtsumme_eur: { type: "number" },
    posten: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["bezeichnung", "betrag_eur", "bewertung", "unberechtigter_anteil_eur", "begruendung", "rechtsgrundlage"],
        properties: {
          bezeichnung: { type: "string" },
          betrag_eur: { type: "number" },
          bewertung: { type: "string", enum: ["berechtigt", "teilweise", "unberechtigt", "unklar"] },
          // Betrag dieses Postens, der NICHT geschuldet ist (0 bei berechtigt/unklar,
          // voller Betrag bei unberechtigt, Teilbetrag bei teilweise).
          unberechtigter_anteil_eur: { type: "number" },
          begruendung: { type: "string" },
          rechtsgrundlage: { type: "string" }, // konkrete Norm/Rechtsprechung, sonst ""
        },
      },
    },
    vertrauensgrad: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
  },
} as const;

// === 2) Typen ================================================================
export type Bewertung = "berechtigt" | "teilweise" | "unberechtigt" | "unklar";

export interface ModelPosten {
  bezeichnung: string;
  betrag_eur: number;
  bewertung: Bewertung;
  unberechtigter_anteil_eur: number;
  begruendung: string;
  rechtsgrundlage: string;
}

export interface ModelOutput {
  dokument_erkannt: boolean;
  absender_name: string;
  urspruenglicher_glaeubiger: string;
  aktenzeichen: string;
  geforderte_gesamtsumme_eur: number;
  posten: ModelPosten[];
  vertrauensgrad: "hoch" | "mittel" | "niedrig";
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

// Genau das Schema, das app.js im Dashboard rendert:
export type FrontendStatus = "RECHTENS" | "GEKUERZT" | "NICHT_RECHTENS";

export interface FrontendPayload {
  stammdaten: { inkassoName: string; glaeubiger: string; aktenzeichen: string; originalSumme: number };
  berechnung: { fairerKern: number; ersparnis: number; laufzeitMonate: number; vorgeschlageneRate: number };
  posten: { name: string; status: FrontendStatus; betrag: number; paragraph: string; wieso: string }[];
  emailTemplate: string;
  hinweise: string[];
}

// === 3) Geld-Mathematik in Cent (gegen Float-Drift) ==========================
const toCents = (eur: number) => Math.round((Number.isFinite(eur) ? eur : 0) * 100);
const toEur = (cents: number) => cents / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

// === 4) Übersetzung Modell -> Frontend (inkl. Nachrechnung & E-Mail) =========
export function buildPayload(model: ModelOutput, onboarding: Onboarding): FrontendPayload {
  const hinweise: string[] = [];

  let unberechtigtCents = 0;
  let postenSummeCents = 0;
  const posten: FrontendPayload["posten"] = [];

  for (const p of model.posten) {
    const betragC = Math.max(0, toCents(p.betrag_eur));
    const anteilC = clamp(toCents(p.unberechtigter_anteil_eur), 0, betragC);
    if (toCents(p.unberechtigter_anteil_eur) !== anteilC) {
      hinweise.push(`Anteil bei "${p.bezeichnung}" auf plausiblen Bereich korrigiert.`);
    }
    unberechtigtCents += anteilC;
    postenSummeCents += betragC;

    // Status für die UI ableiten – "unklar" -> RECHTENS (konservativ: im Zweifel
    // dem Verbraucher keine angreifbare Position vorgaukeln).
    let status: FrontendStatus = "RECHTENS";
    if (anteilC >= betragC && betragC > 0) status = "NICHT_RECHTENS";
    else if (anteilC > 0) status = "GEKUERZT";

    posten.push({
      name: p.bezeichnung,
      status,
      betrag: toEur(betragC),
      paragraph: p.rechtsgrundlage || "",
      wieso: p.begruendung,
    });
  }

  const gefordertC = Math.max(0, toCents(model.geforderte_gesamtsumme_eur));
  if (Math.abs(postenSummeCents - gefordertC) > 1) {
    hinweise.push("Summe der erkannten Posten weicht von der Gesamtforderung ab – Dokument ggf. unvollständig erfasst.");
  }

  const gezahltC = Math.max(0, toCents(onboarding.bereitsGezahltEur));
  const berechtigteForderungC = Math.max(0, gefordertC - unberechtigtCents); // rechtlich geschuldet
  const nochZuZahlenC = Math.max(0, berechtigteForderungC - gezahltC);       // "fairer Kern" = offen

  const fairerKern = toEur(nochZuZahlenC);
  const ersparnis = toEur(unberechtigtCents); // echte rechtliche Kürzung (nicht: bereits gezahlt)

  // Einfache, deterministische Raten-Heuristik (~75 €/Monat Zielrate, 1–12 Monate).
  const laufzeitMonate = nochZuZahlenC <= 0 ? 1 : clamp(Math.round(nochZuZahlenC / 7500), 1, 12);
  const vorgeschlageneRate = toEur(Math.ceil(nochZuZahlenC / laufzeitMonate));

  const emailTemplate = buildEmail({
    aktenzeichen: model.aktenzeichen,
    bestritten: posten.filter((x) => x.status !== "RECHTENS"),
    fairerKern,
    onboarding,
  });

  return {
    stammdaten: {
      inkassoName: model.absender_name || "Unbekannter Gläubiger",
      glaeubiger: model.urspruenglicher_glaeubiger || "",
      aktenzeichen: model.aktenzeichen || "",
      originalSumme: toEur(gefordertC),
    },
    berechnung: { fairerKern, ersparnis, laufzeitMonate, vorgeschlageneRate },
    posten,
    emailTemplate,
    hinweise,
  };
}

// === 5) Feste, defensiv formulierte Widerspruchs-Vorlage =====================
// Bewusst zurückhaltend formuliert. KEINE absolute "§31-BDSG-Untersagung", sondern
// Widerspruch gegen die Übermittlung der *bestrittenen* Forderung.
function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
}

function buildEmail(args: {
  aktenzeichen: string;
  bestritten: FrontendPayload["posten"];
  fairerKern: number;
  onboarding: Onboarding;
}): string {
  const az = args.aktenzeichen && args.aktenzeichen.toLowerCase() !== "unbekannt" ? args.aktenzeichen : "";
  const azZeile = az ? ` (Aktenzeichen ${az})` : "";
  const bezug = args.onboarding.ersterBrief
    ? "ich beziehe mich auf Ihr Schreiben"
    : "ich beziehe mich auf Ihr erneutes Schreiben";

  const liste =
    args.bestritten.length > 0
      ? "Folgende Positionen weise ich zurück:\n" +
        args.bestritten.map((p) => `- ${p.name}: ${p.wieso}`).join("\n")
      : "Eine über die Hauptforderung hinausgehende Position kann ich nicht nachvollziehen.";

  const anerkennung =
    args.fairerKern > 0
      ? `Den aus meiner Sicht berechtigten, unstrittigen Betrag in Höhe von ${eur(args.fairerKern)} erkenne ich an und gleiche ihn aus bzw. biete eine Ratenzahlung an.`
      : "Eine offene, berechtigte Restforderung verbleibt nach meiner Prüfung nicht.";

  return [
    `Sehr geehrte Damen und Herren,`,
    ``,
    `${bezug}${azZeile} und widerspreche der geltend gemachten Forderung teilweise.`,
    ``,
    liste,
    ``,
    anerkennung,
    ``,
    `Tilgungsbestimmung: Gemäß § 366 Abs. 1 BGB bestimme ich, dass meine Zahlungen vorrangig auf die Hauptforderung und nicht auf die von mir bestrittenen Kosten und Gebühren angerechnet werden.`,
    ``,
    `Da die darüber hinausgehende Forderung bestritten ist, widerspreche ich einer Übermittlung dieser bestrittenen Forderung an Auskunfteien (z. B. SCHUFA) und bitte, von einer entsprechenden Meldung abzusehen.`,
    ``,
    `Ich bitte um eine korrigierte Abrechnung und setze hierfür eine angemessene Frist von 14 Tagen.`,
    ``,
    `Mit freundlichen Grüßen`,
  ].join("\n");
}

// === 6) Defensive Mindestprüfung (falls Structured Outputs mal inaktiv) ======
export function isWellFormed(x: unknown): x is ModelOutput {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.dokument_erkannt === "boolean" && typeof o.geforderte_gesamtsumme_eur === "number" && Array.isArray(o.posten);
}

// === 7) System Prompt (neutral – sucht NICHT zwanghaft Fehler) ===============
export const SYSTEM_PROMPT = `Du bist ein nüchterner Analyse-Assistent für deutsche Inkasso- und Kanzleischreiben. Deine Aufgabe ist es, die geltend gemachten Geldposten zu erfassen und sachlich einzuordnen – nicht, möglichst viele Fehler zu finden.

GRUNDREGELN
- Bewerte jeden Posten nur anhand dessen, was im Dokument steht und rechtlich gut belegbar ist (BGB, RVG/VV RVG, einschlägige BGH-Rechtsprechung).
- Kannst du einen Posten ohne weitere Infos nicht sicher einordnen, nutze "unklar". Rate nicht.
- Erfinde keine Posten, Beträge oder Zahlungen. Übernimm Beträge exakt wie im Dokument.
- Formuliere zurückhaltend ("spricht dafür", "regelmäßig angreifbar"), nicht als Rechtsgarantie. Du gibst Orientierung, keine Rechtsberatung.

TYPISCHE PRÜFPUNKTE (nur wenn das Dokument das hergibt)
- Inkassokosten/Geschäftsgebühr: Höhe plausibel? Eine erhöhte Gebühr verlangt besondere Umstände.
- Einigungsgebühr: setzt einen echten Vergleich voraus – eine bloße Ratenzahlung genügt regelmäßig nicht.
- Mahn-/Auskunfts-/Pauschalkosten ohne nachvollziehbare Grundlage.
- Verzugszinsen: Satz und Bezugsbetrag schlüssig?

unberechtigter_anteil_eur: 0 bei "berechtigt"/"unklar"; voller Betrag bei "unberechtigt"; Teilbetrag bei "teilweise". Rechne KEINE Gesamtsummen – das übernimmt das System.

KONTEXT: Du erhältst, ob es das erste Schreiben ist, ob bereits widersprochen wurde und ob bereits gezahlt wurde. Berücksichtige die Chronologie; bereits geleistete Zahlungen fließen NICHT in deine Posten-Bewertung ein (verrechnet das System separat).

Antworte ausschließlich im vorgegebenen JSON-Format. Alle Texte auf Deutsch.`;

export function buildUserContext(o: Onboarding): string {
  return [
    "Chronologischer Kontext des Nutzers:",
    `- Erstes Schreiben in dieser Sache: ${o.ersterBrief ? "ja" : "nein"}`,
    `- Bereits widersprochen: ${o.bereitsWidersprochen ? "ja" : "nein"}`,
    `- Bereits gezahlt: ${o.bereitsGezahltEur > 0 ? o.bereitsGezahltEur.toFixed(2) + " EUR" : "nein"}`,
    "",
    "Analysiere das beigefügte Schreiben gemäß den Regeln und gib das JSON-Objekt zurück.",
  ].join("\n");
}
