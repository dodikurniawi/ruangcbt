// Task 5.3 — parser soal Word.
// Fixture berasal dari struktur dokumen nyata "Sosiologi_Kelas X_ASAS Genap":
// nomor soal dan opsi A–E memakai penomoran otomatis Word (DocxBlock.marker),
// pertanyaan berlanjut di paragraf tanpa nomor, sebagian soal memuat daftar
// bernomor di dalam pertanyaannya, dan ada soal yang opsinya diketik manual.
// Jalankan: node --experimental-strip-types src/lib/wordImport.test.ts
import assert from "node:assert/strict";
import type { DocxBlock } from "./docx.ts";
import { buildImportPayload, isReady, parseQuestions, resolveImages, statusReasons } from "./wordImport.ts";

const QUESTION_LIST = "28:0";
const INSTRUCTION_LIST = "1:0";
let optionListCounter = 0;

function plain(text: string, extra: Partial<DocxBlock> = {}): DocxBlock {
  return { text, marker: null, hasImage: false, isTable: false, bold: false, imageRelId: null, ...extra };
}
function numbered(value: number, text: string, listId = QUESTION_LIST, extra: Partial<DocxBlock> = {}): DocxBlock {
  return { text, marker: { kind: "number", value: String(value), listId }, hasImage: false, isTable: false, bold: false, imageRelId: null, ...extra };
}
/** Lima opsi A–E dengan daftar Word sendiri, persis seperti dokumen aslinya. */
function options(texts: string[], extra: Partial<DocxBlock> = {}): DocxBlock[] {
  const listId = `opt${optionListCounter++}:0`;
  return texts.map((text, index) => ({
    text,
    marker: { kind: "letter" as const, value: "ABCDE"[index], listId },
    hasImage: false,
    isTable: false,
    bold: false,
    imageRelId: null,
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
  assert.deepEqual(statusReasons(q), ["Kunci jawaban belum ditemukan"]);
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

// ── F. SINGLE menerima A-C, A-D, atau A-E; D/E tidak pernah dikarang ────────
{
  for (const count of [3, 4, 5]) {
    const q = parseQuestions([
      numbered(count, `Soal ${count} opsi`), ...options(FIVE.slice(0, count)),
      plain("KUNCI JAWABAN"), plain(`${count}. ${"ABCDE"[count - 1]}`),
    ]).questions[0];
    assert.equal(q.issues.length, 0, `${count} opsi: ${q.issues.join("|")}`);
    assert.equal(isReady(q), true, `A-${"ABCDE"[count - 1]} harus siap`);
    if (count === 3) assert.deepEqual([q.opsi_d, q.opsi_e], ["", ""], "D/E tetap kosong");
  }
}

// ── F2. Kurang dari A-C, opsi melompat, dan kunci ke opsi kosong ditolak ────
{
  const kurang = parseQuestions([
    numbered(1, "Kurang opsi"), ...options(FIVE.slice(0, 2)),
    plain("KUNCI JAWABAN"), plain("1. A"),
  ]).questions[0];
  assert.match(kurang.issues.join(" "), /Opsi C wajib diisi/);
  assert.equal(isReady(kurang), false);

  const melompat = parseQuestions([
    numbered(2, "E tanpa D"),
    ...["A", "B", "C", "E"].map((letter, index) => ({
      text: FIVE[index], marker: { kind: "letter" as const, value: letter, listId: "gap:0" },
      hasImage: false, isTable: false, bold: false, imageRelId: null,
    })),
    plain("KUNCI JAWABAN"), plain("2. E"),
  ]).questions[0];
  assert.match(melompat.issues.join(" "), /Urutan opsi tidak berurutan/);
  assert.equal(isReady(melompat), false);

  const keyKosong = parseQuestions([
    numbered(1, "Jawaban D kosong"), ...options(FIVE.slice(0, 3)),
    plain("KUNCI JAWABAN"), plain("1. D"),
  ]).questions[0];
  assert.match(keyKosong.issues.join(" "), /Kunci jawaban D menunjuk opsi yang tidak tersedia/);
  assert.equal(isReady(keyKosong), false);
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
      hasImage: false, isTable: false, bold: false, imageRelId: null,
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
  assert.ok(withImage.questions[0].issues.some((i) => /gambar/i.test(i)), "gambar wajib ditandai");
}

// ── T. Hanya soal siap yang boleh ikut diimport ─────────────────────────────
{
  const result = parseQuestions([
    numbered(1, "Soal lengkap"), ...options(FIVE),
    numbered(2, "Soal tiga opsi"), ...options(FIVE.slice(0, 3)),
    numbered(3, "Soal lengkap dua"), ...options(FIVE),
    plain("KUNCI JAWABAN"),
    plain("1. A 2. B 3. C"),
  ]);
  assert.equal(result.questions.length, 3);
  const ready = result.questions.filter(isReady);
  assert.deepEqual(ready.map((q) => q.nomor_urut), [1, 2, 3], "A-C juga harus lolos import");
  assert.deepEqual(ready.map((q) => q.kunci_jawaban), ["A", "B", "C"]);
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

// ── U. Kunci dari tanda tebal: satu opsi tebal = kunci ----------------------
{
  const single = parseQuestions([
    numbered(1, "Ibu kota Indonesia?"),
    ...options(FIVE).map((o, i) => (i === 1 ? { ...o, bold: true } : o)),
  ]);
  assert.equal(single.questions[0].kunci_jawaban, "B", "satu opsi tebal terbaca sebagai kunci");
  assert.equal(isReady(single.questions[0]), true, "struktur utuh + kunci tebal = siap");

  // Beberapa opsi tebal (mis. seluruh dokumen tercetak tebal) bukan indikator.
  const multi = parseQuestions([
    numbered(1, "Semua opsi tebal — gaya dokumen"),
    ...options(FIVE).map((o) => ({ ...o, bold: true })),
  ]);
  assert.equal(multi.questions[0].kunci_jawaban, "", "beberapa opsi tebal tidak boleh jadi kunci");
  assert.ok(multi.questions[0].issues.some((i) => /beberapa pilihan dicetak tebal/.test(i)));
  assert.equal(isReady(multi.questions[0]), false);
}

// ── V. Bold konsisten dengan bagian kunci → bagian kunci tetap menang ───────
{
  const r = parseQuestions([
    numbered(1, "Soal satu"), ...options(FIVE).map((o, i) => (i === 0 ? { ...o, bold: true } : o)),
    plain("KUNCI JAWABAN"),
    plain("1. A"),
  ]);
  assert.equal(r.questions[0].kunci_jawaban, "A", "bagian kunci eksplisit menang bila tidak konflik");
  assert.equal(isReady(r.questions[0]), true);
}

// ── W. Konflik indikator kunci: tidak pernah dipilih otomatis ──────────────
{
  const r = parseQuestions([
    numbered(1, "Soal konflik"), ...options(FIVE).map((o, i) => (i === 1 ? { ...o, bold: true } : o)),
    plain("KUNCI JAWABAN"),
    plain("1. D"),
  ]);
  const q = r.questions[0];
  assert.equal(q.kunci_jawaban, "", "konflik antar indikator kunci harus ditandai, bukan ditebak");
  assert.ok(q.issues.some((i) => /berbeda dengan/.test(i)));
  assert.equal(isReady(q), false);
}

// ── X. Gambar: terbaca → ikut preview & import; gagal → ditandai ───────────
{
  const r = parseQuestions([
    numbered(1, "Soal bergambar", QUESTION_LIST, { hasImage: true, imageRelId: "rId5" }),
    ...options(FIVE),
    numbered(2, "Soal biasa"), ...options(FIVE),
    plain("KUNCI JAWABAN"),
    plain("1. B 2. C"),
  ]);
  resolveImages(r.questions, new Map([["rId5", {
    dataUrl: "data:image/png;base64,AA==", fileName: "gambar.png", mimeType: "image/png",
  }]]));
  const bergambar = r.questions[0];
  assert.equal(bergambar.image?.fileName, "gambar.png", "gambar hasil parsing muncul di preview");
  assert.equal(bergambar.imageBroken, false);
  assert.equal(bergambar.issues.length, 0);

  // rId tertulis tetapi byte-nya tidak ada → ditandai, bukan dibuang diam-diam.
  const rBroken = parseQuestions([
    numbered(1, "Gambar putus", QUESTION_LIST, { hasImage: true, imageRelId: "rId9" }),
    ...options(FIVE),
  ]);
  resolveImages(rBroken.questions, new Map());
  const bq = rBroken.questions[0];
  assert.equal(bq.imageBroken, true);
  assert.ok(bq.issues.some((i) => /Gambar pada soal ini perlu diperiksa/.test(i)));
  assert.equal(isReady(bq), false);

  const { payload, blockedByImages } = await buildImportPayload(r.questions, 10, "MAPEL_A",
    async (_base64, _mime, name) => ({ success: true, data: { url: `https://drive/${name}` } }));
  assert.equal(blockedByImages, 0);
  assert.equal(payload.length, 2);
  assert.equal(payload[0].gambar_url, "https://drive/gambar.png", "gambar ikut terimport ke Bank Soal");
  assert.equal(payload[1].gambar_url, "", "soal tanpa gambar tetap kosong");
  assert.equal(payload[0].nomor_urut, 11, "penomoran lanjut dari mapel tujuan");

  // Unggahan gambar gagal → soal dilewati dan dihitung, bukan diimport polos.
  const { payload: failPayload, blockedByImages: blocked } = await buildImportPayload(
    r.questions, 0, "MAPEL_A", async () => ({ success: false, message: "gagal" }),
  );
  assert.equal(blocked, 1);
  assert.equal(failPayload.length, 1, "soal bergambar yang gagal diunggah tidak ikut terimport");
  assert.equal(failPayload[0].nomor_urut, 1);
}

console.log("wordImport: struktur soal, nomor/opsi ambigu, kunci (bagian/bold/konflik), gambar/tabel + mutations PASS");
