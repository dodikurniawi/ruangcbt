// Task 5.1 — Single active exam foundation.
// Yang diuji: begitu siswa mulai, perubahan Config atau Bank Soal tidak boleh
// mengubah soal, urutan, durasi, deadline, maupun hasil scoring attempt itu.
// Menjalankan code.gs asli lewat harness vm bersama (gasHarness.cjs).

const assert = require("node:assert/strict");
const {
  tenantSecret, loadGas, baseState, post,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
} = require("./gasHarness.cjs");

const MINUTE = 60000;

// doGet dengan parameter tambahan (id_siswa disuntik proxy dari sesi).
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

function userRow(overrides) {
  const row = ["S1", "siswa", "pw", "Siswa", "6A", false, "", "", "", 0, "BELUM", "", "", "", ""];
  return Object.assign(row, overrides || {});
}

function snapState(overrides) {
  return baseState(Object.assign({
    Config: [
      ["key", "value"],
      ["exam_name", "Ujian Tengah Semester"],
      ["exam_mapel", "MAPEL_A"],
      ["exam_duration", 90],
      ["exam_status", "OPEN"],
    ],
    MataPelajaran: [
      ["id_mapel", "kode", "nama"],
      ["MAPEL_A", "MTK", "Matematika"],
      ["MAPEL_B", "BIN", "Bahasa Indonesia"],
    ],
    Questions: [
      QUESTION_HEADER,
      singleRow("Q1", 1, "A", "MAPEL_A"),
      singleRow("Q2", 2, "B", "MAPEL_A"),
      singleRow("QB1", 1, "C", "MAPEL_B"),
    ],
    Users: [USER_HEADER.concat(["exam_binding"]), userRow()],
    Responses: [RESPONSE_HEADER],
  }, overrides || {}));
}

function startAttempt(gas) {
  const res = post(gas, "login", { username: "siswa", password: "pw" });
  assert.equal(res.success, true, res.message);
  return res.data;
}

function questionIds(result) {
  return result.data.map(function (q) { return q.id_soal; });
}

function setStart(gas, minutesAgo) {
  gas.__sheets.Users.rows[1][6] = new Date(Date.now() - minutesAgo * MINUTE);
}

// ── A. CONFIG DRIFT: durasi ────────────────────────────────────────────────
// Mulai dengan 90 menit, admin ubah ke 60, attempt tetap 90.
{
  const gas = loadGas(snapState());
  const attempt = startAttempt(gas);
  assert.equal(attempt.exam_duration, 90);
  assert.ok(attempt.exam_id, "attempt wajib membawa identitas ujian");

  post(gas, "updateConfig", { key: "exam_duration", value: 60 });
  setStart(gas, 70); // lewat deadline 60 menit, masih di dalam 90 menit

  const sync = post(gas, "syncAnswers", { id_siswa: "S1", answers: { Q1: "A" } });
  assert.equal(sync.success, true, "autosave harus memakai durasi beku, bukan Config baru");

  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } });
  assert.equal(submit.success, true);
  assert.equal(submit.late, false, "deadline attempt tidak boleh ikut Config yang berubah");
  assert.equal(submit.score, "100.00");

  // Siswa berikutnya mengikuti config baru.
  const fresh = loadGas(snapState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["exam_duration", 60]],
  }));
  assert.equal(startAttempt(fresh).exam_duration, 60, "attempt baru memakai config terbaru");
}

// ── B. MAPEL DRIFT ─────────────────────────────────────────────────────────
{
  const gas = loadGas(snapState());
  const attempt = startAttempt(gas);
  assert.equal(attempt.exam_mapel, "MAPEL_A");

  post(gas, "updateConfig", { key: "exam_mapel", value: "MAPEL_B" });

  const delivered = getAs(gas, "getQuestions", { id_siswa: "S1" });
  assert.deepEqual(questionIds(delivered), ["Q1", "Q2"], "attempt tetap mapel lama");

  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } });
  assert.equal(submit.score, "100.00");
  assert.equal(gas.__sheets.Users.rows[1][12], "MAPEL_A", "mapel tercatat = mapel beku attempt");
}

// ── C. QUESTION DRIFT: edit soal saat ujian berjalan ditolak ───────────────
// Termasuk lubang lama: admin memindahkan Config.exam_mapel dulu, lalu mengedit
// soal yang justru sedang dikerjakan.
{
  const gas = loadGas(snapState());
  startAttempt(gas);
  post(gas, "updateConfig", { key: "exam_mapel", value: "MAPEL_B" });

  const edit = post(gas, "updateQuestion", {
    id_soal: "Q1",
    data: {
      nomor_urut: 1, tipe: "SINGLE", pertanyaan: "<p>Soal diubah</p>", gambar_url: "",
      opsi_a: "A", opsi_b: "B", opsi_c: "C", opsi_d: "D", opsi_e: "",
      kunci_jawaban: "D", bobot: 1, kategori: "", id_mapel: "MAPEL_A",
    },
  });
  assert.equal(edit.success, false, "soal yang sedang dikerjakan tidak boleh diubah");
  assert.match(edit.message, /berlangsung/);

  const remove = post(gas, "deleteQuestion", { id_soal: "Q1" });
  assert.equal(remove.success, false, "soal yang sedang dikerjakan tidak boleh dihapus");
}

// ── D. QUESTION ADDITION ───────────────────────────────────────────────────
{
  const gas = loadGas(snapState());
  startAttempt(gas);
  gas.__sheets.Questions.rows.push(singleRow("Q3", 3, "A", "MAPEL_A"));

  const delivered = getAs(gas, "getQuestions", { id_siswa: "S1" });
  assert.deepEqual(questionIds(delivered), ["Q1", "Q2"], "soal baru tidak masuk attempt berjalan");

  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } });
  assert.equal(submit.score, "100.00", "soal baru tidak boleh menaikkan skor maksimum");
}

// ── E. QUESTION ARCHIVE SETELAH MULAI ──────────────────────────────────────
{
  const gas = loadGas(snapState());
  startAttempt(gas);
  gas.__sheets.Questions.rows[2][14] = "ARSIP"; // Q2 diarsipkan di tengah ujian

  const delivered = getAs(gas, "getQuestions", { id_siswa: "S1" });
  assert.deepEqual(questionIds(delivered), ["Q1", "Q2"], "soal beku tetap dikirim walau diarsipkan");

  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } });
  assert.equal(submit.success, true);
  assert.equal(submit.score, "100.00", "soal beku tetap dinilai walau sudah diarsipkan");
}

// ── F. SCORING DRIFT: versi baru tidak menggantikan versi beku ─────────────
{
  const gas = loadGas(snapState());
  startAttempt(gas);
  // Simulasi versioning: Q1 diarsipkan, versi baru Q1V2 aktif dengan kunci lain.
  gas.__sheets.Questions.rows[1][14] = "ARSIP";
  gas.__sheets.Questions.rows.push(singleRow("Q1V2", 1, "D", "MAPEL_A"));
  gas.__sheets.Questions.rows[gas.__sheets.Questions.rows.length - 1][15] = "Q1";

  const delivered = getAs(gas, "getQuestions", { id_siswa: "S1" });
  assert.deepEqual(questionIds(delivered), ["Q1", "Q2"], "attempt tetap memakai versi beku");

  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } });
  assert.equal(submit.score, "100.00", "scoring memakai kunci versi beku, bukan versi terbaru");
}

// ── G. RE-ENTRY setelah browser/tab ditutup ────────────────────────────────
function runningState(lastSeenMinutesAgo) {
  const start = new Date(Date.now() - 20 * MINUTE);
  const binding = JSON.stringify({
    exam_id: "EXFIXED", exam_name: "Ujian Tengah Semester", exam_mapel: "MAPEL_A",
    exam_duration: 90, question_ids: ["Q1", "Q2"],
  });
  const row = userRow();
  row[5] = true;                                   // status_login tertinggal true
  row[6] = start;
  row[10] = "SEDANG";
  row[11] = new Date(Date.now() - lastSeenMinutesAgo * MINUTE);
  row[13] = JSON.stringify({ Q1: "A" });           // saved_answers
  row[14] = binding;
  const state = snapState();
  state.Users = [USER_HEADER.concat(["exam_binding"]), row];
  return { state: state, start: start };
}
{
  const fixture = runningState(10);
  const gas = loadGas(fixture.state);
  const resumed = startAttempt(gas);
  assert.equal(resumed.exam_id, "EXFIXED", "re-entry memakai snapshot attempt yang sama");
  assert.equal(resumed.exam_duration, 90);
  assert.equal(
    new Date(resumed.waktu_mulai).getTime(), fixture.start.getTime(),
    "re-entry tidak boleh mengulang waktu_mulai",
  );
  assert.equal(
    new Date(gas.__sheets.Users.rows[1][6]).getTime(), fixture.start.getTime(),
    "waktu_mulai di sheet tidak boleh ditulis ulang",
  );
  assert.equal(JSON.stringify(resumed.saved_answers), JSON.stringify({ Q1: "A" }));
  assert.equal(gas.__sheets.Users.rows[1][13], JSON.stringify({ Q1: "A" }), "saved_answers tetap");
  assert.deepEqual(
    questionIds(getAs(gas, "getQuestions", { id_siswa: "S1" })), ["Q1", "Q2"],
    "re-entry memakai question set beku",
  );

  // Sesi yang benar-benar masih aktif di perangkat lain tetap ditolak.
  const active = loadGas(runningState(0.2).state);
  const denied = post(active, "login", { username: "siswa", password: "pw" });
  assert.equal(denied.success, false);
  assert.match(denied.message, /perangkat lain/);
}

// ── H. RESPONSE BINDING ────────────────────────────────────────────────────
{
  const gas = loadGas(snapState());
  const attempt = startAttempt(gas);
  post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } });

  const rows = gas.__sheets.Responses.rows;
  const last = rows[rows.length - 1];
  assert.equal(last[1], "S1");
  assert.equal(last[9], attempt.exam_id, "Responses kolom 10 = identitas/revisi ujian");
  assert.equal(last[10], "MAPEL_A", "Responses kolom 11 = mapel beku attempt");
  // Arti kolom lama tidak berubah.
  assert.equal(last[5], "100.00");
  assert.equal(JSON.parse(last[4]).Q1, "A");
}

// ── I. LEGACY: baris tanpa binding tetap jalan ─────────────────────────────
{
  const legacyUser = ["S1", "siswa", "pw", "Siswa", "6A", false,
    new Date(Date.now() - 10 * MINUTE), "", "", 0, "SEDANG", "", "", ""]; // 14 kolom, tanpa binding
  const state = snapState();
  state.Users = [USER_HEADER, legacyUser];
  state.Responses = [
    RESPONSE_HEADER,
    [new Date(), "S0", "Alumni", "6A", JSON.stringify({ Q1: "A" }), "80.00", 30, "", ""], // 9 kolom
  ];
  const gas = loadGas(state);

  const exported = JSON.parse(gas.doGet({ parameter: { action: "exportResults", proxy_secret: tenantSecret } }).text);
  assert.equal(exported.success, true);
  assert.equal(exported.data[1][5], "80.00", "Responses lama tetap terbaca apa adanya");

  // Attempt lama dibekukan saat login berikutnya, tanpa mengubah waktu_mulai.
  const resumed = startAttempt(gas);
  assert.ok(resumed.exam_id, "attempt lama mendapat binding saat re-entry");
  assert.equal(resumed.exam_duration, 90);
  assert.equal(
    new Date(resumed.waktu_mulai).getTime(), new Date(legacyUser[6]).getTime(),
    "binding susulan tidak boleh mengulang waktu ujian",
  );

  // Attempt yang belum sempat dapat binding tetap bisa submit lewat fallback Config.
  const noBinding = snapState();
  noBinding.Users = [USER_HEADER, ["S1", "siswa", "pw", "Siswa", "6A", true,
    new Date(Date.now() - 10 * MINUTE), "", "", 0, "SEDANG", "", "", ""]];
  const legacySubmit = post(loadGas(noBinding), "submitExam", {
    id_siswa: "S1", answers: { Q1: "A", Q2: "B" },
  });
  assert.equal(legacySubmit.success, true);
  assert.equal(legacySubmit.score, "100.00");
}

// ── J. REGRESI 5 TIPE lewat attempt beku ───────────────────────────────────
{
  const tfData = JSON.stringify({ pernyataan: [{ id: "1", teks: "Air mendidih 100C" }, { id: "2", teks: "Es panas" }] });
  const matchData = JSON.stringify({ kiri: [{ id: "L1", teks: "Ibu kota" }], kanan: [{ id: "R1", teks: "Jakarta" }] });
  const fillData = JSON.stringify({ petunjuk: "Isi ibu kota Indonesia" });
  const multiTypeState = () => snapState({
    Questions: [
      QUESTION_HEADER,
      singleRow("Q1", 1, "A", "MAPEL_A"),
      ["Q2", 2, "COMPLEX", "Pilih dua", "", "A", "B", "C", "D", "", "A,C", 1, "", "MAPEL_A", "AKTIF", "", ""],
      ["Q3", 3, "TRUE_FALSE", "Benar salah", "", "", "", "", "", "", '{"1":"BENAR","2":"SALAH"}', 2, "", "MAPEL_A", "AKTIF", "", tfData],
      ["Q4", 4, "MATCHING", "Pasangkan", "", "", "", "", "", "", '{"L1":"R1"}', 2, "", "MAPEL_A", "AKTIF", "", matchData],
      ["Q5", 5, "FILL_IN", "Isian", "", "", "", "", "", "", '{"accepted_answers":["Jakarta"]}', 1, "", "MAPEL_A", "AKTIF", "", fillData],
    ],
  });
  const gas = loadGas(multiTypeState());
  startAttempt(gas);

  const delivered = getAs(gas, "getQuestions", { id_siswa: "S1" });
  assert.deepEqual(questionIds(delivered), ["Q1", "Q2", "Q3", "Q4", "Q5"]);
  const leaked = JSON.stringify(delivered);
  for (const field of ["kunci_jawaban", "status_soal", "versi_dari", "accepted_answers", "BENAR"]) {
    assert.equal(leaked.includes(field), false, "proyeksi siswa bocor: " + field);
  }

  const submit = post(gas, "submitExam", {
    id_siswa: "S1",
    answers: {
      Q1: "A", Q2: ["A", "C"], Q3: { 1: "BENAR", 2: "SALAH" }, Q4: { L1: "R1" }, Q5: "jakarta",
    },
  });
  assert.equal(submit.score, "100.00", "5 tipe tetap dinilai penuh lewat snapshot");

  const partial = loadGas(multiTypeState());
  startAttempt(partial);
  const half = post(partial, "submitExam", {
    id_siswa: "S1",
    answers: { Q1: "A", Q2: ["A"], Q3: { 1: "BENAR", 2: "BENAR" }, Q4: {}, Q5: "Bandung" },
  });
  // bobot 1+1+2+2+1 = 7. Benar: SINGLE 1, TRUE_FALSE separuh 1. Sisanya 0.
  assert.equal(half.score, "28.57", "scoring parsial 5 tipe tidak berubah");
}

// ── MUTATION GUARDS ────────────────────────────────────────────────────────
// Setiap mutasi mematikan satu jaminan pembekuan; test di atas wajib gagal.
function mutate(find, replaceWith, label) {
  return function (source) {
    const mutated = source.replace(find, replaceWith);
    assert.notEqual(mutated, source, "titik mutation " + label + " tidak ditemukan");
    return mutated;
  };
}
{
  // A. Durasi beku diganti durasi Config saat submit.
  const durationMutation = mutate(
    "const examDuration = binding ? binding.exam_duration : Number(config.exam_duration);",
    "const examDuration = Number(config.exam_duration);",
    "A",
  );
  const gasA = loadGas(snapState(), durationMutation);
  startAttempt(gasA);
  post(gasA, "updateConfig", { key: "exam_duration", value: 60 });
  setStart(gasA, 70);
  assert.throws(() => assert.equal(
    post(gasA, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } }).late, false,
  ), undefined, "mutation A tidak terdeteksi");

  // A2. Durasi beku diganti durasi Config saat autosave.
  const syncMutation = mutate(
    "var syncDuration = syncBinding ? syncBinding.exam_duration : getConfig().exam_duration;",
    "var syncDuration = getConfig().exam_duration;",
    "A2",
  );
  const gasA2 = loadGas(snapState(), syncMutation);
  startAttempt(gasA2);
  post(gasA2, "updateConfig", { key: "exam_duration", value: 60 });
  setStart(gasA2, 70);
  assert.throws(() => assert.equal(
    post(gasA2, "syncAnswers", { id_siswa: "S1", answers: { Q1: "A" } }).success, true,
  ), undefined, "mutation A2 tidak terdeteksi");

  // B. Mapel beku diganti mapel Config saat submit.
  const mapelMutation = mutate(
    'const exam_mapel = binding ? binding.exam_mapel : (config.exam_mapel || "");',
    'const exam_mapel = config.exam_mapel || "";',
    "B",
  );
  const gasB = loadGas(snapState(), mapelMutation);
  startAttempt(gasB);
  post(gasB, "updateConfig", { key: "exam_mapel", value: "MAPEL_B" });
  post(gasB, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } });
  assert.throws(() => assert.equal(gasB.__sheets.Users.rows[1][12], "MAPEL_A"),
    undefined, "mutation B tidak terdeteksi");

  // C. Delivery mengabaikan binding dan kembali membaca Questions terbaru.
  const deliveryMutation = mutate(
    "const binding = skipMapelFilter ? null : getAttemptBinding(id_siswa);",
    "const binding = null;",
    "C",
  );
  const gasC = loadGas(snapState(), deliveryMutation);
  startAttempt(gasC);
  gasC.__sheets.Questions.rows.push(singleRow("Q3", 3, "A", "MAPEL_A"));
  assert.throws(() => assert.deepEqual(
    questionIds(getAs(gasC, "getQuestions", { id_siswa: "S1" })), ["Q1", "Q2"],
  ), undefined, "mutation C tidak terdeteksi");

  // D. Scoring mengabaikan binding dan menilai dari Bank Soal terbaru.
  const scoringMutation = mutate(
    "  const scoring = binding\n    ? scoreExam([null].concat(resolveBoundQuestionRows(binding)), submittedAnswers, \"\", true)\n    : scoreExam(getSheet(\"Questions\").getDataRange().getValues(), submittedAnswers, exam_mapel);",
    "  const scoring = scoreExam(getSheet(\"Questions\").getDataRange().getValues(), submittedAnswers, exam_mapel);",
    "D",
  );
  const gasD = loadGas(snapState(), scoringMutation);
  startAttempt(gasD);
  gasD.__sheets.Questions.rows[1][14] = "ARSIP";
  gasD.__sheets.Questions.rows.push(singleRow("Q1V2", 1, "D", "MAPEL_A"));
  assert.throws(() => assert.equal(
    post(gasD, "submitExam", { id_siswa: "S1", answers: { Q1: "A", Q2: "B" } }).score, "100.00",
  ), undefined, "mutation D tidak terdeteksi");

  // E. Re-entry menulis ulang waktu_mulai.
  const reentryMutation = mutate(
    "      if (!row[6]) {\n        sheet.getRange(i + 1, 7).setValue(waktuMulai);",
    "      if (true) {\n        sheet.getRange(i + 1, 7).setValue(new Date());",
    "E",
  );
  const fixture = runningState(10);
  const gasE = loadGas(fixture.state, reentryMutation);
  startAttempt(gasE);
  assert.throws(() => assert.equal(
    new Date(gasE.__sheets.Users.rows[1][6]).getTime(), fixture.start.getTime(),
  ), undefined, "mutation E tidak terdeteksi");

  // F. Binding attempt diabaikan saat menjaga soal yang sedang diujikan.
  const guardMutation = mutate(
    "    const attemptMapel = binding ? binding.exam_mapel : fallbackMapel;",
    "    const attemptMapel = fallbackMapel;",
    "F",
  );
  const gasF = loadGas(snapState(), guardMutation);
  startAttempt(gasF);
  post(gasF, "updateConfig", { key: "exam_mapel", value: "MAPEL_B" });
  assert.throws(() => assert.equal(
    post(gasF, "deleteQuestion", { id_soal: "Q1" }).success, false,
  ), undefined, "mutation F tidak terdeteksi");
}

console.log("examSnapshot: config/mapel/question drift, re-entry, response binding + mutations A/A2/B/C/D/E/F PASS");
