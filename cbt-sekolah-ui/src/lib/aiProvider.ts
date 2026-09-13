import {
  getProviderApiKey,
  getSelectedProvider,
  missingProviderKeyMessage,
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
  gemini: ["gemini-2.5-flash", "gemini-flash-latest"],
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
  | "malformed_response";

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

async function callGemini(
  apiKey: string,
  request: AIRequest,
  fetchImpl: typeof fetch,
): Promise<AIResult<string>> {
  // Model berikutnya hanya dicoba untuk kegagalan yang memang milik model itu:
  // 404 (model tidak tersedia untuk key ini) dan 5xx (model sedang kelebihan
  // beban, mis. 503). 429 TIDAK pernah pindah model — batas kuota berlaku per
  // key, jadi request tambahan hanya memperburuknya. Jumlah request maksimal =
  // panjang AI_MODELS.gemini, bukan retry tanpa batas.
  let lastFailure: AIFailure = "server_error";

  for (const model of AI_MODELS.gemini) {
    const response = await requestWithTimeout(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        ...(request.systemInstruction
          ? { systemInstruction: { parts: [{ text: request.systemInstruction }] } }
          : {}),
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: request.maxOutputTokens ?? 1024,
          // Flash 2.5 berpikir dulu dan token "thoughts" itu ikut memakan
          // maxOutputTokens. Untuk analisis terstruktur, budget habis di thinking
          // bisa membuat jawaban terpotong (finishReason MAX_TOKENS, parts kosong)
          // padahal request-nya sukses. Thinking dimatikan: tugasnya menafsirkan
          // angka yang sudah dihitung server, bukan menalar panjang.
          thinkingConfig: { thinkingBudget: 0 },
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
    if (response.status === 404 || response.status >= 500) {
      lastFailure = "server_error";
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

  return failure("gemini", lastFailure);
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
    ? callGemini(apiKey, request, fetchImpl)
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
