// tests/kanzlei.unit.test.ts
// Unit-Tests (ohne DB) für die Kanzlei-Auflösung & den Mandanten-Cross-Tenant-Schutz.
// Deckt Vorgabe 1 ab: gültige Mitgliedschaft akzeptiert; fremde/gespoofte kanzlei_id
// abgelehnt; 0 Kanzleien -> Fehler; >1 nur mit gültiger Auswahl; sowie cases-Insert
// mit mandant_id aus FREMDER Kanzlei -> abgelehnt (mandantBelongsToKanzlei = false).
import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decideKanzlei, resolveKanzleiId, mandantBelongsToKanzlei } from "@/lib/kanzlei";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

/** Minimaler, chainbarer Fake-Supabase-Client: jede Query endet bei `result`. */
function fakeSupabase(result: { data: unknown; error: unknown }): SupabaseClient {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  Object.assign(builder, {
    select: self,
    eq: self,
    in: self,
    order: self,
    limit: self,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    // thenable: erlaubt `await supabase.from(...).select(...).eq(...)`
    then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onF, onR),
  });
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("decideKanzlei (reine Entscheidungslogik)", () => {
  it("0 Mitgliedschaften -> no_kanzlei", () => {
    expect(decideKanzlei([])).toEqual({ ok: false, code: "no_kanzlei" });
  });

  it("genau 1 Mitgliedschaft -> diese wird genommen", () => {
    expect(decideKanzlei([A])).toEqual({ ok: true, kanzleiId: A });
  });

  it("requested = eigene Kanzlei -> akzeptiert", () => {
    expect(decideKanzlei([A, B], A)).toEqual({ ok: true, kanzleiId: A });
  });

  it("requested = FREMDE/gespoofte Kanzlei -> forbidden_kanzlei", () => {
    expect(decideKanzlei([A], B)).toEqual({ ok: false, code: "forbidden_kanzlei" });
  });

  it(">1 ohne Auswahl -> ambiguous_kanzlei", () => {
    expect(decideKanzlei([A, B])).toEqual({ ok: false, code: "ambiguous_kanzlei" });
  });

  it(">1 mit gültiger Auswahl -> akzeptiert", () => {
    expect(decideKanzlei([A, B], B)).toEqual({ ok: true, kanzleiId: B });
  });
});

describe("resolveKanzleiId (mit Fake-Client)", () => {
  it("gültige Mitgliedschaft -> akzeptiert", async () => {
    const sb = fakeSupabase({ data: [{ kanzlei_id: A }], error: null });
    expect(await resolveKanzleiId(sb, "user", undefined)).toEqual({ ok: true, kanzleiId: A });
  });

  it("gespoofte kanzlei_id (nicht Mitglied) -> abgelehnt", async () => {
    const sb = fakeSupabase({ data: [{ kanzlei_id: A }], error: null });
    expect(await resolveKanzleiId(sb, "user", B)).toEqual({ ok: false, code: "forbidden_kanzlei" });
  });

  it("0 Kanzleien -> no_kanzlei", async () => {
    const sb = fakeSupabase({ data: [], error: null });
    expect(await resolveKanzleiId(sb, "user")).toEqual({ ok: false, code: "no_kanzlei" });
  });

  it(">1 Kanzleien ohne Auswahl -> ambiguous_kanzlei", async () => {
    const sb = fakeSupabase({ data: [{ kanzlei_id: A }, { kanzlei_id: B }], error: null });
    expect(await resolveKanzleiId(sb, "user")).toEqual({ ok: false, code: "ambiguous_kanzlei" });
  });

  it(">1 Kanzleien mit gültiger Auswahl -> akzeptiert", async () => {
    const sb = fakeSupabase({ data: [{ kanzlei_id: A }, { kanzlei_id: B }], error: null });
    expect(await resolveKanzleiId(sb, "user", B)).toEqual({ ok: true, kanzleiId: B });
  });

  it("DB-Fehler -> error", async () => {
    const sb = fakeSupabase({ data: null, error: { code: "XX" } });
    expect(await resolveKanzleiId(sb, "user")).toEqual({ ok: false, code: "error" });
  });
});

describe("mandantBelongsToKanzlei (Cross-Tenant-Schutz beim cases-Insert)", () => {
  it("Mandant der eigenen Kanzlei -> true", async () => {
    const sb = fakeSupabase({ data: { id: "m1" }, error: null });
    expect(await mandantBelongsToKanzlei(sb, "m1", A)).toBe(true);
  });

  it("FREMDER Mandant (RLS verbirgt ihn -> keine Zeile) -> false", async () => {
    const sb = fakeSupabase({ data: null, error: null });
    expect(await mandantBelongsToKanzlei(sb, "m-fremd", A)).toBe(false);
  });

  it("DB-Fehler -> false (kein Durchwinken)", async () => {
    const sb = fakeSupabase({ data: null, error: { code: "XX" } });
    expect(await mandantBelongsToKanzlei(sb, "m1", A)).toBe(false);
  });
});
