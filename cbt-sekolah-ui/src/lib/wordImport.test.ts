// Task 5.3 — parser soal Word.
// Fixture berasal dari struktur dokumen nyata "Sosiologi_Kelas X_ASAS Genap":
// nomor soal dan opsi A–E memakai penomoran otomatis Word (DocxBlock.marker),
// pertanyaan berlanjut di paragraf tanpa nomor, sebagian soal memuat daftar
// bernomor di dalam pertanyaannya, dan ada soal yang opsinya diketik manual.
// Jalankan: node --experimental-strip-types src/lib/wordImport.test.ts
import assert from "node:assert/strict";
import type { DocxBlock } from "./docx.ts";
import { isReady, parseQuestions, statusReasons } from "./wordImport.ts";

const QUESTION_LIST = "28:0";
const INSTRUCTION_LIST = "1:0";
let optionListCounter = 0;

function plain(text: string, extra: Partial<DocxBlock> = {}): DocxBlock {
  return { text, marker: null, hasImage: false, isTable: false, ...extra };
}
function numbered(value: number, text: string, listId = QUESTION_LIST, extra: Partial<DocxBlock> = {}): DocxBlock {
  return { text, marker: { kind: "number", value: String(value), listId }, hasImage: false, isTable: false, ...extra };
}
/** Lima opsi A–E dengan daftar Word sendiri, persis seperti dokumen aslinya. */
function options(texts: string[], extra: Partial<DocxBlock> = {}): DocxBlock[] {
  const listId = `opt${optionListCounter++}:0`;
  return texts.map((text, index) => ({
    text,
    marker: { kind: "letter" as const, value: "ABCDE"[index], listId },
    hasImage: false,
    isTable: false,
    ...extra,
  }));
}
const FIVE = ["Pilihan satu", "Pilihan dua", "Pilihan tiga", "Pilihan empat", "Pilihan lima"];

// Kop dokumen nyata: judul, identitas ujian, lalu petunjuk bernomor tanpa opsi.
const HEADER: DocxBlock[] = [
  plain("NASKAH SOAL SUMATIF AKHIR SEMESTER GENAP"),
  plain("Mata Pelajaran : SOSIOLOGI Hari / Tanggal : …./… 2026"),
  plain("Kelas : X/E Waktu : 120 Menit"),
  plain("Petunjuk Umum"),
  numbered(1, "Tuliskan nama dan nomor tes anda pada lembar jawaban", INSTRUCTION_LIST),
  numbered(2, "Kerjakan soal yang dianggap mudah terlebih dahulu", INSTRUCTION_LIST),
];

// ── A. Satu soal ────────────────────────────────────────────────────────────
{
  const result = parseQuestions([numbered(1, "Apa ibu kota Indonesia?"), ...options(FIVE)]);
  assert.equal(result.questions.length, 1);
  const q = result.questions[0];
  assert.equal(q.nomor_urut, 1);
  assert.equal(q.pertanyaan, "Apa ibu kota Indonesia?");
  assert.equal(q.opsi_a, "Pilihan satu");
  assert.equal(q.opsi_e, "Pilihan lima");
  assert.equal(q.issues.length, 0, q.issues.join("|"));
  assert.equal(q.kunci_jawaban, "", "tanpa bagian kunci, jawaban tidak boleh ditebak");
  assert.equal(isReady(q), false, "soal tanpa kunci belum siap diimport");
  assert.deepEqual(statusReasons(q), ["Kunci jawaban belum diisi"]);
}

// ── B. Banyak soal + petunjuk tidak ikut terbaca sebagai soal ───────────────
{
  const result = parseQuestions([
    ...HEADER,
    numbered(1, "Soal pertama"), ...options(FIVE),
    numbered(2, "Soal kedua"), ...options(FIVE),
    numbered(3, "Soal ketiga"), ...options(FIVE),
  ]);
  assert.equal(result.questions.length, 3);
  assert.deepEqual(result.questions.map((q) => q.pertanyaan), ["Soal pertama", "Soal kedua", "Soal ketiga"]);
  assert.equal(result.detectedMapel, "SOSIOLOGI", "mapel dokumen hanya dibaca sebagai saran");
  assert.ok(result.skippedBlocks >= 1, "petunjuk bernomor dilaporkan sebagai bagian yang dilewati");
}

// ── C. Pertanyaan multi-paragraf tetap satu soal ────────────────────────────
{
  const result = parseQuestions([
    numbered(1, "Perhatikan data berikut."),
    plain("Data tersebut menunjukkan bahwa..."),
    plain("hal ini terjadi karena..."),
    ...options(FIVE),
  ]);
  assert.equal(result.questions.length, 1);
  assert.equal(
    result.questions[0].pertanyaan,
    "Perhatikan data berikut. Data tersebut menunjukkan bahwa... hal ini terjadi karena...",
  );
}

// ── C2. Daftar bernomor di dalam pertanyaan tidak memecah soal ──────────────
{
  const result = parseQuestions([
    numbered(1, "Perhatikan pernyataan berikut."),
    numbered(1, "Pernyataan pertama", "sub9:0"),
    numbered(2, "Pernyataan kedua", "sub9:0"),
    numbered(3, "Pernyataan ketiga", "sub9:0"),
    plain("Pernyataan yang benar adalah ...."),
    ...options(FIVE),
    numbered(2, "Soal berikutnya"), ...options(FIVE),
  ]);
  assert.equal(result.questions.length, 2, "daftar di dalam pertanyaan bukan soal baru");
  assert.match(result.questions[0].pertanyaan, /1\) Pernyataan pertama 2\) Pernyataan kedua/);
  assert.equal(result.questions[0].issues.length, 0);
}

// ── D. Opsi multi-baris (lanjutan opsi terakhir mengakhiri soal) ────────────
{
  const opts = options(FIVE);
  const result = parseQuestions([
    numbered(1, "Soal satu"), ...opts,
    numbered(2, "Soal dua"), ...options(FIVE),
  ]);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[1].opsi_c, "Pilihan tiga");
}

// ── E. Lengkap A–E → tidak ada keluhan struktur ─────────────────────────────
{
  const q = parseQuestions([numbered(7, "Soal lengkap"), ...options(FIVE)]).questions[0];
  assert.equal(q.issues.length, 0);
  assert.equal(q.nomor_urut, 7, "nomor dokumen dipertahankan untuk pencocokan kunci");
}

// ── F. Opsi E hilang → PERLU DICEK, bukan diimport diam-diam ────────────────
{
  const q = parseQuestions([numbered(1, "Soal tanpa E"), ...options(FIVE.slice(0, 4))]).questions[0];
  assert.equal(q.opsi_e, "");
  assert.ok(q.issues.some((issue) => /Opsi E tidak ditemukan/.test(issue)), q.issues.join("|"));
  assert.equal(isReady(q), false);
}

// ── G. Nomor ambigu: paragraf bernomor tanpa opsi bukan soal ────────────────
{
  const result = parseQuestions([
    numbered(1, "Daftar tanpa opsi", INSTRUCTION_LIST),
    numbered(2, "Daftar lain tanpa opsi", INSTRUCTION_LIST),
  ]);
  assert.equal(result.questions.length, 0, "tidak boleh mengarang soal dari daftar biasa");
  assert.equal(result.skippedBlocks, 1);
}

// ── H. Angka di dalam pertanyaan bukan nomor soal ───────────────────────────
{
  const result = parseQuestions([
    plain("1. Pada tahun 2025, terjadi perubahan sosial di berbagai daerah."),
    plain("2025 menjadi titik balik. Perubahan itu disebut ...."),
    plain("A. Pilihan satu"), plain("B. Pilihan dua"), plain("C. Pilihan tiga"),
    plain("D. Pilihan empat"), plain("E. Pilihan lima"),
  ]);
  assert.equal(result.questions.length, 1, "hanya nomor di awal paragraf yang dihitung");
  const q = result.questions[0];
  assert.match(q.pertanyaan, /^Pada tahun 2025/);
  assert.match(q.pertanyaan, /2025 menjadi titik balik/);
  assert.equal(q.issues.length, 0);
  assert.equal(q.opsi_a, "Pilihan satu");
}

// ── I. Huruf A–E di dalam kalimat bukan opsi ────────────────────────────────
{
  const result = parseQuestions([
    numbered(1, "Menurut A dan B, perubahan sosial terjadi karena faktor internal."),
    plain("Pendapat A tersebut didukung oleh data berikut."),
    ...options(FIVE),
  ]);
  const q = result.questions[0];
  assert.equal(q.opsi_a, "Pilihan satu", "kalimat berawalan huruf tanpa pemisah bukan opsi");
  assert.match(q.pertanyaan, /Menurut A dan B/);
  assert.match(q.pertanyaan, /Pendapat A tersebut/);
  assert.equal(q.issues.length, 0);
}

// ── J/K. Kunci jawaban: tanpa bagian kunci vs bagian kunci yang sah ─────────
{
  const withoutKey = parseQuestions([numbered(1, "Soal"), ...options(FIVE)]);
  assert.equal(withoutKey.hasAnswerKeySection, false);
  assert.equal(withoutKey.questions[0].kunci_jawaban, "");

  const withKey = parseQuestions([
    numbered(1, "Soal satu"), ...options(FIVE),
    numbered(2, "Soal dua"), ...options(FIVE),
    plain("KUNCI JAWABAN"),
    plain("1. B  2. D"),
  ]);
  assert.equal(withKey.hasAnswerKeySection, true);
  assert.equal(withKey.questions.length, 2, "bagian kunci tidak boleh terbaca sebagai soal");
  assert.equal(withKey.questions[0].kunci_jawaban, "B");
  assert.equal(withKey.questions[1].kunci_jawaban, "D");
  assert.equal(isReady(withKey.questions[0]), true, "struktur utuh + kunci sah = siap");
}

// ── L. Kunci di luar A–E ditolak, tidak dipaksakan ──────────────────────────
{
  const result = parseQuestions([
    numbered(1, "Soal satu"), ...options(FIVE),
    plain("Kunci Jawaban"),
    plain("1. Z"),
  ]);
  const q = result.questions[0];
  assert.equal(q.kunci_jawaban, "", "huruf di luar A–E tidak boleh tersimpan sebagai kunci");
  assert.equal(isReady(q), false);
}

// ── M. Dokumen kosong ───────────────────────────────────────────────────────
{
  const result = parseQuestions([]);
  assert.deepEqual(result.questions, []);
  assert.equal(result.skippedBlocks, 0);
  const onlyHeader = parseQuestions(HEADER);
  assert.equal(onlyHeader.questions.length, 0);
}

// ── N. Dokumen rusak: opsi tanpa soal, opsi meloncat, dua soal tergabung ────
{
  const orphan = parseQuestions(options(FIVE));
  assert.equal(orphan.questions.length, 0, "opsi tanpa nomor soal tidak menghasilkan soal");

  const skewed = parseQuestions([
    numbered(1, "Soal dengan opsi meloncat"),
    ...[["B", "Dua"], ["C", "Tiga"], ["D", "Empat"], ["E", "Lima"]].map(([letter, text]) => ({
      text, marker: { kind: "letter" as const, value: letter, listId: "skew:0" },
      hasImage: false, isTable: false,
    })),
  ]);
  assert.ok(skewed.questions[0].issues.some((i) => /tidak berurutan/.test(i)));
  assert.equal(isReady(skewed.questions[0]), false);

  const merged = parseQuestions([numbered(1, "Dua soal tergabung"), ...options([...FIVE, "Pilihan enam"])]);
  assert.ok(merged.questions[0].issues.some((i) => /dua soal tergabung/.test(i)));
  assert.equal(isReady(merged.questions[0]), false);
}

// ── Tabel & gambar: ditandai, tidak dibuang diam-diam ───────────────────────
{
  const withTable = parseQuestions([
    numbered(1, "Perhatikan data berikut."),
    plain("Jenis / Persentase", { isTable: true }),
    ...options(FIVE),
  ]);
  assert.ok(withTable.questions[0].issues.some((i) => /tabel/.test(i)), "tabel wajib ditandai");
  assert.equal(isReady(withTable.questions[0]), false);

  const withImage = parseQuestions([
    numbered(1, "Perhatikan gambar berikut.", QUESTION_LIST, { hasImage: true }),
    ...options(FIVE),
  ]);
  assert.ok(withImage.questions[0].issues.some((i) => /gambar/.test(i)), "gambar wajib ditandai");
}

// ── T. Hanya soal siap yang boleh ikut diimport ─────────────────────────────
{
  const result = parseQuestions([
    numbered(1, "Soal lengkap"), ...options(FIVE),
    numbered(2, "Soal tanpa E"), ...options(FIVE.slice(0, 4)),
    numbered(3, "Soal lengkap dua"), ...options(FIVE),
    plain("KUNCI JAWABAN"),
    plain("1. A 2. B 3. C"),
  ]);
  assert.equal(result.questions.length, 3);
  const ready = result.questions.filter(isReady);
  assert.deepEqual(ready.map((q) => q.nomor_urut), [1, 3], "soal PERLU DICEK tidak boleh lolos");
  assert.deepEqual(ready.map((q) => q.kunci_jawaban), ["A", "C"]);
}

// ── Varian penanda manual: "1)", "1 -", "1:", "A)", "a." ────────────────────
{
  for (const [numberMark, optionMark] of [[")", ")"], [" -", " -"], [":", ":"], [".", "."]]) {
    const result = parseQuestions([
      plain(`1${numberMark} Soal varian`),
      plain(`A${optionMark} Satu`), plain(`B${optionMark} Dua`), plain(`C${optionMark} Tiga`),
      plain(`D${optionMark} Empat`), plain(`E${optionMark} Lima`),
    ]);
    assert.equal(result.questions.length, 1, `varian "${numberMark}" gagal terbaca`);
    assert.equal(result.questions[0].issues.length, 0);
    assert.equal(result.questions[0].opsi_d, "Empat");
  }
  const lower = parseQuestions([
    plain("1. Soal huruf kecil"),
    plain("a. Satu"), plain("b. Dua"), plain("c. Tiga"), plain("d. Empat"), plain("e. Lima"),
  ]);
  assert.equal(lower.questions[0].opsi_b, "Dua");
}

console.log("wordImport: struktur soal, nomor/opsi ambigu, kunci jawaban, tabel/gambar PASS");
