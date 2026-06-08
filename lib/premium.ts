// lib/premium.ts
// Account-Premium ("Fall-Begleitung") OHNE Subscription: ein eingelöster
// Lizenzschlüssel gewährt PREMIUM_DAYS Tage Premium. Status wird aus der
// Tabelle consumed_licenses berechnet (kein zusätzliches Schema-Feld nötig).
import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PREMIUM_DAYS = 90;

/** SHA-256-Hash des Lizenzschlüssels (Klartext wird NIE gespeichert). */
export function hashLicense(rawKey: string): string {
  return crypto.createHash("sha256").update((rawKey || "").trim()).digest("hex");
}

// ── Kanzlei-basiert (B2B, Schema ab Migration 0004) ──────────────────────────

/**
 * Liefert das Datum, bis zu dem die KANZLEI Premium ist, oder null.
 * Premium = jüngste Aktivierung der Kanzlei liegt < PREMIUM_DAYS zurück.
 */
export async function getPremiumUntilByKanzlei(
  supabase: SupabaseClient,
  kanzleiId: string,
): Promise<Date | null> {
  const sinceMs = Date.now() - PREMIUM_DAYS * 86_400_000;
  const { data, error } = await supabase
    .from("consumed_licenses")
    .select("consumed_at")
    .eq("kanzlei_id", kanzleiId)
    .gte("consumed_at", new Date(sinceMs).toISOString())
    .order("consumed_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return new Date(new Date(data[0].consumed_at as string).getTime() + PREMIUM_DAYS * 86_400_000);
}

/**
 * Wie getPremiumUntilByKanzlei, unterscheidet aber „kein Premium" von einem DB-Fehler.
 * Wichtig für den Cron: bei error=true NICHT als „nicht Premium" behandeln
 * (sonst würde eine Erinnerung bei einem transienten Fehler fälschlich verbraucht).
 */
export async function getPremiumStatusByKanzlei(
  supabase: SupabaseClient,
  kanzleiId: string,
): Promise<{ active: boolean; until: Date | null; error: boolean }> {
  const sinceMs = Date.now() - PREMIUM_DAYS * 86_400_000;
  const { data, error } = await supabase
    .from("consumed_licenses")
    .select("consumed_at")
    .eq("kanzlei_id", kanzleiId)
    .gte("consumed_at", new Date(sinceMs).toISOString())
    .order("consumed_at", { ascending: false })
    .limit(1);
  if (error) return { active: false, until: null, error: true };
  if (!data || data.length === 0) return { active: false, until: null, error: false };
  const until = new Date(new Date(data[0].consumed_at as string).getTime() + PREMIUM_DAYS * 86_400_000);
  return { active: until.getTime() > Date.now(), until, error: false };
}

// ── DEPRECATED: user-basierte Premium-Funktionen ─────────────────────────────
// NUR Übergangs-Brücke, damit der noch nicht umgestellte Frontend-Code (/konto)
// während des Server-PRs weiter KOMPILIERT. Nach 0004 zielen sie auf die nicht
// mehr existierende Spalte consumed_licenses.user_id und liefern faktisch null.
// TODO(frontend-PR): /konto auf getPremium*ByKanzlei umstellen und diese beiden
// Funktionen ERSATZLOS LÖSCHEN – kein dauerhaft toter Code.

/** @deprecated Übergangs-Brücke – im Frontend-PR ersatzlos löschen (siehe oben). */
export async function getPremiumUntil(
  supabase: SupabaseClient,
  userId: string,
): Promise<Date | null> {
  const sinceMs = Date.now() - PREMIUM_DAYS * 86_400_000;
  const { data, error } = await supabase
    .from("consumed_licenses")
    .select("consumed_at")
    .eq("user_id", userId)
    .gte("consumed_at", new Date(sinceMs).toISOString())
    .order("consumed_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return new Date(new Date(data[0].consumed_at as string).getTime() + PREMIUM_DAYS * 86_400_000);
}

/** @deprecated Übergangs-Brücke – im Frontend-PR ersatzlos löschen (siehe oben). */
export async function getPremiumStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ active: boolean; until: Date | null; error: boolean }> {
  const sinceMs = Date.now() - PREMIUM_DAYS * 86_400_000;
  const { data, error } = await supabase
    .from("consumed_licenses")
    .select("consumed_at")
    .eq("user_id", userId)
    .gte("consumed_at", new Date(sinceMs).toISOString())
    .order("consumed_at", { ascending: false })
    .limit(1);
  if (error) return { active: false, until: null, error: true };
  if (!data || data.length === 0) return { active: false, until: null, error: false };
  const until = new Date(new Date(data[0].consumed_at as string).getTime() + PREMIUM_DAYS * 86_400_000);
  return { active: until.getTime() > Date.now(), until, error: false };
}
