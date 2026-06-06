// golden/rules.golden.test.ts
// CI-Gate: kein Merge bei rotem Test (siehe CLAUDE.md).
import { describe, it, expect } from "vitest";
import { evaluate } from "@/lib/rule-engine";
import { CASES, makeFakten, posten } from "@/golden/cases";
import { REGELN } from "@/lib/rules";

const FREIGABE_HINWEIS = "Eine mögliche Kürzung wartet noch auf anwaltliche Freigabe.";

describe("Golden-Suite: Rule-Engine", () => {
  // Informations-Modus: alle Regeln rechnen; Werte wie in den Golden-Fällen.
  for (const c of CASES) {
    it(c.name, () => {
      const res = evaluate(c.fakten, c.onboarding);
      expect(res.berechnung.ersparnis).toBeCloseTo(c.erwartet.ersparnis, 2);
      expect(res.berechnung.fairerKern).toBeCloseTo(c.erwartet.fairerKern, 2);
      expect(res.posten.map((p) => p.status)).toEqual(c.erwartet.status);
    });
  }

  // Informations-Modus: ungeprüfte Regeln berechnen das Ergebnis, werden aber
  // im Audit markiert und mit Hinweis versehen (statt unterdrückt).
  describe("Informations-Modus (ungeprüfte Regeln)", () => {
    it("berechnet die Kürzung einer ungeprüften Regel (Fall A: 20 € / GEKUERZT)", () => {
      const res = evaluate(CASES[0].fakten); // grundgebuehr + Sperre, Regel geprueft:false
      expect(res.berechnung.ersparnis).toBeCloseTo(20, 2);
      expect(res.berechnung.fairerKern).toBeCloseTo(20, 2);
      expect(res.posten.map((p) => p.status)).toEqual(["GEKUERZT"]);
    });

    it("markiert die ungeprüfte Ersparnis im Audit und zeigt den Freigabe-Hinweis", () => {
      const res = evaluate(CASES[0].fakten);
      expect(res.hinweise).toContain(FREIGABE_HINWEIS);
      expect(res.audit.ungepruefteErsparnis).toBeCloseTo(20, 2);
      expect(res.audit.alleAngewendetenGeprueft).toBe(false);
      expect(res.audit.regelnGesamt).toBe(REGELN.length);
    });

    it("ohne greifende Regel: kein Hinweis, keine ungeprüfte Ersparnis (Fall B)", () => {
      const res = evaluate(CASES[1].fakten); // grundgebuehr ohne Sperre
      expect(res.hinweise).not.toContain(FREIGABE_HINWEIS);
      expect(res.audit.ungepruefteErsparnis).toBeCloseTo(0, 2);
      expect(res.audit.eintraege.length).toBe(0);
      expect(res.audit.alleAngewendetenGeprueft).toBe(false);
    });
  });

  // Dokument-Hinweis: doppelte Geschäftsgebühr (Inkasso + Anwalt).
  describe("Hinweis: zweite Anwalts-Geschäftsgebühr", () => {
    const HINWEIS =
      "Es werden Geschäftsgebühren von Inkasso UND Anwalt für dieselbe Sache geltend gemacht – regelmäßig ist nur eine geschuldet (Anrechnung, § 13e RDG).";

    it("POSITIV: Flag true -> Hinweis erscheint", () => {
      const f = makeFakten({
        forderungssumme_eur: 60,
        zweite_anwalts_geschaeftsgebuehr: true,
        posten: [posten("hauptforderung", 60)],
      });
      expect(evaluate(f).hinweise).toContain(HINWEIS);
    });

    it("NEGATIV: Flag false -> kein Hinweis", () => {
      const f = makeFakten({
        forderungssumme_eur: 60,
        zweite_anwalts_geschaeftsgebuehr: false,
        posten: [posten("hauptforderung", 60)],
      });
      expect(evaluate(f).hinweise).not.toContain(HINWEIS);
    });
  });

  it("ist deterministisch (zweimaliges evaluate liefert identisches Ergebnis)", () => {
    const f = makeFakten({
      forderungssumme_eur: 130,
      telekommunikationssperre_belegt: true,
      nur_ratenzahlung_kein_vergleich: true,
      posten: [posten("grundgebuehr", 40), posten("einigungsgebuehr", 30), posten("hauptforderung", 60)],
    });
    expect(evaluate(f)).toEqual(evaluate(f));
  });
});
