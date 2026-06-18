import { MODEL, corsHeaders } from "../../api/_lib/shared.js";

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(request) });
  }

  return Response.json(
    {
      ok: true,
      model: MODEL,
      hasKey: Boolean(Netlify.env.get("XAI_API_KEY")),
      provider: "netlify",
    },
    { headers: corsHeaders(request) }
  );
};