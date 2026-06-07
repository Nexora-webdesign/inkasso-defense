// app/api/cases/[id]/status/route.ts – Status eines Falls ändern (geschützt).
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { isCaseStatus } from "@/lib/escalation";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "Bitte zuerst anmelden." }, 401);

  let status: unknown;
  try {
    status = ((await req.json()) as { status?: unknown })?.status;
  } catch {
    return json({ ok: false, error: "Ungültiger Request-Body." }, 400);
  }
  if (!isCaseStatus(status)) {
    return json({ ok: false, error: "Unbekannter Status." }, 400);
  }

  // RLS (auth.uid()=user_id) stellt sicher, dass nur eigene Fälle änderbar sind.
  const { data, error } = await supabase
    .from("cases")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[api/cases/status] update error:", (error as { code?: string }).code);
    return json({ ok: false, error: "Aktualisierung fehlgeschlagen." }, 500);
  }
  if (!data) return json({ ok: false, error: "Fall nicht gefunden." }, 404);

  return json({ ok: true, status });
}
