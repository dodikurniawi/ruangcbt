// Task 5.3 — import soal ke Bank Soal pada boundary GAS.
// Yang diuji: import memakai validator dan skema yang sama dengan entri manual,
// soal yang tidak lolos validasi tidak ikut tersimpan, dan tipe soal lain,
// versioning historis, serta snapshot ujian yang berjalan tidak terganggu.

const assert = require("node:assert/strict");
const {
  tenantSecret, loadGas, baseState, post,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
} = require("./gasHarness.cjs");

function importState(overrides) {
  return baseState(Object.assign({
    Config: [
      ["key", "value"],
      ["exam_name", "Ujian"],
      ["exam_mapel", "MAPEL_A"],
      ["exam_duration", 90],
      ["exam_status", "OPEN"],
    ],
    MataPelajaran: [
      ["id_mapel", "kode", "nama"],
      ["MAPEL_A", "MTK", "Matematika"],
      ["MAPEL_B", "SOS", "Sosiologi"],
    ],
    Questions: [
      QUESTION_HEADER,
      ["Q1", 1, "SINGLE", "Soal lama", "", "A", "B", "C", "D", "", "A", 1, "", "MAPEL_A", "AKTIF", "", ""],
    ],
    Users: [USER_HEADER.concat(["exam_binding"]),
      ["S1", "siswa", "pw", "Siswa", "6A", false, "", "", "", 0, "BELUM", "", "", "", ""]],
    Responses: [RESPONSE_HEADER],
  }, overrides || {}));
}

function imported(nomor, overrides) {
  return Object.assign({
    nomor_urut: nomor,
    tipe: "SINGLE",
    pertanyaan: "Soal import nomor " + nomor,
    gambar_url: "",
    opsi_a: "Satu", opsi_b: "Dua", opsi_c: "Tiga", opsi_d: "Empat", opsi_e: "Lima",
    kunci_jawaban: "B",
    bobot: 1,
    kategori: "",
    id_mapel: "MAPEL_A",
  }, overrides || {});
}

function questionRows(gas) {
  return gas.__sheets.Questions.rows.slice(1);
}

// ── Import normal: soal masuk sebagai SINGLE + AKTIF, id dibuat server ──────
{
  const gas = loadGas(importState());
  const res = post(gas, "importQuestions", { questions: [imported(2), imported(3), imported(4)] });
  assert.equal(res.success, true, res.message);
  assert.equal(res.data.added, 3);
  assert.deepEqual(res.data.rejected, []);

  const rows = questionRows(gas);
  assert.equal(rows.length, 4, "soal lama tetap ada, tiga soal baru ditambahkan");
  const added = rows.slice(1);
  for (const row of added) {
    assert.match(String(row[0]), /^Q[0-9A-Z]+$/, "id_soal dibuat backend, bukan dikirim klien");
    assert.equal(row[2], "SINGLE");
    assert.equal(row[10], "B", "kunci jawaban tersimpan apa adanya");
    assert.equal(row[13], "MAPEL_A");
    assert.equal(row[14], "AKTIF", "soal import langsung aktif");
    assert.equal(row[15], "", "soal import bukan versi dari soal lain");
    assert.equal(row[16], "", "SINGLE tidak menulis data_soal");
  }
  assert.equal(new Set(added.map((row) => row[0])).size, 3, "id_soal tidak boleh kembar");

  // Soal import muncul di Bank Soal admin, lengkap dengan kuncinya.
  const admin = JSON.parse(
    gas.doGet({ parameter: { action: "getAdminQuestions", proxy_secret: tenantSecret } }).text
  );
  assert.equal(admin.data.length, 4);
  assert.ok(admin.data.some((q) => q.pertanyaan === "Soal import nomor 3" && q.kunci_jawaban === "B"));
}

// ── R/T. Validasi server tetap berlaku; soal invalid tidak tersimpan ────────
{
  const invalidCases = [
    [imported(2, { pertanyaan: "   " }), /Redaksi soal wajib diisi/],
    [imported(2, { opsi_d: "" }), /Opsi A sampai D wajib diisi/],
    [imported(2, { kunci_jawaban: "" }), /Kunci jawaban wajib diisi/],
    [imported(2, { kunci_jawaban: "Z" }), /opsi yang tidak tersedia/],
    [imported(2, { kunci_jawaban: "A,B" }), /satu kunci jawaban/],
    [imported(2, { id_mapel: "MAPEL_TIDAK_ADA" }), /Mata pelajaran tidak ditemukan/],
    [imported(2, { id_mapel: "" }), /Mata pelajaran wajib dipilih/],
    [imported(2, { bobot: 0 }), /Bobot harus angka/],
    [imported(2, { tipe: "ESSAY" }), /Tipe soal tidak dikenal/],
    [imported(2, { status_soal: "AKTIF" }), /Field tidak dikenal/],
  ];
  for (const [payload, pattern] of invalidCases) {
    const gas = loadGas(importState());
    const res = post(gas, "importQuestions", { questions: [payload] });
    assert.equal(res.success, true, "satu soal bermasalah tidak menggagalkan seluruh import");
    assert.equal(res.data.added, 0);
    assert.equal(res.data.rejected.length, 1);
    assert.match(res.data.rejected[0].message, pattern);
    assert.equal(questionRows(gas).length, 1, "soal invalid tidak boleh tersimpan");
  }

  // Soal valid tetap masuk walau ada tetangganya yang ditolak.
  const mixed = loadGas(importState());
  const res = post(mixed, "importQuestions", {
    questions: [imported(2), imported(3, { kunci_jawaban: "" }), imported(4)],
  });
  assert.equal(res.data.added, 2);
  assert.equal(res.data.rejected.length, 1);
  assert.equal(res.data.rejected[0].nomor_urut, 3);
  assert.equal(questionRows(mixed).length, 3);
}

// ── Payload rusak ditolak dengan pesan yang bisa dibaca ────────────────────
{
  const gas = loadGas(importState());
  for (const payload of [undefined, [], "bukan array", {}]) {
    const res = post(gas, "importQuestions", { questions: payload });
    assert.equal(res.success, false);
    assert.match(res.message, /Tidak ada soal yang dikirim/);
  }
  const tooMany = post(gas, "importQuestions", {
    questions: Array.from({ length: 201 }, (_unused, i) => imported(i + 2)),
  });
  assert.equal(tooMany.success, false);
  assert.match(tooMany.message, /Maksimal 200 soal/);
  assert.equal(questionRows(gas).length, 1, "batas jumlah dicek sebelum menulis apa pun");
}

// ── O/P. Regresi tipe soal lain lewat jalur manual ─────────────────────────
{
  const gas = loadGas(importState());
  post(gas, "importQuestions", { questions: [imported(2)] });

  const single = post(gas, "createQuestion", {
    data: imported(5, { pertanyaan: "<p>SINGLE manual</p>" }),
  });
  assert.equal(single.success, true, single.message);

  const complex = post(gas, "createQuestion", {
    data: imported(6, { tipe: "COMPLEX", kunci_jawaban: "A,C", pertanyaan: "<p>COMPLEX manual</p>" }),
  });
  assert.equal(complex.success, true, complex.message);

  const trueFalse = post(gas, "createQuestion", {
    data: {
      nomor_urut: 7, tipe: "TRUE_FALSE", pertanyaan: "<p>Benar salah</p>", gambar_url: "",
      opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
      kunci_jawaban: '{"1":"BENAR"}', bobot: 2, kategori: "", id_mapel: "MAPEL_A",
      data_soal: { pernyataan: [{ id: "1", teks: "Air mendidih 100C" }] },
    },
  });
  assert.equal(trueFalse.success, true, trueFalse.message);

  const rows = questionRows(gas);
  assert.deepEqual(rows.map((row) => row[2]), ["SINGLE", "SINGLE", "SINGLE", "COMPLEX", "TRUE_FALSE"]);
  assert.equal(rows[4][16], '{"pernyataan":[{"id":"1","teks":"Air mendidih 100C"}]}',
    "data_soal tipe lain tidak terganggu import");
}

// ── S. Import tidak merusak snapshot ujian yang sedang berjalan ────────────
{
  const gas = loadGas(importState());
  const attempt = post(gas, "login", { username: "siswa", password: "pw" }).data;
  const before = JSON.parse(
    gas.doGet({ parameter: { action: "getQuestions", proxy_secret: tenantSecret, id_siswa: "S1" } }).text
  );
  assert.deepEqual(before.data.map((q) => q.id_soal), ["Q1"]);

  const res = post(gas, "importQuestions", { questions: [imported(2), imported(3)] });
  assert.equal(res.data.added, 2, "menambah soal baru tetap diizinkan saat ujian berlangsung");

  const after = JSON.parse(
    gas.doGet({ parameter: { action: "getQuestions", proxy_secret: tenantSecret, id_siswa: "S1" } }).text
  );
  assert.deepEqual(after.data.map((q) => q.id_soal), ["Q1"],
    "soal hasil import tidak boleh masuk ke attempt yang sudah berjalan");
  assert.equal(JSON.stringify(after).includes("kunci_jawaban"), false, "kunci jawaban tidak bocor ke siswa");

  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A" } });
  assert.equal(submit.score, "100.00", "scoring attempt tidak terpengaruh soal baru");
  assert.equal(
    JSON.parse(gas.__sheets.Users.rows[1][14]).exam_id, attempt.exam_id,
    "snapshot attempt tidak berubah",
  );
}

// ── MUTATION GUARDS ────────────────────────────────────────────────────────
function mutate(find, replaceWith, label) {
  return function (source) {
    const mutated = source.replace(find, replaceWith);
    assert.notEqual(mutated, source, "titik mutation " + label + " tidak ditemukan");
    return mutated;
  };
}
{
  // E. Import melewati validasi server.
  const skipValidation = mutate(
    "      const invalid = validateQuestionPayload(data);\n      if (invalid) {",
    "      const invalid = null;\n      if (invalid) {",
    "E",
  );
  const gasE = loadGas(importState(), skipValidation);
  assert.throws(() => assert.equal(
    post(gasE, "importQuestions", { questions: [imported(2, { kunci_jawaban: "" })] }).data.added, 0,
  ), undefined, "mutation E tidak terdeteksi");

  // Soal import ditulis sebagai versi dari soal lain / langsung arsip.
  const wrongStatus = mutate(
    "      sheet.appendRow(questionRowValues(id_soal, data, QUESTION_STATUS_ACTIVE, \"\"));",
    "      sheet.appendRow(questionRowValues(id_soal, data, QUESTION_STATUS_ARCHIVED, \"Q1\"));",
    "F",
  );
  const gasF = loadGas(importState(), wrongStatus);
  post(gasF, "importQuestions", { questions: [imported(2)] });
  assert.throws(() => assert.equal(questionRows(gasF)[1][14], "AKTIF"),
    undefined, "mutation F tidak terdeteksi");
}

console.log("importQuestions: jalur Bank Soal, validasi server, regresi tipe lain, snapshot aman + mutations E/F PASS");
