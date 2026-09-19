// P0-2/P0-3/P0-4: kontrak Config, jumlah pembacaan sheet pada getExamSummary, dan
// cache baca-berat (getUsers/getLiveScore) beserta invalidasinya.
// Jalankan: node backend-script/readCache.test.cjs

const assert = require("node:assert/strict");
const { loadGas, baseState, post, get } = require("./gasHarness.cjs");

function stateWithPin(pin) {
  return baseState({
    Config: [
      ["key", "value"],
      ["exam_mapel", "MAPEL_A"],
      ["exam_duration", 90],
      ["exam_pin", pin],
      ["admin_password", "rahasia-admin"],
      ["live_score_pin", "9999"],
    ],
  });
}

// ===== P0-2 — Config membawa isPinRequired, PIN mentah tidak pernah keluar =====

{
  const gas = loadGas(stateWithPin("1234"));
  const res = get(gas, "getConfig");
  assert.equal(res.success, true);
  assert.equal(res.data.isPinRequired, true, "PIN terisi -> isPinRequired true");

  // Kontrak lama wajib tetap sepakat dengan field turunan yang baru.
  assert.equal(get(gas, "getExamPinStatus").data.isPinRequired, true);

  const serialized = JSON.stringify(res.data);
  assert.equal(serialized.includes("1234"), false, "exam_pin tidak boleh ikut respons");
  assert.equal(serialized.includes("rahasia-admin"), false, "admin_password tidak boleh ikut respons");
  assert.equal(serialized.includes("9999"), false, "live_score_pin tidak boleh ikut respons");
  assert.equal("exam_pin" in res.data, false);
  assert.equal("admin_password" in res.data, false);
}

{
  const gas = loadGas(stateWithPin(""));
  assert.equal(get(gas, "getConfig").data.isPinRequired, false, "PIN kosong -> tidak diminta");
  assert.equal(get(gas, "getExamPinStatus").data.isPinRequired, false);
}

{
  // Spasi saja bukan PIN: harus sama dengan perlakuan handleGetExamPinStatus.
  const gas = loadGas(stateWithPin("   "));
  assert.equal(get(gas, "getConfig").data.isPinRequired, false);
  assert.equal(get(gas, "getExamPinStatus").data.isPinRequired, false);
}

// ===== P0-3 — getExamSummary: satu baca Questions, satu baca KumpulanSoal =====

function summaryState() {
  return baseState({
    Config: [
      ["key", "value"],
      ["exam_name", "UTS Ganjil"],
      ["exam_mapel", "MAPEL_A"],
      ["exam_duration", 60],
      ["exam_status", "OPEN"],
    ],
    Questions: [
      ["id_soal", "nomor_urut", "tipe", "pertanyaan", "gambar_url", "opsi_a", "opsi_b",
        "opsi_c", "opsi_d", "opsi_e", "kunci_jawaban", "bobot", "kategori", "id_mapel",
        "status_soal", "versi_dari", "data_soal", "id_kumpulan"],
      ["Q1", 1, "SINGLE", "Satu", "", "A", "B", "C", "D", "", "A", 1, "", "MAPEL_A", "AKTIF", "", "", "K1"],
      ["Q2", 2, "SINGLE", "Dua", "", "A", "B", "C", "D", "", "B", 1, "", "MAPEL_A", "AKTIF", "", "", "K1"],
      ["Q3", 3, "SINGLE", "Tiga", "", "A", "B", "C", "D", "", "C", 1, "", "MAPEL_B", "AKTIF", "", "", "K2"],
    ],
    KumpulanSoal: [
      ["id_kumpulan", "nama_kumpulan", "id_mapel", "status", "dibuat", "terakhir_dipakai"],
      ["K1", "Bab 1", "MAPEL_A", "AKTIF", "", ""],
      ["K2", "Bab 2", "MAPEL_B", "AKTIF", "", ""],
    ],
  });
}

let summaryBaseline;
{
  const gas = loadGas(summaryState());
  const questionsBefore = gas.__sheets.Questions.reads;
  const collectionsBefore = gas.__sheets.KumpulanSoal.reads;

  const res = get(gas, "getExamSummary");
  assert.equal(res.success, true);

  const questionReads = gas.__sheets.Questions.reads - questionsBefore;
  const collectionReads = gas.__sheets.KumpulanSoal.reads - collectionsBefore;
  assert.equal(questionReads, 1, `Questions dibaca ${questionReads}x, seharusnya 1x`);
  assert.equal(collectionReads, 1, `KumpulanSoal dibaca ${collectionReads}x, seharusnya 1x`);

  // Kontrak output tidak boleh berubah oleh optimasi ini.
  assert.equal(res.data.exam_name, "UTS Ganjil");
  assert.equal(res.data.exam_mapel, "MAPEL_A");
  assert.equal(res.data.exam_duration, 60);
  assert.equal(res.data.exam_status, "OPEN");
  assert.equal(res.data.question_counts.MAPEL_A, 2);
  assert.equal(res.data.question_counts.MAPEL_B, 1);
  assert.equal(res.data.question_count, 2, "soal yang benar-benar diujikan pada mapel aktif");
  assert.deepEqual(res.data.exam_kumpulan, []);
  assert.equal(res.data.collections.length, 2);
  summaryBaseline = JSON.stringify(res);
}

{
  // Helper yang menerima data oper-an harus menghasilkan angka yang sama persis
  // dengan helper yang membaca sheet sendiri.
  const gas = loadGas(summaryState());
  const viaInjected = gas.__eval(
    'collectExamQuestionRows("MAPEL_A", [], readQuestionRows(), collectionStatusMap(readCollections())).length'
  );
  const viaOwnRead = gas.__eval('collectExamQuestionRows("MAPEL_A", []).length');
  assert.equal(viaInjected, viaOwnRead, "injeksi data tidak boleh mengubah hasil seleksi soal");
  assert.equal(JSON.stringify(get(gas, "getExamSummary")), summaryBaseline, "output summary harus identik");
}

{
  // Kumpulan nonaktif tetap dikecualikan setelah optimasi.
  const state = summaryState();
  state.KumpulanSoal[1][3] = "NONAKTIF";
  const gas = loadGas(state);
  const res = get(gas, "getExamSummary");
  assert.equal(res.data.question_count, 0, "kumpulan nonaktif tidak ikut diujikan");
  assert.equal(res.data.question_counts.MAPEL_A, undefined, "mapel tanpa kumpulan aktif tidak dihitung");
}

// ===== P0-4 — cache getUsers / getLiveScore =====

function examinedState() {
  const state = baseState();
  state.Users = [
    state.Users[0],
    ["S1", "siswa", "pw", "Siswa Satu", "6A", false, "", "", "", 0, "BELUM", "", "", ""],
    ["S2", "duasiswa", "pw2", "Siswa Dua", "6A", false, "", "", 80, 0, "SELESAI", "", "MAPEL_A", ""],
  ];
  return state;
}

{
  // Cache miss -> baca sheet. Cache hit -> TIDAK baca sheet, isi tetap sama.
  const gas = loadGas(examinedState(), null, { liveCache: true });
  const before = gas.__sheets.Users.reads;
  const first = get(gas, "getUsers");
  const afterFirst = gas.__sheets.Users.reads;
  assert.ok(afterFirst > before, "permintaan pertama wajib membaca sheet");

  const second = get(gas, "getUsers");
  assert.equal(gas.__sheets.Users.reads, afterFirst, "permintaan kedua wajib dilayani cache");
  assert.deepEqual(second, first, "jawaban dari cache harus identik dengan jawaban sheet");
  assert.equal(second.data.length, 2);
}

{
  const gas = loadGas(examinedState(), null, { liveCache: true });
  const first = get(gas, "getLiveScore");
  const afterFirst = gas.__sheets.Users.reads;
  const second = get(gas, "getLiveScore");
  assert.equal(gas.__sheets.Users.reads, afterFirst, "live score kedua wajib dilayani cache");
  assert.deepEqual(second, first);
  assert.equal(first.stats.selesai, 1);
  assert.equal(first.data[0].nama, "Siswa Dua");
}

{
  // Invalidasi: login mengubah status siswa, jadi layar guru tidak boleh
  // menyajikan status lama dari cache.
  const gas = loadGas(examinedState(), null, { liveCache: true });
  assert.equal(get(gas, "getUsers").data[0].status_ujian, "BELUM");
  const login = post(gas, "login", { username: "siswa", password: "pw" });
  assert.equal(login.success, true);
  assert.equal(get(gas, "getUsers").data[0].status_ujian, "SEDANG", "cache wajib dibuang setelah login");
}

{
  // Invalidasi setelah submit: papan skor publik harus langsung memuat siswa itu.
  const gas = loadGas(examinedState(), null, { liveCache: true });
  post(gas, "login", { username: "siswa", password: "pw" });
  assert.equal(get(gas, "getLiveScore").stats.selesai, 1);
  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A" } });
  assert.equal(submit.success, true);
  assert.equal(get(gas, "getLiveScore").stats.selesai, 2, "cache live score wajib dibuang setelah submit");
}

{
  // Invalidasi setelah reset login guru.
  const gas = loadGas(examinedState(), null, { liveCache: true });
  post(gas, "login", { username: "siswa", password: "pw" });
  assert.equal(get(gas, "getUsers").data[0].status_ujian, "SEDANG");
  assert.equal(post(gas, "resetUserLogin", { id_siswa: "S1" }).success, true);
  assert.equal(get(gas, "getUsers").data[0].status_ujian, "BELUM", "cache wajib dibuang setelah reset");
}

{
  // Perubahan data siswa oleh guru.
  const gas = loadGas(examinedState(), null, { liveCache: true });
  assert.equal(get(gas, "getUsers").data.length, 2);
  assert.equal(
    post(gas, "createStudent", { username: "baru", password: "pw", nama_lengkap: "Siswa Baru", kelas: "6B" }).success,
    true,
  );
  assert.equal(get(gas, "getUsers").data.length, 3, "cache wajib dibuang setelah tambah siswa");
}

{
  // Autosave sengaja TIDAK menginvalidasi: yang ditulisnya hanya last_seen dan
  // saved_answers. Yang wajib dijamin adalah datanya tetap tersimpan.
  const gas = loadGas(examinedState(), null, { liveCache: true });
  post(gas, "login", { username: "siswa", password: "pw" });
  const sync = post(gas, "syncAnswers", { id_siswa: "S1", answers: { Q1: "B" } });
  assert.equal(sync.success, true);
  assert.equal(gas.__sheets.Users.rows[1][13], JSON.stringify({ Q1: "B" }), "jawaban tetap tersimpan di sheet");
}

{
  // Nilai raksasa dilewati, bukan melempar: kegagalan cache tidak boleh
  // menggagalkan permintaan yang datanya sudah benar.
  const gas = loadGas(examinedState(), null, { liveCache: true });
  const skipped = gas.__eval('cachePutSafe("besar", "x".repeat(200 * 1024), 4); cache.get("besar")');
  assert.equal(skipped, null, "nilai di atas batas tidak disimpan");
  const kept = gas.__eval('cachePutSafe("kecil", "ok", 4); cache.get("kecil")');
  assert.equal(kept, "ok");
}

// ===== MUTATION TEST — pastikan test di atas benar-benar mendeteksi regresi =====

const mutations = [
  {
    name: "pin-required-selalu-false",
    apply: (src) => src.replace(
      'isPinRequired: String(config.exam_pin || "").trim() !== "",',
      "isPinRequired: false,",
    ),
    run: (gas) => get(gas, "getConfig").data.isPinRequired === true,
    state: () => stateWithPin("1234"),
  },
  {
    name: "pin-bocor-ke-client",
    apply: (src) => src.replace(
      'isPinRequired: String(config.exam_pin || "").trim() !== "",',
      'isPinRequired: String(config.exam_pin || "").trim() !== "", exam_pin: config.exam_pin,',
    ),
    run: (gas) => !JSON.stringify(get(gas, "getConfig").data).includes("1234"),
    state: () => stateWithPin("1234"),
  },
  {
    name: "summary-baca-questions-dua-kali",
    apply: (src) => src.replace(
      "question_count: collectExamQuestionRows(exam_mapel, exam_kumpulan, rows, statusMap).length,",
      "question_count: collectExamQuestionRows(exam_mapel, exam_kumpulan).length,",
    ),
    run: (gas) => {
      const before = gas.__sheets.Questions.reads;
      get(gas, "getExamSummary");
      return gas.__sheets.Questions.reads - before === 1;
    },
    state: summaryState,
  },
  {
    name: "cache-users-tidak-diinvalidasi",
    apply: (src) => src.replace(
      "if (result && result.success && USERS_MUTATING_ACTIONS[action]) {",
      "if (false) {",
    ),
    run: (gas) => {
      get(gas, "getUsers");
      post(gas, "login", { username: "siswa", password: "pw" });
      return get(gas, "getUsers").data[0].status_ujian === "SEDANG";
    },
    state: examinedState,
    options: { liveCache: true },
  },
  {
    name: "cache-users-tidak-pernah-dipakai",
    apply: (src) => src.replace(
      "  const cached = cache.get(USERS_CACHE_KEY);\n  if (cached) return JSON.parse(cached);",
      "  const cached = null;\n  if (cached) return JSON.parse(cached);",
    ),
    run: (gas) => {
      get(gas, "getUsers");
      const after = gas.__sheets.Users.reads;
      get(gas, "getUsers");
      return gas.__sheets.Users.reads === after;
    },
    state: examinedState,
    options: { liveCache: true },
  },
];

for (const mutation of mutations) {
  const gas = loadGas(mutation.state(), (src) => {
    const mutated = mutation.apply(src);
    assert.notEqual(mutated, src, `mutasi ${mutation.name} tidak menemukan target`);
    return mutated;
  }, mutation.options);
  let survived = false;
  try {
    survived = mutation.run(gas) === true;
  } catch {
    survived = false;
  }
  assert.equal(survived, false, `mutasi ${mutation.name} LOLOS — test tidak mendeteksi regresi`);
  console.log("  KILLED ", mutation.name);
}

console.log("readCache: kontrak Config, summary satu-kali-baca, cache Users/LiveScore + invalidasi PASS");
