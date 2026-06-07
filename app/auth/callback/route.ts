// app/auth/callback/route.ts – Rückkehr vom E-Mail-Bestätigungslink.
// Bestätigt die E-Mail (Code/Token -> Session), beendet die Session dann wieder
// und schickt den Nutzer auf die Login-Seite: Er meldet sich anschließend
// regulär mit E-Mail + Passwort an. So ist der Flow eindeutig.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/konto";

  const supabase = createClient(await cookies());

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "magiclink" | "email" | "signup" | "recovery" | "invite",
      token_hash: tokenHash,
    });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=link", url.origin));
  }

  // E-Mail ist jetzt bestätigt. Session wieder beenden → bewusst manuelle Anmeldung.
  await supabase.auth.signOut();

  const dest = `/login?confirmed=1&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
