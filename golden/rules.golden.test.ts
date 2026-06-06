// golden/rules.golden.test.ts
// CI-Gate: kein Merge bei rotem Test (siehe CLAUDE.md).
import { describe, it, expect } from "vitest";
import { evaluate } from "@/lib/rule-engine";
import { CASES, makeFakten, posten } from "@/golden/cases";

describe("Golden-Suite: Rule-Engine", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const res = evaluate(c.fakten, c.onboarding);
      expect(res.berechnung.ersparnis).toBeCloseTo(c.erwartet.ersparnis, 2);
      expect(res.berechnung.fairerKern).toBeCloseTo(c.erwartet.fairerKern, 2);
      expect(res.posten.map((p) => p.status)).toEqual(c.erwartet.status);
    });
  }

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
