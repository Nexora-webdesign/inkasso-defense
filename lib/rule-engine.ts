// lib/rule-engine.ts
// -----------------------------------------------------------------------------
// Deterministische juristische Auswertung. Nimmt die KI-Fakten + Onboarding und
// erzeugt das Frontend-Payload. Geldrechnung ausschließlich in Cent.
// Die Rechtslogik liegt allein in lib/rules.ts (siehe CLAUDE.md).
// -----------------------------------------------------------------------------
import { DEFAULT_ONBOARDING, type Fakten, type Faktenposten, type Onboarding } from "./facts";
import { REGELN, RULES_VERSION, type Regel } from "./rules";

export type FrontendStatus = "RECHTENS" | "GEKUERZT" | "NICHT_RECHTENS";

export interface AuditEintrag {
  posten: string;
  regelId: string;
  norm: string;
  geprueft: boolean;
  kuerzungEur: number;
}

export interface FrontendPayload {
  stammdaten: { inkassoName: string; glaeubiger: string; aktenzeichen: string; originalSumme: number };
  berechnung: { fairerKern: number; ersparnis: number; laufzeitMonate: number; vorgeschlageneRate: number };
  posten: { name: string; status: FrontendStatus; betrag: number; paragraph: string; wieso: string }[];
  emailTemplate: string;
  hinweise: string[];
  audit: {
    rulesVersion: string;
    requireApproved: boolean;
    regelnAktiv: number;
    regelnGesamt: number;
    eintraege: AuditEintrag[];
  };
}

export interface EvaluateOptions {
  /** Nur anwaltlich freigegebene Regeln (geprueft:true) anwenden. */
  requireApproved: boolean;
}

// --- Geld-Mathematik in Cent (gegen Float-Drift) ----------------------------
const toCents = (eur: number) => Math.round((Number.isFinite(eur) ? eur : 0) * 100);
const toEur = (cents: number) => cents / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

// trifft_zu defensiv gekapselt -> eine fehlerhafte Regel crasht nie die Analyse.
function matches(r: Regel, f: Fakten, p: Faktenposten): boolean {
  try {
    return r.trifft_zu(f, p);
  } catch {
    return false;
  }
}

// Erste passende Regel aus der übergebenen (aktiven) Regelmenge.
function findRule(regeln: Regel[], f: Fakten, p: Faktenposten): Regel | undefined {
  return regeln.find((r) => matches(r, f, p));
}

export function evaluate(
  fakten: Fakten,
  onboarding: Onboarding = DEFAULT_ONBOARDING,
  options: EvaluateOptions = { requireApproved: false },
): FrontendPayload {
  // "geprueft"-Gate: bei requireApproved nur anwaltlich freigegebene Regeln anwenden.
  const aktiveRegeln = REGELN.filter((r) => !options.requireApproved || r.geprueft);

  const eintraege: AuditEintrag[] = [];
  const hinweise: string[] = [];
  const posten: FrontendPayload["posten"] = [];
  let ersparnisC = 0;
  let postenSumC = 0;
  let zurueckgehalten = false; // eine noch ungeprüfte Regel hätte gepasst

  for (const p of fakten.posten) {
    const betragC = Math.max(0, toCents(p.betrag_eur));
    postenSumC += betragC;

    const regel = findRule(aktiveRegeln, fakten, p);
    if (options.requireApproved && !regel && REGELN.some((r) => !r.geprueft && matches(r, fakten, p))) {
      zurueckgehalten = true;
    }
    let kuerzC = 0;
    if (regel) {
      let roh = 0;
      try {
        roh = regel.kuerzungEur(p);
      } catch {
        roh = 0;
      }
      kuerzC = clamp(toCents(roh), 0, betragC);
    }
    ersparnisC += kuerzC;

    let status: FrontendStatus = "RECHTENS";
    if (kuerzC > 0 && kuerzC >= betragC && betragC > 0) status = "NICHT_RECHTENS";
    else if (kuerzC > 0) status = "GEKUERZT";

    posten.push({
      name: p.bezeichnung_im_text || p.art,
      status,
      betrag: toEur(betragC),
      paragraph: regel && kuerzC > 0 ? regel.norm : "",
      wieso:
        regel && kuerzC > 0
          ? regel.begruendung
          : "Nach den hinterlegten Regeln ist hier kein Beanstandungsgrund ersichtlich.",
    });

    if (regel && kuerzC > 0) {
      eintraege.push({
        posten: p.bezeichnung_im_text || p.art,
        regelId: regel.id,
        norm: regel.norm,
        geprueft: regel.geprueft,
        kuerzungEur: toEur(kuerzC),
      });
    }
  }

  const forderungC = Math.max(0, toCents(fakten.forderungssumme_eur));
  const gezahltC = Math.max(0, toCents(onboarding.bereitsGezahltEur));
  const berechtigtC = Math.max(0, forderungC - ersparnisC);
  const fairerKernC = Math.max(0, berechtigtC - gezahltC);

  const fairerKern = toEur(fairerKernC);
  const ersparnis = toEur(ersparnisC);

  // Einfache, deterministische Raten-Heuristik (~75 EUR/Monat, 1..12).
  const laufzeitMonate = fairerKernC <= 0 ? 1 : clamp(Math.round(fairerKernC / 7500), 1, 12);
  const vorgeschlageneRate = toEur(Math.ceil(fairerKernC / laufzeitMonate));

  if (Math.abs(postenSumC - forderungC) > 1) {
    hinweise.push(
      "Die Summe der erkannten Posten weicht von der angegebenen Forderungssumme ab – das Dokument wurde möglicherweise unvollständig erfasst.",
    );
  }
  if (fakten.vertrauensgrad === "niedrig") {
    hinweise.push("Die automatische Erfassung war unsicher. Bitte lass das Ergebnis anwaltlich prüfen.");
  }
  if (zurueckgehalten) {
    hinweise.push("Eine mögliche Kürzung wartet noch auf anwaltliche Freigabe.");
  }

  const bestritten = posten.filter((x) => x.status !== "RECHTENS");
  const az = fakten.aktenzeichen && fakten.aktenzeichen.toLowerCase() !== "unbekannt" ? fakten.aktenzeichen : "";
  const emailTemplate = buildEmail({ ersterBrief: onboarding.ersterBrief, aktenzeichen: az, bestritten, fairerKern });

  return {
    stammdaten: {
      inkassoName: fakten.absender_name || "Unbekannter Gläubiger",
      glaeubiger: fakten.urspruenglicher_glaeubiger || "",
      aktenzeichen: fakten.aktenzeichen || "",
      originalSumme: toEur(forderungC),
    },
    berechnung: { fairerKern, ersparnis, laufzeitMonate, vorgeschlageneRate },
    posten,
    emailTemplate,
    hinweise,
    audit: {
      rulesVersion: RULES_VERSION,
      requireApproved: options.requireApproved,
      regelnAktiv: aktiveRegeln.length,
      regelnGesamt: REGELN.length,
      eintraege,
    },
  };
}

// --- E-Mail-Vorlage (deterministisch, kein Datum/Zufall) --------------------
function eur(n: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
}

function buildEmail(args: {
  ersterBrief: boolean;
  aktenzeichen: string;
  bestritten: FrontendPayload["posten"];
  fairerKern: number;
}): string {
  const azZeile = args.aktenzeichen ? ` (Aktenzeichen ${args.aktenzeichen})` : "";
  const bezug = args.ersterBrief
    ? "ich beziehe mich auf Ihr Schreiben"
    : "ich beziehe mich auf Ihr erneutes Schreiben";

  const liste =
    args.bestritten.length > 0
      ? "Folgende Positionen weise ich zurück:\n" + args.bestritten.map((p) => `- ${p.name}: ${p.wieso}`).join("\n")
      : "Eine über die Hauptforderung hinausgehende Position kann ich nicht nachvollziehen.";

  const anerkennung =
    args.fairerKern > 0
      ? `Den aus meiner Sicht berechtigten, unstrittigen Betrag in Höhe von ${eur(args.fairerKern)} erkenne ich an und gleiche ihn aus bzw. biete eine Ratenzahlung an.`
      : "Eine offene, berechtigte Restforderung verbleibt nach meiner Prüfung nicht.";

  return [
    "Sehr geehrte Damen und Herren,",
    "",
    `${bezug}${azZeile} und widerspreche der geltend gemachten Forderung teilweise.`,
    "",
    liste,
    "",
    anerkennung,
    "",
    "Tilgungsbestimmung: Gemäß § 366 Abs. 1 BGB bestimme ich, dass meine Zahlungen vorrangig auf die Hauptforderung und nicht auf die von mir bestrittenen Kosten und Gebühren angerechnet werden.",
    "",
    "Da die darüber hinausgehende Forderung bestritten ist, widerspreche ich einer Übermittlung dieser bestrittenen Forderung an Auskunfteien (z. B. SCHUFA) und bitte, von einer entsprechenden Meldung abzusehen.",
    "",
    "Ich bitte um eine korrigierte Abrechnung und setze hierfür eine angemessene Frist von 14 Tagen.",
    "",
    "Mit freundlichen Grüßen",
  ].join("\n");
}
