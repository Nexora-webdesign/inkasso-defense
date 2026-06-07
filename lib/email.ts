// lib/email.ts – E-Mail-Versand für App-Benachrichtigungen (z. B. Fristen-
// Erinnerungen) über die Resend-HTTP-API. Benötigt RESEND_API_KEY (geheim).
// Auth-Mails (Bestätigung/Login) laufen separat über Supabase-SMTP.

const RESEND_URL = "https://api.resend.com/emails";

export class EmailError extends Error {}

const FROM = process.env.RESEND_FROM || "Inkasso-Defense <noreply@inkasso-defense.de>";

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new EmailError("RESEND_API_KEY fehlt.");

  let res: Response;
  try {
    res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
  } catch {
    throw new EmailError("network");
  }
  if (!res.ok) {
    // Status loggen (keine Inhalte/PII).
    throw new EmailError(`resend-${res.status}`);
  }
}

/** Minimales HTML-Escaping für eingebettete Nutzertexte. */
export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
