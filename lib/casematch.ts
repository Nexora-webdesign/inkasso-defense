// lib/casematch.ts
// Prüft, ob ein hochgeladenes Folgeschreiben zum bestehenden Fall gehört:
// gleiches Aktenzeichen ODER (falls kein Az) gleicher Gläubiger/Inkasso-Name.
// Robust gegen OCR-/Formatierungs-Abweichungen (Normalisierung + Kern-Vergleich).

// ── Regel 1: max. 1 Fall pro Konto ───────────────────────────────────────────
export const MAX_CASES_PER_ACCOUNT = 1;

/** Darf der Nutzer (mit bereits existingCaseCount Fällen) noch einen Fall anlegen? */
export function canOpenNewCase(existingCaseCount: number): boolean {
  return (Number(existingCaseCount) || 0) < MAX_CASES_PER_ACCOUNT;
}

function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
}

/** Aktenzeichen-Schlüssel; "unbekannt"/leer -> "" (= nicht vorhanden). */
function azKey(s: unknown): string {
  const n = norm(s);
  return n === "" || n === "unbekannt" ? "" : n;
}

/** Firmen-/Rechtsform-Floskeln entfernen, damit "Adler & Voß Inkasso GmbH" ~ "Adler & Voss". */
function creditorCore(s: unknown): string {
  return norm(s).replace(
    /(gmbhcoke?g|gmbh|mbh|kgaa|gmbhco|ag|kg|ohg|ug|co|inkassodienst|inkassoservice|inkassogesellschaft|inkasso|forderungsmanagement|rechtsanwaelte|rechtsanwalt|kanzlei|rae|legal|eg|se)/g,
    "",
  );
}

function creditorMatches(a: unknown, b: unknown): boolean {
  const ca = creditorCore(a);
  const cb = creditorCore(b);
  if (ca.length < 3 || cb.length < 3) return false;
  return ca.includes(cb) || cb.includes(ca);
}

export type CaseStamm = { inkassoName?: string; glaeubiger?: string; aktenzeichen?: string };

/**
 * @returns ok=true wenn das Schreiben zum Fall passt; sonst reason "az" | "sender".
 */
export function letterMatchesCase(
  stamm: CaseStamm,
  f: { absender_name?: string; aktenzeichen?: string },
): { ok: boolean; reason?: "az" | "sender" } {
  const caseAz = azKey(stamm.aktenzeichen);
  const newAz = azKey(f.aktenzeichen);

  // Beide Aktenzeichen bekannt -> müssen übereinstimmen.
  if (caseAz && newAz) {
    return caseAz === newAz ? { ok: true } : { ok: false, reason: "az" };
  }

  // Sonst über Gläubiger-/Inkasso-Namen abgleichen.
  const senders = [stamm.inkassoName, stamm.glaeubiger].filter(Boolean) as string[];
  const matched = senders.some((s) => creditorMatches(s, f.absender_name || ""));
  return matched ? { ok: true } : { ok: false, reason: "sender" };
}
