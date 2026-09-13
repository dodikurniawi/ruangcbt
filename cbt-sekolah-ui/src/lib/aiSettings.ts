export type AIProvider = "gemini" | "groq";

export const AI_STORAGE_KEYS = {
  gemini: "ruangcbt_ai_gemini_api_key",
  groq: "ruangcbt_ai_groq_api_key",
  provider: "ruangcbt_ai_provider",
  // Model hasil deteksi per provider: id yang API-nya sendiri bilang tersedia
  // untuk key guru. Menghilangkan tebak-tebakan daftar model yang berakhir 404.
  geminiModel: "ruangcbt_ai_gemini_model",
  groqModel: "ruangcbt_ai_groq_model",
} as const;

export const LEGACY_GROQ_API_KEY = "groq_api_key";
export const AI_SETTINGS_CHANGED_EVENT = "ruangcbt-ai-settings-changed";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function emitChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AI_SETTINGS_CHANGED_EVENT));
}

/** Pindahkan key lama hanya setelah salinan baru terbukti tersimpan. */
export function migrateLegacyGroqKey(storage: StorageLike | null = browserStorage()): boolean {
  try {
    if (!storage || storage.getItem(AI_STORAGE_KEYS.groq)) return false;
    const legacy = storage.getItem(LEGACY_GROQ_API_KEY)?.trim();
    if (!legacy) return false;
    storage.setItem(AI_STORAGE_KEYS.groq, legacy);
    if (storage.getItem(AI_STORAGE_KEYS.groq) !== legacy) return false;
    storage.removeItem(LEGACY_GROQ_API_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getProviderApiKey(
  provider: AIProvider,
  storage: StorageLike | null = browserStorage(),
): string {
  if (!storage) return "";
  try {
    if (provider === "groq") migrateLegacyGroqKey(storage);
    const raw = storage.getItem(AI_STORAGE_KEYS[provider]);
    if (raw) {
      const firstLine = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l !== "");
      if (firstLine) return firstLine;
    }
    if (provider === "gemini") {
      for (const legacyKey of ["smartguru_gemini_keys", "edugen_gemini_api_key", "geminiApiKey", "geminiApiKeys"]) {
        const legacyVal = storage.getItem(legacyKey);
        if (legacyVal) {
          const firstLine = legacyVal.split(/\r?\n/).map((l) => l.trim()).find((l) => l !== "");
          if (firstLine) return firstLine;
        }
      }
    }
    return "";
  } catch {
    return "";
  }
}

export function getSelectedProvider(storage: StorageLike | null = browserStorage()): AIProvider {
  if (!storage) return "gemini";
  try {
    migrateLegacyGroqKey(storage);
    const saved = storage.getItem(AI_STORAGE_KEYS.provider);
    if (saved === "gemini" || saved === "groq") return saved;
    if (getProviderApiKey("gemini", storage)) return "gemini";
    if (getProviderApiKey("groq", storage)) return "groq";
  } catch { /* browser memblokir storage — gunakan default tanpa crash */ }
  return "gemini";
}

export function saveProviderApiKey(
  provider: AIProvider,
  apiKey: string,
  storage: StorageLike | null = browserStorage(),
): boolean {
  const value = apiKey.trim();
  if (!storage || !value) return false;
  try {
    storage.setItem(AI_STORAGE_KEYS[provider], value);
    const saved = storage.getItem(AI_STORAGE_KEYS[provider]) === value;
    if (saved) emitChanged();
    return saved;
  } catch {
    return false;
  }
}

export function deleteProviderApiKey(
  provider: AIProvider,
  storage: StorageLike | null = browserStorage(),
) {
  if (!storage) return;
  try {
    storage.removeItem(AI_STORAGE_KEYS[provider]);
    emitChanged();
  } catch { /* storage browser tidak tersedia */ }
}

export function saveSelectedProvider(
  provider: AIProvider,
  storage: StorageLike | null = browserStorage(),
) {
  if (!storage) return;
  try {
    storage.setItem(AI_STORAGE_KEYS.provider, provider);
    emitChanged();
  } catch { /* storage browser tidak tersedia */ }
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length < 9) return "••••••••";
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

/**
 * Satu-satunya validasi lokal untuk API key: tidak kosong setelah trim.
 *
 * API key adalah opaque credential. Prefix, panjang, dan karakternya milik
 * penyedia dan bisa berubah kapan pun, jadi RuangCBT tidak pernah memvalidasi
 * bentuknya — key yang sebenarnya valid tidak boleh ditolak di browser. Sah atau
 * tidak ditentukan penyedia saat key dipakai (lihat aiProvider.ts: 401/403 →
 * invalid_key).
 */
export function isNonEmptyApiKey(apiKey: string): boolean {
  return apiKey.trim() !== "";
}

const MODEL_STORAGE_KEY: Record<AIProvider, string> = {
  gemini: AI_STORAGE_KEYS.geminiModel,
  groq: AI_STORAGE_KEYS.groqModel,
};

/** Model tersimpan hasil deteksi. "" berarti belum pernah dideteksi. */
export function getProviderModel(
  provider: AIProvider,
  storage: StorageLike | null = browserStorage(),
): string {
  if (!storage) return "";
  try {
    return storage.getItem(MODEL_STORAGE_KEY[provider])?.trim() ?? "";
  } catch {
    return "";
  }
}

export function saveProviderModel(
  provider: AIProvider,
  model: string,
  storage: StorageLike | null = browserStorage(),
): boolean {
  const value = model.trim();
  if (!storage || !value) return false;
  try {
    storage.setItem(MODEL_STORAGE_KEY[provider], value);
    const saved = storage.getItem(MODEL_STORAGE_KEY[provider]) === value;
    if (saved) emitChanged();
    return saved;
  } catch {
    return false;
  }
}

export function missingProviderKeyMessage(provider: AIProvider): string {
  const label = provider === "gemini" ? "Gemini" : "Groq";
  return `API key ${label} belum diatur. Buka Pengaturan AI untuk menambahkannya.`;
}
