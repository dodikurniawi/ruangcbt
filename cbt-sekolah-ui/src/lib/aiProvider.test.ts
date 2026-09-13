import assert from "node:assert/strict";
import { AI_MODELS, generateAIJson, generateAIText, inFlightCount } from "./aiProvider.ts";
import { AI_STORAGE_KEYS, type StorageLike } from "./aiSettings.ts";
import { canRequestAiAnalysis } from "./learningAnalysis.ts";

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

// ── SINGLE-FLIGHT: satu aksi analisis = satu request penyedia ────────────────
{
  const flight = new MemoryStorage({
    [AI_STORAGE_KEYS.gemini]: geminiKey,
    [AI_STORAGE_KEYS.groq]: groqKey,
    [AI_STORAGE_KEYS.provider]: "gemini",
  });
  const request = { systemInstruction: "sys", prompt: "payload-siswa", schema: { type: "object" as const } };

  let calls = 0;
  let release: (() => void) | null = null;
  const slowFetch = (async () => {
    calls++;
    await new Promise<void>((resolve) => { release = resolve; });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
  }) as unknown as typeof fetch;

  // A — satu klik, satu request.
  const first = generateAIJson<{ ok: boolean }>(request, { storage: flight, fetchImpl: slowFetch });
  // B/C — klik kedua dan pemanggil concurrent lain ikut request yang sama.
  const second = generateAIJson<{ ok: boolean }>(request, { storage: flight, fetchImpl: slowFetch });
  const third = generateAIText(request, { storage: flight, fetchImpl: slowFetch });
  assert.equal(calls, 1, "dua klik berturut-turut tidak boleh menambah request penyedia");
  assert.equal(inFlightCount(), 1);

  (release as unknown as () => void)();
  const [a, b, c] = await Promise.all([first, second, third]);
  assert.equal(calls, 1);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(c.ok, true);
  assert.equal(inFlightCount(), 0, "kunci dedupe wajib dilepas setelah request selesai");

  // Request selanjutnya (mis. guru menekan "Analisis Ulang") tetap boleh jalan.
  await generateAIText(request, { storage: flight, fetchImpl: (async () => {
    calls++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  }) as unknown as typeof fetch });
  assert.equal(calls, 2, "setelah selesai, analisis ulang harus bisa mengirim request baru");

  // Prompt berbeda = analisis berbeda, tidak boleh ikut ter-dedupe.
  let otherCalls = 0;
  await Promise.all([
    generateAIText({ prompt: "siswa-A" }, { storage: flight, fetchImpl: (async () => {
      otherCalls++;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "x" }] } }] }), { status: 200 });
    }) as unknown as typeof fetch }),
    generateAIText({ prompt: "siswa-B" }, { storage: flight, fetchImpl: (async () => {
      otherCalls++;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "y" }] } }] }), { status: 200 });
    }) as unknown as typeof fetch }),
  ]);
  assert.equal(otherCalls, 2);
}

// ── E/F/K — 429 berhenti: tanpa retry, tanpa pindah provider diam-diam ───────
{
  const rate = new MemoryStorage({
    [AI_STORAGE_KEYS.gemini]: geminiKey,
    [AI_STORAGE_KEYS.groq]: groqKey,
    [AI_STORAGE_KEYS.provider]: "gemini",
  });

  const urls: string[] = [];
  const result = await generateAIText({ prompt: "kuota" }, {
    storage: rate,
    fetchImpl: (async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ error: { message: "Quota exceeded for quota metric" } }), { status: 429 });
    }) as unknown as typeof fetch,
  });

  assert.equal(urls.length, 1, "429 tidak boleh memicu retry otomatis");
  assert.ok(urls[0].includes("generativelanguage.googleapis.com"));
  assert.ok(!urls.some((url) => url.includes("api.groq.com")), "429 Gemini tidak boleh fallback diam-diam ke Groq");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure, "rate_limited");
    assert.equal(result.provider, "gemini");
    assert.equal(
      result.message,
      "Kuota atau batas penggunaan Gemini sedang tercapai. Coba lagi beberapa saat atau gunakan provider AI lain.",
    );
    // J — pesan tidak pernah memuat API key atau error mentah penyedia.
    assert.equal(result.message.includes(geminiKey), false);
    assert.equal(result.message.includes("quota metric"), false);
  }

  // Groq 429 juga berhenti, tidak lanjut ke model berikutnya.
  let groqCalls = 0;
  const groqRate = await generateAIText({ prompt: "kuota" }, {
    provider: "groq", storage: rate,
    fetchImpl: (async () => { groqCalls++; return new Response("{}", { status: 429 }); }) as unknown as typeof fetch,
  });
  assert.equal(groqCalls, 1, "429 Groq tidak boleh mencoba model berikutnya");
  assert.equal(groqRate.ok, false);
  if (!groqRate.ok) assert.equal(groqRate.failure, "rate_limited");
}

// ── G/H/I — pesan guru untuk 5xx, 401, dan timeout ──────────────────────────
{
  const storageG = new MemoryStorage({
    [AI_STORAGE_KEYS.gemini]: geminiKey,
    [AI_STORAGE_KEYS.provider]: "gemini",
  });
  const server = await generateAIText({ prompt: "5xx" }, {
    storage: storageG, fetchImpl: (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch,
  });
  assert.equal(server.ok, false);
  if (!server.ok) {
    assert.equal(server.failure, "server_error");
    assert.equal(server.message, "Gemini sedang mengalami gangguan. Coba lagi beberapa saat.");
  }

  const unauthorized = await generateAIText({ prompt: "401" }, {
    storage: storageG, fetchImpl: (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch,
  });
  assert.equal(unauthorized.ok, false);
  if (!unauthorized.ok) {
    assert.equal(unauthorized.failure, "invalid_key");
    assert.match(unauthorized.message, /tidak valid atau tidak memiliki akses/);
  }

  const offline = await generateAIText({ prompt: "timeout" }, {
    storage: storageG, fetchImpl: (async () => { throw new Error("Failed to fetch"); }) as unknown as typeof fetch,
  });
  assert.equal(offline.ok, false);
  if (!offline.ok) {
    assert.equal(offline.failure, "timeout");
    assert.equal(offline.message, "Gemini tidak dapat dihubungi. Periksa koneksi internet lalu coba lagi.");
  }
}

// ── L — Groq tetap bekerja bila guru memang memilihnya ──────────────────────
{
  const manual = new MemoryStorage({
    [AI_STORAGE_KEYS.groq]: groqKey,
    [AI_STORAGE_KEYS.provider]: "groq",
  });
  let groqUrl = "";
  const res = await generateAIText({ prompt: "pilih groq" }, {
    storage: manual,
    fetchImpl: (async (input: string | URL | Request) => {
      groqUrl = String(input);
      return new Response(JSON.stringify({ choices: [{ message: { content: "hasil groq" } }] }), { status: 200 });
    }) as unknown as typeof fetch,
  });
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.provider, "groq");
    assert.equal(res.data, "hasil groq");
  }
  assert.ok(groqUrl.includes("api.groq.com"));
}

// ── D — cache hit dan guard lain tidak pernah memicu request penyedia ───────
{
  const below = {
    score: 62,
    kkm: 70,
    categories: [
      { name: "Pecahan", correct: 2, total: 8, earnedScore: 2, maxScore: 8, accuracy: 25 },
    ],
  };
  assert.equal(canRequestAiAnalysis(below), true);
  assert.equal(canRequestAiAnalysis(below, { cached: { analysis: {} } }), false, "cache hit = nol request AI");
  assert.equal(canRequestAiAnalysis(below, { isRunning: true }), false, "request berjalan = tidak ada request kedua");
  assert.equal(canRequestAiAnalysis({ ...below, score: 85 }), false, "nilai >= KKM tidak memanggil AI");
  assert.equal(canRequestAiAnalysis({ ...below, categories: [] }), false, "tanpa kategori tidak memanggil AI");
  assert.equal(canRequestAiAnalysis(null), false);
}

// ── Model: alias Gemini + tidak ada model Groq yang sudah dimatikan ─────────
{
  assert.deepEqual([...AI_MODELS.gemini], ["gemini-2.5-flash", "gemini-flash-latest"]);
  for (const retired of ["gemini-1.5-flash", "gemini-2.0-flash"]) {
    assert.ok(!AI_MODELS.gemini.includes(retired as never), `${retired} membalas 404, jangan dipakai`);
  }
  for (const retired of ["mixtral-8x7b-32768", "gemma2-9b-it"]) {
    assert.ok(!AI_MODELS.groq.includes(retired as never), `${retired} sudah decommissioned di Groq`);
  }

  // URL Gemini memakai model dari daftar itu, bukan id lain yang ditulis manual.
  let geminiUrl = "";
  await generateAIText({ prompt: "cek model" }, {
    provider: "gemini",
    storage: new MemoryStorage({ [AI_STORAGE_KEYS.gemini]: geminiKey }),
    fetchImpl: (async (input: string | URL | Request) => {
      geminiUrl = String(input);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 });
    }) as unknown as typeof fetch,
  });
  assert.ok(geminiUrl.endsWith(`/${AI_MODELS.gemini[0]}:generateContent`), geminiUrl);
}

// ── Groq + response_format json_object wajib menyebut "json" di pesan ───────
{
  let sentBody = "";
  await generateAIJson<unknown>({
    systemInstruction: "Analisis hasil ujian.",
    prompt: JSON.stringify({ score: 62, kkm: 70 }),
    schema: { type: "object" },
  }, {
    provider: "groq",
    storage: new MemoryStorage({ [AI_STORAGE_KEYS.groq]: groqKey }),
    fetchImpl: (async (_input: string | URL | Request, init?: RequestInit) => {
      sentBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
    }) as unknown as typeof fetch,
  });
  const parsed = JSON.parse(sentBody) as {
    response_format?: { type: string };
    messages: { role: string; content: string }[];
  };
  assert.equal(parsed.response_format?.type, "json_object");
  assert.ok(
    parsed.messages.some((m) => /json/i.test(m.content)),
    "Groq menolak json_object (400) bila tidak ada kata json di pesan",
  );
  assert.ok(parsed.messages.some((m) => m.role === "system" && m.content.includes("Analisis hasil ujian.")));
}

// ── 503/404 Gemini: pindah model sekali, 429 tetap satu request ─────────────
{
  const storage503 = new MemoryStorage({
    [AI_STORAGE_KEYS.gemini]: geminiKey,
    [AI_STORAGE_KEYS.provider]: "gemini",
  });

  // 503 pada model pertama → model berikutnya dicoba, lalu berhenti. Jumlah
  // request tidak pernah melebihi panjang daftar model.
  const tried: string[] = [];
  const overloaded = await generateAIText({ prompt: "503-semua" }, {
    storage: storage503,
    fetchImpl: (async (input: string | URL | Request) => {
      tried.push(String(input));
      return new Response(JSON.stringify({ error: { message: "The model is overloaded" } }), { status: 503 });
    }) as unknown as typeof fetch,
  });
  assert.equal(tried.length, AI_MODELS.gemini.length, "request tidak boleh melebihi jumlah model");
  assert.equal(overloaded.ok, false);
  if (!overloaded.ok) {
    assert.equal(overloaded.failure, "server_error");
    assert.equal(overloaded.message, "Gemini sedang mengalami gangguan. Coba lagi beberapa saat.");
    assert.equal(overloaded.message.includes("overloaded"), false);
  }

  // 503 pada model pertama, model kedua sukses → guru dapat hasil.
  if (AI_MODELS.gemini.length > 1) {
    let attempt = 0;
    const recovered = await generateAIText({ prompt: "503-lalu-sukses" }, {
      storage: storage503,
      fetchImpl: (async () => {
        attempt++;
        return attempt === 1
          ? new Response("{}", { status: 503 })
          : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "hasil" }] } }] }), { status: 200 });
      }) as unknown as typeof fetch,
    });
    assert.equal(recovered.ok, true);
    if (recovered.ok) assert.equal(recovered.model, AI_MODELS.gemini[1]);
    assert.equal(attempt, 2);
  }

  // 429 tidak pernah pindah model: batas kuota berlaku per key.
  let quotaCalls = 0;
  const limited = await generateAIText({ prompt: "429-tidak-pindah-model" }, {
    storage: storage503,
    fetchImpl: (async () => { quotaCalls++; return new Response("{}", { status: 429 }); }) as unknown as typeof fetch,
  });
  assert.equal(quotaCalls, 1, "429 wajib berhenti di model pertama");
  assert.equal(limited.ok, false);
  if (!limited.ok) assert.equal(limited.failure, "rate_limited");

  // 401 juga berhenti langsung — mengulang dengan model lain tidak mengubah apa pun.
  let authCalls = 0;
  await generateAIText({ prompt: "401-berhenti" }, {
    storage: storage503,
    fetchImpl: (async () => { authCalls++; return new Response("{}", { status: 401 }); }) as unknown as typeof fetch,
  });
  assert.equal(authCalls, 1);
}

// ── Thinking dimatikan: token thoughts tidak boleh menghabiskan output budget ──
{
  let body = "";
  const res = await generateAIJson<{ ok: boolean }>({
    prompt: "payload",
    schema: { type: "object" },
  }, {
    provider: "gemini",
    storage: new MemoryStorage({ [AI_STORAGE_KEYS.gemini]: geminiKey }),
    fetchImpl: (async (_input: string | URL | Request, init?: RequestInit) => {
      body = String(init?.body ?? "");
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
    }) as unknown as typeof fetch,
  });
  assert.equal(res.ok, true);
  const parsed = JSON.parse(body) as {
    generationConfig: { thinkingConfig?: { thinkingBudget?: number }; maxOutputTokens?: number };
  };
  assert.equal(parsed.generationConfig.thinkingConfig?.thinkingBudget, 0);
  assert.equal(parsed.generationConfig.maxOutputTokens, 1024);

  // Jawaban terpotong (parts kosong) tetap jadi pesan guru, bukan hasil palsu.
  const truncated = await generateAIText({ prompt: "x" }, {
    provider: "gemini",
    storage: new MemoryStorage({ [AI_STORAGE_KEYS.gemini]: geminiKey }),
    fetchImpl: (async () => new Response(
      JSON.stringify({ candidates: [{ content: { role: "model" }, finishReason: "MAX_TOKENS" }] }),
      { status: 200 },
    )) as unknown as typeof fetch,
  });
  assert.equal(truncated.ok, false);
  if (!truncated.ok) assert.equal(truncated.failure, "empty_response");
}

console.log("aiProvider: key isolation, header-only credentials, errors, timeout, JSON parsing, single-flight, 429 stop PASS");
