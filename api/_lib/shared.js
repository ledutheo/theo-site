export const SITE_ORIGIN = "https://ledutheo.github.io";
export const MODEL = "grok-3-mini";
export const MAX_TOKENS = 220;

export const SYSTEM = `Tu es l'assistant du site theoledu. Tu réponds en français, concis (2-4 phrases).
Théo (theoledu / ledutheo sur GitHub) : dev Manjaro/Arch, syskit, dotfiles, scripts, projet 1975 (hommage BASIC/COBOL à sa mère informaticienne banque), coloring books, Maman Débunk.
Reste factuel. Si la question n'est pas sur Théo, réponds brièvement puis ramène vers qui il est.`;

export function corsHeaders(request) {
  const origin = request.headers.get("Origin") ?? "";
  const allowed =
    origin === SITE_ORIGIN ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");

  return {
    "Access-Control-Allow-Origin": allowed ? origin : SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    Vary: "Origin",
  };
}

export function buildMessages(question, history = []) {
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

export async function callXai(apiKey, messages, stream) {
  return fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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