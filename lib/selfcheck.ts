// lib/selfcheck.ts – Selbstdiagnose des Fall-Begleitungs-Systems.
// Prüft Env, DB-Tabellen, Resend-Erreichbarkeit und den Cron-Heartbeat.
// Verschickt selbst NICHTS – nur Befund. (Alarmierung: api/cron/health-alert.)
import { createAdminClient } from "@/utils/supabase/admin";

export type CheckStatus = "ok" | "warn" | "error";
export interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}
export interface SelfCheckResult {
  severity: CheckStatus;
  checks: Check[];
}

const REQUIRED_ENV = [
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "CRON_SECRET",
];

const CORE_TABLES = ["profiles", "cases", "reminders", "consumed_licenses", "case_letters"];

// Cron gilt als "tot", wenn der letzte Lauf länger zurückliegt (täglicher Cron).
const CRON_MAX_AGE_H = 26;

export async function runSelfCheck(): Promise<SelfCheckResult> {
  const checks: Check[] = [];

  // 1) Env-Variablen
  for (const key of REQUIRED_ENV) {
    const set = Boolean(process.env[key]);
    checks.push({ name: `env:${key}`, status: set ? "ok" : "error", detail: set ? "gesetzt" : "fehlt" });
  }

  const hasDb = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);

  // 2) DB-Tabellen (mit Service-Role, umgeht RLS -> echte Existenzprüfung)
  if (hasDb) {
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      admin = null;
    }
    if (!admin) {
      checks.push({ name: "db", status: "error", detail: "Admin-Client nicht initialisierbar" });
    } else {
      for (const t of CORE_TABLES) {
        const { error } = await admin.from(t).select("*", { count: "exact", head: true });
        checks.push({
          name: `table:${t}`,
          status: error ? "error" : "ok",
          detail: error ? `fehlt/Fehler (${(error as { code?: string }).code ?? "?"})` : "ok",
        });
      }

      // 3) Cron-Heartbeat
      const { data, error } = await admin
        .from("system_status")
        .select("updated_at")
        .eq("key", "reminders_cron")
        .maybeSingle();
      if (error) {
        checks.push({ name: "cron:reminders", status: "warn", detail: "Heartbeat nicht verfügbar (Migration 0003?)" });
      } else if (!data) {
        checks.push({ name: "cron:reminders", status: "warn", detail: "noch kein Lauf erfasst" });
      } else {
        const ageH = (Date.now() - new Date(data.updated_at as string).getTime()) / 3_600_000;
        checks.push({
          name: "cron:reminders",
          status: ageH > CRON_MAX_AGE_H ? "error" : "ok",
          detail: `letzter Lauf vor ${ageH.toFixed(1)} h`,
        });
      }
    }
  } else {
    checks.push({ name: "db", status: "error", detail: "kein Service-Role-Key – DB-/Cron-Check übersprungen" });
  }

  // 4) Resend: Key vorhanden? Ein "Sending access"-Key darf bewusst NICHT
  //    /domains lesen (401) – das ist kein Fehler. Der tatsächliche Versand
  //    wird beim Reminder-/Alert-Lauf real geprüft (sendEmail wirft bei !ok).
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    let detail = "API-Key gesetzt (Versand aktiv)";
    try {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${resendKey}` } });
      detail = r.ok ? "API-Key gültig (Vollzugriff)" : `API-Key gesetzt (Sende-Rechte; /domains ${r.status})`;
    } catch {
      detail = "API-Key gesetzt (Erreichbarkeit nicht prüfbar)";
    }
    checks.push({ name: "resend", status: "ok", detail });
  } else {
    checks.push({ name: "resend", status: "error", detail: "RESEND_API_KEY fehlt" });
  }

  const severity: CheckStatus = checks.some((c) => c.status === "error")
    ? "error"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "ok";

  return { severity, checks };
}
