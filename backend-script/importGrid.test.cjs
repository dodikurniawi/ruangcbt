// Import Bank Soal: keamanan batas grid dan keutuhan data.
//
// P1 mengganti N appendRow dengan satu setValues. appendRow menumbuhkan grid
// sheet sendiri; setValues tidak — range di luar grid ditolak Sheets. Test ini
// menjaga agar penghematan itu tidak berubah menjadi "import gagal total pada
// sheet yang hampir penuh", dan agar isi barisnya tetap persis sama.
//
// Jalankan: node backend-script/importGrid.test.cjs

const assert = require("node:assert/strict");
const { loadGas, baseState, post, QUESTION_HEADER } = require("./gasHarness.cjs");

const QUESTION_COLUMNS = 18;

function importState(existingQuestions) {
  const rows = [QUESTION_HEADER.slice()];
  for (let i = 0; i < (existingQuestions || 0); i++) {
    rows.push([
      `OLD${i}`, i + 1, "SINGLE", `Soal lama ${i}`, "", "A", "B", "C", "D", "",
      "A", 1, "", "MAPEL_A", "AKTIF", "", "", "",
    ]);
  }
  return baseState({
    Questions: rows,
    KumpulanSoal: [["id_kumpulan", "nama_kumpulan", "id_mapel", "status", "dibuat", "terakhir_dipakai"]],
  });
}

function payload(n) {
  return Array.from({ length: n }, (_, i) => ({
    tipe: "SINGLE",
    nomor_urut: i + 1,
    pertanyaan: `Soal nomor ${i + 1}`,
    gambar_url: i % 3 === 0 ? `https://drive.google.com/thumbnail?id=IMG${i + 1}&sz=w800` : "",
    opsi_a: `A${i + 1}`, opsi_b: `B${i + 1}`, opsi_c: `C${i + 1}`, opsi_d: `D${i + 1}`,
    kunci_jawaban: ["A", "B", "C", "D"][i % 4],
    bobot: (i % 5) + 1,
    kategori: `Kat${(i % 3) + 1}`,
    id_mapel: "MAPEL_A",
  }));
}

function runImport(n, existing, mutateSource) {
  const gas = loadGas(importState(existing || 0), mutateSource);
  const sheet = gas.__sheets.Questions;
  const before = sheet.rows.length;
  let res = null, error = null;
  try {
    res = post(gas, "importQuestions", { questions: payload(n) });
  } catch (e) {
    error = e.message;
  }
  return {
    gas, res, error, rowsBefore: before, rowsAfter: sheet.rows.length,
    appendRows: sheet.appendRows, setValuesCalls: sheet.setValuesCalls,
    maxRows: sheet.getMaxRows(), rows: sheet.rows,
  };
}

// ===========================================================================
// 1. KEUTUHAN DATA — 1 / 10 / 100 / 200 soal
// ===========================================================================
for (const n of [1, 10, 100, 200]) {
  const r = runImport(n, 0);
  assert.equal(r.error, null, `n=${n}: import tidak boleh melempar (${r.error})`);
  assert.equal(r.res.success, true, `n=${n}: import harus sukses`);
  assert.equal(r.res.data.added, n, `n=${n}: added harus ${n}`);
  assert.equal(r.res.data.rejected.length, 0, `n=${n}: tidak boleh ada yang ditolak`);
  assert.equal(r.rowsAfter, r.rowsBefore + n, `n=${n}: jumlah baris harus bertambah tepat ${n}`);

  // Satu panggilan tulis batch untuk seluruh soal — bukan satu per soal.
  assert.equal(r.setValuesCalls, 1, `n=${n}: harus satu setValues, bukan ${r.setValuesCalls}`);
  assert.equal(r.appendRows, 0, `n=${n}: tidak boleh ada appendRow per soal`);

  const ids = new Set();
  for (let i = 1; i <= n; i++) {
    const row = r.rows[i];
    assert.equal(row.length, QUESTION_COLUMNS, `n=${n} baris ${i}: harus ${QUESTION_COLUMNS} kolom, tidak partial`);
    assert.ok(String(row[0]).startsWith("Q"), `n=${n} baris ${i}: id_soal harus berawalan Q`);
    ids.add(String(row[0]));
    assert.equal(row[1], i, `n=${n} baris ${i}: ordering nomor_urut harus terjaga`);
    assert.equal(row[2], "SINGLE");
    assert.equal(row[3], `Soal nomor ${i}`);
    const expectedImage = (i - 1) % 3 === 0 ? `https://drive.google.com/thumbnail?id=IMG${i}&sz=w800` : "";
    assert.equal(row[4], expectedImage, `n=${n} baris ${i}: gambar harus utuh`);
    assert.equal(row[5], `A${i}`);
    assert.equal(row[10], ["A", "B", "C", "D"][(i - 1) % 4], `n=${n} baris ${i}: kunci jawaban`);
    assert.equal(row[11], ((i - 1) % 5) + 1, `n=${n} baris ${i}: bobot`);
    assert.equal(row[12], `Kat${((i - 1) % 3) + 1}`);
    assert.equal(row[13], "MAPEL_A", `n=${n} baris ${i}: mapel`);
    assert.equal(row[14], "AKTIF", `n=${n} baris ${i}: status soal`);
    assert.equal(row[15], "", `n=${n} baris ${i}: versi_dari harus kosong untuk soal baru`);
  }
  assert.equal(ids.size, n, `n=${n}: seluruh id_soal wajib unik`);
}

// ===========================================================================
// 2. BATAS GRID — sheet hampir penuh
// ===========================================================================
for (const existing of [700, 950, 990]) {
  const r = runImport(200, existing);
  assert.equal(r.error, null, `existing=${existing}: import tidak boleh melempar (${r.error})`);
  assert.equal(r.res.success, true, `existing=${existing}: import harus sukses`);
  assert.equal(r.res.data.added, 200, `existing=${existing}: 200 soal harus masuk`);
  assert.equal(r.rowsAfter, existing + 1 + 200, `existing=${existing}: jumlah baris akhir`);
  assert.ok(r.maxRows >= r.rowsAfter, `existing=${existing}: grid harus ditumbuhkan sampai cukup`);

  // Baris pertama dan terakhir hasil import tetap utuh.
  const first = r.rows[existing + 1];
  const last = r.rows[existing + 200];
  assert.equal(first[1], 1, `existing=${existing}: soal pertama di posisi benar`);
  assert.equal(last[1], 200, `existing=${existing}: soal terakhir di posisi benar`);
  assert.equal(last.length, QUESTION_COLUMNS, `existing=${existing}: baris terakhir tidak partial`);
  assert.equal(last[14], "AKTIF");
}

// ===========================================================================
// 3. SUKSES TIDAK BOLEH DILAPORKAN BILA PENULISAN GAGAL
// ===========================================================================
{
  // Paksa penulisan gagal; handler tidak boleh mengembalikan success:true.
  const gas = loadGas(importState(0));
  const sheet = gas.__sheets.Questions;
  const originalGetRange = sheet.getRange.bind(sheet);
  sheet.getRange = function (row, col, numRows, numCols) {
    const range = originalGetRange(row, col, numRows, numCols);
    const originalSetValues = range.setValues;
    range.setValues = function () {
      if (numRows && numRows > 1) throw new Error("Sheets menolak penulisan");
      return originalSetValues.apply(this, arguments);
    };
    return range;
  };
  const res = post(gas, "importQuestions", { questions: payload(5) });
  assert.equal(res.success, false, "penulisan yang gagal tidak boleh dilaporkan sukses");
  assert.equal(sheet.rows.length, 1, "tidak boleh ada baris separuh jadi");
}

// ===========================================================================
// MUTATION — pastikan test di atas benar-benar mendeteksi regresi
// ===========================================================================
function mutate(find, replaceWith, label) {
  return function (source) {
    const mutated = source.replace(find, replaceWith);
    assert.notEqual(mutated, source, "titik mutation " + label + " tidak ditemukan");
    return mutated;
  };
}

const mutations = [
  {
    label: "penjagaan grid dihapus (setValues di luar grid)",
    apply: mutate(
      "      ensureQuestionRows(sheet, startRow + rowsToWrite.length - 1);",
      "      // penjagaan grid dihapus",
      "GRID",
    ),
    run: (m) => {
      const r = runImport(200, 990, m);
      return r.error === null && r.res && r.res.success === true;
    },
  },
  {
    label: "kembali ke appendRow per soal",
    apply: mutate(
      "      ensureQuestionRows(sheet, startRow + rowsToWrite.length - 1);\n      sheet.getRange(startRow, 1, rowsToWrite.length, QUESTION_COLUMNS).setValues(rowsToWrite);",
      "      for (let w = 0; w < rowsToWrite.length; w++) sheet.appendRow(rowsToWrite[w]);",
      "APPEND",
    ),
    run: (m) => {
      const r = runImport(10, 0, m);
      return r.setValuesCalls === 1 && r.appendRows === 0;
    },
  },
  {
    label: "satu soal hilang dari batch",
    apply: mutate(
      "      rowsToWrite.push(questionRowValues(id_soal, data, QUESTION_STATUS_ACTIVE, \"\", target.id_kumpulan));",
      "      if (i > 0) rowsToWrite.push(questionRowValues(id_soal, data, QUESTION_STATUS_ACTIVE, \"\", target.id_kumpulan));",
      "ROWCOUNT",
    ),
    run: (m) => {
      const r = runImport(10, 0, m);
      return r.error === null && r.rowsAfter === r.rowsBefore + 10;
    },
  },
  {
    label: "kunci jawaban tertukar",
    apply: mutate(
      "    structuredKey ? stableStringify(structuredKey) : parseAnswerKeys(data.kunci_jawaban).join(\",\"),",
      '    structuredKey ? stableStringify(structuredKey) : "A",',
      "KEY",
    ),
    run: (m) => {
      const r = runImport(10, 0, m);
      if (r.error || !r.res || !r.res.success) return false;
      for (let i = 1; i <= 10; i++) {
        if (r.rows[i][10] !== ["A", "B", "C", "D"][(i - 1) % 4]) return false;
      }
      return true;
    },
  },
  {
    label: "ordering batch dibalik",
    apply: mutate(
      "      sheet.getRange(startRow, 1, rowsToWrite.length, QUESTION_COLUMNS).setValues(rowsToWrite);",
      "      sheet.getRange(startRow, 1, rowsToWrite.length, QUESTION_COLUMNS).setValues(rowsToWrite.slice().reverse());",
      "ORDER",
    ),
    run: (m) => {
      const r = runImport(10, 0, m);
      if (r.error || !r.res || !r.res.success) return false;
      for (let i = 1; i <= 10; i++) if (r.rows[i][1] !== i) return false;
      return true;
    },
  },
];

for (const m of mutations) {
  let survived = false;
  try { survived = m.run(m.apply) === true; } catch { survived = false; }
  assert.equal(survived, false, `mutation "${m.label}" LOLOS — test tidak mendeteksi regresi`);
  console.log("  KILLED ", m.label);
}

console.log("importGrid: keutuhan 1/10/100/200, batas grid 700/950/990, gagal-tulis tidak sukses + 5 mutation PASS");
