// golden/cases.ts
// Testfälle für die Rule-Engine. Jede Regeländerung braucht hier einen
// Positiv- UND einen Negativfall (siehe CLAUDE.md).
import type { Fakten, Faktenposten, Onboarding, PostenArt } from "@/lib/facts";
import type { FrontendStatus } from "@/lib/rule-engine";

export function posten(
  art: PostenArt,
  betrag_eur: number,
  gebuehrensatz = 0,
  extra: Partial<Faktenposten> = {},
): Faktenposten {
  return {
    art,
    bezeichnung_im_text: art,
    betrag_eur,
    gebuehrensatz,
    pauschale_aus_verwaltungskosten: false,
    beleg: "Testbeleg",
    ...extra,
  };
}

export function makeFakten(over: Partial<Fakten> = {}): Fakten {
  return {
    dokument_erkannt: true,
    absender_name: "Test Inkasso GmbH",
    urspruenglicher_glaeubiger: "Test Gläubiger",
    aktenzeichen: "AZ-TEST",
    forderungssumme_eur: 0,
    posten: [],
    telekommunikationssperre_belegt: false,
    nur_ratenzahlung_kein_vergleich: false,
    besondere_umstaende_belegt: false,
    forderung_bestritten: false,
    ist_verbraucher: true,
    verzugszins_prozent: 0,
    zweite_anwalts_geschaeftsgebuehr: false,
    vertrauensgrad: "hoch",
    ...over,
  };
}

const ONB = (over: Partial<Onboarding> = {}): Onboarding => ({
  ersterBrief: true,
  bereitsWidersprochen: false,
  bereitsGezahltEur: 0,
  ...over,
});

export interface GoldenCase {
  name: string;
  fakten: Fakten;
  onboarding?: Onboarding;
  erwartet: { ersparnis: number; fairerKern: number; status: FrontendStatus[] };
}

export const CASES: GoldenCase[] = [
  {
    name: "A) Grundgebühr mit belegter Anschlusssperre -> 50% gekürzt",
    fakten: makeFakten({
      forderungssumme_eur: 40,
      telekommunikationssperre_belegt: true,
      posten: [posten("grundgebuehr", 40)],
    }),
    erwartet: { ersparnis: 20, fairerKern: 20, status: ["GEKUERZT"] },
  },
  {
    name: "B) NEGATIV: Grundgebühr ohne belegte Sperre -> keine Kürzung",
    fakten: makeFakten({
      forderungssumme_eur: 40,
      telekommunikationssperre_belegt: false,
      posten: [posten("grundgebuehr", 40)],
    }),
    erwartet: { ersparnis: 0, fairerKern: 40, status: ["RECHTENS"] },
  },
  {
    name: "C) Einigungsgebühr bei bloßer Ratenzahlung -> voll gestrichen",
    fakten: makeFakten({
      forderungssumme_eur: 30,
      nur_ratenzahlung_kein_vergleich: true,
      posten: [posten("einigungsgebuehr", 30)],
    }),
    erwartet: { ersparnis: 30, fairerKern: 0, status: ["NICHT_RECHTENS"] },
  },
  {
    name: "D) Geschäftsgebühr 1,9 UNBESTRITTEN -> auf 0,9 reduziert",
    fakten: makeFakten({
      forderungssumme_eur: 100,
      besondere_umstaende_belegt: false,
      forderung_bestritten: false,
      posten: [posten("geschaeftsgebuehr", 100, 1.9)],
    }),
    // s = 0,9 (unbestritten): 100 * (1 - 0.9/1.9) = 52,6315... -> 52,63
    erwartet: { ersparnis: 52.63, fairerKern: 47.37, status: ["GEKUERZT"] },
  },
  {
    name: "D2) Geschäftsgebühr 1,9 BESTRITTEN -> auf 1,3 reduziert",
    fakten: makeFakten({
      forderungssumme_eur: 100,
      besondere_umstaende_belegt: false,
      forderung_bestritten: true,
      posten: [posten("geschaeftsgebuehr", 100, 1.9)],
    }),
    // s = 1,3 (bestritten): 100 * (1 - 1.3/1.9) = 31,5789... -> 31,58
    erwartet: { ersparnis: 31.58, fairerKern: 68.42, status: ["GEKUERZT"] },
  },
  {
    name: "E) NEGATIV: Geschäftsgebühr 1,9 mit besonderen Umständen -> keine Kürzung",
    fakten: makeFakten({
      forderungssumme_eur: 100,
      besondere_umstaende_belegt: true,
      posten: [posten("geschaeftsgebuehr", 100, 1.9)],
    }),
    erwartet: { ersparnis: 0, fairerKern: 100, status: ["RECHTENS"] },
  },

  // --- Verzugszins überhöht (§ 288 Abs. 1 BGB, Verbraucher 6,27 %) ----------
  {
    name: "F) Verzugszins 12% beim Verbraucher -> auf 6,27% gekürzt",
    fakten: makeFakten({
      forderungssumme_eur: 100,
      ist_verbraucher: true,
      verzugszins_prozent: 12,
      posten: [posten("verzugszinsen", 100)],
    }),
    // 100 * (1 - 6.27/12) = 47,75
    erwartet: { ersparnis: 47.75, fairerKern: 52.25, status: ["GEKUERZT"] },
  },
  {
    name: "G) NEGATIV: Verzugszins genau 6,27% beim Verbraucher -> keine Kürzung",
    fakten: makeFakten({
      forderungssumme_eur: 100,
      ist_verbraucher: true,
      verzugszins_prozent: 6.27,
      posten: [posten("verzugszinsen", 100)],
    }),
    erwartet: { ersparnis: 0, fairerKern: 100, status: ["RECHTENS"] },
  },

  // --- Verzugspauschale (§ 288 Abs. 5 BGB: nicht gegen Verbraucher) ---------
  {
    name: "H) Verzugspauschale 40€ beim Verbraucher -> voll gestrichen",
    fakten: makeFakten({
      forderungssumme_eur: 40,
      ist_verbraucher: true,
      posten: [posten("verzugspauschale", 40)],
    }),
    erwartet: { ersparnis: 40, fairerKern: 0, status: ["NICHT_RECHTENS"] },
  },
  {
    name: "I) NEGATIV: Verzugspauschale 40€ bei Nicht-Verbraucher -> keine Kürzung",
    fakten: makeFakten({
      forderungssumme_eur: 40,
      ist_verbraucher: false,
      posten: [posten("verzugspauschale", 40)],
    }),
    erwartet: { ersparnis: 0, fairerKern: 40, status: ["RECHTENS"] },
  },

  // --- Auslagenpauschale Cap (Nr. 7002 VV RVG, max. 20 €) -------------------
  {
    name: "J) Auslagen 25€ -> auf 20€ gedeckelt (5€ gekürzt)",
    fakten: makeFakten({
      forderungssumme_eur: 25,
      posten: [posten("auslagen", 25)],
    }),
    erwartet: { ersparnis: 5, fairerKern: 20, status: ["GEKUERZT"] },
  },
  {
    name: "K) NEGATIV: Auslagen genau 20€ -> keine Kürzung",
    fakten: makeFakten({
      forderungssumme_eur: 20,
      posten: [posten("auslagen", 20)],
    }),
    erwartet: { ersparnis: 0, fairerKern: 20, status: ["RECHTENS"] },
  },

  // --- Mahnkosten erste Mahnung (§§ 286, 280 BGB; Onboarding-abhängig) ------
  {
    name: "L) Mahnkosten 15€ bei erstem Schreiben (ersterBrief=true) -> voll gestrichen",
    fakten: makeFakten({
      forderungssumme_eur: 15,
      posten: [posten("mahnkosten", 15)],
    }),
    onboarding: ONB({ ersterBrief: true }),
    erwartet: { ersparnis: 15, fairerKern: 0, status: ["NICHT_RECHTENS"] },
  },
  {
    name: "M) NEGATIV: Mahnkosten 15€ bei Folgeschreiben (ersterBrief=false) -> keine Kürzung",
    fakten: makeFakten({
      forderungssumme_eur: 15,
      posten: [posten("mahnkosten", 15)],
    }),
    onboarding: ONB({ ersterBrief: false }),
    erwartet: { ersparnis: 0, fairerKern: 15, status: ["RECHTENS"] },
  },

  // --- Verwaltungskostenpauschale (BGH VIII ZR 289/19) ----------------------
  {
    name: "N) Verwaltungskostenpauschale (Flag) -> voll gestrichen",
    fakten: makeFakten({
      forderungssumme_eur: 30,
      posten: [posten("sonstiges", 30, 0, { pauschale_aus_verwaltungskosten: true })],
    }),
    erwartet: { ersparnis: 30, fairerKern: 0, status: ["NICHT_RECHTENS"] },
  },
  {
    name: "O) NEGATIV: gleicher Posten ohne Verwaltungskosten-Flag -> keine Kürzung",
    fakten: makeFakten({
      forderungssumme_eur: 30,
      posten: [posten("sonstiges", 30, 0, { pauschale_aus_verwaltungskosten: false })],
    }),
    erwartet: { ersparnis: 0, fairerKern: 30, status: ["RECHTENS"] },
  },
];
