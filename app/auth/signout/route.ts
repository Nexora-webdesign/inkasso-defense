// app/auth/signout/route.ts – Abmelden.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(request.url).origin), { status: 303 });
}
