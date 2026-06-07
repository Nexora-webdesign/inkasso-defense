// lib/letter-guide.ts
// Deterministische "So geht's weiter"-Leitfäden je Brieftyp (keine KI, keine
// Rechtsberatung). Nutzt die EscalationGuide-Form aus lib/escalation.ts.
import type { CaseStatus, EscalationGuide } from "@/lib/escalation";
import type { LetterType } from "@/lib/followup";

export const LETTER_TYPE_LABEL: Record<LetterType, string> = {
  zahlungserinnerung: "Zahlungserinnerung",
  mahnung: "Mahnung",
  inkasso: "Inkasso-Schreiben",
  mahnbescheid: "Mahnbescheid (Gericht)",
  vollstreckungsbescheid: "Vollstreckungsbescheid (Gericht)",
  glaeubiger_antwort: "Antwort des Gläubigers",
  sonstiges: "Sonstiges Schreiben",
};

/** Leitfaden inkl. vorgeschlagenem Folgestatus (suggestNext) für die Fall-Statusmaschine. */
const GUIDES: Record<LetterType, EscalationGuide> = {
  zahlungserinnerung: {
    headline: "Außergerichtliche Zahlungserinnerung",
    intro:
      "Eine (noch freundliche) Erinnerung – das Verfahren ist nicht gerichtlich. Reagiere zeitnah, falls du das noch nicht getan hast.",
    deadlineDays: 14,
    steps: [
      { title: "Antwort senden (falls noch nicht geschehen)", detail: "Nutze deinen Teilwiderspruch aus dem Erstschreiben – erkenne nur den fairen Kern an." },
      { title: "Dokumentieren", detail: "Halte Datum und Versandnachweis fest." },
    ],
  },
  mahnung: {
    headline: "Außergerichtliche Mahnung",
    intro:
      "Eine Mahnung von Gläubiger oder Inkasso – noch kein gerichtliches Verfahren. Bleib ruhig und reagiere sachlich; die genannte Frist findest du oben.",
    deadlineDays: 14,
    steps: [
      { title: "Forderung weiter bestreiten", detail: "Falls du bereits widersprochen hast, verweise darauf. Sonst sende deinen Teilwiderspruch." },
      { title: "Nichts Strittiges zahlen", detail: "Vermeide Teilzahlungen ohne Tilgungsbestimmung – sie können als Anerkenntnis gewertet werden." },
      { title: "Auf Mahnbescheid achten", detail: "Kommt später ein gelber gerichtlicher Mahnbescheid, lade ihn sofort hier hoch – dann läuft eine strikte 14-Tage-Frist." },
    ],
  },
  inkasso: {
    headline: "Inkasso-Schreiben",
    intro:
      "Ein außergerichtliches Inkasso-/Forderungsschreiben. Das Inkassobüro muss die Forderung nachvollziehbar belegen.",
    steps: [
      { title: "Beleg/Vollmacht prüfen", detail: "Du darfst Grund und Höhe der Forderung bestreiten und Nachweise verlangen." },
      { title: "Teilwiderspruch (falls noch nicht)", detail: "Erkenne nur den unstrittigen fairen Kern an und widersprich dem Rest." },
      { title: "Unterlagen sammeln", detail: "Bewahre den gesamten Schriftverkehr geordnet auf." },
    ],
  },
  mahnbescheid: {
    headline: "Wichtig: gerichtlicher Mahnbescheid – 14-Tage-Frist",
    intro:
      "Ein gerichtlicher Mahnbescheid ist ernst zu nehmen. Ab Zustellung hast du 14 Tage, um zu widersprechen – sonst kann ein Vollstreckungsbescheid ergehen.",
    deadlineDays: 14,
    urgent: true,
    suggestNext: "mahnbescheid_erhalten" as CaseStatus,
    steps: [
      { title: "Zustelldatum notieren", detail: "Die Frist beginnt mit der Zustellung (oft auf dem Umschlag vermerkt). Trage dir das Fristende sofort ein." },
      { title: "Widerspruchsformular nutzen", detail: "Dem Mahnbescheid liegt ein Formular bei. Kreuze 'Ich widerspreche dem Anspruch insgesamt' an und sende es fristgerecht ans angegebene Gericht." },
      { title: "Unterstützung holen", detail: "Gerade jetzt sinnvoll: Verbraucherzentrale oder Rechtsanwalt einschalten." },
    ],
  },
  vollstreckungsbescheid: {
    headline: "Sehr dringend: Vollstreckungsbescheid",
    intro:
      "Ein Vollstreckungsbescheid ergeht nach einem unwidersprochenen Mahnbescheid und ist vollstreckbar. Gegen ihn ist binnen 2 Wochen ab Zustellung der Einspruch möglich – handle sofort.",
    deadlineDays: 14,
    urgent: true,
    suggestNext: "mahnbescheid_erhalten" as CaseStatus,
    steps: [
      { title: "Sofort Frist prüfen", detail: "Notiere das Zustelldatum; die Einspruchsfrist beträgt 2 Wochen und ist strikt." },
      { title: "Einspruch einlegen", detail: "Der Einspruch ist beim im Bescheid genannten Gericht einzulegen." },
      { title: "Dringend Hilfe holen", detail: "Wende dich umgehend an eine Verbraucherzentrale oder einen Rechtsanwalt – hier geht es um Zwangsvollstreckung." },
    ],
  },
  glaeubiger_antwort: {
    headline: "Antwort des Gläubigers",
    intro:
      "Der Gläubiger bzw. das Inkasso hat auf deinen Widerspruch reagiert. Prüfe, ob nachvollziehbare Belege oder eine Vollmacht beigefügt sind.",
    steps: [
      { title: "Belege prüfen", detail: "Wurden Vertrag/Rechnung/Vollmacht vorgelegt? Ohne tragfähigen Nachweis kannst du dein Bestreiten aufrechterhalten." },
      { title: "Bei Bedarf erneut widersprechen", detail: "Bleibt die Forderung unbelegt oder überhöht, wiederhole deinen begründeten Widerspruch." },
    ],
  },
  sonstiges: {
    headline: "Schreiben prüfen",
    intro:
      "Dieses Schreiben ließ sich nicht eindeutig einordnen. Lies es sorgfältig und prüfe, ob eine Frist oder Zahlungsaufforderung enthalten ist.",
    steps: [
      { title: "Inhalt & Fristen prüfen", detail: "Achte auf Absender, Aktenzeichen und genannte Fristen." },
      { title: "Im Zweifel Rat einholen", detail: "Bei Unsicherheit hilft die Verbraucherzentrale weiter." },
    ],
  },
};

export function getLetterGuide(letterType: LetterType): EscalationGuide {
  return GUIDES[letterType] ?? GUIDES.sonstiges;
}

/** Status-Rang zum Vergleich, ob ein erkannter Brief den Fall "weiterbewegt". */
const STATUS_RANK: Record<string, number> = {
  offen: 0,
  widerspruch_gesendet: 1,
  mahnbescheid_erhalten: 2,
  erledigt: 3,
};

/** true, wenn next den Fall gegenüber current voranbringt (für Auto-Status). */
export function isStatusAdvance(current: string, next: string): boolean {
  return (STATUS_RANK[next] ?? -1) > (STATUS_RANK[current] ?? -1);
}
