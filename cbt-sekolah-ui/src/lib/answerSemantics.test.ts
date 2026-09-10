import assert from "node:assert/strict";
import { isAnswered, countAnswered } from "./answerSemantics.ts";

// Memakai helper produksi apa adanya — kalau isAnswered diubah kembali ke
// truthiness (!!answer), blok falsy di bawah gagal.

const answered: unknown[] = [
  "A",
  ["A"],
  ["A", "C"],
  { "1": "SALAH" },
  { "1": "A" },
  { "1": "BENAR", "2": "SALAH" },
  "Jakarta",
  false, // defensif: bukan truthiness bug
  true,
  0, // defensif
  42,
];

const unanswered: unknown[] = [
  "",
  "   ",
  null,
  undefined,
  [],
  {},
];

for (const v of answered) {
  assert.equal(isAnswered(v), true, `harus answered: ${JSON.stringify(v)}`);
}
for (const v of unanswered) {
  assert.equal(isAnswered(v), false, `harus unanswered: ${JSON.stringify(v)}`);
}

// Negative guard: helper yang truthiness akan gagal di sini karena false/0 falsy.
assert.equal(isAnswered(false), true, "false wajib answered (regresi TRUE_FALSE)");
assert.equal(isAnswered(0), true, "0 wajib answered");
assert.equal(isAnswered(""), false, "string kosong wajib unanswered");
assert.equal(isAnswered([]), false, "array kosong wajib unanswered");
assert.equal(isAnswered({}), false, "object kosong wajib unanswered");

// countAnswered memakai isAnswered yang sama.
assert.equal(
  countAnswered({ Q1: "A", Q2: "", Q3: ["B"], Q4: [], Q5: "Bandung" }),
  3
);
assert.equal(countAnswered({}), 0);

console.log("answerSemantics: isAnswered/countAnswered PASS");
