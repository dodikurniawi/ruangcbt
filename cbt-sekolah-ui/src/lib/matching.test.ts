import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isAnswered } from "./answerSemantics.ts";
import { sanitizeDataSoal, sanitizeQuestionPayload } from "./questionSanitize.ts";
import {
  emptyMatchingDraft,
  nextMatchingId,
  serializeMatchingDraft,
  toMatchingDraft,
  updateMatchingAnswer,
  validateMatchingDraft,
  type MatchingDraft,
} from "./matching.ts";

const draft: MatchingDraft = {
  kiri: [{ id: "1", teks: "Jakarta" }, { id: "2", teks: "Bandung" }],
  kanan: [{ id: "A", teks: "Jawa Barat" }, { id: "B", teks: "DKI Jakarta" }],
  pasangan: { "1": "B", "2": "A" },
};

// ── Validasi draft admin (UX; GAS tetap otoritatif) ─────────────────────────
assert.equal(validateMatchingDraft(draft), null);
assert.match(validateMatchingDraft({ ...draft, kiri: [] }) ?? "", /item kiri/);
assert.match(validateMatchingDraft({ ...draft, kanan: [] }) ?? "", /item kanan/);
assert.match(validateMatchingDraft({
  ...draft,
  kiri: [{ id: "1", teks: "Jakarta" }, { id: "1", teks: "Bandung" }],
}) ?? "", /unik/);
assert.match(validateMatchingDraft({
  ...draft,
  kiri: [{ id: "1", teks: "<p> </p>" }, { id: "2", teks: "Bandung" }],
}) ?? "", /wajib diisi/);
assert.match(validateMatchingDraft({ ...draft, pasangan: { "1": "B" } }) ?? "", /wajib dipasangkan/);
assert.match(validateMatchingDraft({ ...draft, pasangan: { "1": "B", "2": "Z" } }) ?? "", /tidak ada/);

// ── Stable ID: teks berubah, ID tetap; ID baru tidak memakai index ─────────
assert.equal(nextMatchingId(draft.kiri, "kiri"), "3");
assert.equal(nextMatchingId(draft.kanan, "kanan"), "C");
assert.equal(nextMatchingId([draft.kiri[1]], "kiri"), "1", "ID bebas dipakai ulang hanya bila item hilang");
assert.equal(nextMatchingId([{ id: "A", teks: "" }, { id: "C", teks: "" }], "kanan"), "B");
// Kolom kanan tidak kehabisan ID setelah Z.
const alphabet = Array.from({ length: 26 }, (_, i) => ({ id: String.fromCharCode(65 + i), teks: "" }));
assert.equal(nextMatchingId(alphabet, "kanan"), "AA");

const renamed: MatchingDraft = {
  ...draft,
  kiri: draft.kiri.map((item) => ({ ...item, teks: item.teks + " (revisi)" })),
};
assert.deepEqual(serializeMatchingDraft(renamed).kunci_jawaban, serializeMatchingDraft(draft).kunci_jawaban,
  "mengubah teks tidak boleh menggeser kunci");

// ── Serialisasi ↔ rekonstruksi (round-trip Bank Soal) ─────────────────────
const serialized = serializeMatchingDraft(draft);
assert.deepEqual(serialized.data_soal, {
  kiri: [{ id: "1", teks: "Jakarta" }, { id: "2", teks: "Bandung" }],
  kanan: [{ id: "A", teks: "Jawa Barat" }, { id: "B", teks: "DKI Jakarta" }],
});
assert.deepEqual(JSON.parse(serialized.kunci_jawaban), { "1": "B", "2": "A" });
assert.deepEqual(toMatchingDraft(serialized.data_soal, serialized.kunci_jawaban), draft);

// Kunci rusak atau menunjuk ID yang hilang tidak pernah crash.
const recovered = toMatchingDraft(serialized.data_soal, "{bukan json");
assert.deepEqual(recovered.pasangan, {});
assert.deepEqual(
  toMatchingDraft(serialized.data_soal, '{"1":"Z","2":"A"}').pasangan,
  { "2": "A" },
  "pasangan ke item kanan yang hilang dibuang",
);
assert.deepEqual(emptyMatchingDraft().pasangan, {});
assert.notEqual(emptyMatchingDraft().kiri, emptyMatchingDraft().kiri, "draft baru tidak berbagi array");

// ── Jawaban siswa: Record<string,string>, parsial tetap terjaga ────────────
const partial = updateMatchingAnswer({}, "1", "B");
assert.deepEqual(partial, { "1": "B" });
const full = updateMatchingAnswer(partial, "2", "A");
assert.deepEqual(full, { "1": "B", "2": "A" }, "pasangan sebelumnya harus dipertahankan");
assert.deepEqual(updateMatchingAnswer(full, "1", "A"), { "1": "A", "2": "A" }, "memilih ulang menimpa");
assert.deepEqual(updateMatchingAnswer(full, "1", ""), { "2": "A" }, "mengosongkan menghapus pasangan");
assert.deepEqual(updateMatchingAnswer("rusak", "1", "B"), { "1": "B" }, "state rusak tidak crash");

// Answer semantics memakai helper 4.2.1, bukan truthiness.
assert.equal(isAnswered({}), false, "objek kosong = belum dijawab");
assert.equal(isAnswered(partial), true, "pasangan parsial dianggap terisi");
assert.equal(isAnswered(full), true);

// Serialisasi autosave/recovery mempertahankan objek apa adanya.
assert.deepEqual(JSON.parse(JSON.stringify({ MT1: partial })), { MT1: { "1": "B" } });

// ── Sanitizer MATCHING: teks kiri/kanan lewat allowlist, ID tetap plain ───
const cleaned = sanitizeDataSoal("MATCHING", {
  kiri: [{ id: "1", teks: '<script>alert(1)</script>Jakarta' }],
  kanan: [{ id: "A", teks: '<b onclick="steal()">DKI Jakarta</b>' }],
}) as { kiri: { id: string; teks: string }[]; kanan: { id: string; teks: string }[] };
assert.equal(cleaned.kiri[0].teks, "Jakarta");
assert.equal(cleaned.kanan[0].teks, "<b>DKI Jakarta</b>");
assert.equal(cleaned.kiri[0].id, "1", "ID tetap identifier polos");

const payload = sanitizeQuestionPayload({
  tipe: "MATCHING",
  pertanyaan: "Jodohkan",
  kunci_jawaban: '{"1":"B"}',
  data_soal: { kiri: [{ id: "1", teks: '<img src=x onerror="alert(1)">Jakarta' }], kanan: [{ id: "B", teks: "DKI" }] },
});
assert.equal(
  (payload.data_soal as { kiri: { teks: string }[] }).kiri[0].teks, "Jakarta",
  "nested HTML tidak boleh bypass sanitizer",
);
assert.equal(payload.kunci_jawaban, '{"1":"B"}', "kunci mapping lewat apa adanya untuk divalidasi GAS");

// Struktur tidak lengkap dibuang seluruhnya agar GAS menolak (fail closed).
assert.equal("data_soal" in sanitizeQuestionPayload({
  tipe: "MATCHING",
  pertanyaan: "Jodohkan",
  data_soal: { kiri: [{ id: "1", teks: "Jakarta" }] },
}), false, "MATCHING tanpa kanan harus dibuang");
assert.equal("data_soal" in sanitizeQuestionPayload({
  tipe: "MATCHING",
  pertanyaan: "Jodohkan",
  data_soal: { kiri: [{ id: "1", teks: "Jakarta", kunci: "B" }], kanan: [{ id: "B", teks: "DKI" }] },
}), false, "field asing di dalam item harus membuang seluruh data_soal");

// ── Mutation C: bypass sanitizer kiri/kanan ───────────────────────────────
const source = readFileSync(new URL("./questionSanitize.ts", import.meta.url), "utf8");
const mutated = source.replace(
  "    items.push({ id, teks: sanitizeQuestionHtml(raw.teks) });",
  "    items.push({ id, teks: String(raw.teks) });",
);
assert.notEqual(mutated, source, "titik mutation C tidak ditemukan");
const dir = mkdtempSync(join(tmpdir(), "ruangcbt-matching-"));
const file = join(dir, "questionSanitize.ts");
writeFileSync(file, mutated, "utf8");
try {
  const broken = await import(pathToFileURL(file).href);
  const unsafe = broken.sanitizeDataSoal("MATCHING", {
    kiri: [{ id: "1", teks: "<script>steal()</script>Jakarta" }],
    kanan: [{ id: "A", teks: "DKI" }],
  }) as { kiri: { teks: string }[] };
  assert.throws(() => assert.equal(unsafe.kiri[0].teks, "Jakarta"), "mutation C tidak terdeteksi");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// ── Mutation F: jawaban parsial dianggap kosong ───────────────────────────
const truthyAnswered = (answer: unknown) =>
  typeof answer === "object" && answer !== null && Object.keys(answer).length > 1;
assert.throws(() => assert.equal(truthyAnswered(partial), true), "mutation F tidak terdeteksi");
assert.equal(isAnswered(partial), true);

console.log("matching: draft, stable ID, pasangan parsial, sanitasi, mutation C/F PASS");
