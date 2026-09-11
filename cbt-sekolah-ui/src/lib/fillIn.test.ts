import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isAnswered } from "./answerSemantics.ts";
import { sanitizeDataSoal, sanitizeQuestionPayload } from "./questionSanitize.ts";
import {
  EMPTY_FILL_IN_DRAFT,
  serializeFillInDraft,
  toFillInDraft,
  validateFillInDraft,
  type FillInDraft,
} from "./fillIn.ts";

const draft: FillInDraft = {
  petunjuk: "<p>Tulis nama kota.</p>",
  acceptedAnswers: ["Jakarta", "DKI Jakarta"],
  caseSensitive: false,
  trim: true,
};

// ── Validasi draft admin (UX; GAS tetap otoritatif) ─────────────────────────
assert.equal(validateFillInDraft(draft), null);
assert.match(validateFillInDraft({ ...draft, petunjuk: "<p>  </p>" }) ?? "", /Petunjuk/);
assert.match(validateFillInDraft({ ...draft, acceptedAnswers: [] }) ?? "", /minimal satu/);
assert.match(validateFillInDraft({ ...draft, acceptedAnswers: ["Jakarta", "  "] }) ?? "", /wajib diisi/);
assert.match(validateFillInDraft({ ...draft, acceptedAnswers: ["Jakarta", " jakarta "] }) ?? "", /duplikat/);
// Duplikat itu sah ketika huruf besar/kecil dibedakan.
assert.equal(
  validateFillInDraft({ ...draft, caseSensitive: true, acceptedAnswers: ["Jakarta", "jakarta"] }),
  null,
);
assert.equal(EMPTY_FILL_IN_DRAFT.trim, true, "default trim aktif");
assert.equal(EMPTY_FILL_IN_DRAFT.caseSensitive, false, "default case-insensitive");

// ── Serialisasi ↔ rekonstruksi draft (round-trip Bank Soal) ────────────────
const serialized = serializeFillInDraft(draft);
assert.deepEqual(serialized.data_soal, { petunjuk: "<p>Tulis nama kota.</p>" });
assert.deepEqual(JSON.parse(serialized.kunci_jawaban), {
  accepted_answers: ["Jakarta", "DKI Jakarta"],
  case_sensitive: false,
  trim: true,
});
assert.deepEqual(toFillInDraft(serialized.data_soal, serialized.kunci_jawaban), draft);

const strict: FillInDraft = { ...draft, caseSensitive: true, trim: false, acceptedAnswers: [" Jakarta "] };
const strictSerialized = serializeFillInDraft(strict);
assert.deepEqual(JSON.parse(strictSerialized.kunci_jawaban).accepted_answers, [" Jakarta "],
  "trim=false tidak boleh diam-diam memangkas kunci");
assert.deepEqual(toFillInDraft(strictSerialized.data_soal, strictSerialized.kunci_jawaban), strict);

// Kunci rusak jatuh ke default, bukan crash.
const recovered = toFillInDraft({ petunjuk: "x" }, "{bukan json");
assert.deepEqual(recovered, { petunjuk: "x", acceptedAnswers: [""], caseSensitive: false, trim: true });

// ── Jawaban siswa: string, memakai semantic helper yang sama ────────────────
assert.equal(isAnswered(""), false, "jawaban kosong = belum dijawab");
assert.equal(isAnswered("Jakarta"), true);
assert.deepEqual(JSON.parse(JSON.stringify({ FI1: "  Jakarta " })), { FI1: "  Jakarta " },
  "serialisasi autosave mempertahankan string apa adanya");

// ── Sanitizer FILL_IN: petunjuk lewat allowlist, bentuk rusak fail closed ──
assert.deepEqual(
  sanitizeDataSoal("FILL_IN", { petunjuk: '<p onclick="x()">Tulis</p><script>alert(1)</script>' }),
  { petunjuk: "<p>Tulis</p>" },
);
const nested = sanitizeQuestionPayload({
  tipe: "FILL_IN",
  pertanyaan: "Ibu kota?",
  kunci_jawaban: '{"accepted_answers":["Jakarta"]}',
  data_soal: { petunjuk: '<img src=x onerror="alert(1)">Nama kota' },
});
assert.equal((nested.data_soal as { petunjuk: string }).petunjuk, "Nama kota");
assert.equal(nested.kunci_jawaban, '{"accepted_answers":["Jakarta"]}', "kunci lewat apa adanya");

// data_soal dengan field asing dibuang seluruhnya agar GAS menolak, bukan
// disimpan sebagai subset "valid".
const extraField = sanitizeQuestionPayload({
  tipe: "FILL_IN",
  pertanyaan: "Ibu kota?",
  data_soal: { petunjuk: "Nama kota", accepted_answers: ["Jakarta"] },
});
assert.equal("data_soal" in extraField, false, "struktur FILL_IN tidak lengkap harus dibuang");

// ── Mutation C: bypass sanitizer petunjuk ──────────────────────────────────
const source = readFileSync(new URL("./questionSanitize.ts", import.meta.url), "utf8");
const mutated = source.replace(
  "      const petunjuk = sanitizeQuestionHtml(dataSoal.petunjuk);",
  "      const petunjuk = String(dataSoal.petunjuk ?? \"\");",
);
assert.notEqual(mutated, source, "titik mutation C tidak ditemukan");
const dir = mkdtempSync(join(tmpdir(), "ruangcbt-fillin-"));
const file = join(dir, "questionSanitize.ts");
writeFileSync(file, mutated, "utf8");
try {
  const broken = await import(pathToFileURL(file).href);
  const unsafe = broken.sanitizeDataSoal("FILL_IN", {
    petunjuk: "<script>steal()</script>Nama kota",
  }) as { petunjuk: string };
  assert.throws(() => assert.equal(unsafe.petunjuk, "Nama kota"), "mutation C tidak terdeteksi");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
assert.equal(
  (sanitizeDataSoal("FILL_IN", { petunjuk: "<script>steal()</script>Nama kota" }) as { petunjuk: string }).petunjuk,
  "Nama kota",
);

console.log("fillIn: admin draft, round-trip, sanitasi petunjuk, mutation C PASS");
