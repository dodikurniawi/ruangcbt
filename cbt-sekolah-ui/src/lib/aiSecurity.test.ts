import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const settings = read("src/lib/aiSettings.ts");
const provider = read("src/lib/aiProvider.ts");
const endpoint = read("src/lib/aiAnalysis.ts");
const gas = read("../backend-script/code.gs");
const settingsUi = read("src/components/admin/AISettingsPanel.tsx");
const analysisPage = read("src/app/admin/analisis/page.tsx");
const questionsPage = read("src/app/admin/questions/page.tsx");
const resultPanel = read("src/components/admin/HasilBelajarPanel.tsx");
const printPage = read("src/app/admin/cetak/page.tsx");

assert.match(settings, /ruangcbt_ai_gemini_api_key/);
assert.match(settings, /ruangcbt_ai_groq_api_key/);
assert.doesNotMatch(gas, /ruangcbt_ai_(gemini|groq)_api_key|GEMINI_API_KEY/);
assert.doesNotMatch(endpoint, /apiKey|x-goog-api-key|Authorization|generateAI/);
assert.doesNotMatch(provider, /console\.(log|error)|NEXT_PUBLIC_|searchParams/);
assert.doesNotMatch(settings, /cookie|sessionStorage|fetch\(/);

// Key dikirim lewat query param (?key=...) untuk menghindari blokir CORS preflight header;
// tidak pernah muncul di body request, respons, atau pesan error.
assert.match(provider, /generateContent\?key=/);
assert.doesNotMatch(provider, /x-goog-api-key/);
assert.doesNotMatch(provider, /message:.*apiKey|body:.*apiKey/);

// Show/hide hanya mengganti tipe input; save/delete punya handler eksplisit terpisah.
assert.match(settingsUi, /type=\{visible\[provider\.id\] \? "text" : "password"\}/);
assert.match(settingsUi, /setVisible\(\(p\)/);
assert.match(settingsUi, /onClick=\{\(\) => save\(provider\.id\)\}/);
assert.match(settingsUi, /onClick=\{\(\) => remove\(provider\.id\)\}/);
assert.doesNotMatch(settingsUi, /defaultValue=.*getProviderApiKey/);

for (const source of [analysisPage, questionsPage, resultPanel, printPage]) {
  assert.match(source, /generateAI(Text|Json)/, "semua fitur AI harus memakai provider bersama");
  assert.doesNotMatch(source, /localStorage\.getItem\("groq_api_key"\)|Konfigurasi Groq API Key/);
}
assert.match(analysisPage, /\$\{LS_CACHE\}:\$\{schoolId\}:\$\{provider\}/);
assert.match(analysisPage, /questionSourceHash/);
assert.match(resultPanel, /\$\{CACHE_PREFIX\}:\$\{schoolId\}:\$\{provider\}:\$\{idSiswa\}:\$\{resultHash\}/);

// ── Single-flight & 429: invariant yang tidak boleh hilang dari source ──────
// Satu aksi guru = satu request aktif; 429 berhenti, tidak di-retry, dan tidak
// pindah provider diam-diam.
assert.match(provider, /const inFlight = new Map<string, Promise<AIResult<string>>>\(\)/);
assert.match(provider, /if \(running\) return running;/);
assert.match(provider, /inFlight\.delete\(key\)/);
// Tidak ada loop retry / penjadwalan ulang request di jalur provider.
assert.doesNotMatch(provider, /setTimeout\([^)]*retry|for \(let attempt|while \(attempt|retries|backoff/i);
// 429 mengembalikan kegagalan, bukan lanjut ke model/provider berikutnya.
assert.match(provider, /if \(response\.status === 429\) return failure\("groq", "rate_limited"\)/);
assert.match(provider, /if \(response\.status === 429\) return failure\("gemini", "rate_limited"\)/);
// Pemilihan provider hanya dari pilihan guru; tidak ada percabangan "coba yang lain".
assert.doesNotMatch(provider, /callGroq\(apiKey, request, fetchImpl\)[\s\S]{0,120}callGemini\(apiKey, request, fetchImpl\)[\s\S]{0,40}\|\|/);

// AI hanya dipanggil dari handler tombol, tidak pernah otomatis dari effect atau
// SWR: membuka halaman Analisis tidak memakai kuota guru.
for (const [label, source] of [["panel hasil belajar", resultPanel], ["rekap cetak", printPage]] as const) {
  // Potongan setelah tiap "useEffect(" sampai penutup dependency array-nya.
  const effects = source.split("useEffect(").slice(1)
    .map((chunk) => chunk.slice(0, chunk.indexOf("]);") + 3));
  assert.ok(effects.length > 0, "source wajib punya useEffect untuk diperiksa");
  for (const effect of effects) {
    assert.doesNotMatch(effect, /generateAI/, `${label}: effect tidak boleh memanggil AI`);
  }
  assert.doesNotMatch(source, /useSWR\([^)]*generateAI/, `${label}: SWR tidak boleh memanggil AI`);
}
assert.match(resultPanel, /canRequestAiAnalysis\(stats, \{ isRunning: isAnalyzing \}\)/);
// Batch analisis butir soal: tombol terkunci saat berjalan dan berhenti di 429.
assert.match(analysisPage, /if \(isBatchAnalyzing\) return;/);
assert.match(analysisPage, /disabled=\{isBatchAnalyzing \|\|/);
assert.match(analysisPage, /failureKind === "rate_limited"/);

console.log("aiSecurity: browser-only keys, no GAS/server key path, no logs/URL, centralized providers/cache, single-flight & 429 stop PASS");
