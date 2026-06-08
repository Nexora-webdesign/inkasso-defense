// tests/rls-isolation.integration.test.ts
// -----------------------------------------------------------------------------
// Automatischer, eingecheckter RLS-Isolations-Test für Migration 0004
// (Vorgabe 3): zwei Kanzleien, User A sieht/ändert die Akten von B NICHT.
//
// Geprüft werden BEIDE Ebenen:
//   (a) DB-Query  – direkter PostgREST-Zugriff mit dem JWT von User A.
//   (b) API-Pfad  – exakt dieselbe RLS, auf die sich app/api/cases/* verlässt
//                    (die Routen filtern NICHT zusätzlich nach user, sondern
//                     delegieren die Isolation vollständig an diese Policies).
//   (c) Trigger   – kanzlei_id von case_letters wird serverseitig aus der
//                    Eltern-Akte erzwungen und ist NICHT client-spoofbar (Vorgabe 2).
//
// Läuft nur, wenn Test-Credentials gesetzt sind – sonst SKIP (vitest bleibt grün):
//   SUPABASE_TEST_URL                (oder NEXT_PUBLIC_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY        (Service-Role – nur in Test/CI!)
//   SUPABASE_TEST_ANON_KEY           (oder NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
//
// WICHTIG: Nur gegen eine TEST-Datenbank mit angewandter 0004 ausführen.
// -----------------------------------------------------------------------------
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_TEST_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON =
  process.env.SUPABASE_TEST_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

const READY = Boolean(URL && SERVICE && ANON);

// Eindeutige, kollisionsfreie Test-Identitäten (kein echtes Postfach nötig).
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const PW = "Test-Passwort-" + stamp;
const emailA = `rls-a-${stamp}@inkasso-defense.test`;
const emailB = `rls-b-${stamp}@inkasso-defense.test`;

type Ctx = {
  admin: SupabaseClient;
  userA: SupabaseClient;
  idA: string;
  idB: string;
  kanzleiA: string;
  kanzleiB: string;
  caseA: string;
  caseB: string;
};
const ctx = {} as Ctx;

async function createConfirmedUser(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser(${email}): ${error?.message}`);
  return data.user.id;
}

async function kanzleiOf(admin: SupabaseClient, userId: string): Promise<string> {
  // Solo-Kanzlei + Inhaber-Mitgliedschaft entstehen über handle_new_user (0004).
  const { data, error } = await admin
    .from("kanzlei_members")
    .select("kanzlei_id, role")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error(`kanzleiOf(${userId}): ${error?.message}`);
  expect(data.role).toBe("inhaber");
  return data.kanzlei_id as string;
}

async function seedCase(admin: SupabaseClient, kanzleiId: string, userId: string): Promise<string> {
  const { data, error } = await admin
    .from("cases")
    .insert({
      kanzlei_id: kanzleiId,
      created_by: userId,
      title: "RLS-Test-Akte",
      result_json: { stammdaten: {}, berechnung: {} },
      status: "offen",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`seedCase(${kanzleiId}): ${error?.message}`);
  return data.id as string;
}

describe.skipIf(!READY)("RLS-Isolation (Migration 0004)", () => {
  beforeAll(async () => {
    ctx.admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

    ctx.idA = await createConfirmedUser(ctx.admin, emailA);
    ctx.idB = await createConfirmedUser(ctx.admin, emailB);
    ctx.kanzleiA = await kanzleiOf(ctx.admin, ctx.idA);
    ctx.kanzleiB = await kanzleiOf(ctx.admin, ctx.idB);
    expect(ctx.kanzleiA).not.toBe(ctx.kanzleiB);

    ctx.caseA = await seedCase(ctx.admin, ctx.kanzleiA, ctx.idA);
    ctx.caseB = await seedCase(ctx.admin, ctx.kanzleiB, ctx.idB);

    // Als User A anmelden → ab hier RLS-gebundener Client (wie die App ihn nutzt).
    ctx.userA = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await ctx.userA.auth.signInWithPassword({ email: emailA, password: PW });
    if (error) throw new Error(`signIn A: ${error.message}`);
  }, 60_000);

  afterAll(async () => {
    if (!ctx.admin) return;
    // Kanzlei-Löschung kaskadiert Akten/Briefe/Reminder; danach Test-User entfernen.
    await ctx.admin.from("kanzleien").delete().in("id", [ctx.kanzleiA, ctx.kanzleiB].filter(Boolean));
    if (ctx.idA) await ctx.admin.auth.admin.deleteUser(ctx.idA);
    if (ctx.idB) await ctx.admin.auth.admin.deleteUser(ctx.idB);
  }, 60_000);

  it("(a) DB-Query: A sieht die eigene Akte, aber NICHT die von B", async () => {
    const { data, error } = await ctx.userA.from("cases").select("id, kanzlei_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(ctx.caseA);
    expect(ids).not.toContain(ctx.caseB);
    // Keine fremde Kanzlei in der Ergebnismenge.
    expect((data ?? []).every((r) => r.kanzlei_id === ctx.kanzleiA)).toBe(true);
  });

  it("(b) API-Pfad: gezielter Zugriff auf B's Akte liefert nichts (RLS, wie app/api/cases/[id])", async () => {
    const { data, error } = await ctx.userA.from("cases").select("id").eq("id", ctx.caseB).maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("(b) API-Pfad: A kann B's Akte NICHT verändern (0 betroffene Zeilen)", async () => {
    const { data, error } = await ctx.userA
      .from("cases")
      .update({ status: "erledigt" })
      .eq("id", ctx.caseB)
      .select("id");
    expect(error).toBeNull(); // RLS blockt still: kein Fehler, aber keine Zeile
    expect(data ?? []).toHaveLength(0);
    // Gegenprobe via Service-Role: Status von B ist unverändert.
    const { data: check } = await ctx.admin.from("cases").select("status").eq("id", ctx.caseB).single();
    expect(check?.status).toBe("offen");
  });

  it("(c) Trigger: gespooftes kanzlei_id wird aus der Eltern-Akte überschrieben (Vorgabe 2)", async () => {
    const { data, error } = await ctx.userA
      .from("case_letters")
      .insert({
        case_id: ctx.caseA,
        kanzlei_id: ctx.kanzleiB, // Spoofing-Versuch → muss ignoriert werden
        letter_type: "sonstiges",
        summary: "trigger-test",
      })
      .select("id, kanzlei_id")
      .single();
    expect(error).toBeNull();
    expect(data?.kanzlei_id).toBe(ctx.kanzleiA); // Trigger hat auf A korrigiert
  });

  it("(c) Cross-Tenant: A kann KEIN Schreiben an B's Akte hängen (Trigger setzt B → RLS blockt)", async () => {
    const { data, error } = await ctx.userA
      .from("case_letters")
      .insert({ case_id: ctx.caseB, letter_type: "sonstiges", summary: "fremd" })
      .select("id");
    // Trigger leitet kanzlei_id = B ab; WITH CHECK (Mitglied von B?) schlägt fehl.
    expect(error).not.toBeNull();
    expect(data).toBeFalsy();
  });
});
