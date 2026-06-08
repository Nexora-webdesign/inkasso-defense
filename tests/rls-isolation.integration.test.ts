// tests/rls-isolation.integration.test.ts
// -----------------------------------------------------------------------------
// Automatischer, eingecheckter RLS-Isolations-Test für Migration 0004
// (Vorgabe 3): zwei Kanzleien, User A sieht/ändert die Daten von B NICHT —
// für ALLE kanzlei-gebundenen Tabellen, jeweils mit Service-Role-Gegenprobe.
//
// Geprüfte Ebenen:
//   (a) DB-Query  – direkter PostgREST-Zugriff mit dem JWT von User A.
//   (b) API-Pfad  – exakt dieselbe RLS, auf die sich app/api/cases/* verlässt
//                    (die Routen filtern NICHT zusätzlich nach user, sondern
//                     delegieren die Isolation vollständig an diese Policies).
//   (c) Trigger   – kanzlei_id von case_letters/reminders wird serverseitig aus
//                    der Eltern-Akte erzwungen, nicht client-spoofbar (Vorgabe 2).
//   (d) Rollen    – ein 'mitarbeiter' darf lesen, aber NICHT löschen.
//   (e) Positiv   – A darf in der EIGENEN Kanzlei eine Akte anlegen.
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
const emailC = `rls-c-${stamp}@inkasso-defense.test`; // wird 'mitarbeiter' in Kanzlei A

type Ctx = {
  admin: SupabaseClient;
  userA: SupabaseClient;
  userC: SupabaseClient;
  idA: string;
  idB: string;
  idC: string;
  kanzleiA: string;
  kanzleiB: string;
  kanzleiC: string; // C's eigene Solo-Kanzlei (Cleanup)
  caseA: string;
  caseB: string;
  mandantA: string;
  mandantB: string;
  reminderA: string;
  reminderB: string;
  consumedA: string;
  consumedB: string;
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

async function seedMandant(admin: SupabaseClient, kanzleiId: string, userId: string): Promise<string> {
  const { data, error } = await admin
    .from("mandanten")
    .insert({ kanzlei_id: kanzleiId, created_by: userId, typ: "verbraucher", name: "Testmandant" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`seedMandant(${kanzleiId}): ${error?.message}`);
  return data.id as string;
}

async function seedReminder(admin: SupabaseClient, caseId: string, userId: string): Promise<string> {
  // kanzlei_id wird vom BEFORE-Trigger aus case_id abgeleitet → hier bewusst weggelassen.
  const { data, error } = await admin
    .from("reminders")
    .insert({
      case_id: caseId,
      created_by: userId,
      type: "widerspruch_14tage",
      due_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`seedReminder(${caseId}): ${error?.message}`);
  return data.id as string;
}

async function seedConsumed(
  admin: SupabaseClient,
  kanzleiId: string,
  userId: string,
  hash: string,
): Promise<string> {
  const { data, error } = await admin
    .from("consumed_licenses")
    .insert({ kanzlei_id: kanzleiId, created_by: userId, license_hash: hash, product_id: "test" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`seedConsumed(${kanzleiId}): ${error?.message}`);
  return data.id as string;
}

describe.skipIf(!READY)("RLS-Isolation (Migration 0004)", () => {
  beforeAll(async () => {
    ctx.admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

    ctx.idA = await createConfirmedUser(ctx.admin, emailA);
    ctx.idB = await createConfirmedUser(ctx.admin, emailB);
    ctx.idC = await createConfirmedUser(ctx.admin, emailC);
    ctx.kanzleiA = await kanzleiOf(ctx.admin, ctx.idA);
    ctx.kanzleiB = await kanzleiOf(ctx.admin, ctx.idB);
    ctx.kanzleiC = await kanzleiOf(ctx.admin, ctx.idC); // vor Doppel-Mitgliedschaft erfassen
    expect(new Set([ctx.kanzleiA, ctx.kanzleiB, ctx.kanzleiC]).size).toBe(3);

    // C wird zusätzlich 'mitarbeiter' in Kanzlei A.
    {
      const { error } = await ctx.admin
        .from("kanzlei_members")
        .insert({ kanzlei_id: ctx.kanzleiA, user_id: ctx.idC, role: "mitarbeiter" });
      if (error) throw new Error(`seed mitarbeiter: ${error.message}`);
    }

    // Daten in beiden Kanzleien anlegen (Service-Role, RLS-frei).
    ctx.caseA = await seedCase(ctx.admin, ctx.kanzleiA, ctx.idA);
    ctx.caseB = await seedCase(ctx.admin, ctx.kanzleiB, ctx.idB);
    ctx.mandantA = await seedMandant(ctx.admin, ctx.kanzleiA, ctx.idA);
    ctx.mandantB = await seedMandant(ctx.admin, ctx.kanzleiB, ctx.idB);
    ctx.reminderA = await seedReminder(ctx.admin, ctx.caseA, ctx.idA);
    ctx.reminderB = await seedReminder(ctx.admin, ctx.caseB, ctx.idB);
    ctx.consumedA = await seedConsumed(ctx.admin, ctx.kanzleiA, ctx.idA, `hashA-${stamp}`);
    ctx.consumedB = await seedConsumed(ctx.admin, ctx.kanzleiB, ctx.idB, `hashB-${stamp}`);

    // Als User A anmelden → ab hier RLS-gebundener Client (wie die App ihn nutzt).
    ctx.userA = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    {
      const { error } = await ctx.userA.auth.signInWithPassword({ email: emailA, password: PW });
      if (error) throw new Error(`signIn A: ${error.message}`);
    }
    // Als User C (mitarbeiter in Kanzlei A) anmelden.
    ctx.userC = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    {
      const { error } = await ctx.userC.auth.signInWithPassword({ email: emailC, password: PW });
      if (error) throw new Error(`signIn C: ${error.message}`);
    }
  }, 90_000);

  afterAll(async () => {
    if (!ctx.admin) return;
    // Kanzlei-Löschung kaskadiert Akten/Mandanten/Briefe/Reminder/Lizenzen.
    await ctx.admin
      .from("kanzleien")
      .delete()
      .in("id", [ctx.kanzleiA, ctx.kanzleiB, ctx.kanzleiC].filter(Boolean));
    if (ctx.idA) await ctx.admin.auth.admin.deleteUser(ctx.idA);
    if (ctx.idB) await ctx.admin.auth.admin.deleteUser(ctx.idB);
    if (ctx.idC) await ctx.admin.auth.admin.deleteUser(ctx.idC);
  }, 90_000);

  // ── cases ──────────────────────────────────────────────────────────────────
  describe("cases", () => {
    it("(a) DB-Query: A sieht die eigene Akte, aber NICHT die von B", async () => {
      const { data, error } = await ctx.userA.from("cases").select("id, kanzlei_id");
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(ctx.caseA);
      expect(ids).not.toContain(ctx.caseB);
      expect((data ?? []).every((r) => r.kanzlei_id === ctx.kanzleiA)).toBe(true);
    });

    it("(b) API-Pfad: gezielter Zugriff auf B's Akte liefert nichts", async () => {
      const { data, error } = await ctx.userA.from("cases").select("id").eq("id", ctx.caseB).maybeSingle();
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("(b) Schreib-Isolation: A kann B's Akte NICHT ändern (0 Zeilen + Gegenprobe)", async () => {
      const { data, error } = await ctx.userA
        .from("cases")
        .update({ status: "erledigt" })
        .eq("id", ctx.caseB)
        .select("id");
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
      const { data: check } = await ctx.admin.from("cases").select("status").eq("id", ctx.caseB).single();
      expect(check?.status).toBe("offen");
    });

    it("(e) Positiv: A darf in der EIGENEN Kanzlei eine Akte anlegen", async () => {
      const { data, error } = await ctx.userA
        .from("cases")
        .insert({
          kanzlei_id: ctx.kanzleiA,
          title: "A-eigene-Akte",
          result_json: { stammdaten: {}, berechnung: {} },
          status: "offen",
        })
        .select("id, kanzlei_id")
        .single();
      expect(error).toBeNull();
      expect(data?.kanzlei_id).toBe(ctx.kanzleiA);
    });

    it("(e) Negativ: A kann KEINE Akte in B's Kanzlei anlegen", async () => {
      const { data, error } = await ctx.userA
        .from("cases")
        .insert({ kanzlei_id: ctx.kanzleiB, title: "fremd", result_json: {}, status: "offen" })
        .select("id");
      expect(error).not.toBeNull();
      expect(data).toBeFalsy();
    });
  });

  // ── mandanten (zuerst, wie gefordert) ───────────────────────────────────────
  describe("mandanten", () => {
    it("(a) Lese-Isolation: A sieht nur eigene Mandanten", async () => {
      const { data, error } = await ctx.userA.from("mandanten").select("id, kanzlei_id");
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(ctx.mandantA);
      expect(ids).not.toContain(ctx.mandantB);
      expect((data ?? []).every((r) => r.kanzlei_id === ctx.kanzleiA)).toBe(true);
    });

    it("(b) Schreib-Isolation: A kann B's Mandant NICHT ändern (0 Zeilen + Gegenprobe)", async () => {
      const { data, error } = await ctx.userA
        .from("mandanten")
        .update({ name: "HACK" })
        .eq("id", ctx.mandantB)
        .select("id");
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
      const { data: check } = await ctx.admin.from("mandanten").select("name").eq("id", ctx.mandantB).single();
      expect(check?.name).toBe("Testmandant");
    });

    it("(b) Schreib-Isolation: A kann KEINEN Mandant in B's Kanzlei anlegen", async () => {
      const { data, error } = await ctx.userA
        .from("mandanten")
        .insert({ kanzlei_id: ctx.kanzleiB, typ: "verbraucher", name: "fremd" })
        .select("id");
      expect(error).not.toBeNull();
      expect(data).toBeFalsy();
    });
  });

  // ── reminders ────────────────────────────────────────────────────────────────
  describe("reminders", () => {
    it("(a) Lese-Isolation: A sieht nur eigene Reminder", async () => {
      const { data, error } = await ctx.userA.from("reminders").select("id, kanzlei_id");
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(ctx.reminderA);
      expect(ids).not.toContain(ctx.reminderB);
      expect((data ?? []).every((r) => r.kanzlei_id === ctx.kanzleiA)).toBe(true);
    });

    it("(b) Schreib-Isolation: A kann B's Reminder NICHT ändern (0 Zeilen + Gegenprobe)", async () => {
      const { data, error } = await ctx.userA
        .from("reminders")
        .update({ type: "folge_erinnerung" })
        .eq("id", ctx.reminderB)
        .select("id");
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
      const { data: check } = await ctx.admin.from("reminders").select("type").eq("id", ctx.reminderB).single();
      expect(check?.type).toBe("widerspruch_14tage");
    });
  });

  // ── kanzlei_members ──────────────────────────────────────────────────────────
  describe("kanzlei_members", () => {
    it("(a) Lese-Isolation: A sieht nur Mitglieder der eigenen Kanzlei", async () => {
      const { data, error } = await ctx.userA.from("kanzlei_members").select("kanzlei_id, user_id, role");
      expect(error).toBeNull();
      expect((data ?? []).every((r) => r.kanzlei_id === ctx.kanzleiA)).toBe(true);
      // B's Inhaber-Mitgliedschaft ist NICHT sichtbar.
      expect((data ?? []).some((r) => r.user_id === ctx.idB)).toBe(false);
      // Eigene + die des mitarbeiters (C) in Kanzlei A sind sichtbar.
      const users = (data ?? []).map((r) => r.user_id);
      expect(users).toContain(ctx.idA);
      expect(users).toContain(ctx.idC);
    });

    it("(b) Schreib-Isolation: A kann KEIN Mitglied in B's Kanzlei aufnehmen", async () => {
      const { data, error } = await ctx.userA
        .from("kanzlei_members")
        .insert({ kanzlei_id: ctx.kanzleiB, user_id: ctx.idA, role: "anwalt" })
        .select("user_id");
      expect(error).not.toBeNull();
      expect(data).toBeFalsy();
    });

    it("(b) Schreib-Isolation: A kann B's Mitgliedschaft NICHT ändern (0 Zeilen + Gegenprobe)", async () => {
      const { data, error } = await ctx.userA
        .from("kanzlei_members")
        .update({ role: "mitarbeiter" })
        .eq("kanzlei_id", ctx.kanzleiB)
        .eq("user_id", ctx.idB)
        .select("user_id");
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
      const { data: check } = await ctx.admin
        .from("kanzlei_members")
        .select("role")
        .eq("kanzlei_id", ctx.kanzleiB)
        .eq("user_id", ctx.idB)
        .single();
      expect(check?.role).toBe("inhaber");
    });
  });

  // ── kanzleien ────────────────────────────────────────────────────────────────
  describe("kanzleien", () => {
    it("(a) Lese-Isolation: A sieht nur die eigene Kanzlei", async () => {
      const { data, error } = await ctx.userA.from("kanzleien").select("id");
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(ctx.kanzleiA);
      expect(ids).not.toContain(ctx.kanzleiB);
    });

    it("(b) Schreib-Isolation: A kann B's Kanzlei NICHT umbenennen (0 Zeilen + Gegenprobe)", async () => {
      const { data: before } = await ctx.admin.from("kanzleien").select("name").eq("id", ctx.kanzleiB).single();
      const { data, error } = await ctx.userA
        .from("kanzleien")
        .update({ name: "HACK" })
        .eq("id", ctx.kanzleiB)
        .select("id");
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
      const { data: after } = await ctx.admin.from("kanzleien").select("name").eq("id", ctx.kanzleiB).single();
      expect(after?.name).toBe(before?.name);
    });
  });

  // ── consumed_licenses ──────────────────────────────────────────────────────────
  describe("consumed_licenses", () => {
    it("(a) Lese-Isolation: A sieht nur eigene Lizenz-Verbräuche", async () => {
      const { data, error } = await ctx.userA.from("consumed_licenses").select("id, kanzlei_id");
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(ctx.consumedA);
      expect(ids).not.toContain(ctx.consumedB);
      expect((data ?? []).every((r) => r.kanzlei_id === ctx.kanzleiA)).toBe(true);
    });

    it("(b) Schreib-Isolation: A kann KEINEN Lizenz-Verbrauch in B's Kanzlei eintragen", async () => {
      const { data, error } = await ctx.userA
        .from("consumed_licenses")
        .insert({ kanzlei_id: ctx.kanzleiB, license_hash: `hackB-${stamp}`, product_id: "test" })
        .select("id");
      expect(error).not.toBeNull();
      expect(data).toBeFalsy();
    });
  });

  // ── case_letters: Trigger erzwingt kanzlei_id (Vorgabe 2) ─────────────────────
  describe("case_letters (Trigger)", () => {
    it("(c) gespooftes kanzlei_id wird aus der Eltern-Akte überschrieben", async () => {
      const { data, error } = await ctx.userA
        .from("case_letters")
        .insert({ case_id: ctx.caseA, kanzlei_id: ctx.kanzleiB, letter_type: "sonstiges", summary: "spoof" })
        .select("id, kanzlei_id")
        .single();
      expect(error).toBeNull();
      expect(data?.kanzlei_id).toBe(ctx.kanzleiA);
    });

    it("(c) Cross-Tenant: A kann KEIN Schreiben an B's Akte hängen (Trigger setzt B → RLS blockt)", async () => {
      const { data, error } = await ctx.userA
        .from("case_letters")
        .insert({ case_id: ctx.caseB, letter_type: "sonstiges", summary: "fremd" })
        .select("id");
      expect(error).not.toBeNull();
      expect(data).toBeFalsy();
    });
  });

  // ── Rollen: mitarbeiter (User C in Kanzlei A) ────────────────────────────────
  describe("Rolle mitarbeiter", () => {
    it("(d) mitarbeiter darf die Akten der eigenen Kanzlei LESEN", async () => {
      const { data, error } = await ctx.userC.from("cases").select("id").eq("id", ctx.caseA).maybeSingle();
      expect(error).toBeNull();
      expect(data?.id).toBe(ctx.caseA);
    });

    it("(d) mitarbeiter darf NICHT löschen (0 Zeilen + Gegenprobe: Akte bleibt)", async () => {
      const { data, error } = await ctx.userC.from("cases").delete().eq("id", ctx.caseA).select("id");
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
      const { data: check } = await ctx.admin.from("cases").select("id").eq("id", ctx.caseA).single();
      expect(check?.id).toBe(ctx.caseA);
    });

    it("(d) mitarbeiter darf ebenfalls keinen Mandanten löschen", async () => {
      const { data, error } = await ctx.userC.from("mandanten").delete().eq("id", ctx.mandantA).select("id");
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
      const { data: check } = await ctx.admin.from("mandanten").select("id").eq("id", ctx.mandantA).single();
      expect(check?.id).toBe(ctx.mandantA);
    });
  });
});
