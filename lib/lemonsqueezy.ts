// lib/lemonsqueezy.ts
// -----------------------------------------------------------------------------
// Serverseitige Lizenz-Verifikation für die Freemium-Paywall (No-DB).
// Nutzt die ÖFFENTLICHE Lemon-Squeezy License-API (kein API-Key nötig):
//   POST https://api.lemonsqueezy.com/v1/licenses/validate
// Härtung: akzeptiert nur Keys des eigenen Produkts (LEMONSQUEEZY_PRODUCT_ID).
// -----------------------------------------------------------------------------

const LS_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate";

/** Wird geworfen, wenn die Prüfung technisch nicht durchführbar ist (Netz-/Parsefehler).
 *  Aufrufer sollten dann mit 503 antworten (NICHT durchwinken). */
export class LicenseCheckError extends Error {
  constructor(message = "license-check-failed") {
    super(message);
    this.name = "LicenseCheckError";
  }
}

/**
 * Prüft, ob ein Lizenzschlüssel gültig, aktiv und unserem Produkt zugeordnet ist.
 * @returns true (gültig) / false (ungültig). Wirft LicenseCheckError bei Netz-/Parsefehlern.
 */
export async function verifyLicense(rawKey: string): Promise<boolean> {
  const license_key = (rawKey || "").trim();
  if (!license_key) return false;

  let res: Response;
  try {
    res = await fetch(LS_VALIDATE_URL, {
      method: "POST",
      headers: { Accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ license_key }),
    });
  } catch {
    throw new LicenseCheckError("network");
  }

  // LS liefert bei ungültigen Keys i. d. R. HTTP 400/404 MIT JSON {valid:false}.
  let json: {
    valid?: boolean;
    license_key?: { status?: string };
    meta?: { product_id?: number | string };
  };
  try {
    json = await res.json();
  } catch {
    throw new LicenseCheckError("parse");
  }

  if (json?.valid !== true) return false;
  if (json?.license_key?.status !== "active") return false;

  // Produkt-Härtung: nur eigene Keys akzeptieren (sofern Produkt-ID gesetzt).
  const expected = process.env.LEMONSQUEEZY_PRODUCT_ID;
  if (expected && String(json?.meta?.product_id ?? "") !== String(expected)) return false;

  return true;
}
