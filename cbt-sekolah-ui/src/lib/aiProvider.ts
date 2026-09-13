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

export const AI_MODELS = {
  gemini: ["gemini-2.5-flash"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
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
  const messages: Record<AIFailure, string> = {
    missing_key: missingProviderKeyMessage(provider),
    invalid_key: `API key ${provider === "gemini" ? "Gemini" : "Groq"} tidak valid atau tidak memiliki akses. Periksa kembali API key Anda.`,
    rate_limited: "Kuota AI sedang habis atau terlalu banyak permintaan. Coba lagi nanti.",
    timeout: "Penyedia AI tidak merespons tepat waktu. Coba lagi.",
    client_error: "Permintaan AI tidak dapat diproses.",
    server_error: "Layanan AI sedang bermasalah. Coba lagi nanti.",
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
  const model = AI_MODELS.gemini[0];
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
  if (response.status >= 500) return failure("gemini", "server_error");
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

async function callGroq(
  apiKey: string,
  request: AIRequest,
  fetchImpl: typeof fetch,
): Promise<AIResult<string>> {
  let lastFailure: AIFailure = "server_error";
  for (const model of AI_MODELS.groq) {
    const response = await requestWithTimeout(GROQ_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemInstruction
            ? [{ role: "system", content: request.systemInstruction }]
            : []),
          { role: "user", content: request.prompt },
        ],
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxOutputTokens ?? 1024,
        ...(request.schema ? { response_format: { type: "json_object" } } : {}),
      }),
    }, fetchImpl);

    if (!response) return failure("groq", "timeout");
    if (response.status === 401 || response.status === 403) return failure("groq", "invalid_key");
    if (response.status === 429) lastFailure = "rate_limited";
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
  return provider === "gemini"
    ? callGemini(apiKey, request, fetchImpl)
    : callGroq(apiKey, request, fetchImpl);
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
