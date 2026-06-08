// app/api/premium/activate/route.ts
// Verknüpft einen Lemon-Squeezy-Lizenzschlüssel (Fall-Begleitung) mit dem
// angemeldeten Account: prüft Echtheit, schützt vor Mehrfacheinlösung (UNIQUE
// auf license_hash) und gewährt PREMIUM_DAYS Tage Premium.
import { cookies } from "next/headers";
import { json } from "@/lib/http";
import { createClient } from "@/utils/supabase/server";
import { verifyLicense, LicenseCheckError } from "@/lib/lemonsqueezy";
import { hashLicense, PREMIUM_DAYS } from "@/lib/premium";
import { resolveKanzleiId } from "@/lib/kanzlei";

export const runtime = "nodejs";
export const maxDuration = 15;


export async function POST(req: Request) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "Bitte zuerst anmelden." }, 401);

  let key = "";
  try {
    const b = (await req.json()) as { licenseKey?: string; key?: string };
    key = String(b?.licenseKey ?? b?.key ?? "");
  } catch {
    return json({ ok: false, error: "Ungültiger Request-Body." }, 400);
  }
  if (!key.trim()) return json({ ok: false, error: "Bitte Freischaltcode eingeben." }, 400);

  // Produkt-ID der "Fall-Begleitung" (= weiterverwendetes LS-Produkt). Öffentlich,
  // per Env überschreibbar.
  const caseProductId = process.env.LEMONSQUEEZY_CASE_PRODUCT_ID || "1123668";

  // Echtheits-/Produktprüfung.
  let valid = false;
  try {
    valid = await verifyLicense(key, caseProductId);
  } catch (err) {
    if (err instanceof LicenseCheckError) {
      return json({ ok: false, error: "Freischaltung konnte gerade nicht geprüft werden. Bitte erneut versuchen." }, 503);
    }
    throw err;
  }
  if (!valid) return json({ ok: false, error: "Freischaltcode ungültig oder abgelaufen." }, 402);

  // Premium gilt auf Kanzlei-Ebene -> Kanzlei serverseitig auflösen.
  const kres = await resolveKanzleiId(supabase, user.id);
  if (!kres.ok) {
    if (kres.code === "no_kanzlei")
      return json({ ok: false, code: kres.code, error: "Dein Konto ist keiner Kanzlei zugeordnet." }, 409);
    if (kres.code === "ambiguous_kanzlei")
      return json({ ok: false, code: kres.code, error: "Bitte Kanzlei wählen." }, 400);
    return json({ ok: false, error: "Kanzlei konnte nicht ermittelt werden." }, 500);
  }

  // Reuse-Schutz: UNIQUE(license_hash) verhindert Doppel-/Fremdeinlösung atomar.
  const { error } = await supabase.from("consumed_licenses").insert({
    license_hash: hashLicense(key),
    kanzlei_id: kres.kanzleiId,
    created_by: user.id,
    product_id: caseProductId,
  });
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return json({ ok: false, error: "Dieser Freischaltcode wurde bereits eingelöst." }, 409);
    }
    console.error("[premium/activate] insert error:", (error as { code?: string }).code);
    return json({ ok: false, error: "Aktivierung fehlgeschlagen. Bitte erneut versuchen." }, 500);
  }

  const premiumUntil = new Date(Date.now() + PREMIUM_DAYS * 86_400_000).toISOString();
  return json({ ok: true, premiumUntil });
}
