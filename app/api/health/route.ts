// Health-Check für Deploy-Verifikation: GET /api/health
export const runtime = "nodejs";

export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, model: process.env.ANALYZE_MODEL || "claude-haiku-4-5", keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY) }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
