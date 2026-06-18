import { MODEL, corsHeaders } from "./_lib/shared.js";

export const config = { runtime: "edge" };

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(request) });
  }

  return Response.json(
    {
      ok: true,
      model: MODEL,
      hasKey: Boolean(process.env.XAI_API_KEY),
      provider: "vercel",
    },
    { headers: corsHeaders(request) }
  );
}