// golden/cases.ts
// Testfälle für die Rule-Engine. Jede Regeländerung braucht hier einen
// Positiv- UND einen Negativfall (siehe CLAUDE.md).
import type { Fakten, Faktenposten, Onboarding, PostenArt } from "@/lib/facts";
import type { FrontendStatus } from "@/lib/rule-engine";

export function posten(
  art: PostenArt,
  betrag_eur: number,
  gebuehrensatz = 0,
  bezeichnung_im_text = art,
): Faktenposten {
  return { art, bezeichnung_im_text, betrag_eur, gebuehrensatz, beleg: "Testbeleg" };
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
    vertrauensgrad: "hoch",
    ...over,
  };
}

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
    name: "D) Geschäftsgebühr 1,9 ohne besondere Umstände -> auf 1,3 reduziert",
    fakten: makeFakten({
      forderungssumme_eur: 100,
      besondere_umstaende_belegt: false,
      posten: [posten("geschaeftsgebuehr", 100, 1.9)],
    }),
    // 100 * (1 - 1.3/1.9) = 31,5789... -> auf Cent: 31,58
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
];
