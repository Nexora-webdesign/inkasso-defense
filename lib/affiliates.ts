// lib/affiliates.ts
// -----------------------------------------------------------------------------
// Zentrale Partner-/Empfehlungs-Konfiguration für kontextbezogene Empfehlungen
// (Tool-Ergebnis + Blog). RECHTLICH: KEINE bezahlten Anwalts-Empfehlungen
// (§ 49b BRAO). Nur zulässige Kategorien. Provisions-Partner sind als solche
// gekennzeichnet (Werbekennzeichnung in der UI).
//
// Betreiber-Hinweis: echte Affiliate-Links bei "url" eintragen. Einträge ohne
// url werden NICHT angezeigt (kein toter Link).
// -----------------------------------------------------------------------------

export type AffiliateKategorie = "rechtsschutz" | "bonitaet" | "schuldnerberatung";

/** Signale aus dem Analyse-Ergebnis, die eine Empfehlung auslösen können. */
export type AffiliateSignal = "hohe_ersparnis" | "nicht_rechtens" | "schufa" | "ratenzahlung";

export interface Affiliate {
  id: string;
  name: string;
  kategorie: AffiliateKategorie;
  /** Ziel-URL. Leer = wird nicht angezeigt (Betreiber trägt Affiliate-Link ein). */
  url: string;
  claim: string;
  /** true = Provisions-/Werbepartner (sichtbare Kennzeichnung "Anzeige"). */
  kommission: boolean;
  /** Welche Ergebnis-Signale diese Empfehlung passend machen. */
  signals: AffiliateSignal[];
}

export const AFFILIATES: Affiliate[] = [
  {
    id: "rechtsschutz",
    name: "Rechtsschutzversicherung",
    kategorie: "rechtsschutz",
    url: "", // TODO Betreiber: Affiliate-Link eintragen
    claim: "Für künftige Streitfälle abgesichert – Beratung & Kostenübernahme.",
    kommission: true,
    signals: ["hohe_ersparnis", "nicht_rechtens"],
  },
  {
    id: "bonitaet",
    name: "Bonitäts- & SCHUFA-Check",
    kategorie: "bonitaet",
    url: "", // TODO Betreiber: Affiliate-Link eintragen
    claim: "Prüfe kostenlos, ob ein Eintrag deine Bonität beeinflusst.",
    kommission: true,
    signals: ["schufa"],
  },
  {
    id: "schuldnerberatung",
    name: "Schuldnerberatung finden",
    kategorie: "schuldnerberatung",
    url: "https://www.bag-sb.de/ratsuchende/wie-finde-ich-eine-schuldnerberatung/",
    claim: "Kostenlose, anerkannte Schuldnerberatungsstellen in deiner Nähe.",
    kommission: false,
    signals: ["ratenzahlung", "hohe_ersparnis"],
  },
];

/** Wählt passende, anzeigbare Empfehlungen (mit url) anhand der Signale. Max. 2. */
export function pickAffiliates(signals: AffiliateSignal[], limit = 2): Affiliate[] {
  const set = new Set(signals);
  return AFFILIATES.filter((a) => a.url && a.signals.some((s) => set.has(s))).slice(0, limit);
}
