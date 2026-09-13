import {
  getProviderApiKey,
  getProviderModel,
  getSelectedProvider,
  missingProviderKeyMessage,
  saveProviderModel,
  type AIProvider,
  type StorageLike,
} from "./aiSettings.ts";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;

// Gemini dipanggil dengan alias "-latest": alias selalu menunjuk Flash stabil yang
// sedang berlaku, jadi model tidak ikut mati ketika versi bernomor dihentikan atau
// tidak tersedia untuk personal API key guru.
// ponytail: jalur Gemini memakai AI_MODELS.gemini[0] saja — daftar fallback berarti
// request tambahan saat 429, dan itu justru memperburuk batas kuota.
export const AI_MODELS = {
  // JANGAN ganti ke id bernomor lama. gemini-1.5-flash, gemini-1.5-pro, dan
  // gemini-2.0-flash sudah dihentikan dan membalas 404 untuk personal API key.
  // Urutan ini terbukti jalan pada tes koneksi: 2.5-flash sebagai model utama,
  // alias -latest sebagai cadangan bila versi bernomor sedang 404/503.
  // Test aiProvider.test.ts menolak id yang sudah mati — jangan ikut diubah agar
  // lolos, karena itu menghapus satu-satunya pagar yang mencegah 404 kembali.
  gemini: ["gemini-flash-latest", "gemini-2.5-flash"],
  groq: [
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ],
} as const;

export interface AISchema {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  properties?: Record<string, AISchema>;
  items?: AISchema;
  required?: string[];
  enum?: string[];
  propertyOrdering?: string[];
}

export interface AIRequest {
  systemInstruction?: string;
  prompt: string;
  schema?: AISchema;
  temperature?: number;
  maxOutputTokens?: number;
}

export type AIFailure =
  | "missing_key"
  | "invalid_key"
  | "rate_limited"
  | "timeout"
  | "client_error"
  | "server_error"
  | "empty_response"
  | "malformed_response"
  | "model_not_found";

export type AIResult<T> =
  | { ok: true; data: T; provider: AIProvider; model: string }
  | { ok: false; failure: AIFailure; message: string; provider: AIProvider };

function failure(provider: AIProvider, kind: AIFailure): AIResult<never> {
  const label = provider === "gemini" ? "Gemini" : "Groq";
  // Pesan untuk guru saja: status code, isi error penyedia, dan API key tidak
  // pernah masuk ke sini.
  const messages: Record<AIFailure, string> = {
    missing_key: missingProviderKeyMessage(provider),
    invalid_key: `API key ${label} tidak valid atau tidak memiliki akses. Periksa kembali API key Anda.`,
    rate_limited: `Kuota atau batas penggunaan ${label} sedang tercapai. Coba lagi beberapa saat atau gunakan provider AI lain.`,
    timeout: `${label} tidak dapat dihubungi. Periksa koneksi internet lalu coba lagi.`,
    client_error: "Permintaan AI tidak dapat diproses.",
    server_error: `${label} sedang mengalami gangguan. Coba lagi beberapa saat.`,
    empty_response: "Penyedia AI mengembalikan jawaban kosong.",
    model_not_found: `Model ${label} tidak tersedia untuk API key ini. Buka Pengaturan AI lalu jalankan "Tes koneksi" untuk mendeteksi model yang tersedia.`,
    malformed_response: "Respons AI tidak dapat diproses.",
  };
  return { ok: false, failure: kind, message: messages[kind], provider };
}

async function requestWithTimeout(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ===== DETEKSI MODEL =====
// Daftar hardcode selalu ketinggalan: model bernomor dihentikan, dan satu key
// belum tentu punya akses ke model yang key lain punya (404). Jadi model yang
// dipakai adalah model yang API-nya sendiri nyatakan tersedia untuk key guru,
// disimpan di browser lewat saveProviderModel(). AI_MODELS hanya cadangan bila
// deteksi belum pernah jalan.

/** Urutan preferensi: Flash alias → Flash bernomor → Flash apa pun → sisanya. */
function preferGeminiModel(models: readonly string[]): string | null {
  if (models.length === 0) return null;
  const byPreference = [
    (id: string) => id === "gemini-flash-latest",
    (id: string) => /^gemini-\d+(\.\d+)?-flash$/.test(id),
    (id: string) => id.includes("flash") && !id.includes("thinking"),
    () => true,
  ];
  for (const matches of byPreference) {
    const found = models.find(matches);
    if (found) return found;
  }
  return null;
}

/**
 * Tanya API model apa yang tersedia untuk key ini dan mendukung generateContent.
 * Dipakai tombol "Tes koneksi" di Pengaturan AI dan sebagai penyelamat saat
 * seluruh model kandidat membalas 404.
 */
export async function detectGeminiModel(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AIResult<string>> {
  const response = await requestWithTimeout(
    `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}&pageSize=200`,
    { method: "GET" },
    fetchImpl,
  );
  if (!response) return failure("gemini", "timeout");
  if (response.status === 401 || response.status === 403 || response.status === 400) {
    return failure("gemini", "invalid_key");
  }
  if (response.status === 429) return failure("gemini", "rate_limited");
  if (!response.ok) return failure("gemini", response.status >= 500 ? "server_error" : "client_error");

  let available: string[];
  try {
    const body = await response.json() as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    available = (body.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => String(m.name ?? "").replace(/^models\//, ""))
      .filter(Boolean);
  } catch {
    return failure("gemini", "malformed_response");
  }

  const picked = preferGeminiModel(available);
  if (!picked) return failure("gemini", "empty_response");
  return { ok: true, data: picked, provider: "gemini", model: picked };
}

/** Model tersimpan lebih dulu, lalu cadangan hardcode — tanpa duplikat. */
function geminiModelCandidates(storage?: StorageLike | null): string[] {
  const saved = getProviderModel("gemini", storage);
  return [...new Set([...(saved ? [saved] : []), ...AI_MODELS.gemini])];
}

async function callGemini(
  apiKey: string,
  request: AIRequest,
  fetchImpl: typeof fetch,
  storage?: StorageLike | null,
): Promise<AIResult<string>> {
  const first = await attemptGemini(apiKey, request, fetchImpl, geminiModelCandidates(storage));
  // Seluruh kandidat menjawab 404 = daftar model kita tidak cocok untuk key ini.
  // Sekali ini saja: tanya API model apa yang tersedia, simpan, lalu coba lagi.
  // Bukan retry membabi buta — hanya jalan pada 404, dan hanya satu putaran.
  if (!first.ok && first.failure === "model_not_found") {
    const detected = await detectGeminiModel(apiKey, fetchImpl);
    if (!detected.ok) return detected.failure === "empty_response"
      ? failure("gemini", "model_not_found")
      : detected;
    saveProviderModel("gemini", detected.data, storage);
    return attemptGemini(apiKey, request, fetchImpl, [detected.data]);
  }
  return first;
}

async function attemptGemini(
  apiKey: string,
  request: AIRequest,
  fetchImpl: typeof fetch,
  candidates: readonly string[],
): Promise<AIResult<string>> {
  // Model berikutnya hanya dicoba untuk kegagalan yang memang milik model itu:
  // 404 (model tidak tersedia untuk key ini) dan 5xx (model sedang kelebihan
  // beban, mis. 503). 429 TIDAK pernah pindah model — batas kuota berlaku per
  // key, jadi request tambahan hanya memperburuknya. Jumlah request maksimal =
  // panjang AI_MODELS.gemini, bukan retry tanpa batas.
  // Kesimpulan akhir dibuat deterministic: 5xx berarti model ada tapi sedang
  // bermasalah (guru cukup menunggu), sedangkan 404 di SEMUA kandidat berarti
  // daftar modelnya yang salah untuk key ini (pemicu deteksi model).
  let sawServerError = false;
  let sawModelNotFound = false;

  for (const model of candidates) {
    // Kirim key lewat query parameter — Google merekomendasikan ini untuk browser client.
    // CORS preflight untuk custom header kadang diblokir sehingga menghasilkan 404.
    const response = await requestWithTimeout(`${GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(request.systemInstruction
          ? { systemInstruction: { parts: [{ text: request.systemInstruction }] } }
          : {}),
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: request.maxOutputTokens ?? 1024,
          ...(request.schema
            ? { responseMimeType: "application/json", responseSchema: request.schema }
            : {}),
        },
      }),
    }, fetchImpl);

    if (!response) return failure("gemini", "timeout");
    // Sah atau tidaknya key hanya ditentukan di sini, bukan dari bentuk stringnya.
    // Gemini membalas 400 API_KEY_INVALID untuk key salah dan 403 untuk key tanpa akses.
    if (response.status === 401 || response.status === 403 || response.status === 400) {
      return failure("gemini", "invalid_key");
    }
    if (response.status === 429) return failure("gemini", "rate_limited");
    if (response.status === 404) {
      // Model tidak ada/tidak diizinkan untuk key ini — coba kandidat berikutnya.
      sawModelNotFound = true;
      continue;
    }
    if (response.status >= 500) {
      sawServerError = true;
      continue;
    }
    if (!response.ok) return failure("gemini", "client_error");
    try {
      const body = await response.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      return text
        ? { ok: true, data: text, provider: "gemini", model }
        : failure("gemini", "empty_response");
    } catch {
      return failure("gemini", "malformed_response");
    }
  }

  if (sawServerError) return failure("gemini", "server_error");
  return failure("gemini", sawModelNotFound ? "model_not_found" : "server_error");
}

async function callGroq(
  apiKey: string,
  request: AIRequest,
  fetchImpl: typeof fetch,
): Promise<AIResult<string>> {
  // response_format json_object ditolak Groq (400) bila tidak ada kata "json" di
  // pesan. Payload analisis kami memang JSON tapi kata itu belum tentu muncul,
  // jadi instruksinya ditambahkan di sini — satu tempat untuk semua pemanggil.
  const systemContent = request.schema
    ? `${request.systemInstruction ?? ""}

Balas hanya dengan satu objek JSON valid, tanpa teks lain.`.trim()
    : request.systemInstruction;

  let lastFailure: AIFailure = "server_error";
  for (const model of AI_MODELS.groq) {
    const response = await requestWithTimeout(GROQ_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemContent ? [{ role: "system", content: systemContent }] : []),
          { role: "user", content: request.prompt },
        ],
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxOutputTokens ?? 1024,
        ...(request.schema ? { response_format: { type: "json_object" } } : {}),
      }),
    }, fetchImpl);

    if (!response) return failure("groq", "timeout");
    if (response.status === 401 || response.status === 403) return failure("groq", "invalid_key");
    // 429 berhenti di sini: mencoba model berikutnya berarti request tambahan ke
    // endpoint yang justru sedang membatasi kita.
    if (response.status === 429) return failure("groq", "rate_limited");
    else if (response.status >= 500 || response.status === 404) lastFailure = "server_error";
    else if (!response.ok) return failure("groq", "client_error");
    else {
      try {
        const body = await response.json() as { choices?: { message?: { content?: string } }[] };
        const text = body.choices?.[0]?.message?.content?.trim() ?? "";
        return text
          ? { ok: true, data: text, provider: "groq", model }
          : failure("groq", "empty_response");
      } catch {
        return failure("groq", "malformed_response");
      }
    }
  }
  return failure("groq", lastFailure);
}

// ===== SINGLE-FLIGHT =====
// Satu aksi analisis = maksimal satu request aktif untuk isi yang sama. Klik ganda,
// dua komponen yang meminta analisis sama, atau re-render yang memanggil ulang
// semuanya ikut promise yang sedang berjalan — bukan menambah request baru ke
// penyedia yang kuotanya per menit.
//
// ponytail: satu Map di modul ini sudah cukup — seluruh pemanggil AI lewat sini,
// dan kunci dedupe berumur sependek request itu sendiri. Tidak perlu lock lintas
// tab atau infrastruktur server.
const inFlight = new Map<string, Promise<AIResult<string>>>();

/** Kunci dedupe: provider + isi request. Prompt identik = request yang sama. */
function requestKey(provider: AIProvider, request: AIRequest): string {
  return JSON.stringify([
    provider,
    request.systemInstruction ?? "",
    request.prompt,
    request.schema ?? null,
    request.temperature ?? null,
    request.maxOutputTokens ?? null,
  ]);
}

/** Jumlah request AI yang sedang berjalan. Dipakai test dan UI guard. */
export function inFlightCount(): number {
  return inFlight.size;
}

export async function generateAIText(
  request: AIRequest,
  options: {
    provider?: AIProvider;
    storage?: StorageLike | null;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<AIResult<string>> {
  const provider = options.provider ?? getSelectedProvider(options.storage);
  const apiKey = getProviderApiKey(provider, options.storage);
  if (!apiKey) return failure(provider, "missing_key");
  const fetchImpl = options.fetchImpl ?? fetch;

  const key = requestKey(provider, request);
  const running = inFlight.get(key);
  if (running) return running;

  // Provider yang dipilih guru dipakai apa adanya: tidak ada fallback diam-diam
  // Gemini → Groq, termasuk saat 429. Guru yang memilih provider di Pengaturan AI.
  const pending = (provider === "gemini"
    ? callGemini(apiKey, request, fetchImpl, options.storage)
    : callGroq(apiKey, request, fetchImpl)
  ).finally(() => { inFlight.delete(key); });

  inFlight.set(key, pending);
  return pending;
}

export async function generateAIJson<T>(
  request: AIRequest,
  options: Parameters<typeof generateAIText>[1] = {},
): Promise<AIResult<T>> {
  const response = await generateAIText(request, options);
  if (!response.ok) return response;
  try {
    return { ...response, data: JSON.parse(response.data) as T };
  } catch {
    return failure(response.provider, "malformed_response");
  }
}
