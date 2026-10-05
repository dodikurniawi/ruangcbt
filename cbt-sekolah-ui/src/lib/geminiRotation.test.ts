// Rotasi multi API key Gemini.
//
// Business rule: guru tidak boleh berhenti membuat soal hanya karena SATU key
// kena kuota, selama masih ada key lain. Yang dijaga test ini:
//
//   1. Key berikutnya hanya dipakai bila kegagalannya memang milik key itu
//      (kuota, key tidak sah, timeout, gangguan sementara).
//   2. Kegagalan yang akan terulang di setiap key — payload salah, model tidak
//      tersedia — TIDAK pernah membuang kuota key lain.
//   3. Setiap key dicoba paling banyak SEKALI per request. Tidak ada retry
//      tanpa batas, dan tidak pernah kembali ke key yang sudah gagal.
//   4. API key tidak pernah muncul di pesan error maupun di hasil.
//
// Jalankan: node --experimental-strip-types src/lib/geminiRotation.test.ts

import assert from "node:assert/strict";
import { generateAIText } from "./aiProvider.ts";
import { AI_STORAGE_KEYS, getProviderApiKeys, type StorageLike } from "./aiSettings.ts";

class MemoryStorage implements StorageLike {
  private data: Record<string, string>;
  constructor(data: Record<string, string>) { this.data = data; }
  getItem(key: string) { return this.data[key] ?? null; }
  setItem(key: string, value: string) { this.data[key] = value; }
  removeItem(key: string) { delete this.data[key]; }
}

const K1 = "AIza-key-satu-bukan-asli";
const K2 = "AIza-key-dua-bukan-asli";
const K3 = "AIza-key-tiga-bukan-asli";

function storeWith(geminiValue: string, extra: Record<string, string> = {}) {
  return new MemoryStorage({
    [AI_STORAGE_KEYS.gemini]: geminiValue,
    [AI_STORAGE_KEYS.provider]: "gemini",
    // Model tersimpan dipakai apa adanya supaya satu key = satu request dan
    // hitungan request di bawah mengukur ROTASI, bukan kandidat model.
    [AI_STORAGE_KEYS.geminiModel]: "gemini-flash-latest",
    ...extra,
  });
}

/** Key dibaca dari header x-goog-api-key — satu-satunya tempat key Gemini dikirim. */
function keyOf(input: string | URL | Request, init?: RequestInit): string {
  for (const k of [K1, K2, K3]) assert.equal(String(input).includes(k), false, "key tidak boleh di URL");
  return (init?.headers as Record<string, string> | undefined)?.["x-goog-api-key"] ?? "";
}

const OK_BODY = JSON.stringify({ candidates: [{ content: { parts: [{ text: "hasil soal" }] } }] });

/**
 * fetch tiruan yang membalas per key. `seen` merekam urutan key yang dipakai,
 * jadi test dapat membuktikan key mana yang dicoba dan berapa kali.
 */
function fetchByKey(responses: Record<string, () => Response>, seen: string[]) {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const key = keyOf(input, init);
    seen.push(key);
    const reply = responses[key];
    assert.ok(reply, `key tak terduga dipakai: ${key.slice(0, 8)}...`);
    return reply();
  }) as unknown as typeof fetch;
}

const limited = () => new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }), { status: 429 });
const ok = () => new Response(OK_BODY, { status: 200 });
const overloaded = () => new Response("{}", { status: 503 });

// ── TEST 1: satu key sukses, key berikutnya tidak pernah dipanggil ─────────
{
  const seen: string[] = [];
  const result = await generateAIText({ prompt: "buat soal" }, {
    storage: storeWith(`${K1},${K2},${K3}`),
    fetchImpl: fetchByKey({ [K1]: ok, [K2]: ok, [K3]: ok }, seen),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(seen, [K1], "key 2 dan 3 tidak boleh ikut dipanggil");
  if (result.ok) {
    assert.equal(result.keyTrace?.keyLabel, "gemini-key-1");
    assert.equal(result.keyTrace?.rotated, false);
  }
}

// ── TEST 2: key 1 kena 429, key 2 sukses ───────────────────────────────────
{
  const seen: string[] = [];
  const result = await generateAIText({ prompt: "buat soal 2" }, {
    storage: storeWith(`${K1},${K2},${K3}`),
    fetchImpl: fetchByKey({ [K1]: limited, [K2]: ok, [K3]: ok }, seen),
  });
  assert.equal(result.ok, true, "429 pada key 1 tidak boleh menghentikan guru");
  assert.deepEqual(seen, [K1, K2]);
  if (result.ok) {
    assert.equal(result.keyTrace?.keyLabel, "gemini-key-2");
    assert.equal(result.keyTrace?.rotated, true);
  }
}

// ── TEST 3: key 1 dan 2 kena 429, key 3 sukses ─────────────────────────────
{
  const seen: string[] = [];
  const result = await generateAIText({ prompt: "buat soal 3" }, {
    storage: storeWith(`${K1},${K2},${K3}`),
    fetchImpl: fetchByKey({ [K1]: limited, [K2]: limited, [K3]: ok }, seen),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(seen, [K1, K2, K3]);
  if (result.ok) assert.equal(result.keyTrace?.keyLabel, "gemini-key-3");
}

// ── TEST 4 + 11: semua key 429 → error bersih, tanpa retry tanpa batas ─────
{
  const seen: string[] = [];
  const result = await generateAIText({ prompt: "buat soal 4" }, {
    storage: storeWith(`${K1},${K2},${K3}`),
    fetchImpl: fetchByKey({ [K1]: limited, [K2]: limited, [K3]: limited }, seen),
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure, "rate_limited");
    // Pesan untuk guru: tanpa status code, tanpa isi error penyedia, tanpa key.
    assert.doesNotMatch(result.message, /429|RESOURCE_EXHAUSTED|AIza/);
  }
  // Setiap key tepat sekali: tidak ada key yang dicoba dua kali.
  assert.deepEqual(seen, [K1, K2, K3], "setiap key maksimal satu kali per request");
  assert.equal(new Set(seen).size, seen.length, "tidak boleh kembali ke key yang sudah gagal");
}

// ── TEST 5: key 1 timeout (fetch gagal/abort), key 2 sukses ────────────────
{
  const seen: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const key = keyOf(input, init);
    seen.push(key);
    // requestWithTimeout menangkap throw apa pun dan melaporkannya sebagai timeout.
    if (key === K1) throw new Error("aborted");
    return new Response(OK_BODY, { status: 200 });
  }) as unknown as typeof fetch;

  const result = await generateAIText({ prompt: "buat soal 5" }, {
    storage: storeWith(`${K1},${K2}`), fetchImpl,
  });
  assert.equal(result.ok, true, "timeout satu key harus berpindah ke key berikutnya");
  assert.deepEqual(seen, [K1, K2]);
}

// Gangguan layanan (5xx) TIDAK memicu pindah key: "The model is overloaded"
// dijawab sama untuk setiap key, jadi memutar key hanya melipatgandakan request
// ke endpoint yang sedang kelebihan beban (2 model x N key) dan membakar kuota
// semua key sekaligus. Satu key dicoba (dua kandidat model), lalu berhenti.
{
  const seen: string[] = [];
  const result = await generateAIText({ prompt: "buat soal 5b" }, {
    storage: storeWith(`${K1},${K2}`),
    fetchImpl: fetchByKey({ [K1]: overloaded, [K2]: ok }, seen),
  });
  assert.equal(result.ok, false, "5xx berhenti di key pertama");
  if (!result.ok) assert.equal(result.failure, "server_error");
  assert.deepEqual([...new Set(seen)], [K1], "key kedua tidak ikut dibakar oleh 5xx");
  assert.equal(seen.length, 2, "hanya dua kandidat model pada satu key");
}

// ── TEST 6: permintaan/payload salah → JANGAN coba semua key ───────────────
{
  const seen: string[] = [];
  const invalidRequest = () => new Response(
    JSON.stringify({ error: { code: 400, status: "INVALID_ARGUMENT", message: "Invalid JSON payload received." } }),
    { status: 400 },
  );
  const result = await generateAIText({ prompt: "payload salah" }, {
    storage: storeWith(`${K1},${K2},${K3}`),
    fetchImpl: fetchByKey({ [K1]: invalidRequest, [K2]: ok, [K3]: ok }, seen),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure, "client_error");
  assert.deepEqual(seen, [K1], "payload salah akan gagal sama di setiap key");
}

// Sebaliknya: key yang memang tidak sah MILIK satu key, jadi rotasi tetap jalan.
{
  const seen: string[] = [];
  const badKey = () => new Response(
    JSON.stringify({ error: { code: 400, status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } }),
    { status: 400 },
  );
  const result = await generateAIText({ prompt: "key dicabut" }, {
    storage: storeWith(`${K1},${K2}`),
    fetchImpl: fetchByKey({ [K1]: badKey, [K2]: ok }, seen),
  });
  assert.equal(result.ok, true, "satu key mati tidak boleh mengunci key lain");
  assert.deepEqual(seen, [K1, K2]);
}

// 403 (key tanpa akses) juga key-specific.
{
  const seen: string[] = [];
  const result = await generateAIText({ prompt: "key tanpa akses" }, {
    storage: storeWith(`${K1},${K2}`),
    fetchImpl: fetchByKey({ [K1]: () => new Response("{}", { status: 403 }), [K2]: ok }, seen),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(seen, [K1, K2]);
}

// ── TEST 7: model tidak tersedia → JANGAN rotasi ke semua key ──────────────
// 404 untuk setiap model memicu deteksi model SEKALI (satu request GET ke daftar
// model). Jika API pun tidak menawarkan model yang bisa generateContent, hasilnya
// akan identik untuk key lain — jadi key 2 tidak boleh ikut dibakar.
{
  const seen: string[] = [];
  const urls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    urls.push(url);
    const key = keyOf(input, init);
    if (key === K2) {
      seen.push(key);
      return new Response(OK_BODY, { status: 200 });
    }
    seen.push(key);
    // Daftar model: kosong. generateContent: 404.
    return url.includes(":generateContent")
      ? new Response(JSON.stringify({ error: { status: "NOT_FOUND" } }), { status: 404 })
      : new Response(JSON.stringify({ models: [] }), { status: 200 });
  }) as unknown as typeof fetch;

  const result = await generateAIText({ prompt: "model tidak ada" }, {
    storage: storeWith(`${K1},${K2}`), fetchImpl,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure, "model_not_found");
  assert.ok(!seen.includes(K2), "masalah model tidak boleh membuang kuota key lain");
}

// Jawaban kosong dan jawaban rusak juga bukan milik satu key.
for (const [label, reply, expected] of [
  ["kosong", () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }), "empty_response"],
  ["rusak", () => new Response("bukan json", { status: 200 }), "malformed_response"],
] as const) {
  const seen: string[] = [];
  const result = await generateAIText({ prompt: `jawaban ${label}` }, {
    storage: storeWith(`${K1},${K2}`),
    fetchImpl: fetchByKey({ [K1]: reply, [K2]: ok }, seen),
  });
  assert.equal(result.ok, false, label);
  if (!result.ok) assert.equal(result.failure, expected, label);
  assert.deepEqual(seen, [K1], `jawaban ${label} tidak boleh memicu rotasi`);
}

// ── TEST 8: hanya satu key tersedia → perilaku lama persis ─────────────────
{
  const seen: string[] = [];
  const result = await generateAIText({ prompt: "satu key saja" }, {
    storage: storeWith(K1),
    fetchImpl: fetchByKey({ [K1]: limited }, seen),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure, "rate_limited");
  assert.deepEqual(seen, [K1], "429 dengan satu key tetap berhenti pada satu request");
}

// Tanpa key sama sekali: tidak ada request ke penyedia.
{
  let calls = 0;
  const result = await generateAIText({ prompt: "tanpa key" }, {
    storage: storeWith(""),
    fetchImpl: (async () => { calls++; return new Response("{}", { status: 200 }); }) as unknown as typeof fetch,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure, "missing_key");
  assert.equal(calls, 0);
}

// ── TEST 9: beberapa key dibaca, dalam urutan, tanpa duplikat ──────────────
{
  assert.deepEqual(getProviderApiKeys("gemini", storeWith(`${K1},${K2},${K3}`)), [K1, K2, K3]);
  // Pemisah lain yang wajar ikut diterima; spasi berlebih dirapikan.
  assert.deepEqual(getProviderApiKeys("gemini", storeWith(` ${K1} \n${K2} ; ${K3} `)), [K1, K2, K3]);
  // Key yang sama dua kali tidak boleh menghasilkan dua percobaan.
  assert.deepEqual(getProviderApiKeys("gemini", storeWith(`${K1},${K1},${K2}`)), [K1, K2]);
  assert.deepEqual(getProviderApiKeys("gemini", storeWith("")), []);
  // Key lama dari aplikasi pendahulu tetap terbaca, seluruhnya.
  assert.deepEqual(
    getProviderApiKeys("gemini", new MemoryStorage({ smartguru_gemini_keys: `${K2}\n${K3}` })),
    [K2, K3],
  );
}

// Groq tidak ikut berubah: satu key, satu Authorization header, tanpa rotasi.
{
  const groqKey = "gsk_bukan-asli";
  const seen: string[] = [];
  const result = await generateAIText({ prompt: "groq tetap" }, {
    provider: "groq",
    storage: new MemoryStorage({ [AI_STORAGE_KEYS.groq]: groqKey }),
    fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
      seen.push(String((init?.headers as Record<string, string>)?.Authorization ?? ""));
      return new Response(JSON.stringify({ choices: [{ message: { content: "hasil" } }] }), { status: 200 });
    }) as unknown as typeof fetch,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(seen, [`Bearer ${groqKey}`]);
}

// Groq 429 tetap berhenti — rotasi key adalah fitur Gemini saja.
{
  let calls = 0;
  const result = await generateAIText({ prompt: "groq kuota" }, {
    provider: "groq",
    storage: new MemoryStorage({ [AI_STORAGE_KEYS.groq]: `gsk_satu,gsk_dua` }),
    fetchImpl: (async () => { calls++; return new Response("{}", { status: 429 }); }) as unknown as typeof fetch,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure, "rate_limited");
  assert.equal(calls, 1, "Groq tidak ikut dirotasi");
}

// ── TEST 10: key tidak pernah muncul di hasil maupun pesan error ───────────
{
  for (const reply of [limited, () => new Response("{}", { status: 403 }), overloaded]) {
    const result = await generateAIText({ prompt: `bocor? ${Math.random()}` }, {
      storage: storeWith(`${K1},${K2},${K3}`),
      fetchImpl: fetchByKey({ [K1]: reply, [K2]: reply, [K3]: reply }, []),
    });
    const serialized = JSON.stringify(result);
    for (const key of [K1, K2, K3]) {
      assert.equal(serialized.includes(key), false, "API key tidak boleh ikut di hasil");
    }
    assert.match(serialized, /gemini-key-\d/, "hanya label anonim yang dibawa");
  }
}

// ── TEST 11 (lanjutan): batas atas request = jumlah key ────────────────────
{
  const keys = [K1, K2, K3];
  let calls = 0;
  await generateAIText({ prompt: "batas request" }, {
    storage: storeWith(keys.join(",")),
    fetchImpl: (async () => { calls++; return limited(); }) as unknown as typeof fetch,
  });
  assert.equal(calls, keys.length, "jumlah request tidak boleh melebihi jumlah key");
}

// ── TEST 12: hasil sukses tetap berbentuk sama seperti sebelumnya ──────────
// Pemanggil (generator soal, analisis, rekap cetak) membaca response.data apa
// adanya; rotasi tidak boleh mengubah kontrak itu.
{
  const result = await generateAIText({ prompt: "bentuk hasil" }, {
    storage: storeWith(`${K1},${K2}`),
    fetchImpl: fetchByKey({ [K1]: limited, [K2]: ok }, []),
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data, "hasil soal");
    assert.equal(result.provider, "gemini");
    assert.equal(result.model, "gemini-flash-latest");
  }
}

console.log("geminiRotation: sequential fallback, klasifikasi error, backward compat, tanpa kebocoran key PASS");
