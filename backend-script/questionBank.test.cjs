// Test Bank Soal pada boundary GAS: validasi, integritas historis, safe edit/delete,
// dan proteksi id soal. Menjalankan code.gs asli di dalam vm dengan sheet tiruan
// yang mendukung tulis, hapus, dan append.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const tenantSecret = "tenant-shared-secret-32-characters-minimum";

function makeSheet(rows) {
  const sheet = {
    rows,
    getDataRange: () => ({ getValues: () => rows }),
    getLastRow: () => rows.length,
    appendRow(values) { rows.push(values.slice()); },
    deleteRow(rowNumber) { rows.splice(rowNumber - 1, 1); },
    getRange(row, col, numRows, numCols) {
      return {
        setValue(value) {
          while (rows[row - 1].length < col) rows[row - 1].push("");
          rows[row - 1][col - 1] = value;
        },
        setValues(values) {
          for (let r = 0; r < (numRows || 1); r++) {
            for (let c = 0; c < (numCols || values[r].length); c++) {
              while (rows[row - 1 + r].length < col + c) rows[row - 1 + r].push("");
              rows[row - 1 + r][col - 1 + c] = values[r][c];
            }
          }
        },
      };
    },
  };
  return sheet;
}

function loadGas(sheetRows) {
  const sheets = {};
  for (const name of Object.keys(sheetRows)) sheets[name] = makeSheet(sheetRows[name]);

  const locks = { held: false };
  const context = {
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(text) { return { text, setMimeType() { return this; } }; },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock() { if (locks.held) return false; locks.held = true; return true; },
        releaseLock() { locks.held = false; },
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (key) => (key === "SHARED_SECRET" ? tenantSecret : null) }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: (name) => sheets[name] || null, insertSheet: () => null }),
    },
    console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "code.gs"), "utf8"), context);
  context.__sheets = sheets;
  // `const` di top-level script vm tidak menjadi properti context, jadi baca lewat eval.
  context.__eval = function (expr) { return vm.runInContext(expr, context); };
  return context;
}

const QUESTION_HEADER = [
  "id_soal", "nomor_urut", "tipe", "pertanyaan", "gambar_url",
  "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e",
  "kunci_jawaban", "bobot", "kategori", "id_mapel", "status_soal", "versi_dari",
];
const USER_HEADER = [
  "id_siswa", "username", "password", "nama", "kelas", "login",
  "mulai", "selesai", "skor", "pelanggaran", "status", "last_seen", "mapel", "saved",
];
const RESPONSE_HEADER = [
  "timestamp", "id_siswa", "nama", "kelas", "jawaban", "skor", "durasi", "log", "ip",
];

// Sheet lama sengaja hanya 14 kolom: status_soal belum ada dan harus terbaca AKTIF.
function baseState(overrides) {
  const state = {
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["exam_duration", 90]],
    MataPelajaran: [["id_mapel", "kode", "nama"], ["MAPEL_A", "MTK", "Matematika"]],
    Questions: [
      QUESTION_HEADER.slice(0, 14),
      ["Q1", 1, "SINGLE", "Soal lama", "", "A", "B", "C", "D", "", "A", 1, "Mudah", "MAPEL_A"],
    ],
    Users: [USER_HEADER, ["S1", "siswa", "pw", "Siswa", "6A", false, "", "", "", 0, "BELUM", "", "", ""]],
    Responses: [RESPONSE_HEADER],
  };
  return Object.assign(state, overrides || {});
}

function post(gas, action, params) {
  return JSON.parse(
    gas.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, proxy_secret: tenantSecret }, params)) } }).text
  );
}

function get(gas, action) {
  return JSON.parse(gas.doGet({ parameter: { action, proxy_secret: tenantSecret } }).text);
}

const validSingle = {
  nomor_urut: 2, tipe: "SINGLE", pertanyaan: "<p>Berapa 2+2?</p>", gambar_url: "",
  opsi_a: "3", opsi_b: "4", opsi_c: "5", opsi_d: "6", opsi_e: "",
  kunci_jawaban: "B", bobot: 1, kategori: "Mudah", id_mapel: "MAPEL_A",
};

// ── 1. Validasi SINGLE ──────────────────────────────────────────────────────
{
  const gas = loadGas(baseState());
  const ok = post(gas, "createQuestion", { data: validSingle });
  assert.equal(ok.success, true, ok.message);
  const rows = gas.__sheets.Questions.rows;
  assert.equal(rows.length, 3);
  assert.equal(rows[2][14], "AKTIF", "soal baru harus ditandai AKTIF");

  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, { pertanyaan: "  <p></p> " }) }).success, false);
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, { opsi_c: "" }) }).success, false);
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, { tipe: "ESSAY" }) }).success, false);
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, { kunci_jawaban: "A,B" }) }).success, false);
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, { id_mapel: "" }) }).success, false);
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, { id_mapel: "MAPEL_HANTU" }) }).success, false);
}

// ── 2. Validasi COMPLEX ─────────────────────────────────────────────────────
{
  const gas = loadGas(baseState());
  const complex = Object.assign({}, validSingle, { tipe: "COMPLEX", kunci_jawaban: "A,C" });
  assert.equal(post(gas, "createQuestion", { data: complex }).success, true);
  // COMPLEX dengan satu kunci sebenarnya SINGLE, jadi ditolak.
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, complex, { kunci_jawaban: "A" }) }).success, false);
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, complex, { kunci_jawaban: "" }) }).success, false);
  // Kunci duplikat menyusut jadi satu set, sehingga A,A bukan COMPLEX yang sah.
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, complex, { kunci_jawaban: "A,A" }) }).success, false);
}

// ── 3. Kunci menunjuk opsi yang tidak tersedia ──────────────────────────────
{
  const gas = loadGas(baseState());
  const res = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { kunci_jawaban: "E" }) });
  assert.equal(res.success, false);
  assert.match(res.message, /opsi yang tidak tersedia/);
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, { opsi_e: "7", kunci_jawaban: "E" }) }).success, true);
}

// ── 4. Bobot tidak valid ditolak ────────────────────────────────────────────
{
  const gas = loadGas(baseState());
  for (const bobot of [0, -1, "abc", 101, null]) {
    assert.equal(
      post(gas, "createQuestion", { data: Object.assign({}, validSingle, { bobot }) }).success,
      false,
      `bobot ${bobot} seharusnya ditolak`
    );
  }
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, { bobot: "5" }) }).success, true);
}

// ── 5. Duplicate id_soal ditolak, dan id otomatis tidak pernah bentrok ──────
{
  const gas = loadGas(baseState());
  const dup = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { id_soal: "Q1" }) });
  assert.equal(dup.success, false);
  assert.match(dup.message, /sudah digunakan/);

  const ids = new Set(["Q1"]);
  for (let i = 0; i < 25; i++) {
    const res = post(gas, "createQuestion", { data: validSingle });
    assert.equal(res.success, true, res.message);
    assert.ok(!ids.has(res.id_soal), `id_soal bentrok: ${res.id_soal}`);
    ids.add(res.id_soal);
  }
}

// ── 6. Field tak dikenal tidak diterima diam-diam ───────────────────────────
{
  const gas = loadGas(baseState());
  const res = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { status_soal: "ARSIP" }) });
  assert.equal(res.success, false);
  assert.match(res.message, /Field tidak dikenal/);
}

// ── 7. Safe edit: ujian berjalan mengunci soal ──────────────────────────────
{
  const running = baseState();
  running.Users.push(["S2", "aktif", "pw", "Siswa Aktif", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""]);
  const gas = loadGas(running);

  const res = post(gas, "updateQuestion", { id_soal: "Q1", data: Object.assign({}, validSingle, { kunci_jawaban: "C" }) });
  assert.equal(res.success, false);
  assert.match(res.message, /ujian yang berlangsung/);
  assert.equal(gas.__sheets.Questions.rows[1][10], "A", "kunci soal tidak boleh berubah saat ujian berjalan");

  const del = post(gas, "deleteQuestion", { id_soal: "Q1" });
  assert.equal(del.success, false);
  assert.equal(gas.__sheets.Questions.rows.length, 2, "soal tidak boleh hilang saat ujian berjalan");
}

// ── 8. Edit normal saat tidak ada ujian berjalan ────────────────────────────
{
  const gas = loadGas(baseState());
  const res = post(gas, "updateQuestion", { id_soal: "Q1", data: Object.assign({}, validSingle, { kunci_jawaban: "C" }) });
  assert.equal(res.success, true, res.message);
  assert.equal(res.versioned, false, "soal tanpa histori diperbarui di tempat");
  assert.equal(gas.__sheets.Questions.rows.length, 2, "tidak ada baris baru untuk soal tanpa histori");
  assert.equal(gas.__sheets.Questions.rows[1][10], "C");
  assert.equal(gas.__sheets.Questions.rows[1][0], "Q1", "id_soal harus dipertahankan");
  assert.equal(post(gas, "updateQuestion", { id_soal: "TIDAK_ADA", data: validSingle }).success, false);
}

// ── 9. Safe delete: soal yang pernah dijawab diarsipkan, bukan dihapus ──────
{
  const answered = baseState();
  answered.Responses.push([new Date(), "S1", "Siswa", "6A", JSON.stringify({ Q1: "A" }), "100.00", 10, "", ""]);
  const gas = loadGas(answered);

  const res = post(gas, "deleteQuestion", { id_soal: "Q1" });
  assert.equal(res.success, true, res.message);
  assert.equal(res.archived, true);
  assert.equal(gas.__sheets.Questions.rows.length, 2, "baris soal historis harus tetap ada");
  assert.equal(gas.__sheets.Questions.rows[1][14], "ARSIP");

  // Soal arsip tidak lagi dikirim ke siswa, tetapi tetap terlihat oleh admin.
  assert.equal(get(gas, "getQuestions").data.length, 0);
  const adminList = get(gas, "getAdminQuestions").data;
  assert.equal(adminList.length, 1);
  assert.equal(adminList[0].status_soal, "ARSIP");
}

// ── 10. Soal yang belum pernah dijawab tetap boleh dihapus permanen ─────────
{
  const gas = loadGas(baseState());
  const res = post(gas, "deleteQuestion", { id_soal: "Q1" });
  assert.equal(res.success, true);
  assert.equal(res.archived, false);
  assert.equal(gas.__sheets.Questions.rows.length, 1);
  const missing = post(gas, "deleteQuestion", { id_soal: "Q1" });
  assert.equal(missing.success, false, "delete gagal harus melaporkan kegagalan, bukan sukses palsu");
}

// ── 11. Backward compatibility: sheet 14 kolom tetap terbaca dan dinilai ────
{
  const legacy = baseState();
  legacy.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""],
  ];
  const gas = loadGas(legacy);

  const studentView = get(gas, "getQuestions").data;
  assert.equal(studentView.length, 1, "soal lama tanpa kolom status harus tetap terkirim");
  assert.equal(studentView[0].kunci_jawaban, undefined);
  assert.equal(get(gas, "getAdminQuestions").data[0].status_soal, "AKTIF");

  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A" } });
  assert.equal(submit.success, true, submit.message);
  assert.equal(submit.score, "100.00");
  assert.equal(gas.__sheets.Responses.rows.length, 2, "tepat satu baris Responses");
}

// ── 12. Soal arsip tidak ikut dinilai ───────────────────────────────────────
{
  const archived = baseState();
  archived.Questions.push(
    ["Q2", 2, "SINGLE", "Soal arsip", "", "A", "B", "C", "D", "", "A", 1, "", "MAPEL_A", "ARSIP"]
  );
  archived.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""],
  ];
  const gas = loadGas(archived);

  assert.equal(get(gas, "getQuestions").data.length, 1, "siswa hanya menerima soal aktif");
  // Q1 benar, Q2 diarsipkan dan tidak menambah maxScore.
  const submit = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A" } });
  assert.equal(submit.score, "100.00", "soal arsip tidak boleh mengubah skor maksimum");
}

// ── 13. Upload gambar divalidasi di server ──────────────────────────────────
{
  const gas = loadGas(baseState());
  assert.equal(post(gas, "uploadImage", { base64Data: "AAAA", mimeType: "text/html" }).success, false);
  assert.equal(post(gas, "uploadImage", { base64Data: "AAAA", mimeType: "application/pdf" }).success, false);
  assert.equal(post(gas, "uploadImage", { base64Data: "", mimeType: "image/png" }).success, false);
  const tooBig = post(gas, "uploadImage", { base64Data: "A".repeat(4 * 1024 * 1024), mimeType: "image/png" });
  assert.equal(tooBig.success, false);
  assert.match(tooBig.message, /2 MB/);
}

// ── 14. Boundary otorisasi tidak berubah ────────────────────────────────────
{
  const gas = loadGas(baseState());
  const noSecret = JSON.parse(gas.doPost({ postData: { contents: JSON.stringify({ action: "createQuestion", data: validSingle }) } }).text);
  assert.equal(noSecret.success, false);
  assert.equal(noSecret.message, "Unauthorized");
}


// ═══════════════════════════════════════════════════════════════════════════
// INTEGRITAS HISTORIS — soal yang jawabannya sudah tercatat tidak boleh ditimpa
// ═══════════════════════════════════════════════════════════════════════════

// Ujian yang sudah selesai: satu response memakai Q1 dan menjawabnya.
function answeredState(answers) {
  const state = baseState();
  state.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", false, new Date(), new Date(), "100.00", 0, "SELESAI", "", "MAPEL_A", ""],
  ];
  state.Responses.push([
    new Date(), "S1", "Siswa", "6A",
    JSON.stringify(answers || { Q1: "A" }), "100.00", 12, "", "",
  ]);
  return state;
}

// ── 15. MUTATION TEST: baris soal historis tidak boleh ditimpa ──────────────
// Test ini gagal bila implementasi kembali menulis ulang baris lama memakai
// id_soal yang sama setelah soal punya response historis.
{
  const gas = loadGas(answeredState());
  const before = gas.__sheets.Questions.rows[1].slice(0, 14);

  const res = post(gas, "updateQuestion", {
    id_soal: "Q1",
    data: Object.assign({}, validSingle, { pertanyaan: "<p>3 + 3 = ?</p>", kunci_jawaban: "C", bobot: 5 }),
  });
  assert.equal(res.success, true, res.message);
  assert.equal(res.versioned, true, "perubahan soal historis wajib jadi versi baru");
  assert.notEqual(res.id_soal, "Q1", "versi baru wajib punya id_soal baru");
  assert.equal(res.previous_id_soal, "Q1");

  const rows = gas.__sheets.Questions.rows;
  const historical = rows.find((r) => r[0] === "Q1");
  assert.deepEqual(
    historical.slice(0, 14), before,
    "isi soal historis berubah — response lama jadi menunjuk soal yang berbeda"
  );
  assert.equal(historical[10], "A", "kunci historis wajib tetap A");
  assert.equal(historical[3], "Soal lama", "redaksi historis wajib tetap");
  assert.equal(historical[11], 1, "bobot historis wajib tetap");
  assert.equal(historical[14], "ARSIP", "baris historis diarsipkan");
  assert.equal(historical[15], "Q1", "lineage versi tercatat");

  const fresh = rows.find((r) => r[0] === res.id_soal);
  assert.equal(fresh[3], "<p>3 + 3 = ?</p>");
  assert.equal(fresh[10], "C");
  assert.equal(fresh[11], 5);
  assert.equal(fresh[14], "AKTIF");
  assert.equal(fresh[15], "Q1", "versi baru menunjuk soal asal");
}

// ── 16. Response historis tidak berubah dan tetap menunjuk soal versi lama ──
{
  const gas = loadGas(answeredState());
  const responseBefore = gas.__sheets.Responses.rows[1].slice();

  post(gas, "updateQuestion", {
    id_soal: "Q1",
    data: Object.assign({}, validSingle, { pertanyaan: "<p>3 + 3 = ?</p>", kunci_jawaban: "C" }),
  });

  assert.deepEqual(gas.__sheets.Responses.rows[1], responseBefore, "baris Responses tidak boleh tersentuh");

  // Menelusuri jawaban lama: id_soal pada response masih menemukan soal lama,
  // bukan kunci terbaru. Inilah yang membuat hasil lama tetap dapat dipahami.
  const historicalAnswers = JSON.parse(gas.__sheets.Responses.rows[1][4]);
  const admin = get(gas, "getAdminQuestions").data;
  for (const id of Object.keys(historicalAnswers)) {
    const soal = admin.find((q) => q.id_soal === id);
    assert.ok(soal, "soal historis " + id + " hilang dari bank soal");
    assert.equal(soal.kunci_jawaban, "A", "kunci historis tidak boleh ikut berubah");
    assert.equal(soal.pertanyaan, "Soal lama", "redaksi historis tidak boleh ikut berubah");
    assert.equal(historicalAnswers[id], soal.kunci_jawaban, "jawaban benar jadi salah setelah edit");
  }
}

// ── 17. Scoring ujian berikutnya memakai versi baru, bukan versi historis ───
{
  const gas = loadGas(answeredState());
  const versioned = post(gas, "updateQuestion", {
    id_soal: "Q1",
    data: Object.assign({}, validSingle, { kunci_jawaban: "C" }),
  });

  // Siswa berikutnya hanya menerima versi aktif.
  gas.__sheets.Users.rows.push(
    ["S2", "siswa2", "pw", "Siswa Dua", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""]
  );
  const delivered = get(gas, "getQuestions").data;
  assert.equal(delivered.length, 1, "hanya versi aktif yang dikirim ke siswa");
  assert.equal(delivered[0].id_soal, versioned.id_soal);

  // Kunci lama (A) sekarang salah untuk versi baru; kunci baru (C) yang benar.
  const wrongAnswers = {};
  wrongAnswers[versioned.id_soal] = "A";
  const wrong = post(gas, "submitExam", { id_siswa: "S2", answers: wrongAnswers });
  assert.equal(wrong.score, "0.00", "kunci versi baru yang dipakai untuk ujian baru");

  const gas2 = loadGas(answeredState());
  const v2 = post(gas2, "updateQuestion", { id_soal: "Q1", data: Object.assign({}, validSingle, { kunci_jawaban: "C" }) });
  gas2.__sheets.Users.rows.push(
    ["S2", "siswa2", "pw", "Siswa Dua", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""]
  );
  const rightAnswers = {};
  rightAnswers[v2.id_soal] = "C";
  const right = post(gas2, "submitExam", { id_siswa: "S2", answers: rightAnswers });
  assert.equal(right.score, "100.00");
}

// ── 18. Menyimpan tanpa perubahan tidak membuat versi baru ──────────────────
{
  const gas = loadGas(answeredState());
  const unchanged = {
    nomor_urut: 1, tipe: "SINGLE", pertanyaan: "Soal lama", gambar_url: "",
    opsi_a: "A", opsi_b: "B", opsi_c: "C", opsi_d: "D", opsi_e: "",
    kunci_jawaban: "A", bobot: 1, kategori: "Mudah", id_mapel: "MAPEL_A",
  };
  const res = post(gas, "updateQuestion", { id_soal: "Q1", data: unchanged });
  assert.equal(res.success, true, res.message);
  assert.equal(res.versioned, false, "menyimpan tanpa perubahan tidak boleh menggandakan soal");
  assert.equal(gas.__sheets.Questions.rows.length, 2);
}

// ── 19. Mengurutkan ulang soal historis bukan perubahan isi ─────────────────
{
  const gas = loadGas(answeredState());
  const reordered = {
    nomor_urut: 7, tipe: "SINGLE", pertanyaan: "Soal lama", gambar_url: "",
    opsi_a: "A", opsi_b: "B", opsi_c: "C", opsi_d: "D", opsi_e: "",
    kunci_jawaban: "A", bobot: 1, kategori: "Mudah", id_mapel: "MAPEL_A",
  };
  const res = post(gas, "updateQuestion", { id_soal: "Q1", data: reordered });
  assert.equal(res.versioned, false, "urutan tampil tidak tercatat di Responses, jadi bukan isi historis");
  assert.equal(gas.__sheets.Questions.rows.length, 2);
  assert.equal(gas.__sheets.Questions.rows[1][1], 7);
  assert.equal(gas.__sheets.Questions.rows[1][10], "A", "kunci tetap tidak tersentuh");
}

// ── 20. Regresi PG dan PGK setelah versioning ───────────────────────────────
{
  const state = answeredState({ Q1: "A", Q2: ["A", "C"] });
  state.Questions.push(
    ["Q2", 2, "COMPLEX", "Soal kompleks lama", "", "A", "B", "C", "D", "", "A,C", 2, "Sedang", "MAPEL_A"]
  );
  const gas = loadGas(state);

  // PGK historis juga wajib versioned, bukan ditimpa.
  const complexEdit = post(gas, "updateQuestion", {
    id_soal: "Q2",
    data: Object.assign({}, validSingle, { tipe: "COMPLEX", kunci_jawaban: "B,D", nomor_urut: 2 }),
  });
  assert.equal(complexEdit.versioned, true);
  const oldComplex = gas.__sheets.Questions.rows.find((r) => r[0] === "Q2");
  assert.equal(oldComplex[10], "A,C", "kunci PGK historis wajib tetap");
  assert.equal(oldComplex[2], "COMPLEX", "tipe PGK historis wajib tetap");

  // PG dan PGK versi aktif tetap dinilai seperti biasa.
  gas.__sheets.Users.rows.push(
    ["S3", "siswa3", "pw", "Siswa Tiga", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""]
  );
  const active = get(gas, "getQuestions").data;
  const pg = active.find((q) => q.tipe === "SINGLE");
  const pgk = active.find((q) => q.tipe === "COMPLEX");
  assert.ok(pg && pgk, "PG dan PGK aktif harus terkirim");
  const answers = {};
  answers[pg.id_soal] = "A";
  answers[pgk.id_soal] = ["B", "D"];
  const submit = post(gas, "submitExam", { id_siswa: "S3", answers: answers });
  assert.equal(submit.success, true, submit.message);
  assert.equal(submit.score, "100.00", "PG + PGK versi aktif tetap dinilai benar");
}

// ── 21. Delete soal historis tetap mengarsipkan, tidak menghapus baris ──────
{
  const gas = loadGas(answeredState());
  const before = gas.__sheets.Questions.rows[1].slice(0, 14);
  const res = post(gas, "deleteQuestion", { id_soal: "Q1" });
  assert.equal(res.success, true);
  assert.equal(res.archived, true);
  assert.deepEqual(
    gas.__sheets.Questions.rows[1].slice(0, 14), before,
    "arsip tidak boleh mengubah isi soal historis"
  );
  assert.equal(get(gas, "getAdminQuestions").data.length, 1, "soal historis tetap dapat ditelusuri admin");
}

// ── 22. Sheet lama 14 kolom: versioning tetap bekerja tanpa migrasi ─────────
{
  const gas = loadGas(answeredState());
  assert.equal(gas.__sheets.Questions.rows[1].length, 14, "baris awal memang hanya 14 kolom");

  const res = post(gas, "updateQuestion", {
    id_soal: "Q1",
    data: Object.assign({}, validSingle, { kunci_jawaban: "C" }),
  });
  assert.equal(res.versioned, true);
  assert.equal(gas.__sheets.Questions.rows[1][14], "ARSIP");
  assert.equal(gas.__sheets.Questions.rows[1][15], "Q1");
  assert.equal(gas.__sheets.Questions.rows[1][10], "A", "kunci historis tetap setelah kolom baru ditulis");
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK 4.2.1 — semantik "answered": isAnswerFilled + regresi scoring SINGLE/COMPLEX
// ═══════════════════════════════════════════════════════════════════════════

// State ujian berjalan dengan dua soal: Q1 SINGLE (kunci B), Q2 COMPLEX (kunci A,C).
function scoringState() {
  const s = baseState();
  s.Config = [["key", "value"], ["exam_mapel", ""], ["exam_duration", 90]];
  s.Questions = [
    QUESTION_HEADER.slice(0, 14),
    ["Q1", 1, "SINGLE", "PG", "", "A", "B", "C", "D", "", "B", 2, "Mudah", "MAPEL_A"],
    ["Q2", 2, "COMPLEX", "PGK", "", "A", "B", "C", "D", "", "A,C", 3, "Sedang", "MAPEL_A"],
  ];
  s.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""],
  ];
  return s;
}

// ── 23. isAnswerFilled: falsy bukan lagi "kosong" ──────────────────────────
{
  const gas = loadGas(baseState());
  const f = gas.isAnswerFilled;
  assert.equal(typeof f, "function", "isAnswerFilled wajib ada di code.gs");

  assert.equal(f("A"), true);
  assert.equal(f(["A"]), true);
  assert.equal(f(["A", "C"]), true);
  assert.equal(f({ "1": "SALAH" }), true);
  assert.equal(f({ "1": "A" }), true);
  assert.equal(f("Jakarta"), true);
  assert.equal(f(false), true, "false wajib answered (regresi TRUE_FALSE)");
  assert.equal(f(true), true);
  assert.equal(f(0), true, "0 wajib answered");

  assert.equal(f(""), false);
  assert.equal(f("   "), false);
  assert.equal(f(null), false);
  assert.equal(f(undefined), false);
  assert.equal(f([]), false);
  assert.equal(f({}), false);
}

// ── 24. SINGLE scoring tidak berubah ───────────────────────────────────────
{
  const correct = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: { Q1: "B" } });
  // Q1 benar (2), Q2 kosong. maxScore = 2 + 3 = 5. score = 2/5*100 = 40.00
  assert.equal(correct.score, "40.00", "SINGLE benar + PGK kosong");

  const wrong = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: { Q1: "A" } });
  assert.equal(wrong.score, "0.00", "SINGLE salah");

  const blank = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: {} });
  assert.equal(blank.score, "0.00", "semua kosong");
}

// ── 25. COMPLEX scoring tidak berubah ──────────────────────────────────────
{
  const correct = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: { Q2: ["A", "C"] } });
  // Q2 benar (3) dari max 5 → 60.00
  assert.equal(correct.score, "60.00", "PGK benar");

  const wrongOrder = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: { Q2: ["C", "A"] } });
  assert.equal(wrongOrder.score, "60.00", "PGK benar walau urutan beda");

  const partial = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: { Q2: ["A"] } });
  assert.equal(partial.score, "0.00", "PGK tidak lengkap = salah (all-or-nothing tetap)");

  const emptyArr = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: { Q2: [] } });
  assert.equal(emptyArr.score, "0.00", "PGK array kosong = tidak dijawab");
}

// ── 26. maxScore (denominator) tetap memasukkan bobot soal unanswered ──────
{
  // Hanya Q1 dijawab benar (2). Q2 tidak dikirim sama sekali. Kalau denominator
  // ikut menyusut jadi 2, score keliru jadi 100.00. Harus 40.00.
  const r = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: { Q1: "B" } });
  assert.equal(r.score, "40.00", "bobot soal unanswered tetap di denominator");

  // Semua benar → 100.00
  const full = post(loadGas(scoringState()), "submitExam", { id_siswa: "S1", answers: { Q1: "B", Q2: ["A", "C"] } });
  assert.equal(full.score, "100.00");
}

console.log("questionBank421: isAnswerFilled + regresi scoring PASS");

// ═══════════════════════════════════════════════════════════════════════════
// TASK 4.2.2 — parity kontrak GAS + proyeksi siswa (tidak boleh bocor kunci)
// ═══════════════════════════════════════════════════════════════════════════

const contract = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "question-contract.json"), "utf8")
);

// ── 27. Konstanta GAS sama dengan kontrak bersama ──────────────────────────
{
  const gas = loadGas(baseState());

  assert.deepEqual(
    Array.from(gas.__eval("CANONICAL_QUESTION_TYPES")).sort(),
    contract.types_canonical.slice().sort(),
    "CANONICAL_QUESTION_TYPES menyimpang dari question-contract.json"
  );
  assert.deepEqual(
    Array.from(gas.__eval("VALID_QUESTION_TYPES")).sort(),
    contract.types_implemented.slice().sort(),
    "VALID_QUESTION_TYPES menyimpang dari kontrak"
  );
  assert.deepEqual(
    Array.from(gas.__eval("QUESTION_ALLOWED_FIELDS")).sort(),
    contract.write_fields.slice().sort(),
    "QUESTION_ALLOWED_FIELDS menyimpang dari kontrak"
  );
  // Tabel validator harus persis menutupi tipe yang diklaim didukung.
  assert.deepEqual(
    Object.keys(gas.__eval("QUESTION_TYPE_VALIDATORS")).sort(),
    contract.types_implemented.slice().sort(),
    "tabel validator tidak sama dengan types_implemented"
  );
  for (const t of contract.types_implemented) {
    assert.ok(contract.types_canonical.indexOf(t) !== -1, "implemented harus subset canonical");
  }
}

// ── 28. Tipe canonical yang belum didukung ditolak, bukan diam-diam diterima ─
{
  const gas = loadGas(baseState());
  for (const tipe of ["TRUE_FALSE", "MATCHING", "FILL_IN"]) {
    const res = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { tipe: tipe }) });
    assert.equal(res.success, false, tipe + " belum boleh diterima");
    assert.match(res.message, /belum didukung/);
  }
  const unknown = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { tipe: "ESSAY" }) });
  assert.equal(unknown.success, false);
  assert.match(unknown.message, /tidak dikenal/);

  // data_soal belum boleh masuk Sheet: kolom 17 adalah pekerjaan task berikutnya.
  const withData = post(gas, "createQuestion", {
    data: Object.assign({}, validSingle, { data_soal: { pernyataan: [{ id: "1", teks: "x" }] } }),
  });
  assert.equal(withData.success, false);
  assert.match(withData.message, /Field tidak dikenal/);
}

// ── 29. Proyeksi siswa persis sesuai kontrak, tanpa field admin ─────────────
{
  const state = baseState();
  // Baris lengkap 16 kolom dengan kunci, status, dan lineage terisi.
  state.Questions = [
    QUESTION_HEADER,
    ["Q1", 1, "SINGLE", "Soal", "", "A", "B", "C", "D", "E", "A", 1, "Mudah", "MAPEL_A", "AKTIF", "Q0"],
  ];
  const gas = loadGas(state);

  const student = get(gas, "getQuestions").data;
  assert.equal(student.length, 1);
  assert.deepEqual(
    Object.keys(student[0]).sort(),
    contract.student_fields.slice().sort(),
    "bentuk soal untuk siswa menyimpang dari kontrak"
  );
  for (const forbidden of contract.admin_only_fields) {
    assert.equal(forbidden in student[0], false, "field admin " + forbidden + " bocor ke siswa");
  }
  // Jaring pengaman terakhir: kunci "A" tidak boleh muncul di serialisasi apa pun.
  const serialized = JSON.stringify(student[0]);
  assert.equal(serialized.indexOf("kunci") === -1, true, "kata kunci muncul di payload siswa");

  // Admin tetap menerima kunci dan metadata historis.
  const admin = get(gas, "getAdminQuestions").data[0];
  assert.equal(admin.kunci_jawaban, "A");
  assert.equal(admin.status_soal, "AKTIF");
  assert.equal(admin.versi_dari, "Q0");
}

// ── 30. SINGLE/COMPLEX tetap lolos validator setelah refactor per-tipe ──────
{
  const gas = loadGas(baseState());
  assert.equal(post(gas, "createQuestion", { data: validSingle }).success, true);
  assert.equal(
    post(gas, "createQuestion", {
      data: Object.assign({}, validSingle, { tipe: "COMPLEX", kunci_jawaban: "A,C" }),
    }).success,
    true
  );
  // Aturan jumlah kunci per tipe tidak berubah.
  assert.match(
    post(gas, "createQuestion", { data: Object.assign({}, validSingle, { kunci_jawaban: "A,B" }) }).message,
    /satu kunci jawaban/
  );
  assert.match(
    post(gas, "createQuestion", {
      data: Object.assign({}, validSingle, { tipe: "COMPLEX", kunci_jawaban: "A" }),
    }).message,
    /dua kunci jawaban/
  );
}

console.log("questionBank422: parity kontrak + proyeksi siswa PASS");

console.log("questionBank: validasi, integritas historis, safe edit/delete PASS");
