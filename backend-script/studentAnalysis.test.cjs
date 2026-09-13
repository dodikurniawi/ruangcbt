// Analisis Hasil Belajar Siswa — statistik deterministic milik server.
// Yang diuji: angka per kategori dihitung dari kunci jawaban (bukan dari AI),
// KKM dibaca dari Config dan jatuh ke 70 hanya bila belum diatur, status ketuntasan
// mengikuti KKM, tidak ada nama siswa pada payload, dan result_hash berubah ketika
// hasil ujian berubah (cache analisis jadi stale).

const assert = require("node:assert/strict");
const {
  tenantSecret, loadGas, baseState, get,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
} = require("./gasHarness.cjs");

function soal(id, nomor, kunci, kategori, bobot) {
  return [
    id, nomor, "SINGLE", "Soal " + id, "",
    "A", "B", "C", "D", "",
    kunci, bobot === undefined ? 1 : bobot, kategori, "MAPEL_A", "AKTIF", "", "",
  ];
}

function soalTyped(id, nomor, tipe, kunci, kategori, bobot, dataSoal) {
  return [
    id, nomor, tipe, "Soal " + id, "",
    "A", "B", "C", "D", "",
    typeof kunci === "string" ? kunci : JSON.stringify(kunci),
    bobot, kategori, "MAPEL_A", "AKTIF", "",
    dataSoal ? JSON.stringify(dataSoal) : "",
  ];
}

// Responses: 1=timestamp 2=id_siswa 3=nama 4=kelas 5=jawaban 6=skor 7=durasi
// 8=log 9=ip 10=exam_id 11=exam_mapel
function responseRow(answers, skor, examId) {
  return [
    new Date("2026-01-01T00:00:00Z"), "S1", "Budi Santoso", "6A",
    JSON.stringify(answers), skor, 30, "", "", examId || "EXAM1", "MAPEL_A",
  ];
}

function analysisState(overrides) {
  return baseState(Object.assign({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["exam_duration", 90]],
    MataPelajaran: [["id_mapel", "kode", "nama"], ["MAPEL_A", "MTK", "Matematika"]],
    Questions: [
      QUESTION_HEADER,
      soal("Q1", 1, "A", "Pecahan"),
      soal("Q2", 2, "A", "Pecahan"),
      soal("Q3", 3, "A", "Pecahan"),
      soal("Q4", 4, "A", "Pecahan"),
      soal("Q5", 5, "A", "Geometri"),
      soal("Q6", 6, "A", "Geometri"),
      soal("Q7", 7, "B", ""), // tanpa kategori — tidak boleh dikarang namanya
    ],
    Users: [USER_HEADER.concat(["exam_binding"]),
      ["S1", "siswa", "pw", "Budi Santoso", "6A", false, "", "", "62.00", 0, "SELESAI", "", "MAPEL_A", "", ""]],
    Responses: [RESPONSE_HEADER.concat(["exam_id", "exam_mapel"])],
  }, overrides || {}));
}

function analyze(gas, id_siswa) {
  return JSON.parse(
    gas.doGet({
      parameter: { action: "getStudentAnalysis", proxy_secret: tenantSecret, id_siswa: id_siswa },
    }).text
  );
}

// Jawaban: Pecahan 1 benar dari 4, Geometri 2 benar dari 2, 1 soal tanpa kategori benar.
const ANSWERS = { Q1: "A", Q2: "B", Q3: "C", Q5: "A", Q6: "A", Q7: "B" };

const MIXED_ANSWERS = {
  S_FULL: "A",
  S_ZERO: "B",
  C_FULL: ["C", "A"],
  C_ZERO: ["A"],
  TF_PARTIAL: { "1": "BENAR", "2": "SALAH", "3": "BENAR", "4": "SALAH" },
  M_PARTIAL: { L1: "R1", L2: "R2", L3: "R3", L4: "R3" },
  F_FULL: "Jakarta",
};

function mixedScoringState() {
  return analysisState({
    Questions: [
      QUESTION_HEADER,
      soalTyped("S_FULL", 1, "SINGLE", "A", "Single", 1),
      soalTyped("S_ZERO", 2, "SINGLE", "A", "Single", 1),
      soalTyped("C_FULL", 3, "COMPLEX", "A,C", "Complex", 2),
      soalTyped("C_ZERO", 4, "COMPLEX", "A,C", "Complex", 2),
      soalTyped("TF_PARTIAL", 5, "TRUE_FALSE",
        { "1": "BENAR", "2": "SALAH", "3": "SALAH", "4": "BENAR" },
        "True False", 4,
        { pernyataan: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }] }),
      soalTyped("M_PARTIAL", 6, "MATCHING",
        { L1: "R1", L2: "R2", L3: "R3", L4: "R4" },
        "Matching", 4,
        {
          kiri: [{ id: "L1" }, { id: "L2" }, { id: "L3" }, { id: "L4" }],
          kanan: [{ id: "R1" }, { id: "R2" }, { id: "R3" }, { id: "R4" }],
        }),
      soalTyped("F_FULL", 7, "FILL_IN", { accepted_answers: ["Jakarta"] },
        "Fill In", 2, { petunjuk: "Nama ibu kota" }),
    ],
  });
}

// E — statistik kategori dihitung server dari kunci jawaban.
{
  const state = analysisState();
  state.Responses.push(responseRow(ANSWERS, "62.00"));
  const gas = loadGas(state);
  const res = analyze(gas, "S1");

  assert.equal(res.success, true);
  assert.equal(res.data.total_questions, 7);
  assert.equal(res.data.correct, 4);          // Q1, Q5, Q6, Q7
  assert.equal(res.data.partial, 0);
  assert.equal(res.data.wrong, 3);
  assert.equal(res.data.unanswered, 1);       // Q4 tidak dijawab
  assert.equal(res.data.uncategorized, 1);    // Q7
  assert.deepEqual(res.data.categories, [
    { name: "Pecahan", correct: 1, total: 4, earnedScore: 1, maxScore: 4, accuracy: 25 },
    { name: "Geometri", correct: 2, total: 2, earnedScore: 2, maxScore: 2, accuracy: 100 },
  ]);
  // Area terlemah lebih dulu — dipakai UI sebagai "fokus utama".
  assert.equal(res.data.categories[0].name, "Pecahan");

  // A — nilai di bawah KKM berarti perlu tindak lanjut.
  assert.equal(res.data.score, 62);
  assert.equal(res.data.kkm, 70);
  assert.equal(res.data.status, "PERLU_TINDAK_LANJUT");

  // G — payload analisis tidak memuat nama siswa, password, atau jawaban mentah.
  const serialized = JSON.stringify(res.data);
  assert.ok(!serialized.includes("Budi"));
  assert.ok(!serialized.includes("pw"));
  assert.ok(!serialized.includes("password"));
}

// B/C — KKM memakai sumber existing (Config.kkm), bukan fallback.
{
  const state = analysisState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["exam_duration", 90], ["kkm", 60]],
  });
  state.Responses.push(responseRow(ANSWERS, "62.00"));
  const gas = loadGas(state);
  const res = analyze(gas, "S1");
  assert.equal(res.data.kkm, 60);
  assert.equal(res.data.status, "TUNTAS"); // 62 >= 60 → tidak eligible analisis remedial

  // Nilai KKM yang tidak masuk akal diabaikan, bukan dipakai apa adanya.
  const rusak = loadGas(analysisState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["kkm", "bukan angka"]],
  }));
  rusak.__sheets.Responses.rows.push(responseRow(ANSWERS, "62.00"));
  assert.equal(analyze(rusak, "S1").data.kkm, 70);
}

// Batas ketuntasan: sama dengan KKM sudah tuntas; hanya nilai di bawahnya remedial.
for (const [score, kkm, expectedStatus] of [
  [69, 70, "PERLU_TINDAK_LANJUT"],
  [70, 70, "TUNTAS"],
  [71, 70, "TUNTAS"],
  [74, 75, "PERLU_TINDAK_LANJUT"],
  [75, 75, "TUNTAS"],
]) {
  const state = analysisState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["kkm", kkm]],
  });
  state.Responses.push(responseRow(ANSWERS, score));
  const result = analyze(loadGas(state), "S1").data;
  assert.equal(result.kkm, kkm);
  assert.equal(result.status, expectedStatus, "status nilai " + score + " dengan KKM " + kkm);
}

// Semua tipe memakai scorer produksi. `correct` tetap jumlah full-correct, sedangkan
// accuracy memakai poin aktual sehingga TRUE_FALSE/MATCHING partial tidak hilang.
{
  const state = mixedScoringState();
  state.Responses.push(responseRow(MIXED_ANSWERS, 65));
  const res = analyze(loadGas(state), "S1");
  const categories = Object.fromEntries(res.data.categories.map((item) => [item.name, item]));

  assert.equal(res.data.correct, 3);
  assert.equal(res.data.partial, 2);
  assert.equal(res.data.wrong, 2);

  assert.deepEqual(categories.Single,
    { name: "Single", correct: 1, total: 2, earnedScore: 1, maxScore: 2, accuracy: 50 });
  assert.deepEqual(categories.Complex,
    { name: "Complex", correct: 1, total: 2, earnedScore: 2, maxScore: 4, accuracy: 50 });
  assert.deepEqual(categories["True False"],
    { name: "True False", correct: 0, total: 1, earnedScore: 2, maxScore: 4, accuracy: 50 });
  assert.deepEqual(categories.Matching,
    { name: "Matching", correct: 0, total: 1, earnedScore: 3, maxScore: 4, accuracy: 75 });
  assert.deepEqual(categories["Fill In"],
    { name: "Fill In", correct: 1, total: 1, earnedScore: 2, maxScore: 2, accuracy: 100 });
}

// Q — result_hash berubah bila hasil ujian berubah (cache harus dianggap stale).
{
  const before = analysisState();
  before.Responses.push(responseRow(ANSWERS, "62.00"));
  const hashBefore = analyze(loadGas(before), "S1").data.result_hash;

  const after = analysisState();
  after.Responses.push(responseRow(Object.assign({}, ANSWERS, { Q2: "A" }), "75.00"));
  const hashAfter = analyze(loadGas(after), "S1").data.result_hash;

  assert.notEqual(hashBefore, hashAfter);
}

// Siswa belum selesai ujian / tidak dikenal ditolak, bukan dianalisis dengan data kosong.
{
  const gas = loadGas(analysisState());
  assert.equal(analyze(gas, "S1").success, false);
  assert.equal(analyze(gas, "").success, false);
  assert.equal(analyze(gas, "S404").success, false);
}

// KKM juga terbaca lewat getConfig supaya UI menampilkan angka yang sama.
{
  const gas = loadGas(analysisState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["kkm", 80]],
  }));
  assert.equal(get(gas, "getConfig").data.kkm, 80);
}

// ── MUTATION TEST: statistik wajib berasal dari kunci jawaban ────────────────
// Implementasi sengaja dirusak: setiap soal terjawab dianggap benar. Bila test di
// atas memang menguji perhitungan (bukan hanya bentuk response), build cacat ini
// harus berperilaku berbeda.
{
  const mutate = (source) => {
    const mutated = source.replace(
      "    const isCorrect = question.bobot > 0 && score >= question.bobot;",
      "    const isCorrect = isAnswerFilled(answer);"
    );
    assert.notEqual(mutated, source, "titik mutasi accuracy tidak ditemukan — mutation test kedaluwarsa");
    return mutated;
  };

  const state = analysisState();
  state.Responses.push(responseRow(ANSWERS, "62.00"));
  const broken = loadGas(state, mutate);
  const res = analyze(broken, "S1");
  assert.equal(res.data.correct, 6, "build cacat menghitung jawaban terisi sebagai benar");
  assert.equal(res.data.categories[0].accuracy, 25, "accuracy tetap berasal dari poin scorer");
}

// ── MUTATION TEST: KKM rusak tidak boleh lolos jadi angka apa adanya ─────────
{
  const mutate = (source) => {
    const mutated = source.replace(
      "  return isFinite(raw) && raw > 0 && raw <= 100 ? raw : DEFAULT_KKM;",
      "  return raw;"
    );
    assert.notEqual(mutated, source, "titik mutasi KKM tidak ditemukan — mutation test kedaluwarsa");
    return mutated;
  };

  const state = analysisState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["kkm", "bukan angka"]],
  });
  state.Responses.push(responseRow(ANSWERS, "62.00"));
  const broken = loadGas(state, mutate);
  const res = analyze(broken, "S1");
  // NaN tidak selamat melewati JSON → nilai KKM hilang sama sekali pada build cacat.
  assert.equal(res.data.kkm, null, "build cacat meloloskan KKM tidak valid");
  assert.notEqual(res.data.kkm, 70);
}

// Mutation: Config.kkm tidak boleh diganti hardcode 75.
{
  const mutate = (source) => {
    const mutated = source.replace(
      "  return isFinite(raw) && raw > 0 && raw <= 100 ? raw : DEFAULT_KKM;",
      "  return 75;"
    );
    assert.notEqual(mutated, source, "titik mutasi hardcode KKM tidak ditemukan");
    return mutated;
  };
  const state = analysisState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["kkm", 70]],
  });
  state.Responses.push(responseRow(ANSWERS, 70));
  const broken = analyze(loadGas(state, mutate), "S1");
  assert.equal(broken.data.kkm, 75);
  assert.equal(broken.data.status, "PERLU_TINDAK_LANJUT");
}

function assertPartialMutation(mutatedScoreLine, expectedAccuracy, label) {
  const mutate = (source) => {
    const mutated = source.replace(
      "    const score = scoreQuestion(question, answer);",
      mutatedScoreLine
    );
    assert.notEqual(mutated, source, "titik mutasi partial score tidak ditemukan");
    return mutated;
  };
  const state = mixedScoringState();
  state.Responses.push(responseRow(MIXED_ANSWERS, 65));
  const result = analyze(loadGas(state, mutate), "S1").data.categories;
  const matching = result.find((item) => item.name === "Matching");
  assert.equal(matching.accuracy, expectedAccuracy, label);
}

// Mutation: partial score menjadi zero/full wajib terdeteksi.
assertPartialMutation("    const score = 0;", 0, "build cacat membuang partial credit");
assertPartialMutation("    const score = question.bobot;", 100, "build cacat mengubah partial jadi penuh");

// Mutation: accuracy tidak boleh kembali berbasis jumlah soal.
{
  const mutate = (source) => {
    const mutated = source.replace(
      "      ? Math.round((entry.earnedScore / entry.maxScore) * 1000) / 10",
      "      ? Math.round((entry.correct / entry.total) * 1000) / 10"
    );
    assert.notEqual(mutated, source, "titik mutasi accuracy berbobot tidak ditemukan");
    return mutated;
  };
  const state = mixedScoringState();
  state.Responses.push(responseRow(MIXED_ANSWERS, 65));
  const result = analyze(loadGas(state, mutate), "S1").data.categories;
  assert.equal(result.find((item) => item.name === "Matching").accuracy, 0,
    "build cacat memakai jumlah soal penuh, bukan poin scorer");
}

console.log("studentAnalysis.test.cjs OK (termasuk 6 mutation test)");
