// Import soal dari Excel (.xlsx) ke Bank Soal.
//
// Guru mengisi template RuangCBT lalu mengunggahnya. Kolom yang dikenali
// toleran terhadap penulisan (Jawaban/Kunci/Answer, No/Nomor, dst.) tetapi
// isian yang tidak valid selalu ditandai PERLU DICEK — tidak pernah masuk
// diam-diam. Gambar memang tidak didukung: tidak ada kolom gambar di template,
// jadi tidak ada janji yang dilanggar.
//
// Hasil parsing memakai ParsedQuestion yang sama dengan import Word, sehingga
// preview dan perbaikan guru identik untuk kedua sumber.

import * as XLSX from "xlsx";
import { OPTION_KEYS, type ParsedQuestion } from "./wordImport.ts";

export const SOAL_TEMPLATE_HEADERS = [
  "No", "Soal", "A", "B", "C", "D", "E", "Jawaban", "Bobot",
] as const;

type SoalField =
  | "nomor" | "soal" | "opsi_a" | "opsi_b" | "opsi_c" | "opsi_d" | "opsi_e" | "jawaban" | "bobot";

const HEADER_ALIASES: Record<string, SoalField> = {
  no: "nomor", nomor: "nomor", urut: "nomor",
  soal: "soal", pertanyaan: "soal", soal_pertanyaan: "soal",
  a: "opsi_a", opsi_a: "opsi_a", pilihan_a: "opsi_a",
  b: "opsi_b", opsi_b: "opsi_b", pilihan_b: "opsi_b",
  c: "opsi_c", opsi_c: "opsi_c", pilihan_c: "opsi_c",
  d: "opsi_d", opsi_d: "opsi_d", pilihan_d: "opsi_d",
  e: "opsi_e", opsi_e: "opsi_e", pilihan_e: "opsi_e",
  jawaban: "jawaban", kunci: "jawaban", kunci_jawaban: "jawaban",
  answer: "jawaban", jawaban_benar: "jawaban",
  bobot: "bobot", poin: "bobot", skor: "bobot",
};

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/** Baris template: judul kolom + satu baris contoh yang bisa langsung dicontoh guru. */
export function soalTemplateRows(): unknown[][] {
  return [
    [...SOAL_TEMPLATE_HEADERS],
    ["1", "Ibu kota Indonesia adalah ...", "Bandung", "Jakarta", "Surabaya", "Medan", "Makassar", "B", 1],
  ];
}

/** Buat file template dan picu unduhan di browser. */
export function downloadSoalTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet(soalTemplateRows());
  ws["!cols"] = [
    { wch: 5 }, { wch: 46 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Soal");
  XLSX.writeFile(wb, "Template_Import_Soal_RuangCBT.xlsx");
}

// Baca workbook → array-of-arrays dari sheet pertama.
export function parseWorkbook(data: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("empty");
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" }) as unknown[][];
}

/**
 * Baca soal dari workbook guru. Setiap baris menjadi ParsedQuestion yang sama
 * bentuknya dengan hasil baca Word; baris kosong diabaikan, baris yang isinya
 * tidak valid ditandai lewat issues sehingga tidak ikut diimport diam-diam.
 * Struktur file yang tidak sesuai template melempar pesan yang bisa dibaca guru.
 */
export function parseExcelQuestions(data: ArrayBuffer): { questions: ParsedQuestion[]; skippedBlocks: number } {
  const rows = parseWorkbook(data);
  const [headerRow, ...dataRows] = rows;
  if (!headerRow || !Array.isArray(headerRow)) {
    throw new Error("Format kolom tidak sesuai template RuangCBT. Pastikan baris pertama berisi nama kolom.");
  }

  const colOf: Partial<Record<SoalField, number>> = {};
  headerRow.forEach((cell, i) => {
    const field = HEADER_ALIASES[normalizeHeader(cell)];
    if (field && colOf[field] === undefined) colOf[field] = i;
  });

  if (colOf.soal === undefined) {
    throw new Error(
      "Format kolom tidak sesuai template RuangCBT. " +
      "Download template, lalu isi kolom Soal, opsi A sampai E, dan Jawaban.",
    );
  }

  const questions: ParsedQuestion[] = [];
  const skippedBlocks = 0;
  dataRows.forEach((row, idx) => {
    const cell = (field: SoalField) => {
      const c = colOf[field];
      return c === undefined ? "" : String((row as unknown[])[c] ?? "").trim();
    };

    const soal = cell("soal");
    const semuaKosong = ["soal", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e", "jawaban"].every(
      (f) => cell(f as SoalField) === "",
    );
    if (semuaKosong) return; // baris kosong di akhir file

    const issues: string[] = [];
    const kunciRaw = cell("jawaban");
    const kunciJawaban = kunciRaw && (OPTION_KEYS as readonly string[]).includes(kunciRaw.toUpperCase())
      ? kunciRaw.toUpperCase()
      : "";
    if (kunciRaw && kunciJawaban === "") issues.push(`Kunci jawaban "${kunciRaw}" tidak valid`);

    if (!soal) issues.push("Pertanyaan tidak terbaca");
    const missing = OPTION_KEYS.filter((key) => cell(`opsi_${key.toLowerCase()}` as SoalField) === "");
    if (missing.length > 0) issues.push(`Opsi ${missing.join(", ")} tidak ditemukan`);

    const bobotRaw = cell("bobot");
    const bobot = bobotRaw === "" ? 1 : Number(bobotRaw);
    if (bobotRaw !== "" && (!Number.isFinite(bobot) || bobot <= 0)) {
      issues.push("Bobot harus angka");
    }

    const nomorSel = cell("nomor");
    const parsedNomor = Number(nomorSel);
    const nomor_urut = nomorSel !== "" && Number.isFinite(parsedNomor) && parsedNomor > 0
      ? parsedNomor
      : idx + 1;

    questions.push({
      nomor_urut,
      pertanyaan: soal,
      opsi_a: cell("opsi_a"), opsi_b: cell("opsi_b"), opsi_c: cell("opsi_c"),
      opsi_d: cell("opsi_d"), opsi_e: cell("opsi_e"),
      kunci_jawaban: kunciJawaban,
      bobot: Number.isFinite(bobot) && bobot > 0 ? bobot : 1,
      issues,
      image: null,
      imageBroken: false,
      imageRelId: null,
    });
  });

  return { questions, skippedBlocks };
}