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

// Key selalu header-only; tidak dirangkai ke URL, body, response, atau pesan error.
assert.match(provider, /"x-goog-api-key": apiKey/);
assert.match(provider, /`Bearer \$\{apiKey\}`/);
assert.doesNotMatch(provider, /\?key=|message:.*apiKey|body:.*apiKey/);

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

console.log("aiSecurity: browser-only keys, no GAS/server key path, no logs/URL, centralized providers/cache PASS");
