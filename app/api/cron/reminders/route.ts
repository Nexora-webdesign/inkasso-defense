// app/api/cron/reminders/route.ts – Täglicher Cron: sendet fällige Fristen-
// Erinnerungen für Fälle mit aktiver Fall-Begleitung (Premium).
// Geschützt per CRON_SECRET (Vercel sendet Authorization: Bearer <CRON_SECRET>).
import { createAdminClient } from "@/utils/supabase/admin";
import { getPremiumUntil } from "@/lib/premium";
import { sendEmail, escapeHtml } from "@/lib/email";
import { SITE_URL } from "@/lib/blog-shared";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type DueReminder = {
  id: string;
  type: string;
  case_id: string;
  user_id: string;
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
    .select("id, type, case_id, user_id, cases(title, status)")
    .is("sent_at", null)
    .lte("due_at", nowIso)
    .limit(200);

  if (error) {
    console.error("[cron/reminders] query error:", (error as { code?: string }).code);
    return json({ ok: false, error: "query-failed" }, 500);
  }

  const reminders = (due ?? []) as unknown as DueReminder[];
  let sent = 0;
  let skipped = 0;

  for (const r of reminders) {
    try {
      const status = r.cases?.status ?? "offen";
      // Für Widerspruchs-Erinnerung nur relevant, solange der Fall offen ist.
      if (r.type === "widerspruch_14tage" && status !== "offen") {
        await admin.from("reminders").update({ sent_at: nowIso }).eq("id", r.id);
        skipped++;
        continue;
      }

      // Nur bei aktiver Fall-Begleitung (Premium) versenden.
      const premiumUntil = await getPremiumUntil(admin, r.user_id);
      const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();
      if (!isPremium) {
        await admin.from("reminders").update({ sent_at: nowIso }).eq("id", r.id);
        skipped++;
        continue;
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", r.user_id)
        .maybeSingle();
      const email = profile?.email as string | undefined;
      if (!email) {
        skipped++;
        continue;
      }

      const caseUrl = `${SITE_URL}/fall/${r.case_id}`;
      await sendEmail({
        to: email,
        subject: "Erinnerung: Frist für deinen Inkasso-Widerspruch",
        html: reminderHtml(r.cases?.title ?? "", caseUrl),
      });
      await admin.from("reminders").update({ sent_at: nowIso }).eq("id", r.id);
      sent++;
    } catch (e) {
      // Einzelfehler dürfen den Lauf nicht abbrechen; sent_at NICHT setzen → Retry morgen.
      console.error("[cron/reminders] send error:", (e as Error)?.message);
    }
  }

  console.log(`[cron/reminders] due=${reminders.length} sent=${sent} skipped=${skipped}`);
  return json({ ok: true, due: reminders.length, sent, skipped });
}
