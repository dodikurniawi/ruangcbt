import assert from "node:assert/strict";
import {
  AI_STORAGE_KEYS, LEGACY_GROQ_API_KEY, deleteProviderApiKey, getProviderApiKey,
  getSelectedProvider, isNonEmptyApiKey, maskApiKey, migrateLegacyGroqKey, saveProviderApiKey,
  saveSelectedProvider, type StorageLike,
} from "./aiSettings.ts";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

const storage = new MemoryStorage();
assert.equal(getSelectedProvider(storage), "gemini");
assert.equal(saveProviderApiKey("groq", " gsk_test-only ", storage), true);
assert.equal(getProviderApiKey("groq", storage), "gsk_test-only");
assert.equal(getProviderApiKey("gemini", storage), "");
assert.equal(getSelectedProvider(storage), "groq");
assert.equal(saveProviderApiKey("gemini", "AIza-test-only", storage), true);
saveSelectedProvider("gemini", storage);
assert.equal(maskApiKey("AIza-123456789Kx2"), "AIza••••9Kx2");
deleteProviderApiKey("gemini", storage);
assert.equal(getProviderApiKey("gemini", storage), "");
assert.equal(getSelectedProvider(storage), "gemini", "provider pilihan tidak boleh diam-diam fallback");

const legacy = new MemoryStorage();
legacy.setItem(LEGACY_GROQ_API_KEY, "gsk_legacy");
assert.equal(migrateLegacyGroqKey(legacy), true);
assert.equal(legacy.getItem(AI_STORAGE_KEYS.groq), "gsk_legacy");
assert.equal(legacy.getItem(LEGACY_GROQ_API_KEY), null);

class FailingStorage extends MemoryStorage {
  override setItem() { throw new Error("quota"); }
}
const failing = new FailingStorage();
failing.data.set(LEGACY_GROQ_API_KEY, "gsk_keep-me");
assert.equal(migrateLegacyGroqKey(failing), false);
assert.equal(failing.getItem(LEGACY_GROQ_API_KEY), "gsk_keep-me");

assert.deepEqual([...storage.data.keys()].sort(), [AI_STORAGE_KEYS.groq, AI_STORAGE_KEYS.provider].sort());

// ── API key adalah opaque credential: TIDAK ada validasi format lokal ────────
// A/B/C/D — prefix, panjang, dan karakter apa pun diterima selama tidak kosong.
// Kalau kelak Gemini mengganti format key, RuangCBT tetap mencobanya.
for (const key of [
  "AIzaSyA-contoh-lama",                 // A — format yang berlaku hari ini
  "gemini_pk_v2_format_baru",            // B — prefix lain
  "x",                                   // C — pendek, tanpa pola
  "9f3b1c77-4d2e-4f0a-9c11-abcdef012345",// D — tanpa prefix AIza sama sekali
  "  key-dengan-spasi-di-tepi  ",
]) {
  assert.equal(isNonEmptyApiKey(key), true, `key opaque harus diterima: ${key.trim().slice(0, 4)}…`);
}

// E/F — hanya kosong dan whitespace yang ditolak.
assert.equal(isNonEmptyApiKey(""), false);
assert.equal(isNonEmptyApiKey("   "), false);
assert.equal(isNonEmptyApiKey("\t\n "), false);

// Penyimpanan mengikuti aturan yang sama: bentuk apa pun tersimpan, kosong tidak.
const opaque = new MemoryStorage();
assert.equal(saveProviderApiKey("gemini", "format-baru-tanpa-prefix", opaque), true);
assert.equal(getProviderApiKey("gemini", opaque), "format-baru-tanpa-prefix");
assert.equal(saveProviderApiKey("gemini", "   ", opaque), false);
assert.equal(getProviderApiKey("gemini", opaque), "format-baru-tanpa-prefix", "key lama tetap dipakai");

// Backward compatibility: key yang sudah tersimpan sebelumnya tetap terbaca apa adanya.
const existing = new MemoryStorage();
existing.setItem(AI_STORAGE_KEYS.gemini, "AIzaSy-key-lama-guru");
assert.equal(getProviderApiKey("gemini", existing), "AIzaSy-key-lama-guru");

// Multi-line key paste (mis. dari SmartGuru / Edugen) & fallback key legacy
const multiStorage = new MemoryStorage();
multiStorage.setItem(AI_STORAGE_KEYS.gemini, "  AIzaSyFirstKey  \n  AIzaSySecondKey  ");
assert.equal(getProviderApiKey("gemini", multiStorage), "AIzaSyFirstKey");

const legacyStorage = new MemoryStorage();
legacyStorage.setItem("smartguru_gemini_keys", "AIzaSySmartGuruKey\nAIzaSy2");
assert.equal(getProviderApiKey("gemini", legacyStorage), "AIzaSySmartGuruKey");

// H — masking dipakai untuk tampilan, bukan validasi: key pendek pun tidak ditolak,
// hanya disembunyikan seluruhnya.
assert.equal(maskApiKey("x"), "••••••••");

console.log("aiSettings: browser storage, selection, delete, mask, safe legacy migration, opaque API key PASS");
