// Task — import soal dari Excel.
// Jalankan: node --experimental-strip-types src/lib/excelImport.test.ts
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  SOAL_TEMPLATE_HEADERS,
  parseExcelQuestions,
  soalTemplateRows,
} from "./excelImport.ts";
import { isReady, statusReasons } from "./wordImport.ts";

// Bantu: array-of-rows → ArrayBuffer .xlsx (meniru file yang dipilih guru).
function xlsxBuffer(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Soal");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

const HEADER = (["No", "Soal", "A", "B", "C", "D", "E", "Jawaban", "Bobot"]);
function row(nomor: unknown, soal: unknown, jawaban: unknown, extra: Record<string, unknown> = {}) {
  return [
    nomor, soal, "Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D", "Pilihan E", jawaban, 1,
  ].map((v, i) => (extra[i] !== undefined ? extra[i] : v));
}

// ── Template valid: bisa langsung dipakai dan di-parse siap import ──────────
{
  const rows = soalTemplateRows();
  assert.deepEqual(rows[0], [...SOAL_TEMPLATE_HEADERS], "judul kolom template");
  assert.equal(rows.length, 2, "template membawa satu baris contoh");

  const parsed = parseExcelQuestions(xlsxBuffer(rows));
  assert.equal(parsed.questions.length, 1);
  const q = parsed.questions[0];
  assert.equal(q.kunci_jawaban, "B");
  assert.equal(q.bobot, 1);
  assert.equal(q.issues.length, 0, `template contoh tidak boleh bermasalah: ${q.issues.join("|")}`);
  assert.equal(isReady(q), true, "template contoh langsung siap diimport");
}

// ── Banyak soal terbaca urut ────────────────────────────────────────────────
{
  const parsed = parseExcelQuestions(xlsxBuffer([
    HEADER,
    row(1, "Soal satu", "A"),
    row(2, "Soal dua", "B"),
    row(3, "Soal tiga", "C"),
    row(4, "Soal empat", "D"),
    row(5, "Soal lima", "E"),
  ]));
  assert.equal(parsed.questions.length, 5);
  assert.deepEqual(parsed.questions.map((q) => q.pertanyaan),
    ["Soal satu", "Soal dua", "Soal tiga", "Soal empat", "Soal lima"]);
  assert.deepEqual(parsed.questions.map((q) => q.kunci_jawaban), ["A", "B", "C", "D", "E"]);
  assert.equal(parsed.questions.every(isReady), true);
}

// ── Kolom Jawaban: huruf kecil disamakan, nilai luar A–E ditolak ────────────
{
  const parsed = parseExcelQuestions(xlsxBuffer([
    HEADER,
    row(1, "Jawaban kecil", "b"),
    row(2, "Jawaban liar", "Z"),
  ]));
  assert.equal(parsed.questions[0].kunci_jawaban, "B", "huruf kecil dinormalisasi");
  assert.equal(isReady(parsed.questions[0]), true);
  assert.equal(parsed.questions[1].kunci_jawaban, "", "huruf di luar A–E tidak tersimpan");
  assert.ok(parsed.questions[1].issues.some((i) => /tidak valid/.test(i)));
  assert.equal(isReady(parsed.questions[1]), false);
}

// ── Jawaban kosong → PERLU DICEK, tidak diimport diam-diam ──────────────────
{
  const parsed = parseExcelQuestions(xlsxBuffer([HEADER, row(1, "Tanpa kunci", "")]));
  const q = parsed.questions[0];
  assert.equal(q.kunci_jawaban, "", "kunci kosong tetap kosong");
  assert.deepEqual(statusReasons(q), ["Kunci jawaban belum ditemukan"]);
  assert.equal(isReady(q), false);
}

// ── Data tidak valid ditandai, baris tetap terlihat di preview ──────────────
{
  const parsed = parseExcelQuestions(xlsxBuffer([
    HEADER,
    row(1, "", "A"),
    row(2, "Opsi C kosong", "C", { 4: "" }),
    row(3, "Bobot bukan angka", "D", { 8: "abc" }),
    row(4, "Soal sehat", "E"),
  ]));
  const [tanpaSoal, opsiKosong, bobotSalah, sehat] = parsed.questions;
  assert.ok(tanpaSoal.issues.some((i) => /Pertanyaan tidak terbaca/.test(i)), `${tanpaSoal.issues.join("|")}`);
  assert.equal(isReady(tanpaSoal), false);
  assert.ok(opsiKosong.issues.some((i) => /Opsi C tidak ditemukan/.test(i)));
  assert.equal(isReady(opsiKosong), false);
  assert.ok(bobotSalah.issues.some((i) => /Bobot harus angka/.test(i)));
  assert.equal(isReady(bobotSalah), false);
  assert.equal(sehat.issues.length, 0, "soal lengkap di antara tetangga bermasalah tetap sehat");
  assert.equal(isReady(sehat), true);
  assert.equal(parsed.questions.length, 4, "baris bermasalah tetap muncul supaya guru bisa memperbaikinya");
}

// ── File yang hanya berisi kolom Soal → row ditandai, tidak lolos apa adanya ─
{
  const parsed = parseExcelQuestions(xlsxBuffer([
    ["Soal"],
    ["Quis satu"],
  ]));
  assert.equal(parsed.questions.length, 1);
  assert.equal(parsed.questions[0].pertanyaan, "Quis satu");
  assert.ok(parsed.questions[0].issues.length > 0, "baris hanya berisi soal tidak boleh lolos apa adanya");
  assert.equal(isReady(parsed.questions[0]), false);
}

// ── Baris kosong di akhir file diabaikan, bukan jadi soal ───────────────────
{
  const parsed = parseExcelQuestions(xlsxBuffer([
    HEADER,
    row(1, "Soal valid", "A"),
    [""],
    ["", "", "", "", "", "", "", "", ""],
  ]));
  assert.equal(parsed.questions.length, 1, "baris kosong tidak menjadi soal");
  assert.equal(isReady(parsed.questions[0]), true);
}

// ── Struktur salah total → error yang bisa dibaca guru ──────────────────────
{
  assert.throws(
    () => parseExcelQuestions(xlsxBuffer([["Acak", "Kiri", "Kanan"]])),
    /template RuangCBT/i,
  );
}

console.log("excelImport: template, banyak soal, jawaban kosong/liar, data tak valid, baris kosong + struktur salah PASS");