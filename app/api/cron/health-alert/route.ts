// app/api/cron/health-alert/route.ts – Täglicher Wächter ("dead man's switch").
// Führt den Selbstcheck aus und mailt den Betreiber NUR, wenn etwas wirklich
// kaputt ist (severity = error). Geschützt per CRON_SECRET.
// Manuell prüfbar: curl -H "Authorization: Bearer <CRON_SECRET>" .../api/cron/health-alert
import { runSelfCheck } from "@/lib/selfcheck";
import { sendEmail, escapeHtml } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const result = await runSelfCheck();
  let alerted = false;

  if (result.severity === "error") {
    const operator = process.env.OPERATOR_EMAIL || "igor.bengraf@web.de";
    const reds = result.checks.filter((c) => c.status === "error");
    const rows = reds
      .map((c) => `<li><strong>${escapeHtml(c.name)}</strong>: ${escapeHtml(c.detail)}</li>`)
      .join("");
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0b0f19">
        <h2 style="margin:0 0 12px">⚠️ Inkasso-Defense: Systemwarnung</h2>
        <p>Der automatische Selbstcheck hat <strong>${reds.length}</strong> kritische(s) Problem(e) gefunden:</p>
        <ul>${rows}</ul>
        <p style="font-size:13px;color:#64748b">Solange das besteht, läuft die Fall-Begleitung evtl. nicht
        zuverlässig (z. B. Fristen-Erinnerungen). Bitte prüfen.</p>
      </div>`;
    try {
      await sendEmail({ to: operator, subject: "⚠️ Inkasso-Defense: Systemwarnung", html });
      alerted = true;
    } catch (e) {
      console.error("[cron/health-alert] alert send failed:", (e as Error)?.message);
    }
  }

  // Befund immer als JSON zurück (für manuelle Prüfung). Keine Secrets im Body.
  console.log(`[cron/health-alert] severity=${result.severity} alerted=${alerted}`);
  return json({ ok: true, severity: result.severity, alerted, checks: result.checks });
}
