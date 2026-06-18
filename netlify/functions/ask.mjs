import {
  MODEL,
  buildMessages,
  callXai,
  corsHeaders,
} from "../../api/_lib/shared.js";

export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: "POST only" },
      { status: 405, headers: corsHeaders(request) }
    );
  }

  const apiKey = Netlify.env.get("XAI_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "XAI_API_KEY manquante côté Netlify" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "JSON invalide" },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  const question = body.question?.trim();
  if (!question) {
    return Response.json(
      { error: "question requise" },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  const messages = buildMessages(question, body.history);
  const wantsStream =
    request.headers.get("Accept") === "text/event-stream" || body.stream;

  const upstream = await callXai(apiKey, messages, wantsStream);

  if (!upstream.ok) {
    const detail = await upstream.text();
    return Response.json(
      { error: "xAI", detail },
      { status: upstream.status, headers: corsHeaders(request) }
    );
  }

  if (wantsStream && upstream.body) {
    const headers = {
      ...corsHeaders(request),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const chunk = JSON.parse(payload);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
                );
              }
            } catch {
              /* chunk partiel */
            }
          }
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, { headers });
  }

  const data = await upstream.json();
  const answer =
    data.choices?.[0]?.message?.content?.trim() ?? "Pas de réponse.";

  return Response.json(
    {
      answer,
      model: data.model ?? MODEL,
      usage: data.usage ?? null,
    },
    { headers: corsHeaders(request) }
  );
};