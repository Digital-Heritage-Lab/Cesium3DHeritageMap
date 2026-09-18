import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter, sanitizeMessages } from "./chat-guard.mjs";

const user = (content) => ({ role: "user", content });

test("a leading system prompt is kept, later system messages are rejected", () => {
  const ok = sanitizeMessages([{ role: "system", content: "s" }, user("hi")]);
  assert.equal(ok.length, 2);
  assert.equal(sanitizeMessages([user("hi"), { role: "system", content: "s" }]), null);
  assert.equal(
    sanitizeMessages([{ role: "system", content: "a" }, { role: "system", content: "b" }, user("hi")]),
    null
  );
});

test("oversized, malformed or user-less conversations are rejected", () => {
  assert.equal(sanitizeMessages([{ role: "system", content: "x".repeat(8001) }, user("hi")]), null);
  assert.equal(sanitizeMessages([user("x".repeat(24001))]), null);
  assert.equal(sanitizeMessages([{ role: "tool", content: "x" }]), null);
  assert.equal(sanitizeMessages([{ role: "user", content: 5 }]), null);
  assert.equal(sanitizeMessages([{ role: "system", content: "s" }]), null);
  assert.equal(sanitizeMessages([]), null);
});

test("history is trimmed to the latest messages", () => {
  const many = Array.from({ length: 40 }, (_, i) => user(`m${i}`));
  const trimmed = sanitizeMessages(many);
  assert.equal(trimmed.length, 24);
  assert.equal(trimmed.at(-1).content, "m39");
});

test("rate limiter blocks after the limit and resets with the window", () => {
  const allow = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(allow("a", 0), true);
  assert.equal(allow("a", 10), true);
  assert.equal(allow("a", 20), false);
  assert.equal(allow("b", 20), true);
  assert.equal(allow("a", 1001), true);
});
