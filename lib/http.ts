// lib/http.ts – zentraler JSON-Response-Helfer für API-Routen (DRY).
// Vorher in jeder Route lokal dupliziert.
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
