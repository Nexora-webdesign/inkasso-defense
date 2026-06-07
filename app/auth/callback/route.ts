// app/auth/callback/route.ts – Magic-Link-Rückkehr: Code/Token -> Session.
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

  const dest = ok ? next : "/login?error=link";
  return NextResponse.redirect(new URL(dest, url.origin));
}
