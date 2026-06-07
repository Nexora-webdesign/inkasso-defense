// app/api/license/validate/route.ts
// Prüft einen Freischaltcode (Lemon-Squeezy-Lizenz) vorab – für das manuelle
// Eingabefeld im Dashboard. Teilt die Logik mit der PDF-Route über lib/lemonsqueezy.
import { verifyLicense, LicenseCheckError } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";
export const maxDuration = 15;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function POST(req: Request) {
  let key = "";
  try {
    const b = (await req.json()) as { licenseKey?: string; key?: string };
    key = String(b?.licenseKey ?? b?.key ?? "");
  } catch {
    return json({ ok: false, error: "Ungültiger Request-Body." }, 400);
  }

  let ok = false;
  try {
    ok = await verifyLicense(key);
  } catch (err) {
    if (err instanceof LicenseCheckError) {
      return json({ ok: false, error: "Prüfung fehlgeschlagen. Bitte erneut versuchen." }, 503);
    }
    throw err;
  }

  if (!ok) return json({ ok: false, error: "Freischaltcode ungültig oder abgelaufen." }, 402);
  return json({ ok: true });
}
