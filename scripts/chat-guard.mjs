// Shared request guards for the chat proxies (netlify/functions/chat.mjs and
// server.js), so the public endpoint cannot be used as a general-purpose,
// key-backed LLM gateway.

export const MAX_MESSAGES = 24;
export const MAX_TOTAL_CHARS = 24000;
export const MAX_SYSTEM_CHARS = 8000;

// Accept only plain {role, content} text messages. A single system message is
// allowed, and only as the first entry, because both chat UIs build their own
// prompt client-side. Later system messages are rejected so a caller cannot
// inject instructions into the middle of a conversation.
export function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const recent = raw.slice(-MAX_MESSAGES);
  const messages = [];
  let totalChars = 0;
  for (const [index, entry] of recent.entries()) {
    if (!entry || typeof entry.content !== "string") return null;
    if (entry.role === "system") {
      if (index !== 0 || entry.content.length > MAX_SYSTEM_CHARS) return null;
    } else if (entry.role !== "user" && entry.role !== "assistant") {
      return null;
    }
    totalChars += entry.content.length;
    if (totalChars > MAX_TOTAL_CHARS) return null;
    messages.push({ role: entry.role, content: entry.content });
  }
  return messages.some((message) => message.role === "user") ? messages : null;
}

// Best-effort fixed-window limiter. Serverless instances do not share memory,
// so this bounds abuse per instance rather than globally.
export function createRateLimiter({ limit = 12, windowMs = 60000, maxKeys = 2000 } = {}) {
  const hits = new Map();
  return function allow(key, now = Date.now()) {
    const entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      if (hits.size >= maxKeys) {
        for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
        if (hits.size >= maxKeys) hits.clear();
      }
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
