// lib/rules.ts
// -----------------------------------------------------------------------------
// EINZIGE anwaltlich editierbare Datei. Hier stehen NUR Regel-Deklarationen –
// keine Engine-Logik, keine Summenbildung. Die Auswertung erfolgt in
// lib/rule-engine.ts (siehe CLAUDE.md).
//
// WICHTIG: "geprueft" bleibt false, bis ein Anwalt die Regel + Norm bestätigt hat.
// -----------------------------------------------------------------------------
import type { Fakten, Faktenposten } from "./facts";

export const RULES_VERSION = "2026-06-06-ENTWURF";

export interface Regel {
  /** Stabiler Bezeichner (für Audit & Golden-Tests). */
  id: string;
  /** Zitierte Norm / Rechtsprechung. */
  norm: string;
  /** true erst nach anwaltlicher Freigabe. */
  geprueft: boolean;
  /** Kurze, laienverständliche Begründung. */
  begruendung: string;
  /** Trifft die Regel auf diesen Posten zu (rein anhand der Fakten)? */
  trifft_zu(f: Fakten, p: Faktenposten): boolean;
  /** Unberechtigter/zu kürzender Betrag in EUR (>= 0). */
  kuerzungEur(p: Faktenposten): number;
}

export const REGELN: Regel[] = [
  {
    id: "tk-grundgebuehr-sperre-50",
    norm: "BGH-Rspr. zur anteiligen Grundgebühr bei Anschlusssperre (Az. anwaltlich zu bestätigen)",
    geprueft: false,
    begruendung:
      "Bei einer belegten Vollsperrung des Anschlusses ist die Grundgebühr für diesen Zeitraum nur anteilig geschuldet.",
    trifft_zu: (f, p) => p.art === "grundgebuehr" && f.telekommunikationssperre_belegt,
    kuerzungEur: (p) => p.betrag_eur * 0.5,
  },
  {
    id: "einigungsgebuehr-ohne-vergleich",
    norm: "Nr. 1000 VV RVG",
    geprueft: false,
    begruendung:
      "Eine Einigungsgebühr setzt einen echten Vergleich (gegenseitiges Nachgeben) voraus; eine bloße Ratenzahlung genügt dafür nicht.",
    trifft_zu: (f, p) => p.art === "einigungsgebuehr" && f.nur_ratenzahlung_kein_vergleich,
    kuerzungEur: (p) => p.betrag_eur,
  },
  {
    id: "geschaeftsgebuehr-ueber-schwelle-1-3",
    norm: "Nr. 2300 VV RVG – Schwellengebühr 1,3",
    geprueft: false,
    begruendung:
      "Ohne belegte besondere Umstände ist die Geschäftsgebühr auf die Schwellengebühr von 1,3 zu reduzieren.",
    trifft_zu: (f, p) =>
      p.art === "geschaeftsgebuehr" && p.gebuehrensatz > 1.3 && !f.besondere_umstaende_belegt,
    kuerzungEur: (p) => Math.round(p.betrag_eur * (1 - 1.3 / p.gebuehrensatz) * 100) / 100,
  },
];
