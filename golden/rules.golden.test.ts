// golden/rules.golden.test.ts
// CI-Gate: kein Merge bei rotem Test (siehe CLAUDE.md).
import { describe, it, expect } from "vitest";
import { evaluate } from "@/lib/rule-engine";
import { CASES, GATE_CASE_A, makeFakten, posten } from "@/golden/cases";
import { REGELN } from "@/lib/rules";

describe("Golden-Suite: Rule-Engine", () => {
  // Standard: requireApproved=false -> alle Regeln aktiv, bisherige Erwartungen.
  for (const c of CASES) {
    it(c.name, () => {
      const res = evaluate(c.fakten, c.onboarding, { requireApproved: false });
      expect(res.berechnung.ersparnis).toBeCloseTo(c.erwartet.ersparnis, 2);
      expect(res.berechnung.fairerKern).toBeCloseTo(c.erwartet.fairerKern, 2);
      expect(res.posten.map((p) => p.status)).toEqual(c.erwartet.status);
    });
  }

  // "geprueft"-Gate: bei requireApproved=true zählen nur freigegebene Regeln.
  describe("geprueft-Gate (requireApproved=true)", () => {
    it("wendet KEINE noch ungeprüfte Regel an: " + GATE_CASE_A.name, () => {
      const res = evaluate(GATE_CASE_A.fakten, undefined, { requireApproved: true });
      expect(res.berechnung.ersparnis).toBeCloseTo(GATE_CASE_A.erwartet.ersparnis, 2);
      expect(res.berechnung.fairerKern).toBeCloseTo(GATE_CASE_A.erwartet.fairerKern, 2);
      expect(res.posten.map((p) => p.status)).toEqual(GATE_CASE_A.erwartet.status);
    });

    it("weist auf eine zurückgehaltene Kürzung hin und protokolliert das Gate", () => {
      const res = evaluate(GATE_CASE_A.fakten, undefined, { requireApproved: true });
      expect(res.hinweise).toContain("Eine mögliche Kürzung wartet noch auf anwaltliche Freigabe.");
      expect(res.audit.requireApproved).toBe(true);
      expect(res.audit.regelnGesamt).toBe(REGELN.length);
      // Solange alle Regeln geprueft:false sind, ist keine Regel aktiv.
      expect(res.audit.regelnAktiv).toBe(REGELN.filter((r) => r.geprueft).length);
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
