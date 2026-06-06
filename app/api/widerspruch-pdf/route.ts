// app/api/widerspruch-pdf/route.ts
import { renderWiderspruchPdf } from "@/lib/widerspruch-pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY = 20000;

function bad(error: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  // hier Premium-/Bezahl-Prüfung vor dem Rendern
  let payload: {
    empfaenger?: string;
    aktenzeichen?: string;
    betreff?: string;
    body?: string;
    absender?: { name?: string; strasse?: string; plzOrt?: string };
  };
  try {
    payload = await req.json();
  } catch {
    return bad("Ungültiger Request-Body.");
  }

  const body = String(payload.body || "");
  if (!body.trim()) return bad("Kein Brieftext übermittelt.");
  if (body.length > MAX_BODY) return bad("Brieftext zu lang.", 413);

  try {
    const bytes = await renderWiderspruchPdf({
      empfaenger: String(payload.empfaenger || "Inkassobüro"),
      aktenzeichen: String(payload.aktenzeichen || ""),
      betreff: String(payload.betreff || "Teilwiderspruch"),
      body,
      absender: payload.absender || {},
    });

    const azSafe = String(payload.aktenzeichen || "Forderung").replace(/[^\w.-]+/g, "_").slice(0, 40) || "Forderung";

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="Widerspruch_${azSafe}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/widerspruch-pdf] Fehler:", err);
    return bad("Das PDF konnte nicht erstellt werden. Bitte erneut versuchen.", 500);
  }
}
