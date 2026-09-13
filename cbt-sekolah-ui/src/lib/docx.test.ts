// Task — end-to-end dokumen nyata "Sosiologi.docx" (contoh guru) di root repo.
// Ini satu-satunya test yang menjalankan pembaca .docx asli (ZIP + XML): bold,
// tabel, dan gambar rels. Angka-angka kunci di bawah dianchorkan pada dokumen
// saat ini — jika angka berubah, berarti parse berubah, dan itu HARUS terlihat.
// Jalankan: node --experimental-strip-types src/lib/docx.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractDocxBlocks, extractDocxImages } from "./docx.ts";
import { parseQuestions, isReady, statusReasons } from "./wordImport.ts";

const here = dirname(fileURLToPath(import.meta.url));
const samplePath = join(here, "..", "..", "..", "Sosiologi.docx");

{
  const doc = readFileSync(samplePath) as Buffer;
  const buffer = doc.buffer.slice(doc.byteOffset, doc.byteOffset + doc.byteLength) as ArrayBuffer;

  // ── Pembaca .docx asli: tata letak dokumen guru terbaca utuh ──────────────
  const blocks = await extractDocxBlocks(buffer);
  assert.ok(blocks.length >= 500, `terlalu sedikit blok dari dokumen nyata (${blocks.length})`);
  assert.ok(blocks.some((b) => b.bold), "dokumen nyata memuat teks tebal dan harus terdeteksi");
  // Dokumen ini mengapit dua gambar berdiri sendiri (logo area) yang tidak
  // melekat ke soal mana pun; tanpa rId, tidak boleh ada gambar "kenyangkut".
  const standalone = blocks.filter((b) => b.hasImage);
  assert.equal(standalone.length, 2, `gambar berdiri sendiri sebanyak ${standalone.length}`);
  assert.ok(standalone.every((b) => !b.imageRelId), "gambar tanpa relasi tetap jujur dilaporkan");

  const relIds = new Set<string>();
  for (const b of blocks) if (b.imageRelId) relIds.add(b.imageRelId);
  const images = await extractDocxImages(buffer, [...relIds]);
  assert.ok(images instanceof Map, "peta gambar hasil extract harus siap dipakai");
  assert.equal(images.size, 0, "tidak ada gambar badan soal yang bisa dibaca di dokumen ini");

  // ── Parsing: 80 soal terbaca, mapel terdeteksi, petunjuk dilewati ─────────
  const parsed = parseQuestions(blocks);
  assert.equal(parsed.detectedMapel, "SOSIOLOGI", "baris mapel dibaca sebagai saran");
  assert.ok(parsed.skippedBlocks >= 1, "petunjuk bernomor dilaporkan sebagai bagian yang dilewati");
  assert.equal(parsed.questions.length, 80, `soal terbaca ${parsed.questions.length}`);
  // Multi-paragraf: dokumen punya jauh lebih banyak blok daripada blok minimum soal.
  assert.ok(blocks.length >= parsed.questions.length * 6, "pertanyaan multi-paragraf dirakit jadi satu soal");
  // Opsi lengkap A–E untuk hampir semua; quirk dokumen nyata (opsi mulai dari
  // "B." dan satu soal opsi dobel) harus setiap kali ditandai, tidak diimport.
  for (const q of parsed.questions) {
    const opsi = [q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d, q.opsi_e];
    if (opsi.every((o) => o.trim() !== "")) continue;
    assert.ok(
      q.issues.some((i) => /Urutan opsi tidak berurutan|Opsi E tidak ditemukan/.test(i)),
      `soal ${q.nomor_urut} kekurangan opsi tanpa tanda`,
    );
    assert.equal(isReady(q), false, `soal ${q.nomor_urut} dengan opsi hilang tidak boleh siap`);
  }
  assert.equal(
    parsed.questions.filter((q) => /tergabung|tabel yang belum/.test(q.issues.join(" "))).length, 3,
    "tiga soal dengan struktur tabel/opsi khas dokumen nyata ditandai",
  );
  for (const q of parsed.questions) {
    if (/tergabung|tabel yang belum/.test(q.issues.join(" "))) {
      assert.equal(isReady(q), false, `soal ${q.nomor_urut} berstruktur aneh tidak siap`);
    }
  }

  // ── Tidak boleh ada tebakan massal tanpa bagian kunci ─────────────────────
  const ready = parsed.questions.filter(isReady);
  const pending = parsed.questions.filter((q) => !isReady(q));
  assert.equal(ready.length, 1, "tepat satu soal terkunci dari opsi tebal, tanpa bagian kunci");
  assert.equal(ready[0].kunci_jawaban, "A");
  const kunciOnly = pending.filter(
    (q) => JSON.stringify(statusReasons(q)) === JSON.stringify(["Kunci jawaban belum ditemukan"]),
  );
  assert.ok(kunciOnly.length >= 75, `sebagian besar soal PERLU DICEK karena kunci belum ada (${kunciOnly.length}/80)`);
  assert.equal(ready.length + pending.length, 80, "tidak ada soal yang hilang atau dobel");
}

console.log("docx: dokumen nyata Sosiologi.docx — blok, tebal, gambar, 80 soal, no-guess PASS");