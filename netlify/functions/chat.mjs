// GeoAI chat proxy (production) — forwards chat requests to OpenRouter while
// keeping the API key server-side. The browser must never see the key.
//
// Configure in Netlify: Site configuration -> Environment variables
//   OPENROUTER_API_KEY  (required — get one at https://openrouter.ai/keys)
//   OPENROUTER_MODEL    (optional — defaults to a free model, see below)
//
// The same endpoint exists in server.js for local development.

const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
// Free models are often rate-limited upstream; when the primary model fails
// with a retryable error, the proxy tries these in order. Free slugs rotate —
// check https://openrouter.ai/api/v1/models (ids ending in ":free") when all
// of them start returning 404.
const FALLBACK_MODELS = [
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];
const MAX_MESSAGES = 24;
const MAX_TOTAL_CHARS = 24000;
const MAX_OUTPUT_TOKENS = 400;
// Netlify synchronous functions time out at 10s; abort upstream a bit earlier
// so the browser gets a clean JSON error instead of a platform 502.
const UPSTREAM_TIMEOUT_MS = 9000;
const MIN_ATTEMPT_BUDGET_MS = 2000;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Accept only plain {role, content} text messages and enforce size caps so the
// public endpoint cannot be used as a general-purpose proxy for the key.
function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const allowedRoles = new Set(["system", "user", "assistant"]);
  const messages = [];
  let totalChars = 0;
  for (const entry of raw.slice(-MAX_MESSAGES)) {
    if (!entry || !allowedRoles.has(entry.role) || typeof entry.content !== "string") {
      return null;
    }
    totalChars += entry.content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return null;
    }
    messages.push({ role: entry.role, content: entry.content });
  }
  return messages;
}

export default async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  // Same-origin guard: browsers always send Origin on cross-site POSTs.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return jsonResponse(403, { error: "forbidden" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // The client treats this as "LLM mode off" and falls back to offline commands.
    return jsonResponse(503, { error: "llm_not_configured" });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const messages = sanitizeMessages(body && body.messages);
  if (!messages) {
    return jsonResponse(400, { error: "invalid_messages" });
  }

  const primaryModel = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const candidateModels = [primaryModel].concat(
    FALLBACK_MODELS.filter((model) => model !== primaryModel)
  );
  const deadline = Date.now() + UPSTREAM_TIMEOUT_MS;
  let timedOut = false;

  for (const model of candidateModels) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < MIN_ATTEMPT_BUDGET_MS) {
      timedOut = true;
      break;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), remainingMs);
    try {
      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // OpenRouter attribution headers (recommended, improves free-tier routing)
          "HTTP-Referer": new URL(req.url).origin,
          "X-Title": "Cesium3D Heritage Map GeoAI",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0.4,
        }),
      });

      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        console.warn("OpenRouter error", model, upstream.status, detail.slice(0, 300));
        // Rate limits and server errors are worth retrying on the next free
        // model; auth/validation errors are not.
        if (upstream.status === 429 || upstream.status >= 500 || upstream.status === 404) {
          continue;
        }
        return jsonResponse(502, { error: "llm_upstream_error" });
      }

      const data = await upstream.json();
      const reply =
        data && data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : null;
      if (typeof reply !== "string" || reply.trim().length === 0) {
        continue; // empty answer — try the next model
      }

      return jsonResponse(200, { reply: reply });
    } catch (error) {
      if (error && error.name === "AbortError") {
        timedOut = true;
        break;
      }
      console.warn("OpenRouter request failed:", model, error);
      // Network hiccup — try the next candidate model.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return jsonResponse(timedOut ? 504 : 502, {
    error: timedOut ? "llm_timeout" : "llm_unreachable",
  });
};

export const config = { path: "/api/chat" };
