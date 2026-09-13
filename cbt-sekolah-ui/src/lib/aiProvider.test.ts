import assert from "node:assert/strict";
import { generateAIJson, generateAIText } from "./aiProvider.ts";
import { AI_STORAGE_KEYS, type StorageLike } from "./aiSettings.ts";

class MemoryStorage implements StorageLike {
  private data: Record<string, string>;
  constructor(data: Record<string, string>) { this.data = data; }
  getItem(key: string) { return this.data[key] ?? null; }
  setItem(key: string, value: string) { this.data[key] = value; }
  removeItem(key: string) { delete this.data[key]; }
}

const geminiKey = "AIza-test-gemini-not-real";
const groqKey = "gsk_test-groq-not-real";
const storage = new MemoryStorage({
  [AI_STORAGE_KEYS.gemini]: geminiKey,
  [AI_STORAGE_KEYS.groq]: groqKey,
  [AI_STORAGE_KEYS.provider]: "gemini",
});

let seenUrl = "";
let seenHeaders: Record<string, string> = {};
let seenBody = "";
const gemini = await generateAIJson<{ ok: boolean }>({ prompt: "data", schema: { type: "object" } }, {
  storage,
  fetchImpl: async (input, init) => {
    seenUrl = String(input); seenHeaders = init?.headers as Record<string, string>; seenBody = String(init?.body ?? "");
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
  },
});
assert.equal(gemini.ok, true);
assert.equal(seenUrl.includes(geminiKey), false);
assert.equal(seenHeaders["x-goog-api-key"], geminiKey);
assert.equal(seenHeaders.Authorization, undefined);
assert.equal(seenBody.includes(geminiKey), false);
assert.equal(JSON.stringify(gemini).includes(geminiKey), false);

seenHeaders = {};
const groq = await generateAIText({ prompt: "data" }, {
  provider: "groq", storage,
  fetchImpl: async (input, init) => {
    seenUrl = String(input); seenHeaders = init?.headers as Record<string, string>;
    return new Response(JSON.stringify({ choices: [{ message: { content: "hasil" } }] }), { status: 200 });
  },
});
assert.equal(groq.ok, true);
assert.equal(seenUrl.includes(groqKey), false);
assert.equal(seenHeaders.Authorization, `Bearer ${groqKey}`);
assert.equal(seenHeaders["x-goog-api-key"], undefined);
assert.equal(JSON.stringify(groq).includes(groqKey), false);

// G — sah atau tidaknya key ditentukan penyedia: 400/401/403 → invalid credential,
// 429 tetap kuota. Tidak ada kesimpulan "invalid" dari bentuk string key.
for (const [status, expected] of [
  [400, "invalid_key"], [401, "invalid_key"], [403, "invalid_key"],
  [429, "rate_limited"], [500, "server_error"],
] as const) {
  const result = await generateAIText({ prompt: "x" }, { provider: "gemini", storage, fetchImpl: async () => new Response("{}", { status }) });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure, expected, `status ${status}`);
}
for (const status of [401, 403] as const) {
  const result = await generateAIText({ prompt: "x" }, { provider: "groq", storage, fetchImpl: async () => new Response("{}", { status }) });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure, "invalid_key", `groq status ${status}`);
}

// Key yang bentuknya "tidak biasa" tetap dikirim ke penyedia; hanya jawaban
// penyedia yang menentukan hasilnya. H — key tidak pernah muncul di pesan error.
const odd = new MemoryStorage({
  [AI_STORAGE_KEYS.gemini]: "format-baru-tanpa-prefix-AIza",
  [AI_STORAGE_KEYS.provider]: "gemini",
});
let oddHeaders: Record<string, string> = {};
const rejectedByProvider = await generateAIText({ prompt: "x" }, {
  storage: odd,
  fetchImpl: async (_input, init) => {
    oddHeaders = init?.headers as Record<string, string>;
    return new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 401 });
  },
});
assert.equal(oddHeaders["x-goog-api-key"], "format-baru-tanpa-prefix-AIza", "key non-AIza wajib tetap dicoba");
assert.equal(rejectedByProvider.ok, false);
if (!rejectedByProvider.ok) {
  assert.equal(rejectedByProvider.failure, "invalid_key");
  assert.match(rejectedByProvider.message, /tidak valid atau tidak memiliki akses/);
  assert.equal(rejectedByProvider.message.includes("format-baru-tanpa-prefix-AIza"), false);
  assert.equal(rejectedByProvider.message.includes("API key not valid"), false, "error mentah penyedia tidak diteruskan");
}
assert.equal(JSON.stringify(rejectedByProvider).includes("format-baru-tanpa-prefix-AIza"), false);

const malformed = await generateAIJson({ prompt: "x" }, {
  provider: "gemini", storage,
  fetchImpl: async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }), { status: 200 }),
});
assert.equal(malformed.ok, false);
if (!malformed.ok) assert.equal(malformed.failure, "malformed_response");

const timeout = await generateAIText({ prompt: "x" }, {
  provider: "gemini", storage, fetchImpl: async () => { throw new Error("network/timeout"); },
});
assert.equal(timeout.ok, false);
if (!timeout.ok) assert.equal(timeout.failure, "timeout");

const missing = await generateAIText({ prompt: "x" }, { storage: new MemoryStorage({}) });
assert.equal(missing.ok, false);
if (!missing.ok) assert.equal(missing.failure, "missing_key");

console.log("aiProvider: key isolation, header-only credentials, errors, timeout, JSON parsing PASS");
