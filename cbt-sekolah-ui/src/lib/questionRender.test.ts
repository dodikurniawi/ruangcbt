import assert from "node:assert/strict";
import { isAnswered } from "./answerSemantics.ts";
import {
  fillInPetunjuk,
  matchingColumns,
  questionRenderKind,
  trueFalseStatements,
} from "./questionRender.ts";
import { QUESTION_TYPES_IMPLEMENTED, type StudentQuestion } from "../types/index.ts";

const base = { id_soal: "Q1", nomor_urut: 1, pertanyaan: "Soal", bobot: 1 };
const options = { opsi_a: "A", opsi_b: "B", opsi_c: "C", opsi_d: "D", opsi_e: null };

const single = { ...base, ...options, tipe: "SINGLE" } as StudentQuestion;
const complex = { ...base, ...options, tipe: "COMPLEX" } as StudentQuestion;
const trueFalse = {
  ...base, tipe: "TRUE_FALSE",
  data_soal: { pernyataan: [{ id: "1", teks: "Jakarta ibu kota" }] },
} as StudentQuestion;
const matching = {
  ...base, tipe: "MATCHING",
  data_soal: { kiri: [{ id: "1", teks: "Jakarta" }], kanan: [{ id: "A", teks: "DKI" }] },
} as StudentQuestion;
const fillIn = { ...base, tipe: "FILL_IN", data_soal: { petunjuk: "Nama kota" } } as StudentQuestion;

// ── Setiap tipe aktif punya penanganan eksplisit ───────────────────────────
assert.equal(questionRenderKind(single), "CHOICE");
assert.equal(questionRenderKind(complex), "CHOICE");
assert.equal(questionRenderKind(trueFalse), "TRUE_FALSE");
assert.equal(questionRenderKind(matching), "MATCHING");
assert.equal(questionRenderKind(fillIn), "FILL_IN");
// Tidak ada tipe aktif yang jatuh ke fallback.
for (const tipe of QUESTION_TYPES_IMPLEMENTED) {
  const sample = { SINGLE: single, COMPLEX: complex, TRUE_FALSE: trueFalse, MATCHING: matching, FILL_IN: fillIn }[tipe];
  assert.notEqual(questionRenderKind(sample), "UNSUPPORTED", `${tipe} tidak boleh unsupported`);
}

// ── Tipe tak dikenal tidak pernah dirender sebagai pilihan ganda ───────────
const unknown = { ...base, ...options, tipe: "ESSAY" } as unknown as StudentQuestion;
assert.equal(questionRenderKind(unknown), "UNSUPPORTED", "tipe tak dikenal wajib fallback aman");
const emptyType = { ...base, ...options, tipe: "" } as unknown as StudentQuestion;
assert.equal(questionRenderKind(emptyType), "UNSUPPORTED");

// ── data_soal hilang/rusak → unsupported, bukan UI tipe lain ──────────────
// GAS membuang sel kolom 17 yang tidak bisa diparse, jadi soal terstruktur bisa
// sampai ke siswa tanpa data_soal.
const brokenShapes: StudentQuestion[] = [
  { ...base, tipe: "TRUE_FALSE" } as unknown as StudentQuestion,
  { ...base, tipe: "TRUE_FALSE", data_soal: { pernyataan: [] } } as unknown as StudentQuestion,
  { ...base, tipe: "TRUE_FALSE", data_soal: { pernyataan: [{ teks: "tanpa id" }] } } as unknown as StudentQuestion,
  { ...base, tipe: "MATCHING" } as unknown as StudentQuestion,
  { ...base, tipe: "MATCHING", data_soal: { kiri: [{ id: "1", teks: "x" }] } } as unknown as StudentQuestion,
  { ...base, tipe: "MATCHING", data_soal: { kiri: "rusak", kanan: [] } } as unknown as StudentQuestion,
  { ...base, tipe: "FILL_IN" } as unknown as StudentQuestion,
  { ...base, tipe: "FILL_IN", data_soal: { petunjuk: 7 } } as unknown as StudentQuestion,
];
for (const question of brokenShapes) {
  assert.equal(questionRenderKind(question), "UNSUPPORTED",
    `data_soal rusak (${question.tipe}) harus unsupported`);
}
// Accessor tidak pernah melempar untuk bentuk rusak.
for (const question of brokenShapes) {
  assert.doesNotThrow(() => {
    trueFalseStatements(question);
    matchingColumns(question);
    fillInPetunjuk(question);
  });
}
// Petunjuk kosong tetap sah: soal FILL_IN boleh tanpa petunjuk tambahan.
assert.equal(questionRenderKind({ ...base, tipe: "FILL_IN", data_soal: { petunjuk: "" } } as StudentQuestion), "FILL_IN");

// Accessor hanya menjawab untuk tipenya sendiri.
assert.equal(trueFalseStatements(matching), null);
assert.equal(matchingColumns(trueFalse), null);
assert.equal(fillInPetunjuk(single), null);
assert.deepEqual(matchingColumns(matching), {
  kiri: [{ id: "1", teks: "Jakarta" }],
  kanan: [{ id: "A", teks: "DKI" }],
});
assert.deepEqual(trueFalseStatements(trueFalse), [{ id: "1", teks: "Jakarta ibu kota" }]);
assert.equal(fillInPetunjuk(fillIn), "Nama kota");

// ── Mutation C: fallback "selain TRUE_FALSE/FILL_IN berarti pilihan ganda" ─
const mutatedKind = (question: StudentQuestion): string => {
  if (question.tipe === "TRUE_FALSE") return "TRUE_FALSE";
  if (question.tipe === "FILL_IN") return "FILL_IN";
  return "CHOICE"; // MATCHING dan tipe tak dikenal ikut terserap ke sini
};
assert.throws(() => assert.equal(mutatedKind(matching), "MATCHING"), "mutation C tidak terdeteksi");
assert.throws(() => assert.equal(mutatedKind(unknown), "UNSUPPORTED"), "mutation C tidak terdeteksi");
assert.equal(questionRenderKind(matching), "MATCHING");
assert.equal(questionRenderKind(unknown), "UNSUPPORTED");

// ── Mutation D: semantics jawaban memakai truthiness ──────────────────────
// Bentuk jawaban tiap tipe, termasuk yang falsy tetapi sah.
const answers: Record<string, unknown> = {
  SINGLE: "A",
  COMPLEX: ["A"],
  TRUE_FALSE: { "1": "SALAH" },
  MATCHING: { "1": "B" },
  FILL_IN: "0",
};
for (const [tipe, answer] of Object.entries(answers)) {
  assert.equal(isAnswered(answer), true, `${tipe}: jawaban sah dianggap kosong`);
}
for (const empty of ["", "   ", [], {}, null, undefined]) {
  assert.equal(isAnswered(empty), false, "bentuk kosong dianggap terisi");
}
const truthyAnswered = (answer: unknown) => Boolean(answer);
assert.throws(() => assert.equal(truthyAnswered({}), false), "mutation D tidak terdeteksi");
assert.throws(() => assert.equal(truthyAnswered([]), false), "mutation D tidak terdeteksi");
assert.equal(isAnswered({}), false);
assert.equal(isAnswered([]), false);

console.log("questionRender: 5 tipe eksplisit, fallback aman, mutation C/D PASS");
