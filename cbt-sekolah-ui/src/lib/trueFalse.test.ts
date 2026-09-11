import assert from "node:assert/strict";
import { isAnswered } from "./answerSemantics.ts";
import {
  nextTrueFalseStatement,
  serializeTrueFalseDraft,
  toTrueFalseDraft,
  updateTrueFalseAnswer,
  validateTrueFalseDraft,
  type TrueFalseDraftStatement,
} from "./trueFalse.ts";

const draft: TrueFalseDraftStatement[] = [
  { id: "1", teks: "Matahari terbit dari timur", kunci: "BENAR" },
  { id: "2", teks: "Air membeku pada 100°C", kunci: "SALAH" },
];

assert.equal(validateTrueFalseDraft(draft), null);
assert.match(validateTrueFalseDraft([]) ?? "", /minimal satu/);
assert.match(validateTrueFalseDraft([{ id: "1", teks: " ", kunci: "BENAR" }]) ?? "", /wajib diisi/);
assert.match(validateTrueFalseDraft([
  { id: "1", teks: "a", kunci: "BENAR" },
  { id: "1", teks: "b", kunci: "SALAH" },
]) ?? "", /unik/);
assert.match(validateTrueFalseDraft([
  { id: "1", teks: "a", kunci: "YA" as "BENAR" },
]) ?? "", /BENAR atau SALAH/);

const serialized = serializeTrueFalseDraft(draft);
assert.deepEqual(serialized.data_soal.pernyataan, [
  { id: "1", teks: "Matahari terbit dari timur" },
  { id: "2", teks: "Air membeku pada 100°C" },
]);
assert.deepEqual(JSON.parse(serialized.kunci_jawaban), { "1": "BENAR", "2": "SALAH" });
assert.deepEqual(toTrueFalseDraft(serialized.data_soal, serialized.kunci_jawaban), draft);

assert.deepEqual(nextTrueFalseStatement(draft), { id: "3", teks: "", kunci: "BENAR" });
assert.equal(nextTrueFalseStatement([draft[1]]).id, "1", "ID baru deterministic dan tidak mengubah ID lama");

const partial = updateTrueFalseAnswer({}, "1", "BENAR");
assert.deepEqual(partial, { "1": "BENAR" });
assert.equal(isAnswered(partial), true);
const continued = updateTrueFalseAnswer(partial, "2", "SALAH");
assert.deepEqual(continued, { "1": "BENAR", "2": "SALAH" }, "jawaban parsial harus dipertahankan");
assert.equal(isAnswered({ "1": "SALAH" }), true, "SALAH tetap answered");

// Mutation C: bila selection SALAH dibuang seperti nilai falsy, semantic test
// harus gagal; helper produksi kemudian dipakai lagi dan wajib lulus.
const mutatedSelection = (value: "BENAR" | "SALAH") =>
  value === "SALAH" ? {} : updateTrueFalseAnswer({}, "1", value);
assert.throws(() => assert.equal(isAnswered(mutatedSelection("SALAH")), true));
assert.equal(isAnswered(updateTrueFalseAnswer({}, "1", "SALAH")), true);

console.log("trueFalse: admin draft, stable ID, answer selection, mutation C PASS");
