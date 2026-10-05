import * as XLSX from "xlsx";
import type { StudentInput } from "@/lib/api";
import { toIsoBirthDate } from "./birthDate.ts";

// Kolom template yang diunduh guru.
export const TEMPLATE_HEADERS = [
  "Nama Lengkap", "Username", "Password", "Kelas", "Tempat Lahir", "Tanggal Lahir",
] as const;

// Header di file guru → field internal. Toleran terhadap variasi penulisan.
const HEADER_ALIASES: Record<string, keyof StudentInput> = {
  nama_lengkap: "nama_lengkap", nama: "nama_lengkap", nama_siswa: "nama_lengkap",
  username: "username", nis: "username", "username/nis": "username", user: "username",
  password: "password", sandi: "password", kata_sandi: "password",
  kelas: "kelas", rombel: "kelas", rombongan_belajar: "kelas",
  tempat_lahir: "tempat_lahir", tempat: "tempat_lahir", tempat_kelahiran: "tempat_lahir",
  tanggal_lahir: "tanggal_lahir", tgl_lahir: "tanggal_lahir", tanggal_kelahiran: "tanggal_lahir",
};

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

export interface ImportProblem { row: number; nama: string; reason: string; }
export interface ImportPreview { valid: StudentInput[]; problems: ImportProblem[]; }

// Buat file .xlsx template dan picu unduhan di browser.
export function downloadTemplate(): void {
  // Tanggal lahir ditulis sebagai teks ISO agar guru menyalin bentuk yang benar;
  // parser tetap menerima 12/05/2015 dan sel bertanggal asli Excel.
  const example = [
    ["Ahmad Fauzi", "ahmadfauzi", "siswa123", "6A", "Tangerang", "2015-05-12"],
    ["Siti Nurhaliza", "sitinurhaliza", "siswa123", "6A", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], ...example]);
  ws["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, "Template_Import_Siswa_RuangCBT.xlsx");
}

// Baca workbook → array-of-arrays dari sheet pertama.
export function parseWorkbook(data: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("empty");
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" }) as unknown[][];
}

// Validasi baris terhadap template + daftar username siswa yang sudah ada.
export function buildPreview(rows: unknown[][], existingUsernames: Set<string>): ImportPreview {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow || !Array.isArray(headerRow)) {
    throw new Error("Format kolom tidak sesuai template RuangCBT. Pastikan baris pertama berisi judul kolom.");
  }

  const colOf: Partial<Record<keyof StudentInput, number>> = {};
  headerRow.forEach((cell, i) => {
    const field = HEADER_ALIASES[normalizeHeader(cell)];
    if (field && colOf[field] === undefined) colOf[field] = i;
  });

  if (colOf.nama_lengkap === undefined || colOf.username === undefined || colOf.password === undefined) {
    throw new Error("Format kolom tidak sesuai template RuangCBT. Pastikan ada kolom Nama Lengkap, Username, dan Password.");
  }

  const valid: StudentInput[] = [];
  const problems: ImportProblem[] = [];
  const seenInFile = new Set<string>();

  dataRows.forEach((r, idx) => {
    const rowNum = idx + 2; // baris 1 = judul kolom
    const cell = (c?: number) => (c === undefined ? "" : String((r as unknown[])[c] ?? "").trim());
    const nama = cell(colOf.nama_lengkap);
    const username = cell(colOf.username);
    const password = cell(colOf.password);
    const kelas = cell(colOf.kelas);
    const tempatLahir = cell(colOf.tempat_lahir);
    // Sel tanggal Excel bisa berupa serial number; baca nilai mentahnya, bukan
    // teks hasil cell(), supaya konversi tidak kehilangan informasi.
    const rawTanggal = colOf.tanggal_lahir === undefined
      ? ""
      : (r as unknown[])[colOf.tanggal_lahir];
    const tanggalLahir = toIsoBirthDate(rawTanggal);

    // Baris kosong (mis. di akhir file) — abaikan, bukan siswa.
    if (!nama && !username && !password && !kelas && !tempatLahir && !tanggalLahir) return;

    if (!nama) { problems.push({ row: rowNum, nama: username || "—", reason: "Nama belum diisi" }); return; }
    if (!username) { problems.push({ row: rowNum, nama, reason: "Username belum diisi" }); return; }
    if (!password) { problems.push({ row: rowNum, nama, reason: "Password belum diisi" }); return; }

    const uKey = username.toLowerCase();
    if (seenInFile.has(uKey)) {
      problems.push({ row: rowNum, nama, reason: `Username "${username}" ditulis dua kali dalam file` });
      return;
    }
    if (existingUsernames.has(uKey)) {
      problems.push({ row: rowNum, nama, reason: `Username "${username}" sudah terdaftar` });
      return;
    }

    seenInFile.add(uKey);
    // TTL yang tidak terbaca masuk sebagai kosong, tidak menggagalkan barisnya:
    // file import lama tanpa kolom TTL harus tetap berhasil.
    valid.push({
      nama_lengkap: nama, username, password, kelas,
      ...(tempatLahir ? { tempat_lahir: tempatLahir } : {}),
      ...(tanggalLahir ? { tanggal_lahir: tanggalLahir } : {}),
    });
  });

  return { valid, problems };
}
