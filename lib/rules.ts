// lib/rules.ts
// -----------------------------------------------------------------------------
// EINZIGE anwaltlich editierbare Datei. Hier stehen NUR Regel-Deklarationen –
// keine Engine-Logik, keine Summenbildung. Die Auswertung erfolgt in
// lib/rule-engine.ts (siehe CLAUDE.md).
//
// WICHTIG: "geprueft" bleibt false, bis ein Anwalt die Regel + Norm bestätigt hat.
// -----------------------------------------------------------------------------
import type { Fakten, Faktenposten } from "./facts";
import type { RegelContext } from "./rule-engine";

export const RULES_VERSION = "2026-06-06-ENTWURF-v2";

// Stand 01.01.2026: Basiszinssatz 1,27 % + 5 PP, § 288 Abs. 1 BGB.
// ACHTUNG: zum 01.01. und 01.07. prüfen/aktualisieren.
export const VERZUGSZINS_VERBRAUCHER_PROZENT = 6.27;

export interface Regel {
  /** Stabiler Bezeichner (für Audit & Golden-Tests). */
  id: string;
  /** Zitierte Norm / Rechtsprechung. */
  norm: string;
  /** true erst nach anwaltlicher Freigabe. */
  geprueft: boolean;
  /** Kurze, laienverständliche Begründung. */
  begruendung: string;
  /** Trifft die Regel auf diesen Posten zu (rein anhand der Fakten + Kontext)? */
  trifft_zu(f: Fakten, p: Faktenposten, ctx: RegelContext): boolean;
  /** Unberechtigter/zu kürzender Betrag in EUR (>= 0). */
  kuerzungEur(f: Fakten, p: Faktenposten, ctx: RegelContext): number;
}

// Reihenfolge ist relevant: pro Posten greift die ERSTE passende Regel.
// Die Verwaltungskostenpauschale steht zuletzt (greift unabhängig von "art").
export const REGELN: Regel[] = [
  {
    id: "tk-grundgebuehr-sperre-50",
    norm: "BGH-Rspr. zur anteiligen Grundgebühr bei Anschlusssperre (Az. anwaltlich zu bestätigen)",
    geprueft: false,
    begruendung:
      "Bei einer belegten Vollsperrung des Anschlusses ist die Grundgebühr für diesen Zeitraum nur anteilig geschuldet.",
    trifft_zu: (f, p) => p.art === "grundgebuehr" && f.telekommunikationssperre_belegt,
    kuerzungEur: (_f, p) => p.betrag_eur * 0.5,
  },
  {
    id: "einigungsgebuehr-ohne-vergleich",
    norm: "Nr. 1000 VV RVG",
    geprueft: false,
    begruendung:
      "Eine Einigungsgebühr setzt einen echten Vergleich (gegenseitiges Nachgeben) voraus; eine bloße Ratenzahlung genügt dafür nicht.",
    trifft_zu: (f, p) => p.art === "einigungsgebuehr" && f.nur_ratenzahlung_kein_vergleich,
    kuerzungEur: (_f, p) => p.betrag_eur,
  },
  {
    id: "geschaeftsgebuehr-ueber-schwelle-1-3",
    norm: "Nr. 2300 Anm. Abs. 2 VV RVG – Inkasso-Schwellengebühr 0,9 (bzw. 1,3 bei bestrittener Forderung)",
    geprueft: false,
    begruendung:
      "Ohne belegte besondere Umstände ist die Geschäftsgebühr auf die Schwellengebühr zu reduzieren – im Inkasso 0,9, bei bestrittener Forderung 1,3.",
    trifft_zu: (f, p) =>
      p.art === "geschaeftsgebuehr" &&
      !f.besondere_umstaende_belegt &&
      p.gebuehrensatz > (f.forderung_bestritten ? 1.3 : 0.9),
    kuerzungEur: (f, p) => {
      const s = f.forderung_bestritten ? 1.3 : 0.9;
      return Math.round(p.betrag_eur * (1 - s / p.gebuehrensatz) * 100) / 100;
    },
  },
  {
    id: "verzugszins-ueberhoeht-verbraucher",
    norm: "§ 288 Abs. 1 BGB",
    geprueft: false,
    begruendung:
      "Gegenüber Verbrauchern beträgt der gesetzliche Verzugszins 5 Prozentpunkte über dem Basiszinssatz; ein höher angesetzter Satz ist insoweit nicht geschuldet.",
    trifft_zu: (f, p) =>
      p.art === "verzugszinsen" && f.ist_verbraucher && f.verzugszins_prozent > VERZUGSZINS_VERBRAUCHER_PROZENT,
    kuerzungEur: (f, p) =>
      Math.round(p.betrag_eur * (1 - VERZUGSZINS_VERBRAUCHER_PROZENT / f.verzugszins_prozent) * 100) / 100,
  },
  {
    id: "verzugspauschale-verbraucher-288-5",
    norm: "§ 288 Abs. 5 BGB",
    geprueft: false,
    begruendung:
      "Die 40-EUR-Verzugspauschale steht nur Gläubigern gegenüber Nicht-Verbrauchern zu; gegenüber Verbrauchern besteht kein Anspruch.",
    trifft_zu: (f, p) => p.art === "verzugspauschale" && f.ist_verbraucher,
    kuerzungEur: (_f, p) => p.betrag_eur,
  },
  {
    id: "auslagenpauschale-ueber-cap-7002",
    norm: "Nr. 7002 VV RVG (max. 20 €)",
    geprueft: false,
    begruendung:
      "Die Post- und Telekommunikationspauschale ist gesetzlich auf höchstens 20 EUR begrenzt; ein darüber hinausgehender Betrag ist nicht erstattungsfähig.",
    trifft_zu: (_f, p) => p.art === "auslagen" && p.betrag_eur > 20,
    kuerzungEur: (_f, p) => p.betrag_eur - 20,
  },
  {
    id: "mahnkosten-erste-mahnung",
    norm: "§§ 286, 280 BGB",
    geprueft: false,
    begruendung:
      "Die Kosten der ersten Mahnung sind regelmäßig nicht erstattungsfähig, weil der Verzug erst durch sie begründet wird.",
    // KOMMENTAR: aggressiv – Kanzlei muss kalibrieren (Verzug ggf. schon vorher eingetreten).
    trifft_zu: (_f, p, ctx) => p.art === "mahnkosten" && ctx.onboarding.ersterBrief === true,
    kuerzungEur: (_f, p) => p.betrag_eur,
  },
  {
    id: "verwaltungskosten-pauschale-bgh",
    norm: "BGH 10.06.2020 – VIII ZR 289/19",
    geprueft: false,
    begruendung:
      "Pauschalen für eigenen Verwaltungs-, Bearbeitungs-, IT- oder Personalaufwand sind kein erstattungsfähiger Verzugsschaden.",
    trifft_zu: (_f, p) => p.pauschale_aus_verwaltungskosten === true,
    kuerzungEur: (_f, p) => p.betrag_eur,
  },
];
