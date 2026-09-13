// Parser soal pilihan ganda dari paragraf dokumen Word.
//
// Prinsipnya: kalau struktur soal tidak jelas, soal ditandai PERLU DICEK, bukan
// ditebak. Lebih baik guru memperbaiki tiga soal daripada sepuluh soal masuk
// Bank Soal dengan isi yang salah.
//
// Parser murni: masukannya DocxBlock (lihat docx.ts), keluarannya data soal.
// Tidak menyentuh jaringan, GAS, maupun Sheets, sehingga bisa dites apa adanya.
//
// Kunci jawaban dikenali dari tiga sumber, urut kepercayaannya:
// 1. Bagian "KUNCI JAWABAN" di akhir dokumen (eksplisit, paling bisa dipercaya).
// 2. Satu-satunya opsi yang dicetak tebal ("B. Jakarta" → B).
// 3. Konflik antar indikator → PERLU DICEK, tidak pernah memilih sendiri.

import type { DocxBlock, DocxImage } from "./docx.ts";

export const OPTION_KEYS = ["A", "B", "C", "D", "E"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];
const OPTION_SET = new Set<string>(OPTION_KEYS);

/** Gambar yang terbaca dari dokumen, siap ditampilkan dan diunggah saat import. */
export type { DocxImage } from "./docx.ts";

export interface ParsedQuestion {
  /** Nomor seperti tertulis di dokumen; dipakai mencocokkan kunci jawaban. */
  nomor_urut: number;
  pertanyaan: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string;
  /** Bobot soal; Word selalu 1, Excel dapat diisi guru di kolom Bobot. */
  bobot: number;
  /** Alasan soal perlu diperiksa guru. Kosong = struktur soal sudah utuh. */
  issues: string[];
  /** Gambar yang berhasil diambil dari dokumen; null bila tidak ada. */
  image: DocxImage | null;
  /** Gambar terdeteksi tetapi tidak terbaca → wajib ditandai, jangan dibuang. */
  imageBroken: boolean;
  /** Identitas gambar di dalam .docx; dipakai mengambil byte-nya. */
  imageRelId: string | null;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  /** Paragraf bernomor yang tidak punya opsi sama sekali (mis. petunjuk ujian). */
  skippedBlocks: number;
  /** Mapel yang tertulis di dokumen — hanya saran, bukan sumber kebenaran. */
  detectedMapel: string;
  /** True bila dokumen memuat bagian kunci jawaban yang terbaca. */
  hasAnswerKeySection: boolean;
}

// Nomor soal yang diketik manual: "1." "1)" "1 -" "1:". Angka di tengah kalimat
// tidak pernah cocok karena pola diikat ke awal paragraf dan wajib ada pemisah.
// Batas 3 digit menjaga "2025" di awal kalimat agar tidak terbaca sebagai nomor.
const MANUAL_NUMBER = /^(\d{1,3})\s*[.)\-:]\s+([\s\S]*)$/;
// Opsi yang diketik manual: "A." "A)" "A -" "A:". Huruf A–E di tengah kalimat
// ("menurut A dan B") tidak cocok karena harus berada di awal paragraf.
const MANUAL_OPTION = /^([A-Ea-e])\s*[.)\-:]\s+([\s\S]*)$/;
const ANSWER_KEY_HEADING = /^(kunci\s*jawaban|kunci)\b/i;
const MAPEL_LINE = /^mata\s*pelajaran\s*:?\s*(.+)$/i;

/** Nomor yang diketik guru sendiri tidak punya identitas daftar Word. */
const MANUAL_LIST = "manual";

interface NormalizedBlock {
  kind: "number" | "letter" | "plain";
  /** Nomor soal atau huruf opsi bila penandanya diketahui. */
  marker: string;
  listId: string;
  text: string;
  hasImage: boolean;
  isTable: boolean;
  bold: boolean;
  imageRelId: string | null;
}

/**
 * Samakan bentuk penanda: penomoran otomatis Word sudah dibawa DocxBlock.marker,
 * sedangkan dokumen yang nomornya diketik manual dikenali dari awal paragraf.
 */
function normalize(block: DocxBlock): NormalizedBlock {
  const text = block.text.trim();
  if (block.isTable) {
    return { kind: "plain", marker: "", listId: MANUAL_LIST, text, hasImage: block.hasImage, isTable: true, bold: false, imageRelId: null };
  }
  const base = {
    listId: block.marker?.listId ?? MANUAL_LIST,
    text,
    hasImage: block.hasImage,
    isTable: false,
    bold: block.bold,
    imageRelId: block.imageRelId,
  };
  if (block.marker) {
    return { kind: block.marker.kind, marker: block.marker.value, ...base };
  }

  const option = text.match(MANUAL_OPTION);
  if (option) {
    return { kind: "letter", marker: option[1].toUpperCase(), ...base, text: option[2].trim() };
  }
  const numbered = text.match(MANUAL_NUMBER);
  if (numbered) {
    return { kind: "number", marker: numbered[1], ...base, text: numbered[2].trim() };
  }
  return { kind: "plain", marker: "", ...base };
}

/** Kunci jawaban dari bagian khusus di akhir dokumen: "1. B", "1) B", "1 B". */
function parseAnswerKeys(blocks: NormalizedBlock[]): Map<number, string> {
  const keys = new Map<number, string>();
  for (const block of blocks) {
    // Penanda dikembalikan ke depan baris: baris kunci "1. B  2. D" sudah dipecah
    // normalize() menjadi marker "1" + teks "B  2. D".
    const line = block.marker ? `${block.marker}. ${block.text}` : block.text;
    // Satu baris bisa memuat banyak pasangan: "1. A 2. B 3. C".
    for (const pair of line.matchAll(/(\d{1,3})\s*[.)\-:]?\s*([A-Ea-e])\b/g)) {
      keys.set(Number(pair[1]), pair[2].toUpperCase());
    }
  }
  return keys;
}

interface Candidate {
  nomor: number;
  listId: string;
  /** Berapa paragraf bernomor sudah masuk; membedakan satu pengantar dari satu daftar. */
  numberedCount: number;
  stem: string[];
  options: { letter: string; text: string; bold: boolean }[];
  hasImage: boolean;
  hasTable: boolean;
  imageRelId: string | null;
}

function finish(candidate: Candidate, answerKeys: Map<number, string>): ParsedQuestion | null {
  // Paragraf bernomor tanpa satu pun opsi bukan soal — itu petunjuk ujian atau
  // daftar biasa. Dilewati diam-diam akan menyesatkan, jadi jumlahnya dilaporkan.
  if (candidate.options.length === 0) return null;

  const issues: string[] = [];
  const pertanyaan = candidate.stem.join(" ").replace(/\s+/g, " ").trim();
  if (!pertanyaan) issues.push("Pertanyaan tidak terbaca");

  if (candidate.hasTable) issues.push("Soal memuat tabel yang belum bisa diimport");

  const imageBroken = candidate.hasImage && !candidate.imageRelId;
  if (imageBroken) issues.push("Gambar pada soal ini perlu diperiksa");

  if (candidate.options.length > OPTION_KEYS.length) {
    issues.push(`Ditemukan ${candidate.options.length} opsi, kemungkinan dua soal tergabung`);
  }

  const values: Record<string, string> = {};
  candidate.options.slice(0, OPTION_KEYS.length).forEach((option, index) => {
    const expected = OPTION_KEYS[index];
    // Urutan huruf yang meloncat (A, B, D) menandakan ada opsi yang hilang atau
    // tergabung; isinya tetap ditampilkan supaya guru bisa menilai sendiri.
    if (option.letter !== expected) {
      issues.push(`Urutan opsi tidak berurutan (ditemukan ${option.letter} pada posisi ${expected})`);
    }
    values[expected] = option.text;
  });

  const missing = OPTION_KEYS.filter((key) => !values[key] || values[key].trim() === "");
  if (missing.length > 0) issues.push(`Opsi ${missing.join(", ")} tidak ditemukan`);

  // ── Kunci jawaban ──────────────────────────────────────────────────────────
  // Bagian "KUNCI JAWABAN" eksplisit adalah sumber paling bisa dipercaya. Cetak
  // tebal baru dipakai bila tidak ada konflik; konflik antar indikator tidak
  // pernah diselesaikan dengan menebak.
  const sectionKey = answerKeys.get(candidate.nomor);
  const validSectionKey = sectionKey && OPTION_SET.has(sectionKey) ? sectionKey : "";
  if (sectionKey && !validSectionKey) issues.push(`Kunci jawaban "${sectionKey}" tidak valid`);

  const boldOptions = candidate.options.slice(0, OPTION_KEYS.length).filter((option) => option.bold);
  const conflictBold = boldOptions.length === 1 && boldOptions[0].letter !== validSectionKey;
  let kunci_jawaban = "";
  if (validSectionKey && conflictBold) {
    issues.push(
      `Kunci jawaban di bagian kunci (${validSectionKey}) berbeda dengan pilihan yang dicetak tebal (${boldOptions[0].letter})`,
    );
    kunci_jawaban = conflictBold ? "" : validSectionKey;
  } else if (validSectionKey) {
    kunci_jawaban = validSectionKey;
  } else if (boldOptions.length === 1) {
    kunci_jawaban = boldOptions[0].letter;
  } else if (boldOptions.length > 1) {
    issues.push("Kunci jawaban belum ditemukan — beberapa pilihan dicetak tebal");
  }

  return {
    nomor_urut: candidate.nomor,
    pertanyaan,
    opsi_a: values.A ?? "",
    opsi_b: values.B ?? "",
    opsi_c: values.C ?? "",
    opsi_d: values.D ?? "",
    opsi_e: values.E ?? "",
    kunci_jawaban,
    bobot: 1,
    issues,
    image: null,
    imageBroken,
    imageRelId: candidate.imageRelId,
  };
}

/** Soal siap diimport: struktur utuh dan kunci jawaban sudah terisi. */
export function isReady(question: ParsedQuestion): boolean {
  return question.issues.length === 0 && OPTION_SET.has(question.kunci_jawaban);
}

/** Alasan yang ditampilkan guru pada soal yang belum siap. */
export function statusReasons(question: ParsedQuestion): string[] {
  const reasons = [...question.issues];
  if (!OPTION_SET.has(question.kunci_jawaban)) {
    reasons.push("Kunci jawaban belum ditemukan");
  }
  return reasons;
}

function nextNumber(candidate: Candidate | null, lastNumber: number): number {
  return (candidate ? candidate.nomor : lastNumber) + 1;
}

/**
 * Kapan paragraf bernomor memulai soal baru, bukan menyambung pertanyaan.
 *
 * Dokumen guru memuat dua macam daftar bernomor: nomor soal, dan daftar di dalam
 * pertanyaan ("Perhatikan pernyataan berikut: 1) ... 2) ..."). Keduanya terlihat
 * sama pada teks polos, jadi pembedanya diambil dari konteks:
 * - opsi A–E sudah muncul → soal sebelumnya pasti sudah selesai;
 * - penomoran otomatis Word → daftar nomor soal punya identitas daftar sendiri,
 *   berbeda dari daftar yang dipakai di dalam pertanyaan;
 * - nomor yang diketik manual → nomor soal berlanjut (2 sesudah 1), sedangkan
 *   daftar di dalam pertanyaan mulai lagi dari 1.
 */
function startsNewQuestion(
  block: NormalizedBlock,
  candidate: Candidate | null,
  questionListId: string,
  expectedNumber: number,
): boolean {
  if (!candidate) return true;
  if (candidate.options.length > 0) return true;
  if (block.listId === MANUAL_LIST) return Number(block.marker) === expectedNumber;
  if (questionListId) return block.listId === questionListId;
  // Soal pertama belum ketemu: daftar yang berbeda menandakan bagian baru
  // dokumen (petunjuk ujian ditinggalkan, soal pertama dimulai).
  return block.listId !== candidate.listId;
}

export function parseQuestions(blocks: DocxBlock[]): ParseResult {
  const normalized = blocks.map(normalize);

  let detectedMapel = "";
  for (const block of normalized) {
    const mapel = block.text.match(MAPEL_LINE);
    if (mapel) {
      // Baris header sering menggabungkan beberapa kolom lewat tab.
      detectedMapel = mapel[1].split(/\s{2,}|\t|Hari|Kelas|Waktu/)[0].trim();
      break;
    }
  }

  // Bagian kunci jawaban dipotong lebih dulu supaya barisnya tidak ikut terbaca
  // sebagai soal.
  const keyHeading = normalized.findIndex((block) => ANSWER_KEY_HEADING.test(block.text.trim()));
  const questionBlocks = keyHeading === -1 ? normalized : normalized.slice(0, keyHeading);
  const answerKeys = keyHeading === -1
    ? new Map<number, string>()
    : parseAnswerKeys(normalized.slice(keyHeading + 1));

  const questions: ParsedQuestion[] = [];
  let skippedBlocks = 0;
  let candidate: Candidate | null = null;
  // Daftar Word yang terbukti memuat nomor soal, dan nomor soal terakhir yang
  // benar-benar jadi. Keduanya dipakai membedakan "soal berikutnya" dari
  // "daftar bernomor di dalam pertanyaan".
  let questionListId = "";
  let lastNumber = 0;

  const noteImage = (block: NormalizedBlock) => {
    if (block.imageRelId) candidate!.imageRelId ||= block.imageRelId;
  };

  const close = () => {
    if (!candidate) return;
    const question = finish(candidate, answerKeys);
    if (question) {
      questions.push(question);
      questionListId = candidate.listId;
      lastNumber = question.nomor_urut;
    } else {
      skippedBlocks++;
    }
    candidate = null;
  };

  for (const block of questionBlocks) {
    if (block.kind === "number") {
      if (startsNewQuestion(block, candidate, questionListId, nextNumber(candidate, lastNumber))) {
        // Pengantar tunggal yang belum sempat punya opsi ("Perhatikan pernyataan
        // berikut.") adalah bagian dari soal ini, jadi ikut terbawa. Runtun
        // paragraf bernomor — petunjuk ujian — memang ditinggalkan.
        const open = candidate as Candidate | null;
        const orphan: Candidate | null =
          open && open.options.length === 0 && open.numberedCount === 1 ? open : null;
        close();
        candidate = {
          nomor: orphan ? orphan.nomor : (Number(block.marker) || questions.length + 1),
          listId: block.listId,
          numberedCount: 1,
          stem: orphan
            ? [...orphan.stem, block.text ? `${block.marker}) ${block.text}` : `${block.marker})`]
            : (block.text ? [block.text] : []),
          options: [],
          hasImage: block.hasImage || Boolean(orphan?.hasImage),
          hasTable: block.isTable || Boolean(orphan?.hasTable),
          imageRelId: block.imageRelId ?? orphan?.imageRelId ?? null,
        };
      } else {
        candidate!.numberedCount++;
        // Daftar bernomor di dalam pertanyaan ("Perhatikan: 1) ... 2) ...").
        // Nomornya dipertahankan supaya pertanyaan tetap terbaca utuh.
        candidate!.stem.push(block.text ? `${block.marker}) ${block.text}` : `${block.marker})`);
        if (block.hasImage) candidate!.hasImage = true;
        if (block.isTable) candidate!.hasTable = true;
        noteImage(block);
      }
      continue;
    }

    if (!candidate) continue; // Judul, petunjuk, dan kop surat sebelum soal pertama.

    if (block.kind === "letter") {
      candidate.options.push({ letter: block.marker, text: block.text, bold: block.bold });
      if (block.hasImage) candidate.hasImage = true;
      if (block.isTable) candidate.hasTable = true;
      noteImage(block);
      continue;
    }

    // Paragraf biasa: lanjutan pertanyaan bila opsi belum mulai. Setelah opsi
    // dimulai, paragraf biasa menandakan soal sudah selesai.
    if (candidate.options.length === 0) {
      if (block.isTable) candidate.hasTable = true;
      if (block.hasImage) candidate.hasImage = true;
      noteImage(block);
      if (block.text) candidate.stem.push(block.text);
    } else {
      close();
    }
  }
  close();

  return {
    questions,
    skippedBlocks,
    detectedMapel,
    hasAnswerKeySection: keyHeading !== -1 && answerKeys.size > 0,
  };
}

/**
 * Pasang data gambar pada soal yang sudah di-parse. rId yang tertulis di
 * dokumen tetapi tidak berhasil diambil byte-nya menjadi imageBroken — gambar
 * tidak pernah dihilangkan tanpa kabar.
 */
export function resolveImages(questions: ParsedQuestion[], images: Map<string, DocxImage>): void {
  for (const question of questions) {
    if (!question.imageRelId) continue;
    const image = images.get(question.imageRelId);
    if (image) {
      question.image = image;
    } else if (!question.imageBroken) {
      question.imageBroken = true;
      question.issues.push("Gambar pada soal ini perlu diperiksa");
    }
  }
}

export interface ImportPayloadRow {
  nomor_urut: number;
  tipe: "SINGLE";
  pertanyaan: string;
  gambar_url: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string;
  bobot: number;
  kategori: string;
  id_mapel: string;
}

/**
 * Bungkus soal yang siap menjadi payload import. Gambar soal diunggah lewat
 * callback yang sama dengan upload gambar manual (Google Drive), lalu URL-nya
 * diisi. Unggahan yang gagal membuat soal dilewati dan dihitung — soal tidak
 * pernah masuk tanpa gambarnya.
 */
export async function buildImportPayload(
  questions: ParsedQuestion[],
  startNomor: number,
  idMapel: string,
  uploadImage: (
    base64Data: string,
    mimeType: string,
    fileName: string,
  ) => Promise<{ success: boolean; data?: { url?: string }; message?: string }>,
): Promise<{ payload: ImportPayloadRow[]; blockedByImages: number }> {
  const payload: ImportPayloadRow[] = [];
  let blockedByImages = 0;
  let nomor = startNomor;
  for (const row of questions) {
    if (!isReady(row)) continue;
    let gambar_url = "";
    if (row.image) {
      const base64Data = row.image.dataUrl.split(",")[1] ?? "";
      const res = await uploadImage(base64Data, row.image.mimeType, row.image.fileName);
      if (!res.success || !res.data?.url) {
        blockedByImages++;
        continue;
      }
      gambar_url = res.data.url;
    }
    payload.push({
      nomor_urut: ++nomor,
      tipe: "SINGLE",
      pertanyaan: row.pertanyaan.trim(),
      gambar_url,
      opsi_a: row.opsi_a.trim(),
      opsi_b: row.opsi_b.trim(),
      opsi_c: row.opsi_c.trim(),
      opsi_d: row.opsi_d.trim(),
      opsi_e: row.opsi_e.trim(),
      kunci_jawaban: row.kunci_jawaban,
      bobot: row.bobot || 1,
      kategori: "",
      id_mapel: idMapel,
    });
  }
  return { payload, blockedByImages };
}