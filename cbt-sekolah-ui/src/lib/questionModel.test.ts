import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  sanitizeQuestionPayload,
  sanitizeDataSoal,
  BASE_RICH_TEXT_FIELDS,
  LEGACY_OPTION_FIELDS,
  DATA_SOAL_TEXT_PATHS,
} from "./questionSanitize.ts";
import {
  QUESTION_TYPES,
  QUESTION_TYPES_IMPLEMENTED,
  QUESTION_WRITE_FIELDS,
  STUDENT_QUESTION_FIELDS,
  ADMIN_ONLY_QUESTION_FIELDS,
  type StudentQuestion,
  type QuestionAdminFields,
  type QuestionWritePayload,
} from "../types/index.ts";

const contract = JSON.parse(
  readFileSync(new URL("../../../question-contract.json", import.meta.url), "utf8")
) as {
  types_canonical: string[];
  types_implemented: string[];
  write_fields: string[];
  student_fields: string[];
  rich_text: { base: string[]; legacy_options: string[]; data_soal: Record<string, string[]> };
  admin_only_fields: string[];
  answer_key: { forbidden_in_data_soal: string[] };
};

// ── Parity TS ↔ kontrak ─────────────────────────────────────────────────────
assert.deepEqual([...QUESTION_TYPES], contract.types_canonical, "QUESTION_TYPES menyimpang dari kontrak");
assert.deepEqual([...QUESTION_TYPES_IMPLEMENTED], contract.types_implemented, "types_implemented menyimpang");
assert.deepEqual([...QUESTION_WRITE_FIELDS], contract.write_fields, "write_fields TS menyimpang");
assert.deepEqual([...STUDENT_QUESTION_FIELDS], contract.student_fields, "student_fields TS menyimpang");
assert.deepEqual([...ADMIN_ONLY_QUESTION_FIELDS], contract.admin_only_fields, "admin_only_fields TS menyimpang");
assert.deepEqual([...BASE_RICH_TEXT_FIELDS], contract.rich_text.base);
assert.deepEqual([...LEGACY_OPTION_FIELDS], contract.rich_text.legacy_options);
assert.deepEqual(
  Object.keys(DATA_SOAL_TEXT_PATHS).sort(),
  Object.keys(contract.rich_text.data_soal).sort(),
  "tipe pada DATA_SOAL_TEXT_PATHS tidak sama dengan kontrak"
);
for (const tipe of Object.keys(contract.rich_text.data_soal)) {
  assert.deepEqual(
    [...DATA_SOAL_TEXT_PATHS[tipe]],
    contract.rich_text.data_soal[tipe],
    `jalur rich-text data_soal ${tipe} menyimpang dari kontrak`
  );
}
// Setiap tipe canonical wajib punya entri jalur, walau kosong.
for (const tipe of contract.types_canonical) {
  assert.ok(tipe in DATA_SOAL_TEXT_PATHS, `tipe ${tipe} tidak punya kontrak sanitasi data_soal`);
}
assert.ok(
  contract.types_implemented.every((t) => contract.types_canonical.includes(t)),
  "types_implemented harus subset types_canonical"
);

type KeysOfUnion<T> = T extends T ? keyof T : never;
type SameKeys<A, B> = Exclude<A, B> extends never
  ? Exclude<B, A> extends never ? true : false
  : false;

const studentFieldsMatchType: SameKeys<
  KeysOfUnion<StudentQuestion>,
  (typeof STUDENT_QUESTION_FIELDS)[number]
> = true;
const adminFieldsMatchType: SameKeys<
  keyof QuestionAdminFields,
  (typeof ADMIN_ONLY_QUESTION_FIELDS)[number]
> = true;
const writeFieldsMatchType: SameKeys<
  KeysOfUnion<QuestionWritePayload>,
  (typeof QUESTION_WRITE_FIELDS)[number]
> = true;
assert.equal(studentFieldsMatchType && adminFieldsMatchType && writeFieldsMatchType, true);

const futureCanonicalSamples: StudentQuestion[] = [
  {
    id_soal: "TF1", nomor_urut: 1, tipe: "TRUE_FALSE", pertanyaan: "Nilai pernyataan",
    bobot: 1, data_soal: { pernyataan: [{ id: "1", teks: "Jakarta adalah ibu kota" }] },
  },
  {
    id_soal: "M1", nomor_urut: 2, tipe: "MATCHING", pertanyaan: "Jodohkan",
    bobot: 1,
    data_soal: {
      kiri: [{ id: "1", teks: "Jakarta" }],
      kanan: [{ id: "A", teks: "Ibu kota Indonesia" }],
    },
  },
  {
    id_soal: "F1", nomor_urut: 3, tipe: "FILL_IN", pertanyaan: "Isi jawaban",
    bobot: 1, data_soal: { petunjuk: "Nama kota" },
  },
];
assert.deepEqual(futureCanonicalSamples.map((question) => question.tipe), ["TRUE_FALSE", "MATCHING", "FILL_IN"]);

// ── Backward compatibility: payload SINGLE/COMPLEX lama tidak berubah bentuk ─
const legacySingle = {
  tipe: "SINGLE",
  nomor_urut: 1,
  pertanyaan: "<p>Ibu kota <b>Indonesia</b>?</p>",
  opsi_a: "Jakarta", opsi_b: "Bandung", opsi_c: "Medan", opsi_d: "Surabaya", opsi_e: "",
  kunci_jawaban: "A",
  bobot: 1,
  kategori: "Mudah",
  id_mapel: "MAPEL_A",
  gambar_url: "",
};
const cleanSingle = sanitizeQuestionPayload(legacySingle);
assert.equal(cleanSingle.pertanyaan, "<p>Ibu kota <b>Indonesia</b>?</p>", "rich text sah harus bertahan");
assert.equal(cleanSingle.opsi_a, "Jakarta");
assert.equal(cleanSingle.kunci_jawaban, "A", "kunci legacy tidak boleh diubah");
assert.equal(cleanSingle.bobot, 1);
assert.equal(cleanSingle.id_mapel, "MAPEL_A");
assert.equal("data_soal" in cleanSingle, false, "SINGLE tidak boleh memperoleh data_soal");

const cleanComplex = sanitizeQuestionPayload({ ...legacySingle, tipe: "COMPLEX", kunci_jawaban: "A,C" });
assert.equal(cleanComplex.kunci_jawaban, "A,C", "kunci COMPLEX legacy tetap string apa adanya");
assert.equal("data_soal" in cleanComplex, false);

// ── Sanitasi base + opsi legacy ─────────────────────────────────────────────
const xss = sanitizeQuestionPayload({
  tipe: "SINGLE",
  pertanyaan: '<p onclick="steal()">Soal</p><script>alert(1)</script>',
  opsi_a: '<img src=x onerror="alert(1)">Jakarta',
  opsi_b: '<a href="javascript:alert(1)">Bandung</a>',
  opsi_c: "<b>Medan</b>",
  opsi_d: "Surabaya",
  opsi_e: "<style>body{display:none}</style>Papua",
});
assert.equal(xss.pertanyaan, "<p>Soal</p>");
assert.equal(xss.opsi_a, "Jakarta");
assert.equal(xss.opsi_b, "<a>Bandung</a>");
assert.equal(xss.opsi_c, "<b>Medan</b>", "format aman tetap hidup");
assert.equal(xss.opsi_e, "Papua");

// ── Sanitasi nested data_soal per tipe ──────────────────────────────────────
const tf = sanitizeQuestionPayload({
  tipe: "TRUE_FALSE",
  pertanyaan: "Nilai pernyataan berikut",
  data_soal: {
    pernyataan: [
      { id: "1", teks: '<script>alert(1)</script>Jakarta ibukota' },
      { id: "2", teks: '<b onclick="x">Bandung di Jawa Timur</b>' },
    ],
  },
});
const tfData = tf.data_soal as { pernyataan: { id: string; teks: string }[] };
assert.equal(tfData.pernyataan[0].teks, "Jakarta ibukota");
assert.equal(tfData.pernyataan[1].teks, "<b>Bandung di Jawa Timur</b>");
assert.equal(tfData.pernyataan.length, 2);

const match = sanitizeQuestionPayload({
  tipe: "MATCHING",
  pertanyaan: "Jodohkan",
  data_soal: {
    kiri: [{ id: "1", teks: '<iframe src="//evil"></iframe>Jakarta' }],
    kanan: [{ id: "A", teks: '<img src=x onerror=alert(1)>Ibukota' }],
  },
});
const matchData = match.data_soal as { kiri: { teks: string }[]; kanan: { teks: string }[] };
assert.equal(matchData.kiri[0].teks, "Jakarta");
assert.equal(matchData.kanan[0].teks, "Ibukota");

const fill = sanitizeQuestionPayload({
  tipe: "FILL_IN",
  pertanyaan: "Sebutkan ibukota",
  data_soal: { petunjuk: '<p onmouseover="x">Tulis nama kota</p>' },
});
assert.equal((fill.data_soal as { petunjuk: string }).petunjuk, "<p>Tulis nama kota</p>");

// ── Struktur rusak dibuang, tidak diteruskan setengah jadi ──────────────────
assert.equal(sanitizeDataSoal("TRUE_FALSE", { pernyataan: "bukan array" }), undefined);
assert.equal(sanitizeDataSoal("TRUE_FALSE", null), undefined);
assert.equal(sanitizeDataSoal("TRUE_FALSE", []), undefined);
assert.equal(sanitizeDataSoal("SINGLE", { pernyataan: [{ id: "1", teks: "x" }] }), undefined,
  "SINGLE tidak punya data terstruktur");
assert.equal(sanitizeDataSoal("TIPE_ASING", { apa: "saja" }), undefined, "tipe tak dikenal fail closed");

// Entri rusak di dalam daftar dibuang, entri sah bertahan.
const mixed = sanitizeDataSoal("TRUE_FALSE", {
  pernyataan: [
    { id: "1", teks: "sah" },
    { teks: "tanpa id" },
    "bukan objek",
    null,
    { id: "  ", teks: "id kosong" },
    { id: "2", teks: "<script>x</script>sah juga" },
  ],
}) as { pernyataan: { id: string; teks: string }[] };
assert.equal(mixed.pernyataan.length, 2);
assert.deepEqual(mixed.pernyataan.map((p) => p.id), ["1", "2"]);
assert.equal(mixed.pernyataan[1].teks, "sah juga");

// Field asing di dalam data_soal tidak diteruskan — termasuk yang menyerupai kunci.
const smuggled = sanitizeDataSoal("MATCHING", {
  kiri: [{ id: "1", teks: "Jakarta", kunci: "A", jawaban: "A" }],
  kanan: [{ id: "A", teks: "Ibukota" }],
  kunci_jawaban: { "1": "A" },
}) as Record<string, unknown>;
assert.deepEqual(Object.keys(smuggled).sort(), ["kanan", "kiri"], "hanya kiri/kanan yang bertahan");
const smuggledItem = (smuggled.kiri as Record<string, unknown>[])[0];
assert.deepEqual(Object.keys(smuggledItem).sort(), ["id", "teks"], "item hanya boleh punya id + teks");
for (const forbidden of contract.answer_key.forbidden_in_data_soal) {
  assert.equal(forbidden in smuggledItem, false, `field kunci "${forbidden}" bocor ke data_soal`);
  assert.equal(forbidden in smuggled, false, `field kunci "${forbidden}" bocor ke data_soal`);
}

// ── Kunci tidak pernah disentuh sanitizer, tapi juga tidak pernah pindah ─────
const keyKept = sanitizeQuestionPayload({
  tipe: "TRUE_FALSE",
  pertanyaan: "x",
  kunci_jawaban: '{"1":"BENAR"}',
  data_soal: { pernyataan: [{ id: "1", teks: "y" }] },
});
assert.equal(keyKept.kunci_jawaban, '{"1":"BENAR"}', "kunci JSON masa depan lewat apa adanya");
assert.equal(
  JSON.stringify(keyKept.data_soal).includes("BENAR"), false,
  "kunci tidak boleh muncul di data_soal"
);

console.log("questionModel: canonical model, sanitizer type-aware, parity kontrak PASS");
