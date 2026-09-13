// Task — mutation test: rusak satu perilaku, pastikan test biasa GAGAL (KILLED).
// Menyalin source asli ke file sementara, mengganti satu baris, lalu menjalankan
// pengecekan terekspektasi pada kode yang rusak. Baris yang tidak relevan tidak
// diubah, sehingga setiap kegagalan menunjuk ke satu perilaku.
// Jalankan: node --experimental-strip-types src/lib/mutation.test.ts
import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import * as XLSX from "xlsx";
import type { DocxBlock } from "./docx.ts";
import type { ParsedQuestion } from "./wordImport.ts";
import type { GooglePreviewQuestion } from "./googleForms.ts";
import type { GoogleTokenSession } from "./googleOAuth.ts";

const here = dirname(fileURLToPath(import.meta.url));

interface WordModule {
  parseQuestions: (blocks: DocxBlock[]) => { questions: ParsedQuestion[] };
  resolveImages: (questions: ParsedQuestion[], images: Map<string, { dataUrl: string; fileName: string; mimeType: string }>) => void;
  isReady: (q: ParsedQuestion) => boolean;
  buildImportPayload: (
    questions: ParsedQuestion[], startNomor: number, idMapel: string,
    uploadImage: (base64: string, mime: string, name: string) =>
      Promise<{ success: boolean; data?: { url?: string }; message?: string }>,
  ) => Promise<{ payload: { nomor_urut: number; gambar_url: string }[]; blockedByImages: number }>;
}

interface ExcelModule {
  parseExcelQuestions: (data: ArrayBuffer) => { questions: ParsedQuestion[] };
}

interface GoogleModule {
  mapGoogleForm: (form: unknown) => { questions: GooglePreviewQuestion[] };
  isGoogleQuestionReady: (question: GooglePreviewQuestion) => boolean;
  buildGoogleImportPayload: (
    questions: GooglePreviewQuestion[], startNomor: number, idMapel: string,
    copyImage: (url: string, sourceId: string) => Promise<string | null>,
  ) => Promise<{ payload: unknown[] }>;
}

interface AIProviderModule {
  generateAIText: (
    request: { prompt: string; systemInstruction?: string },
    options: {
      provider?: "gemini" | "groq";
      storage?: { getItem(key: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | null;
      fetchImpl?: typeof fetch;
    },
  ) => Promise<{ ok: boolean; failure?: string; message?: string; provider?: string }>;
}

interface AISettingsModule {
  isNonEmptyApiKey: (apiKey: string) => boolean;
}

interface GoogleOAuthModule {
  googleConnectionStatus: (configured: boolean, token: GoogleTokenSession | null) => Record<string, unknown>;
  validGoogleToken: (
    token: GoogleTokenSession | null, schoolId: string, subject: string,
    binding: string, nowSeconds: number,
  ) => boolean;
}

let optionCounter = 0;
function letters(texts: string[], boldMarks?: boolean[]): DocxBlock[] {
  return texts.map((text, i) => ({
    text,
    marker: { kind: "letter" as const, value: "ABCDE"[i], listId: `opts:${optionCounter++}` },
    hasImage: false, isTable: false, bold: boldMarks?.[i] ?? false, imageRelId: null,
  }));
}
function numbered(value: number, text: string, extra: Partial<DocxBlock> = {}): DocxBlock {
  return { text, marker: { kind: "number", value: String(value), listId: "qs:0" }, hasImage: false, isTable: false, bold: false, imageRelId: null, ...extra };
}
function plain(text: string): DocxBlock {
  return { text, marker: null, hasImage: false, isTable: false, bold: false, imageRelId: null };
}
const FIVE = ["Satu", "Dua", "Tiga", "Empat", "Lima"];

function xlsxBuffer(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Soal");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

/** Tulis mutant sementara, impor, pastikan `check` GAGAL pada perilaku rusak. */
async function expectKilled(
  label: string,
  source: string,
  find: string,
  replaceWith: string,
  check: (mod: WordModule | ExcelModule | GoogleModule | GoogleOAuthModule | AISettingsModule | AIProviderModule) => void | Promise<void>,
) {
  const mutated = source.replace(find, replaceWith);
  assert.notEqual(mutated, source, `anchor mutation ${label} tidak ditemukan di source`);
  const file = join(here, `.mutant_${label}_${Date.now()}_${Math.random().toString(36).slice(2)}.ts`);
  writeFileSync(file, mutated, "utf8");
  try {
    const mod = (await import(pathToFileURL(file).href)) as WordModule & ExcelModule & GoogleModule & GoogleOAuthModule & AISettingsModule & AIProviderModule;
    await assert.rejects(async () => { await check(mod); }, `mutation ${label} tidak terdeteksi`);
    console.log(`  KILLED  ${label}`);
  } finally {
    rmSync(file, { force: true });
  }
}

async function main() {
  console.log("mutation: mematikan 19 perilaku penting (Word 5, Excel 1, Google Form 6, API key opaque 4, request AI 3)");

  const wordSrc = readFileSync(join(here, "wordImport.ts"), "utf8");

  // Minimum SINGLE kembali dipaksa A-D: soal A-C harus membuat mutant gagal.
  await expectKilled("single-require-abcd", wordSrc,
    "OPTION_KEYS.slice(0, 3)", "OPTION_KEYS.slice(0, 4)",
    (m) => {
      const r = (m as WordModule).parseQuestions([
        numbered(1, "Tiga opsi"), ...letters(FIVE.slice(0, 3), [true, false, false]),
      ]);
      assert.equal((m as WordModule).isReady(r.questions[0]), true, "A-C harus tetap siap");
    });

  // 1. Kunci bold: hapus deteksi opsi tebal → kunci hilang, soal tersangkut PERLU DICEK.
  await expectKilled("bold-key", wordSrc,
    "kunci_jawaban = boldOptions[0].letter;", "kunci_jawaban = \"\";",
    (m) => {
      const r = (m as WordModule).parseQuestions([
        numbered(1, "Ibu kota Indonesia?"),
        ...letters(FIVE, [false, true, false, false, false]),
      ]);
      assert.equal(r.questions[0].kunci_jawaban, "B", "kunci dari pilihan tebal harus terbaca");
    });

  // 2. isReady: abaikan struktur-benar → soal bermasalah (gambar tak terbaca)
  //    tetap lolos "siap", meski kunci sudah jelas.
  await expectKilled("no-key-ready", wordSrc,
    "return question.issues.length === 0 &&",
    "return true &&",
    (m) => {
      const r = (m as WordModule).parseQuestions([
        numbered(1, "Gambar tak terbaca", { hasImage: true }),
        ...letters(FIVE),
        plain("KUNCI JAWABAN"),
        plain("1. B"),
      ]);
      assert.equal((m as WordModule).isReady(r.questions[0]), false, "soal bermasalah tidak siap meski kunci jelas");
    });

  // 3. Konflik kunci: hapus aturan konflik → kunci salah diambil paksa dari bagian kunci.
  await expectKilled("conflict-autopick", wordSrc,
    "kunci_jawaban = conflictBold ? \"\" : validSectionKey;", "kunci_jawaban = validSectionKey;",
    (m) => {
      const r = (m as WordModule).parseQuestions([
        numbered(1, "Soal konflik"),
        ...letters(FIVE, [false, true, false, false, false]),
        plain("KUNCI JAWABAN"),
        plain("1. D"),
      ]);
      assert.equal(r.questions[0].kunci_jawaban, "", "konflik tidak boleh dipilih otomatis");
    });

  // 4. Gambar: hapus pengunggahan → soal bergambar diimport tanpa gambarnya.
  await expectKilled("image-import", wordSrc,
    "gambar_url = res.data.url;", "gambar_url = \"\";",
    async (m) => {
      const mod = m as WordModule;
      const r = mod.parseQuestions([
        numbered(1, "Soal bergambar", { hasImage: true, imageRelId: "rId5" }),
        ...letters(FIVE),
        numbered(2, "Soal biasa"), ...letters(FIVE),
        plain("KUNCI JAWABAN"),
        plain("1. B 2. C"),
      ]);
      mod.resolveImages(r.questions, new Map([["rId5", { dataUrl: "data:image/png;base64,AA==", fileName: "gambar.png", mimeType: "image/png" }]]));
      const { payload } = await mod.buildImportPayload(r.questions, 10, "MAPEL_A",
        async (b64, mime, name) => ({ success: true, data: { url: `https://drive/${name}` } }));
      assert.equal(payload[0].gambar_url, "https://drive/gambar.png", "gambar harus ikut terimport");
    });

  const excelSrc = readFileSync(join(here, "excelImport.ts"), "utf8");

  // 5. Excel: abaikan kolom Jawaban → kunci semua kosong.
  await expectKilled("excel-jawaban", excelSrc,
    "const kunciRaw = cell(\"jawaban\");", "const kunciRaw = \"\";",
    (m) => {
      const buf = xlsxBuffer([
        ["No", "Soal", "A", "B", "C", "D", "E", "Jawaban", "Bobot"],
        [1, "Ibu kota Indonesia?", "Jakarta", "Bandung", "Surabaya", "Medan", "Jogja", "B", 1],
      ]);
      const { questions } = (m as ExcelModule).parseExcelQuestions(buf);
      assert.equal(questions[0].kunci_jawaban, "B", "kolom Jawaban di Excel harus terbaca");
    });

  const googleSrc = readFileSync(join(here, "googleForms.ts"), "utf8");
  const googleNoKey = {
    formId: "FORM_A",
    info: { title: "Form" },
    items: [{
      itemId: "item-1",
      title: "Soal tanpa kunci",
      questionItem: { question: {
        questionId: "question-1",
        choiceQuestion: { type: "RADIO", options: ["A", "B", "C", "D"].map((value) => ({ value })) },
      } },
    }],
  };

  // 6. Kunci Google hilang: mutant menebak A, padahal harus PERLU DICEK.
  await expectKilled("google-guess-key", googleSrc,
    'base.issues.push("Kunci jawaban belum tersedia. Soal akan ditandai PERLU DICEK.");',
    'base.kunci_jawaban = "A";',
    (m) => {
      const question = (m as GoogleModule).mapGoogleForm(googleNoKey).questions[0];
      assert.equal(question.kunci_jawaban, "", "kunci Google yang tidak tersedia tidak boleh ditebak");
    });

  // 7. CHECKBOX dipaksa menjadi SINGLE.
  await expectKilled("google-force-single", googleSrc,
    'if (type !== "RADIO" && type !== "DROP_DOWN") return unsupportedQuestion(item, nomor, sourceId);',
    'if (type !== "RADIO" && type !== "DROP_DOWN") return base;',
    (m) => {
      const checkbox = structuredClone(googleNoKey);
      checkbox.items[0].questionItem.question.choiceQuestion.type = "CHECKBOX";
      const question = (m as GoogleModule).mapGoogleForm(checkbox).questions[0];
      assert.equal(question.tipe, null, "tipe unsupported tidak boleh menjadi SINGLE");
    });

  // 8. READY mengabaikan kegagalan gambar.
  await expectKilled("google-image-ready", googleSrc,
    'question.issues.length === 0 &&',
    'true &&',
    (m) => {
      const question = (m as GoogleModule).mapGoogleForm(googleNoKey).questions[0];
      question.kunci_jawaban = "A";
      question.issues = ["Gambar tidak berhasil diambil."];
      assert.equal((m as GoogleModule).isGoogleQuestionReady(question), false, "gambar gagal harus memblokir import");
    });

  // 9. Filter invalid dihapus: soal tanpa kunci ikut payload.
  await expectKilled("google-invalid-import", googleSrc,
    'if (!isGoogleQuestionReady(question) || !question.tipe) continue;',
    'if (!question.tipe) continue;',
    async (m) => {
      const question = (m as GoogleModule).mapGoogleForm(googleNoKey).questions[0];
      const result = await (m as GoogleModule).buildGoogleImportPayload([question], 0, "MAPEL_A", async () => "");
      assert.equal(result.payload.length, 0, "soal Google invalid tidak boleh masuk import");
    });

  const oauthSrc = readFileSync(join(here, "googleOAuth.ts"), "utf8");
  const token: GoogleTokenSession = {
    version: 1,
    accessToken: "secret-google-token",
    schoolId: "tenant-a",
    subject: "admin",
    sessionBinding: "binding",
    expiresAt: 2_000_001_000,
  };

  // 10. Status client membocorkan access token.
  await expectKilled("google-token-leak", oauthSrc,
    'return { configured, connected: token !== null };',
    'return { configured, connected: token !== null, accessToken: token?.accessToken };',
    (m) => {
      const status = (m as GoogleOAuthModule).googleConnectionStatus(true, token);
      assert.equal(JSON.stringify(status).includes(token.accessToken), false, "token tidak boleh dikirim ke client");
    });

  // 11. Binding tenant dihapus.
  await expectKilled("google-tenant-binding", oauthSrc,
    'token.schoolId === schoolId &&',
    'true &&',
    (m) => {
      assert.equal(
        (m as GoogleOAuthModule).validGoogleToken(token, "tenant-b", "admin", "binding", 2_000_000_000),
        false,
        "token tenant A tidak boleh dipakai tenant B",
      );
    });

  // ── API key opaque: setiap validasi format yang kembali harus mati ──────────
  // API key adalah credential opaque. Empat mutant di bawah memasang kembali
  // asumsi format (prefix startsWith, regex ^AIza, panjang minimum, penolakan
  // non-AIza) dan semuanya harus terdeteksi: key valid berformat baru tidak boleh
  // pernah ditolak di browser.
  const settingsSrc = readFileSync(join(here, "aiSettings.ts"), "utf8");
  const NON_AIZA_KEY = "gemini_pk_v2_format_baru";
  const anchor = '  return apiKey.trim() !== "";';

  await expectKilled("apikey-prefix-startswith", settingsSrc,
    anchor, '  return apiKey.trim().startsWith("AIza");',
    (m) => {
      assert.equal((m as AISettingsModule).isNonEmptyApiKey(NON_AIZA_KEY), true,
        "key tanpa prefix AIza wajib diterima");
    });

  await expectKilled("apikey-prefix-regex", settingsSrc,
    anchor, '  return /^AIza/.test(apiKey.trim());',
    (m) => {
      assert.equal((m as AISettingsModule).isNonEmptyApiKey(NON_AIZA_KEY), true,
        "regex prefix tidak boleh jadi syarat");
    });

  await expectKilled("apikey-min-length", settingsSrc,
    anchor, '  return apiKey.trim().length >= 39;',
    (m) => {
      assert.equal((m as AISettingsModule).isNonEmptyApiKey("x"), true,
        "panjang key bukan Business Rule");
    });

  await expectKilled("apikey-reject-non-aiza", settingsSrc,
    anchor, ['  const v = apiKey.trim();', '  return v !== "" && !v.startsWith("gemini_");'].join("\n"),
    (m) => {
      assert.equal((m as AISettingsModule).isNonEmptyApiKey(NON_AIZA_KEY), true,
        "penolakan berbasis bentuk key harus mati");
      assert.equal((m as AISettingsModule).isNonEmptyApiKey(" "), false);
    });
  // ── Satu aksi guru = satu request AI; 429 berhenti ─────────────────────────
  const providerSrc = readFileSync(join(here, "aiProvider.ts"), "utf8");
  const keyStore = {
    data: { ruangcbt_ai_gemini_api_key: "key-gemini", ruangcbt_ai_groq_api_key: "key-groq", ruangcbt_ai_provider: "gemini" } as Record<string, string>,
    getItem(key: string) { return this.data[key] ?? null; },
    setItem(key: string, value: string) { this.data[key] = value; },
    removeItem(key: string) { delete this.data[key]; },
  };

  // 12. Guard single-flight dihapus → dua klik menghasilkan dua request.
  await expectKilled("ai-single-flight", providerSrc,
    "  if (running) return running;", "  if (false && running) return running;",
    async (m) => {
      let calls = 0;
      const releases: Array<() => void> = [];
      const slow = (async () => {
        calls++;
        await new Promise<void>((resolve) => { releases.push(resolve); });
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 });
      }) as unknown as typeof fetch;
      const provider = m as AIProviderModule;
      const first = provider.generateAIText({ prompt: "sama" }, { storage: keyStore, fetchImpl: slow });
      const second = provider.generateAIText({ prompt: "sama" }, { storage: keyStore, fetchImpl: slow });
      const observed = calls;
      releases.forEach((resolve) => resolve());
      await Promise.all([first, second]);
      assert.equal(observed, 1, "klik kedua tidak boleh menambah request penyedia");
    });

  // 13. Retry otomatis pada 429 → request tambahan ke endpoint yang membatasi.
  await expectKilled("ai-no-retry-on-429", providerSrc,
    '    if (response.status === 429) return failure("gemini", "rate_limited");',
    '    if (response.status === 429) { await requestWithTimeout(`${GEMINI_ENDPOINT}/${model}:generateContent`, { method: "POST" }, fetchImpl); return failure("gemini", "rate_limited"); }',
    async (m) => {
      let calls = 0;
      const limited = (async () => { calls++; return new Response("{}", { status: 429 }); }) as unknown as typeof fetch;
      await (m as AIProviderModule).generateAIText({ prompt: "kuota" }, { storage: keyStore, fetchImpl: limited });
      assert.equal(calls, 1, "429 wajib berhenti tanpa retry");
    });

  // 14. Fallback diam-diam Gemini → Groq saat 429.
  await expectKilled("ai-no-silent-fallback", providerSrc,
    '    if (response.status === 429) return failure("gemini", "rate_limited");',
    '    if (response.status === 429) return callGroq(apiKey, request, fetchImpl);',
    async (m) => {
      const urls: string[] = [];
      const limited = (async (input: string | URL | Request) => {
        urls.push(String(input));
        return new Response("{}", { status: 429 });
      }) as unknown as typeof fetch;
      await (m as AIProviderModule).generateAIText({ prompt: "kuota" }, { storage: keyStore, fetchImpl: limited });
      assert.ok(!urls.some((url) => url.includes("api.groq.com")), "429 Gemini tidak boleh pindah ke Groq diam-diam");
    });

}

await main();
