// Task 5.2 — Adakan Ujian.
// Yang diuji: satu aksi simpan menghasilkan konfigurasi ujian yang utuh, ujian
// kosong tidak bisa dibuka, buka/tutup aman diulang, menutup ujian tidak menyentuh
// data siswa, dan attempt yang sudah berjalan tetap memakai snapshot Task 5.1.

const assert = require("node:assert/strict");
const {
  tenantSecret, loadGas, baseState, post, get,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
} = require("./gasHarness.cjs");

const MINUTE = 60000;

function getAs(gas, action, params) {
  return JSON.parse(
    gas.doGet({ parameter: Object.assign({ action, proxy_secret: tenantSecret }, params || {}) }).text
  );
}

function singleRow(id, nomor, kunci, mapel, status) {
  return [
    id, nomor, "SINGLE", "Soal " + id, "",
    "A", "B", "C", "D", "",
    kunci, 1, "", mapel, status || "AKTIF", "", "",
  ];
}

function examState(overrides) {
  return baseState(Object.assign({
    Config: [
      ["key", "value"],
      ["exam_name", "Ujian Lama"],
      ["exam_mapel", "MAPEL_A"],
      ["exam_duration", 90],
      ["exam_status", "CLOSED"],
    ],
    MataPelajaran: [
      ["id_mapel", "kode", "nama"],
      ["MAPEL_A", "MTK", "Matematika"],
      ["MAPEL_B", "SOS", "Sosiologi"],
      ["MAPEL_KOSONG", "SEN", "Seni Budaya"],
    ],
    Questions: [
      QUESTION_HEADER,
      singleRow("Q1", 1, "A", "MAPEL_A"),
      singleRow("Q2", 2, "B", "MAPEL_A"),
      singleRow("QB1", 1, "C", "MAPEL_B"),
      singleRow("QB2", 2, "A", "MAPEL_B"),
      singleRow("QB3", 3, "B", "MAPEL_B"),
      singleRow("QX", 9, "A", "MAPEL_KOSONG", "ARSIP"), // arsip = tidak dihitung
    ],
    Users: [USER_HEADER.concat(["exam_binding"]),
      ["S1", "siswa", "pw", "Siswa", "6A", false, "", "", "", 0, "BELUM", "", "", "", ""]],
    Responses: [RESPONSE_HEADER],
  }, overrides || {}));
}

function configValue(gas, key) {
  const rows = gas.__sheets.Config.rows;
  for (let i = 1; i < rows.length; i++) if (rows[i][0] === key) return rows[i][1];
  return undefined;
}

const validOpen = {
  exam_name: "  Sumatif Akhir Semester Genap  ",
  exam_mapel: "MAPEL_B",
  exam_duration: 120,
  exam_status: "OPEN",
};

// ── A. KONFIGURASI VALID TERSIMPAN UTUH ────────────────────────────────────
{
  const gas = loadGas(examState());
  const res = post(gas, "saveExamConfig", validOpen);
  assert.equal(res.success, true, res.message);
  assert.equal(res.data.exam_name, "Sumatif Akhir Semester Genap", "nama ujian di-trim");
  assert.equal(res.data.question_count, 3);

  // Keempat nilai berubah bersama; tidak ada campuran nama baru + mapel lama.
  assert.equal(configValue(gas, "exam_name"), "Sumatif Akhir Semester Genap");
  assert.equal(configValue(gas, "exam_mapel"), "MAPEL_B");
  assert.equal(configValue(gas, "exam_duration"), 120);
  assert.equal(configValue(gas, "exam_status"), "OPEN");

  const summary = getAs(gas, "getExamSummary");
  assert.equal(summary.data.exam_status, "OPEN");
  assert.equal(summary.data.question_count, 3);
  assert.deepEqual(summary.data.question_counts, { MAPEL_A: 2, MAPEL_B: 3 },
    "soal arsip tidak ikut dihitung");

  // Key yang belum ada di Config lama tetap dibuat, bukan hilang diam-diam.
  const fresh = loadGas(examState({ Config: [["key", "value"]] }));
  assert.equal(post(fresh, "saveExamConfig", validOpen).success, true);
  assert.equal(configValue(fresh, "exam_status"), "OPEN");
  assert.equal(configValue(fresh, "exam_duration"), 120);
}

// ── B/C/D. VALIDASI DITOLAK, CONFIG TIDAK BERUBAH ──────────────────────────
{
  const invalidCases = [
    [{ exam_name: "   " }, /Nama ujian wajib diisi/],
    [{ exam_name: "x".repeat(121) }, /terlalu panjang/],
    [{ exam_mapel: "" }, /Mata pelajaran wajib dipilih/],
    [{ exam_mapel: "MAPEL_TIDAK_ADA" }, /tidak ditemukan/],
    [{ exam_duration: 0 }, /Durasi ujian/],
    [{ exam_duration: -30 }, /Durasi ujian/],
    [{ exam_duration: 12.5 }, /Durasi ujian/],
    [{ exam_duration: "sembilan puluh" }, /Durasi ujian/],
    [{ exam_duration: 601 }, /Durasi ujian/],
    [{ exam_status: "MUNGKIN" }, /Status ujian tidak valid/],
  ];
  for (const [patch, pattern] of invalidCases) {
    const gas = loadGas(examState());
    const res = post(gas, "saveExamConfig", Object.assign({}, validOpen, patch));
    assert.equal(res.success, false, "harus ditolak: " + JSON.stringify(patch));
    assert.match(res.message, pattern);
    // Penolakan tidak boleh menulis apa pun.
    assert.equal(configValue(gas, "exam_name"), "Ujian Lama");
    assert.equal(configValue(gas, "exam_mapel"), "MAPEL_A");
    assert.equal(configValue(gas, "exam_status"), "CLOSED");
  }
}

// ── E. UJIAN TANPA SOAL TIDAK BISA DIBUKA ──────────────────────────────────
{
  const gas = loadGas(examState());
  const res = post(gas, "saveExamConfig", Object.assign({}, validOpen, { exam_mapel: "MAPEL_KOSONG" }));
  assert.equal(res.success, false);
  assert.match(res.message, /Belum ada soal aktif/);
  assert.match(res.message, /Bank Soal/, "pesan harus memberi tahu guru langkah berikutnya");
  assert.equal(configValue(gas, "exam_status"), "CLOSED", "ujian kosong tidak boleh terbuka");

  // Mapel tanpa soal masih boleh disimpan dalam keadaan tertutup.
  assert.equal(
    post(gas, "saveExamConfig", Object.assign({}, validOpen, {
      exam_mapel: "MAPEL_KOSONG", exam_status: "CLOSED",
    })).success, true,
  );
}

// ── F/G/H/I. TRANSISI BUKA/TUTUP, AMAN DIULANG ─────────────────────────────
{
  const gas = loadGas(examState());
  assert.equal(post(gas, "saveExamConfig", validOpen).success, true);
  assert.equal(configValue(gas, "exam_status"), "OPEN");

  // Buka lagi: idempotent, nilai tetap sama.
  const reopen = post(gas, "saveExamConfig", validOpen);
  assert.equal(reopen.success, true);
  assert.equal(reopen.data.exam_status, "OPEN");
  assert.equal(configValue(gas, "exam_name"), "Sumatif Akhir Semester Genap");

  assert.equal(post(gas, "setExamStatus", { status: "CLOSED" }).success, true);
  assert.equal(configValue(gas, "exam_status"), "CLOSED");
  assert.equal(post(gas, "setExamStatus", { status: "CLOSED" }).success, true, "tutup ulang aman");
  assert.equal(configValue(gas, "exam_status"), "CLOSED");

  // Menutup tidak menghapus nama/mapel/durasi ujian.
  assert.equal(configValue(gas, "exam_mapel"), "MAPEL_B");
  assert.equal(configValue(gas, "exam_duration"), 120);

  // Siswa tidak bisa login saat tertutup, bisa lagi setelah dibuka.
  assert.equal(post(gas, "login", { username: "siswa", password: "pw" }).success, false);
  assert.equal(post(gas, "saveExamConfig", validOpen).success, true);
  assert.equal(post(gas, "login", { username: "siswa", password: "pw" }).success, true);
}

// ── J/K. MENUTUP UJIAN TIDAK MENGHAPUS DATA ────────────────────────────────
{
  const gas = loadGas(examState());
  post(gas, "saveExamConfig", validOpen);
  post(gas, "login", { username: "siswa", password: "pw" });
  const bindingBefore = gas.__sheets.Users.rows[1][14];
  assert.ok(bindingBefore, "login membentuk binding Task 5.1");

  post(gas, "submitExam", { id_siswa: "S1", answers: { QB1: "C", QB2: "A", QB3: "B" } });
  const responsesBefore = gas.__sheets.Responses.rows.length;
  const scoreBefore = gas.__sheets.Users.rows[1][8];
  assert.equal(responsesBefore, 2);
  assert.equal(scoreBefore, "100.00");

  assert.equal(post(gas, "setExamStatus", { status: "CLOSED" }).success, true);
  assert.equal(gas.__sheets.Responses.rows.length, responsesBefore, "Responses tidak boleh hilang");
  assert.equal(gas.__sheets.Users.rows.length, 2, "baris siswa tidak boleh hilang");
  assert.equal(gas.__sheets.Users.rows[1][8], scoreBefore, "nilai siswa tidak boleh berubah");
  assert.equal(gas.__sheets.Users.rows[1][14], bindingBefore, "snapshot attempt tidak boleh hilang");
  assert.equal(gas.__sheets.Users.rows[1][10], "SELESAI");
}

// ── L/M/N/O. INTEGRASI SNAPSHOT TASK 5.1 ───────────────────────────────────
{
  const gas = loadGas(examState());
  post(gas, "saveExamConfig", validOpen); // MAPEL_B, 120 menit, 3 soal
  const attempt = post(gas, "login", { username: "siswa", password: "pw" }).data;
  assert.equal(attempt.exam_duration, 120);
  assert.equal(attempt.exam_mapel, "MAPEL_B");
  assert.ok(attempt.exam_id);

  const delivered = getAs(gas, "getQuestions", { id_siswa: "S1" });
  assert.deepEqual(delivered.data.map((q) => q.id_soal), ["QB1", "QB2", "QB3"]);
  assert.equal(JSON.stringify(delivered).includes("kunci_jawaban"), false, "kunci jawaban tidak boleh bocor");

  // Guru mengubah seluruh konfigurasi ujian di tengah attempt.
  assert.equal(post(gas, "saveExamConfig", {
    exam_name: "Ujian Susulan", exam_mapel: "MAPEL_A", exam_duration: 30, exam_status: "OPEN",
  }).success, true);
  // Bank Soal juga bertambah untuk mapel lama.
  gas.__sheets.Questions.rows.push(singleRow("QB4", 4, "A", "MAPEL_B"));

  const afterChange = getAs(gas, "getQuestions", { id_siswa: "S1" });
  assert.deepEqual(afterChange.data.map((q) => q.id_soal), ["QB1", "QB2", "QB3"],
    "attempt berjalan tidak ikut konfigurasi/Bank Soal baru");

  gas.__sheets.Users.rows[1][6] = new Date(Date.now() - 60 * MINUTE); // lewat 30 menit, belum 120
  const sync = post(gas, "syncAnswers", { id_siswa: "S1", answers: { QB1: "C" } });
  assert.equal(sync.success, true, "durasi beku 120 menit tetap berlaku");

  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { QB1: "C", QB2: "A", QB3: "B" } });
  assert.equal(submit.late, false, "deadline attempt tidak ikut durasi Config yang baru");
  assert.equal(submit.score, "100.00", "scoring memakai soal beku, bukan Bank Soal terbaru");
  assert.equal(gas.__sheets.Users.rows[1][12], "MAPEL_B", "mapel tercatat = mapel beku attempt");
}

// ── P. SISWA BARU SETELAH KONFIGURASI DIGANTI ──────────────────────────────
{
  const state = examState();
  state.Users.push(["S2", "siswa2", "pw2", "Siswa Dua", "6A", false, "", "", "", 0, "BELUM", "", "", "", ""]);
  const gas = loadGas(state);

  post(gas, "saveExamConfig", validOpen);
  const first = post(gas, "login", { username: "siswa", password: "pw" }).data;

  post(gas, "saveExamConfig", {
    exam_name: "Ujian Kedua", exam_mapel: "MAPEL_A", exam_duration: 45, exam_status: "OPEN",
  });
  const second = post(gas, "login", { username: "siswa2", password: "pw2" }).data;
  assert.equal(second.exam_duration, 45, "siswa baru memakai konfigurasi terbaru");
  assert.equal(second.exam_mapel, "MAPEL_A");
  assert.notEqual(second.exam_id, first.exam_id, "konfigurasi berbeda = revisi ujian berbeda");
  assert.deepEqual(
    getAs(gas, "getQuestions", { id_siswa: "S2" }).data.map((q) => q.id_soal), ["Q1", "Q2"],
  );
  // Siswa pertama tetap di ujian lamanya.
  assert.deepEqual(
    getAs(gas, "getQuestions", { id_siswa: "S1" }).data.map((q) => q.id_soal), ["QB1", "QB2", "QB3"],
  );
}

// ── Q. LIVE MONITORING TETAP DAPAT DIBUKA & TIDAK BOCOR ────────────────────
{
  const gas = loadGas(examState());
  post(gas, "saveExamConfig", validOpen);
  post(gas, "login", { username: "siswa", password: "pw" });
  post(gas, "submitExam", { id_siswa: "S1", answers: { QB1: "C" } });

  const live = get(gas, "getLiveScore");
  assert.equal(live.success, true);
  assert.deepEqual(Object.keys(live.data[0]).sort(), [
    "kelas", "nama", "rank", "skor", "status", "waktu_selesai", "waktu_submit_ms",
  ], "payload monitoring hanya data tampilan");
  const serialized = JSON.stringify(live);
  for (const secret of ["pw", "QB1", "kunci", "exam_binding", tenantSecret]) {
    assert.equal(serialized.includes(secret), false, "monitoring bocor: " + secret);
  }
  assert.ok(live.stats && typeof live.stats.selesai === "number");
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
  // A. Penjaga ujian kosong dihapus.
  const zeroGuardMutation = mutate(
    '  if (exam_status === "OPEN" && questionCount === 0) {',
    "  if (false) {",
    "A",
  );
  const gasA = loadGas(examState(), zeroGuardMutation);
  assert.throws(() => assert.equal(
    post(gasA, "saveExamConfig", Object.assign({}, validOpen, { exam_mapel: "MAPEL_KOSONG" })).success, false,
  ), undefined, "mutation A tidak terdeteksi");

  // B. Jumlah soal dipercaya dari layar guru, bukan dihitung ulang di server.
  const clientCountMutation = mutate(
    "  const questionCount = collectExamQuestionRows(exam_mapel).length;",
    "  const questionCount = Number(params.question_count) || 0;",
    "B",
  );
  const gasB = loadGas(examState(), clientCountMutation);
  assert.throws(() => assert.equal(
    post(gasB, "saveExamConfig", Object.assign({}, validOpen, {
      exam_mapel: "MAPEL_KOSONG", question_count: 99,
    })).success, false,
  ), undefined, "mutation B tidak terdeteksi");

  // C. Validasi mapel dilewati.
  const mapelGuardMutation = mutate(
    "  if (!validMapel || validMapel.indexOf(exam_mapel) === -1) {",
    "  if (false) {",
    "C",
  );
  // Tanpa validasi mapel, mapel asing lolos sampai penjaga soal kosong dan guru
  // mendapat pesan salah arah ("tambahkan soal") alih-alih "mapel tidak ditemukan".
  const gasC = loadGas(examState(), mapelGuardMutation);
  assert.throws(() => assert.match(
    post(gasC, "saveExamConfig", Object.assign({}, validOpen, { exam_mapel: "MAPEL_TIDAK_ADA" })).message,
    /tidak ditemukan/,
  ), undefined, "mutation C tidak terdeteksi");

  // D. Hanya sebagian key Config yang ditulis — konfigurasi setengah jadi.
  const partialWriteMutation = mutate(
    "  const written = writeConfigValues({\n    exam_name: exam_name,\n    exam_mapel: exam_mapel,",
    "  const written = writeConfigValues({\n    exam_name: exam_name,",
    "D",
  );
  const gasD = loadGas(examState(), partialWriteMutation);
  post(gasD, "saveExamConfig", validOpen);
  assert.throws(() => assert.equal(configValue(gasD, "exam_mapel"), "MAPEL_B"),
    undefined, "mutation D tidak terdeteksi");

  // E. Jumlah soal ujian diambil dari seluruh Bank Soal, bukan per mapel.
  const mapelFilterMutation = mutate(
    '    if (mapel && String(row[13] || "") !== mapel) continue;',
    "    if (false) continue;",
    "E",
  );
  const gasE = loadGas(examState(), mapelFilterMutation);
  post(gasE, "saveExamConfig", validOpen);
  post(gasE, "login", { username: "siswa", password: "pw" });
  assert.throws(() => assert.deepEqual(
    getAs(gasE, "getQuestions", { id_siswa: "S1" }).data.map((q) => q.id_soal), ["QB1", "QB2", "QB3"],
  ), undefined, "mutation E tidak terdeteksi");
}

// ── Sel Config numerik keluar sebagai teks ────────────────────────────────
// Nomor WA "6285296724570" tersimpan di Sheets sebagai number; client memakainya
// sebagai string (cari digit, potong, uppercase).
{
  const gas = loadGas(examState({
    Config: [
      ["key", "value"],
      ["exam_name", 2026],
      ["exam_mapel", "MAPEL_A"],
      ["exam_duration", 90],
      ["exam_status", "OPEN"],
      ["admin_wa", 6285296724570],
    ],
  }));
  const cfg = get(gas, "getConfig").data;
  assert.equal(cfg.admin_wa, "6285296724570");
  assert.equal(typeof cfg.admin_wa, "string", "admin_wa numerik harus keluar sebagai teks");
  assert.equal(cfg.exam_name, "2026");
  assert.equal(typeof cfg.exam_name, "string");
  assert.equal(typeof cfg.exam_mapel, "string");
  assert.equal(typeof cfg.exam_status, "string");
}

// admin_wa yang belum diisi tetap string kosong, bukan undefined.
{
  const gas = loadGas(examState());
  const cfg = get(gas, "getConfig").data;
  assert.equal(cfg.admin_wa, "");
  assert.equal(typeof cfg.admin_wa, "string");
}

console.log("examConfig: validasi, ujian kosong, buka/tutup, integrasi snapshot, monitoring publik + mutations A/B/C/D/E PASS");
