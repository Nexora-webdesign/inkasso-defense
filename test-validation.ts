/**
 * test-validation.ts — Reine TypeScript-Validierung der Enforcement-Logik.
 * Prüft Regel 1 (max. 1 Fall pro Konto) und Regel 2 (Folgebrief gehört zum Fall)
 * gegen die ECHTEN Funktionen aus lib/casematch.ts. KEINE LLM, keine Tokens.
 *
 * Ausführen:
 *   npx tsx test-validation.ts
 *
 * Eigene Fälle: einfach Objekte zu RULE1_CASES / RULE2_CASES hinzufügen.
 */
import { canOpenNewCase, letterMatchesCase, type CaseStamm } from "./lib/casematch";

// ─────────────────────────────────────────────────────────────────────────────
// Regel 1: Wie viele Fälle hat das Konto bereits? -> darf es noch einen anlegen?
// ─────────────────────────────────────────────────────────────────────────────
type Rule1Case = { name: string; existingCount: number; expect: boolean };

const RULE1_CASES: Rule1Case[] = [
  { name: "Neues Konto, 0 Fälle -> darf anlegen", existingCount: 0, expect: true },
  { name: "Bereits 1 Fall -> KEIN zweiter", existingCount: 1, expect: false },
  { name: "Schon 2 Fälle (Altbestand) -> blockiert", existingCount: 2, expect: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Regel 2: Gehört ein hochgeladenes Folgeschreiben zum bestehenden Fall?
//   stamm  = Stammdaten des gespeicherten Falls
//   letter = von der KI aus dem neuen Schreiben extrahierte Felder
// ─────────────────────────────────────────────────────────────────────────────
type Rule2Case = {
  name: string;
  stamm: CaseStamm;
  letter: { absender_name?: string; aktenzeichen?: string };
  expect: boolean; // true = wird akzeptiert
};

const FALL: CaseStamm = {
  inkassoName: "Adler & Voß Inkasso GmbH",
  glaeubiger: "Mobilfunk AG",
  aktenzeichen: "AV-2026/04417",
};

const RULE2_CASES: Rule2Case[] = [
  {
    name: "Gleiches Az (mit Format-/Schreibvariante) -> akzeptiert",
    stamm: FALL,
    letter: { absender_name: "Adler & Voss Inkasso", aktenzeichen: "AV 2026 / 04417" },
    expect: true,
  },
  {
    name: "Anderes Az -> abgelehnt",
    stamm: FALL,
    letter: { absender_name: "Adler & Voß Inkasso GmbH", aktenzeichen: "XY-99/123" },
    expect: false,
  },
  {
    name: "Kein Az im Brief, gleicher Absender -> akzeptiert",
    stamm: FALL,
    letter: { absender_name: "Adler & Voß Inkasso GmbH", aktenzeichen: "" },
    expect: true,
  },
  {
    name: "Kein Az, fremder Absender -> abgelehnt",
    stamm: FALL,
    letter: { absender_name: "Fremd Inkasso GmbH", aktenzeichen: "" },
    expect: false,
  },
  {
    name: "Kein Az, Absender = Gläubiger statt Inkasso -> akzeptiert",
    stamm: FALL,
    letter: { absender_name: "Mobilfunk AG", aktenzeichen: "unbekannt" },
    expect: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Test-Runner (ohne Framework)
// ─────────────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(name: string, actual: boolean, expect: boolean) {
  const ok = actual === expect;
  if (ok) passed++;
  else failed++;
  const tag = ok ? "[ OK ]" : "[FAIL]";
  const detail = ok ? "" : `  (erwartet ${expect}, war ${actual})`;
  console.log(`${tag} ${name}${detail}`);
}

console.log("\n=== Regel 1: max. 1 Fall pro Konto ===");
for (const t of RULE1_CASES) check(t.name, canOpenNewCase(t.existingCount), t.expect);

console.log("\n=== Regel 2: Folgebrief gehört zum Fall ===");
for (const t of RULE2_CASES) check(t.name, letterMatchesCase(t.stamm, t.letter).ok, t.expect);

console.log(`\nErgebnis: ${passed} bestanden, ${failed} fehlgeschlagen.`);
process.exit(failed > 0 ? 1 : 0);
