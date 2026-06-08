// lib/kanzlei.ts
// -----------------------------------------------------------------------------
// Auflösung der Kanzlei-Zugehörigkeit des eingeloggten Users (Server-seitig).
// Anti-Spoofing: ein vom Client gewünschtes kanzlei_id wird NIE blind übernommen,
// sondern nur akzeptiert, wenn es zu einer echten Mitgliedschaft gehört
// (gleiche Logik wie der DB-Trigger, der kanzlei_id aus der Eltern-Akte erzwingt).
// -----------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";

export type KanzleiErrorCode = "no_kanzlei" | "ambiguous_kanzlei" | "forbidden_kanzlei" | "error";

// Flache Typen (kein Discriminated Union): das Projekt nutzt tsconfig strict:false,
// wo Union-Narrowing über ok:true/false NICHT zuverlässig greift. Die Laufzeit-
// Objekte enthalten weiterhin nur die jeweils relevanten Felder.
export type KanzleiDecision = { ok: boolean; kanzleiId?: string; code?: Exclude<KanzleiErrorCode, "error"> };
export type ResolveKanzleiResult = { ok: boolean; kanzleiId?: string; code?: KanzleiErrorCode };

/**
 * Reine Entscheidungslogik (ohne DB) – leicht unit-testbar.
 * - 0 Mitgliedschaften        -> no_kanzlei
 * - requested gesetzt         -> nur akzeptiert, wenn Mitglied (sonst forbidden_kanzlei)
 * - genau 1 Mitgliedschaft    -> diese
 * - >1 ohne gültige Auswahl   -> ambiguous_kanzlei (erst mit Invites relevant)
 */
export function decideKanzlei(memberIds: string[], requested?: string | null): KanzleiDecision {
  const ids = (memberIds ?? []).filter(Boolean);
  if (ids.length === 0) return { ok: false, code: "no_kanzlei" };
  if (requested) {
    return ids.includes(requested)
      ? { ok: true, kanzleiId: requested }
      : { ok: false, code: "forbidden_kanzlei" };
  }
  if (ids.length === 1) return { ok: true, kanzleiId: ids[0] };
  return { ok: false, code: "ambiguous_kanzlei" };
}

/**
 * Liest die Mitgliedschaften des Users und wendet decideKanzlei an.
 * Bei DB-Fehler -> code "error".
 */
export async function resolveKanzleiId(
  supabase: SupabaseClient,
  userId: string,
  requested?: string | null,
): Promise<ResolveKanzleiResult> {
  const { data, error } = await supabase
    .from("kanzlei_members")
    .select("kanzlei_id")
    .eq("user_id", userId);
  if (error) return { ok: false, code: "error" };
  const ids = (data ?? []).map((r) => r.kanzlei_id as string);
  return decideKanzlei(ids, requested);
}

/**
 * Prüft, ob ein Mandant zur angegebenen Kanzlei gehört. Mit einem RLS-gebundenen
 * (User-)Client liefert ein fremder Mandant zuverlässig false (RLS verbirgt ihn).
 * Wird beim cases-Insert genutzt, um Cross-Tenant-Verknüpfung zu verhindern
 * (die cases-INSERT-Policy prüft nur die Rolle, nicht den Mandanten).
 */
export async function mandantBelongsToKanzlei(
  supabase: SupabaseClient,
  mandantId: string,
  kanzleiId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("mandanten")
    .select("id")
    .eq("id", mandantId)
    .eq("kanzlei_id", kanzleiId)
    .maybeSingle();
  return !error && !!data;
}

/**
 * Empfänger für eine Fristen-Erinnerung (Cron, Service-Role):
 * primär die zuständige Person (assigned_to), Fallback = Inhaber-E-Mail(s) der Kanzlei.
 * Wirft bei DB-Fehler -> Cron behandelt das als "deferred" (kein Konsum).
 */
export async function getReminderEmpfaenger(
  admin: SupabaseClient,
  opts: { kanzleiId: string; assignedTo?: string | null },
): Promise<string[]> {
  if (opts.assignedTo) {
    const { data, error } = await admin
      .from("profiles")
      .select("email")
      .eq("id", opts.assignedTo)
      .maybeSingle();
    if (error) throw new Error("profiles-query-failed");
    if (data?.email) return [data.email as string];
    // assigned_to ohne E-Mail -> Fallback auf Inhaber.
  }

  const { data: members, error: mErr } = await admin
    .from("kanzlei_members")
    .select("user_id")
    .eq("kanzlei_id", opts.kanzleiId)
    .eq("role", "inhaber");
  if (mErr) throw new Error("members-query-failed");
  const ids = (members ?? []).map((m) => m.user_id as string);
  if (ids.length === 0) return [];

  const { data: profs, error: pErr } = await admin.from("profiles").select("email").in("id", ids);
  if (pErr) throw new Error("profiles-in-query-failed");
  return (profs ?? []).map((p) => p.email as string).filter(Boolean);
}
