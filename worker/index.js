const SYSTEM = `Tu réponds en français, en 3-5 phrases max.
Théo (theoledu / ledutheo) : développeur Manjaro/Arch, projets syskit, dotfiles, scripts, 1975 (hommage BASIC/COBOL à sa mère informaticienne banque), coloring books, Maman Débunk.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response("POST only", { status: 405, headers: CORS });
    }

    if (!env.XAI_API_KEY) {
      return Response.json(
        { error: "XAI_API_KEY manquante" },
        { status: 500, headers: CORS }
      );
    }

    let question;
    try {
      ({ question } = await request.json());
    } catch {
      return Response.json(
        { error: "JSON invalide" },
        { status: 400, headers: CORS }
      );
    }

    if (!question?.trim()) {
      return Response.json(
        { error: "question requise" },
        { status: 400, headers: CORS }
      );
    }

    const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: question },
        ],
        max_tokens: 300,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return Response.json(
        { error: "xAI", detail },
        { status: upstream.status, headers: CORS }
      );
    }

    const data = await upstream.json();
    const answer =
      data.choices?.[0]?.message?.content?.trim() ??
      "Pas de réponse du modèle.";

    return Response.json({ answer }, { headers: CORS });
  },
};