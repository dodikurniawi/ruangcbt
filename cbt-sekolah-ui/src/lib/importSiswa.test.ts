// Self-check untuk logika validasi import siswa.
// Jalankan: node --experimental-strip-types src/lib/importSiswa.test.ts
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { buildPreview, parseWorkbook, TEMPLATE_HEADERS } from "./importSiswa.ts";

// Bantu: array-of-rows → ArrayBuffer .xlsx (meniru file yang dipilih guru).
function xlsxBuffer(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

const H = [...TEMPLATE_HEADERS];
const noExisting = new Set<string>();

// 1. Tiga siswa valid
{
  const rows = parseWorkbook(xlsxBuffer([
    H,
    ["Ahmad", "ahmad", "p1", "6A"],
    ["Budi", "budi", "p2", "6A"],
    ["Citra", "citra", "p3", "6B"],
  ]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(valid.length, 3, "3 valid");
  assert.equal(problems.length, 0, "0 problem");
  assert.deepEqual(valid[0], { nama_lengkap: "Ahmad", username: "ahmad", password: "p1", kelas: "6A" });
}

// 2. Baris kosong di akhir file diabaikan
{
  const rows = parseWorkbook(xlsxBuffer([
    H,
    ["Ahmad", "ahmad", "p1", "6A"],
    ["", "", "", ""],
    ["", "", "", ""],
  ]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(valid.length, 1, "baris kosong bukan siswa");
  assert.equal(problems.length, 0);
}

// 3. Field wajib kosong → problem dengan nomor baris
{
  const rows = parseWorkbook(xlsxBuffer([
    H,
    ["Ahmad", "ahmad", "", "6A"],       // password kosong
    ["", "budi", "p2", "6A"],            // nama kosong
    ["Citra", "", "p3", "6B"],           // username kosong
  ]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(valid.length, 0);
  assert.equal(problems.length, 3);
  assert.equal(problems[0].row, 2);
  assert.match(problems[0].reason, /Password belum diisi/);
  assert.match(problems[1].reason, /Nama belum diisi/);
  assert.match(problems[2].reason, /Username belum diisi/);
}

// 4. Duplicate dalam file (case-insensitive)
{
  const rows = parseWorkbook(xlsxBuffer([
    H,
    ["Ahmad", "ahmad", "p1", "6A"],
    ["Ahmad Dua", "AHMAD", "p2", "6A"],
  ]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(valid.length, 1, "hanya baris pertama masuk");
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /ditulis dua kali/);
}

// 5. Duplicate dengan siswa existing
{
  const rows = parseWorkbook(xlsxBuffer([
    H,
    ["Ahmad", "ahmad", "p1", "6A"],
    ["Budi", "budi", "p2", "6A"],
  ]));
  const { valid, problems } = buildPreview(rows, new Set(["budi"]));
  assert.equal(valid.length, 1);
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /sudah terdaftar/);
}

// 6. Header salah → error bahasa natural, tidak crash
{
  const rows = parseWorkbook(xlsxBuffer([
    ["Kolom A", "Kolom B", "Kolom C"],
    ["x", "y", "z"],
  ]));
  assert.throws(() => buildPreview(rows, noExisting), /tidak sesuai template RuangCBT/);
}

// 7. Header alias (NIS = username, Sandi = password, Nama = nama_lengkap)
{
  const rows = parseWorkbook(xlsxBuffer([
    ["Nama", "NIS", "Sandi", "Rombel"],
    ["Ahmad", "12345", "rahasia", "6A"],
  ]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(problems.length, 0);
  assert.deepEqual(valid[0], { nama_lengkap: "Ahmad", username: "12345", password: "rahasia", kelas: "6A" });
}

// 8. Kelas boleh kosong (opsional), tetap valid
{
  const rows = parseWorkbook(xlsxBuffer([H, ["Ahmad", "ahmad", "p1", ""]]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(valid.length, 1);
  assert.equal(problems.length, 0);
  assert.equal(valid[0].kelas, "");
}

console.log("importSiswa: 8/8 skenario PASS");

// 9. Kolom TTL baru terbaca, termasuk variasi penulisan header dan sel bertanggal.
{
  const rows = parseWorkbook(xlsxBuffer([
    ["Nama Lengkap", "Username", "Password", "Kelas", "Tempat Lahir", "Tgl Lahir"],
    ["Ahmad", "ahmad", "p1", "6A", " Tangerang ", "2015-05-12"],
    ["Budi", "budi", "p2", "6A", "Jakarta", "20/06/2014"],
    ["Citra", "citra", "p3", "6B", "", ""],
  ]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(problems.length, 0);
  assert.equal(valid[0].tempat_lahir, "Tangerang", "tempat lahir di-trim");
  assert.equal(valid[0].tanggal_lahir, "2015-05-12");
  assert.equal(valid[1].tanggal_lahir, "2014-06-20", "12/05/2015 dibaca hari-dulu");
  assert.equal(valid[2].tempat_lahir, undefined, "TTL kosong tidak dikirim, bukan string palsu");
  assert.equal(valid[2].tanggal_lahir, undefined);
  assert.notEqual(valid[0].tanggal_lahir, valid[1].tanggal_lahir, "TTL tidak tertukar antar siswa");
}

// 10. Backward compatible: file lama tanpa kolom TTL tetap berhasil diimpor.
{
  const rows = parseWorkbook(xlsxBuffer([
    ["Nama Lengkap", "Username", "Password", "Kelas"],
    ["Ahmad", "ahmad", "p1", "6A"],
  ]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(problems.length, 0);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].nama_lengkap, "Ahmad");
  assert.ok(!("tanggal_lahir" in valid[0]));
}

// 11. Tanggal tidak terbaca tidak menggagalkan siswanya — hanya TTL yang kosong.
{
  const rows = parseWorkbook(xlsxBuffer([
    [...TEMPLATE_HEADERS],
    ["Ahmad", "ahmad", "p1", "6A", "Tangerang", "entah kapan"],
  ]));
  const { valid, problems } = buildPreview(rows, noExisting);
  assert.equal(problems.length, 0, "baris tetap sah");
  assert.equal(valid[0].tempat_lahir, "Tangerang");
  assert.equal(valid[0].tanggal_lahir, undefined);
}

console.log("importSiswa: 3 skenario TTL PASS");
