const SITE_ORIGIN = "https://ledutheo.github.io";
const MODEL = "grok-3-mini";
const MAX_TOKENS = 220;
const RATE_LIMIT = 30;
const RATE_WINDOW = 86_400;

const SYSTEM = `Tu es l'assistant du site theoledu. Tu réponds en français, concis (2-4 phrases).
Théo (theoledu / ledutheo sur GitHub) : dev Manjaro/Arch, syskit, dotfiles, scripts, projet 1975 (hommage BASIC/COBOL à sa mère informaticienne banque), coloring books, Maman Débunk.
Reste factuel. Si la question n'est pas sur Théo, réponds brièvement puis ramène vers qui il est.`;

const CORS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin") ?? "";
  const allowed =
    origin === SITE_ORIGIN ||
    origin === "https://theoledu.github.io" ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");

  return {
    ...CORS,
    "Access-Control-Allow-Origin": allowed ? origin : SITE_ORIGIN,
    Vary: "Origin",
  };
}

function json(data, status, request) {
  return Response.json(data, { status, headers: corsHeaders(request) });
}

async function rateLimit(request) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = `rl:${ip}`;
  const cache = caches.default;
  const hit = await cache.match(`https://rate.internal/${key}`);
  const count = hit ? Number(await hit.text()) : 0;

  if (count >= RATE_LIMIT) {
    return false;
  }

  await cache.put(
    `https://rate.internal/${key}`,
    new Response(String(count + 1), {
      headers: { "Cache-Control": `max-age=${RATE_WINDOW}` },
    })
  );
  return true;
}

function buildMessages(question, history = []) {
  const recent = history
    .filter((m) => m?.role && m?.content)
    .slice(-6)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 800) }));

  return [
    { role: "system", content: SYSTEM },
    ...recent,
    { role: "user", content: question },
  ];
}

async function callXai(env, messages, stream) {
  return fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      stream,
    }),
  });
}

async function handleAsk(request, env) {
  if (!env.XAI_API_KEY) {
    return json({ error: "XAI_API_KEY manquante côté worker" }, 500, request);
  }

  if (!(await rateLimit(request))) {
    return json(
      { error: "Limite atteinte (30 questions/jour). Reviens demain." },
      429,
      request
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, 400, request);
  }

  const question = body.question?.trim();
  if (!question) {
    return json({ error: "question requise" }, 400, request);
  }

  const messages = buildMessages(question, body.history);
  const wantsStream =
    request.headers.get("Accept") === "text/event-stream" || body.stream;

  const upstream = await callXai(env, messages, wantsStream);

  if (!upstream.ok) {
    const detail = await upstream.text();
    return json({ error: "xAI", detail }, upstream.status, request);
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
      } catch (err) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, { headers });
  }

  const data = await upstream.json();
  const answer =
    data.choices?.[0]?.message?.content?.trim() ?? "Pas de réponse.";

  return json(
    {
      answer,
      model: data.model ?? MODEL,
      usage: data.usage ?? null,
    },
    200,
    request
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json(
        {
          ok: true,
          model: MODEL,
          hasKey: Boolean(env.XAI_API_KEY),
        },
        200,
        request
      );
    }

    if (request.method === "POST" && (url.pathname === "/" || url.pathname === "/ask")) {
      return handleAsk(request, env);
    }

    return json({ error: "Not found" }, 404, request);
  },
};