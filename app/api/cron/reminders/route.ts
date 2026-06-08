// app/api/cron/reminders/route.ts – Täglicher Cron: sendet fällige Fristen-
// Erinnerungen für Fälle mit aktiver Fall-Begleitung (Premium).
// Geschützt per CRON_SECRET (Vercel sendet Authorization: Bearer <CRON_SECRET>).
import { createAdminClient } from "@/utils/supabase/admin";
import { getPremiumStatus } from "@/lib/premium";
import { sendEmail, escapeHtml } from "@/lib/email";
import { SITE_URL } from "@/lib/blog-shared";

export const runtime = "nodejs";
export const maxDuration = 60;

// Nicht-Premium-Erinnerungen, die länger als das hier überfällig sind, werden
// "konsumiert" (sent_at gesetzt), damit sie nicht ewig erneut verarbeitet werden.
const STALE_DAYS = 21;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type DueReminder = {
  id: string;
  type: string;
  case_id: string;
  user_id: string;
  due_at: string;
  cases: { title: string | null; status: string | null } | null;
};

function reminderHtml(title: string, caseUrl: string): string {
  const safeTitle = escapeHtml(title || "dein Fall");
  return `
  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0b0f19">
    <h2 style="margin:0 0 12px">Erinnerung: Frist für deinen Inkasso-Widerspruch</h2>
    <p>Du hast den Fall <strong>${safeTitle}</strong> gespeichert und ihn noch als <strong>offen</strong> markiert.</p>
    <p>Falls du noch nicht reagiert hast: Sende deinen Teilwiderspruch <strong>zeitnah</strong>
       (idealerweise innerhalb von 14 Tagen ab Erhalt des Schreibens), damit keine weiteren
       Mahnstufen oder Kosten entstehen.</p>
    <p style="margin:24px 0">
      <a href="${caseUrl}" style="background:#12b886;color:#0b0f19;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:9999px;display:inline-block">Zum Fall &amp; Eskalations-Assistent</a>
    </p>
    <p style="font-size:13px;color:#64748b">Dies ist eine technische Orientierungshilfe und keine Rechtsberatung.
       Bei gerichtlichen Schritten oder Unsicherheit wende dich an eine Verbraucherzentrale oder einen Rechtsanwalt.</p>
    <p style="font-size:12px;color:#94a3b8">Du erhältst diese E-Mail, weil du die Fall-Begleitung aktiviert hast.</p>
  </div>`;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("reminders")
    .select("id, type, case_id, user_id, due_at, cases(title, status)")
    .is("sent_at", null)
    .lte("due_at", nowIso)
    .limit(200);

  if (error) {
    console.error("[cron/reminders] query error:", (error as { code?: string }).code);
    return json({ ok: false, error: "query-failed" }, 500);
  }

  const reminders = (due ?? []) as unknown as DueReminder[];
  const consume = (id: string) => admin.from("reminders").update({ sent_at: nowIso }).eq("id", id);

  let sent = 0; // tatsächlich versendet
  let obsolete = 0; // gegenstandslos (Status nicht mehr offen / veraltet) -> konsumiert
  let deferred = 0; // bewusst NICHT konsumiert (kein Premium / transienter Fehler) -> Retry

  for (const r of reminders) {
    try {
      const status = r.cases?.status ?? "offen";
      // Widerspruchs-Erinnerung ist gegenstandslos, sobald der Fall nicht mehr offen ist.
      if (r.type === "widerspruch_14tage" && status !== "offen") {
        await consume(r.id);
        obsolete++;
        continue;
      }

      // Premium fehlertolerant prüfen: bei DB-Fehler NICHT konsumieren (Retry).
      const prem = await getPremiumStatus(admin, r.user_id);
      if (prem.error) {
        deferred++;
        continue;
      }
      if (!prem.active) {
        // Kein Premium: nicht senden. Nur sehr alte Erinnerungen konsumieren,
        // damit eine spätere Freischaltung die Erinnerung noch auslösen kann.
        const ageDays = (Date.now() - new Date(r.due_at).getTime()) / 86_400_000;
        if (ageDays > STALE_DAYS) {
          await consume(r.id);
          obsolete++;
        } else {
          deferred++;
        }
        continue;
      }

      // E-Mail holen – bei Fehler/fehlend NICHT konsumieren (Retry).
      const { data: profile, error: pErr } = await admin
        .from("profiles")
        .select("email")
        .eq("id", r.user_id)
        .maybeSingle();
      if (pErr || !profile?.email) {
        deferred++;
        continue;
      }

      const caseUrl = `${SITE_URL}/fall/${r.case_id}`;
      await sendEmail({
        to: profile.email as string,
        subject: "Erinnerung: Frist für deinen Inkasso-Widerspruch",
        html: reminderHtml(r.cases?.title ?? "", caseUrl),
      });
      // sent_at NUR nach erfolgreichem Versand setzen.
      await consume(r.id);
      sent++;
    } catch (e) {
      // Versand-/Einzelfehler: NICHT konsumieren -> nächster Lauf versucht es erneut.
      console.error("[cron/reminders] item error:", (e as Error)?.message);
      deferred++;
    }
  }

  // Heartbeat (für Selbstcheck/Wächter) – best-effort, ignoriert fehlende Tabelle.
  try {
    await admin.from("system_status").upsert({ key: "reminders_cron", updated_at: nowIso }, { onConflict: "key" });
  } catch {
    /* system_status evtl. noch nicht migriert – unkritisch */
  }

  console.log(`[cron/reminders] due=${reminders.length} sent=${sent} obsolete=${obsolete} deferred=${deferred}`);
  return json({ ok: true, due: reminders.length, sent, obsolete, deferred });
}
