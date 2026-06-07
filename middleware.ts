import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// Hält die Supabase-Session frisch – NUR in den geschützten Premium-Bereichen.
// Gratis-Flow (/, /dashboard) und Blog bleiben unberührt.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/konto/:path*", "/faelle/:path*", "/fall/:path*", "/login", "/auth/:path*"],
};
