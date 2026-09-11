// Parser soal pilihan ganda dari paragraf dokumen Word.
//
// Prinsipnya: kalau struktur soal tidak jelas, soal ditandai PERLU DICEK, bukan
// ditebak. Lebih baik guru memperbaiki tiga soal daripada sepuluh soal masuk
// Bank Soal dengan isi yang salah.
//
// Parser murni: masukannya DocxBlock (lihat docx.ts), keluarannya data soal.
// Tidak menyentuh jaringan, GAS, maupun Sheets, sehingga bisa dites apa adanya.

import type { DocxBlock } from "./docx.ts";

export const OPTION_KEYS = ["A", "B", "C", "D", "E"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

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
  /** Alasan soal perlu diperiksa guru. Kosong = struktur soal sudah utuh. */
  issues: string[];
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
}

/**
 * Samakan bentuk penanda: penomoran otomatis Word sudah dibawa DocxBlock.marker,
 * sedangkan dokumen yang nomornya diketik manual dikenali dari awal paragraf.
 */
function normalize(block: DocxBlock): NormalizedBlock {
  const text = block.text.trim();
  if (block.isTable) {
    return { kind: "plain", marker: "", listId: MANUAL_LIST, text, hasImage: block.hasImage, isTable: true };
  }
  if (block.marker) {
    return {
      kind: block.marker.kind, marker: block.marker.value, listId: block.marker.listId, text,
      hasImage: block.hasImage, isTable: false,
    };
  }

  const option = text.match(MANUAL_OPTION);
  if (option) {
    return {
      kind: "letter", marker: option[1].toUpperCase(), listId: MANUAL_LIST, text: option[2].trim(),
      hasImage: block.hasImage, isTable: false,
    };
  }
  const numbered = text.match(MANUAL_NUMBER);
  if (numbered) {
    return {
      kind: "number", marker: numbered[1], listId: MANUAL_LIST, text: numbered[2].trim(),
      hasImage: block.hasImage, isTable: false,
    };
  }
  return { kind: "plain", marker: "", listId: MANUAL_LIST, text, hasImage: block.hasImage, isTable: false };
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
  options: { letter: string; text: string }[];
  hasImage: boolean;
  hasTable: boolean;
}

function finish(candidate: Candidate, answerKeys: Map<number, string>): ParsedQuestion | null {
  // Paragraf bernomor tanpa satu pun opsi bukan soal — itu petunjuk ujian atau
  // daftar biasa. Dilewati diam-diam akan menyesatkan, jadi jumlahnya dilaporkan.
  if (candidate.options.length === 0) return null;

  const issues: string[] = [];
  const pertanyaan = candidate.stem.join(" ").replace(/\s+/g, " ").trim();
  if (!pertanyaan) issues.push("Pertanyaan tidak terbaca");

  if (candidate.hasTable) issues.push("Soal memuat tabel yang belum bisa diimport");
  if (candidate.hasImage) issues.push("Soal memuat gambar yang belum bisa diimport");

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

  const key = answerKeys.get(candidate.nomor);
  const kunci_jawaban = key && (OPTION_KEYS as readonly string[]).includes(key) ? key : "";
  if (key && !kunci_jawaban) issues.push(`Kunci jawaban "${key}" tidak valid`);

  return {
    nomor_urut: candidate.nomor,
    pertanyaan,
    opsi_a: values.A ?? "",
    opsi_b: values.B ?? "",
    opsi_c: values.C ?? "",
    opsi_d: values.D ?? "",
    opsi_e: values.E ?? "",
    kunci_jawaban,
    issues,
  };
}

/** Soal siap diimport: struktur utuh dan kunci jawaban sudah terisi. */
export function isReady(question: ParsedQuestion): boolean {
  return question.issues.length === 0 && (OPTION_KEYS as readonly string[]).includes(question.kunci_jawaban);
}

/** Alasan yang ditampilkan guru pada soal yang belum siap. */
export function statusReasons(question: ParsedQuestion): string[] {
  const reasons = [...question.issues];
  if (!(OPTION_KEYS as readonly string[]).includes(question.kunci_jawaban)) {
    reasons.push("Kunci jawaban belum diisi");
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
        };
      } else {
        candidate!.numberedCount++;
        // Daftar bernomor di dalam pertanyaan ("Perhatikan: 1) ... 2) ...").
        // Nomornya dipertahankan supaya pertanyaan tetap terbaca utuh.
        candidate!.stem.push(block.text ? `${block.marker}) ${block.text}` : `${block.marker})`);
        if (block.hasImage) candidate!.hasImage = true;
        if (block.isTable) candidate!.hasTable = true;
      }
      continue;
    }

    if (!candidate) continue; // Judul, petunjuk, dan kop surat sebelum soal pertama.

    if (block.kind === "letter") {
      candidate.options.push({ letter: block.marker, text: block.text });
      if (block.hasImage) candidate.hasImage = true;
      if (block.isTable) candidate.hasTable = true;
      continue;
    }

    // Paragraf biasa: lanjutan pertanyaan bila opsi belum mulai. Setelah opsi
    // dimulai, paragraf biasa menandakan soal sudah selesai.
    if (candidate.options.length === 0) {
      if (block.isTable) candidate.hasTable = true;
      if (block.hasImage) candidate.hasImage = true;
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
