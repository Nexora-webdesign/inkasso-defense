// lib/escalation.ts – Deterministischer Eskalations-Assistent.
// Pro Fall-Status geführte nächste Schritte. Keine Rechtsberatung; rein
// informativ. Keine Zufalls-/Datumslogik hier (Daten kommen aus dem Aufrufer).

export type CaseStatus = "offen" | "widerspruch_gesendet" | "mahnbescheid_erhalten" | "erledigt";

export const STATUS_ORDER: CaseStatus[] = [
  "offen",
  "widerspruch_gesendet",
  "mahnbescheid_erhalten",
  "erledigt",
];

export const STATUS_META: Record<CaseStatus, { label: string; hint: string }> = {
  offen: { label: "Offen", hint: "Noch nichts unternommen" },
  widerspruch_gesendet: { label: "Widerspruch gesendet", hint: "Reaktion abwarten" },
  mahnbescheid_erhalten: { label: "Mahnbescheid erhalten", hint: "Frist beachten!" },
  erledigt: { label: "Erledigt", hint: "Abgeschlossen" },
};

export function isCaseStatus(v: unknown): v is CaseStatus {
  return typeof v === "string" && (STATUS_ORDER as string[]).includes(v);
}

export interface EscalationStep {
  title: string;
  detail: string;
}

export interface EscalationGuide {
  headline: string;
  intro: string;
  /** Detail-Schritte (Premium). */
  steps: EscalationStep[];
  /** Informativer Frist-Hinweis in Tagen, falls relevant. */
  deadlineDays?: number;
  /** true = dringender, fristgebundener Status (z. B. Mahnbescheid). */
  urgent?: boolean;
  /** Vorgeschlagener nächster Status (für die Status-Maschine). */
  suggestNext?: CaseStatus;
}

const GUIDES: Record<CaseStatus, EscalationGuide> = {
  offen: {
    headline: "Jetzt Teilwiderspruch senden",
    intro:
      "Reagiere zeitnah – idealerweise innerhalb von 14 Tagen –, damit keine weiteren Mahnstufen oder Kosten entstehen.",
    deadlineDays: 14,
    suggestNext: "widerspruch_gesendet",
    steps: [
      {
        title: "Antwort versenden",
        detail:
          "Nutze die fertige Antwort aus deiner Analyse (E-Mail kopieren oder als PDF herunterladen) und sende sie an das Inkassobüro. Sie erkennt nur den fairen Kern an und widerspricht dem Rest.",
      },
      {
        title: "Versand dokumentieren",
        detail:
          "Halte Datum und Beleg fest. Per Post empfiehlt sich ein Einwurf-Einschreiben als Nachweis.",
      },
      {
        title: "Status aktualisieren",
        detail: "Markiere den Fall danach als 'Widerspruch gesendet', damit du den Überblick behältst.",
      },
    ],
  },
  widerspruch_gesendet: {
    headline: "Reaktion abwarten & dokumentieren",
    intro:
      "Das Inkassobüro muss die Forderung nachvollziehbar belegen. Zahle nichts unter Druck und bewahre den Schriftverkehr auf.",
    suggestNext: "mahnbescheid_erhalten",
    steps: [
      {
        title: "Antwort prüfen",
        detail:
          "Verlangt das Büro Belege oder eine Vollmacht des Gläubigers? Du darfst die Forderung dem Grunde und der Höhe nach bestreiten.",
      },
      {
        title: "Kein vorschnelles Anerkenntnis",
        detail:
          "Vermeide Teilzahlungen ohne Tilgungsbestimmung – sie können als Anerkenntnis der Gesamtforderung gewertet werden.",
      },
      {
        title: "Bei gerichtlichem Mahnbescheid",
        detail:
          "Kommt ein (gelber) Mahnbescheid vom Amtsgericht, markiere den Fall sofort als 'Mahnbescheid erhalten' – dann läuft eine strikte 14-Tage-Frist.",
      },
    ],
  },
  mahnbescheid_erhalten: {
    headline: "Wichtig: 14-Tage-Frist für deinen Widerspruch",
    intro:
      "Ein gerichtlicher Mahnbescheid ist ernst zu nehmen. Ab Zustellung hast du 14 Tage Zeit, zu widersprechen – sonst kann ein Vollstreckungsbescheid ergehen.",
    deadlineDays: 14,
    urgent: true,
    suggestNext: "erledigt",
    steps: [
      {
        title: "Zustelldatum notieren",
        detail:
          "Die Frist beginnt mit dem Tag der Zustellung (oft auf dem Umschlag vermerkt). Trage dir das Fristende sofort ein.",
      },
      {
        title: "Widerspruchsformular nutzen",
        detail:
          "Dem Mahnbescheid liegt ein Widerspruchsformular bei. Kreuze 'Ich widerspreche dem Anspruch insgesamt' an und sende es fristgerecht an das angegebene Gericht.",
      },
      {
        title: "Unterstützung holen",
        detail:
          "Gerade jetzt sinnvoll: Verbraucherzentrale oder Rechtsanwalt einschalten, besonders wenn du unsicher bist.",
      },
    ],
  },
  erledigt: {
    headline: "Fall abgeschlossen",
    intro: "Du hast diesen Fall als erledigt markiert.",
    steps: [
      {
        title: "Unterlagen aufbewahren",
        detail:
          "Bewahre Schriftverkehr und Zahlungsbelege für mögliche Rückfragen auf – idealerweise einige Jahre.",
      },
    ],
  },
};

export function getEscalation(status: CaseStatus): EscalationGuide {
  return GUIDES[status] ?? GUIDES.offen;
}
