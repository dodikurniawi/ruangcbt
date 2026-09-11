// Test Bank Soal pada boundary GAS: validasi, integritas historis, safe edit/delete,
// dan proteksi id soal. Menjalankan code.gs asli di dalam vm dengan sheet tiruan
// yang mendukung tulis, hapus, dan append.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const tenantSecret = "tenant-shared-secret-32-characters-minimum";

function makeSheet(rows) {
  // Sheet baru Apps Script punya 26 kolom; grid tiruan mengikuti itu agar tulisan
  // ke kolom 15-17 berperilaku sama seperti di Sheets sungguhan.
  let maxColumns = rows.reduce((n, r) => Math.max(n, r.length), 26);
  const sheet = {
    rows,
    getDataRange: () => ({ getValues: () => rows }),
    getLastRow: () => rows.length,
    getMaxColumns: () => maxColumns,
    insertColumnsAfter(after, howMany) { maxColumns = after + howMany; },
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

function loadGas(sheetRows, mutateSource) {
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
  let source = fs.readFileSync(path.join(__dirname, "code.gs"), "utf8");
  // mutateSource dipakai mutation test: implementasi sengaja dirusak untuk
  // memastikan test benar-benar mendeteksi regresi, bukan lolos karena kebetulan.
  if (mutateSource) source = mutateSource(source);
  vm.runInContext(source, context);
  context.__sheets = sheets;
  // `const` di top-level script vm tidak menjadi properti context, jadi baca lewat eval.
  context.__eval = function (expr) { return vm.runInContext(expr, context); };
  return context;
}

const QUESTION_HEADER = [
  "id_soal", "nomor_urut", "tipe", "pertanyaan", "gambar_url",
  "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e",
  "kunci_jawaban", "bobot", "kategori", "id_mapel", "status_soal", "versi_dari", "data_soal",
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
  assert.deepEqual(
    Array.from(gas.__eval("STUDENT_QUESTION_FIELDS")).sort(),
    contract.student_fields.slice().sort(),
    "STUDENT_QUESTION_FIELDS menyimpang dari kontrak"
  );
  assert.deepEqual(
    Array.from(gas.__eval("ADMIN_ONLY_QUESTION_FIELDS")).sort(),
    contract.admin_only_fields.slice().sort(),
    "ADMIN_ONLY_QUESTION_FIELDS menyimpang dari kontrak"
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
  // Seluruh tipe canonical kini aktif; hanya tipe di luar model yang ditolak.
  const unknown = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { tipe: "ESSAY" }) });
  assert.equal(unknown.success, false);
  assert.match(unknown.message, /tidak dikenal/);

  // data_soal kini field tulis yang sah, tetapi tidak boleh membawa kunci jawaban.
  const withData = post(gas, "createQuestion", {
    data: Object.assign({}, validSingle, { data_soal: { pernyataan: [{ id: "1", teks: "x" }] } }),
  });
  assert.equal(withData.success, true, withData.message);

  const smuggled = post(gas, "createQuestion", {
    data: Object.assign({}, validSingle, {
      data_soal: { pernyataan: [{ id: "1", teks: "x", kunci: "BENAR" }] },
    }),
  });
  assert.equal(smuggled.success, false, "kunci jawaban tidak boleh diselundupkan lewat data_soal");
  assert.match(smuggled.message, /kunci jawaban/);
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
  assert.equal(
    Object.keys(student[0]).every((field) => contract.student_fields.includes(field)),
    true,
    "proyeksi siswa memuat field di luar allowlist kontrak"
  );
  for (const field of contract.student_fields.filter((name) => name !== "data_soal")) {
    assert.equal(field in student[0], true, "field siswa hilang: " + field);
  }
  assert.equal("data_soal" in student[0], false, "kolom 17 kosong tidak boleh memunculkan data_soal");
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

// ═══════════════════════════════════════════════════════════════════════════
// TASK 4.2.3 — data_soal sebagai kolom 17
// ═══════════════════════════════════════════════════════════════════════════

const DATA_SOAL_SAMPLE = { pernyataan: [{ id: "1", teks: "Jakarta ibu kota" }] };
const DATA_SOAL_JSON = '{"pernyataan":[{"id":"1","teks":"Jakarta ibu kota"}]}';

// Baris 17 kolom lengkap dengan data_soal terisi.
function stateWithDataSoal(cell) {
  const state = baseState();
  state.Questions = [
    QUESTION_HEADER,
    ["Q1", 1, "SINGLE", "Soal lama", "", "A", "B", "C", "D", "", "A", 1, "Mudah", "MAPEL_A", "AKTIF", "",
      cell === undefined ? DATA_SOAL_JSON : cell],
  ];
  return state;
}

const unchangedQ1 = {
  nomor_urut: 1, tipe: "SINGLE", pertanyaan: "Soal lama", gambar_url: "",
  opsi_a: "A", opsi_b: "B", opsi_c: "C", opsi_d: "D", opsi_e: "",
  kunci_jawaban: "A", bobot: 1, kategori: "Mudah", id_mapel: "MAPEL_A",
};

// ── 31. A. Baris legacy (14/16 kolom) tetap terbaca, data_soal kosong ───────
{
  const gas = loadGas(baseState());                    // Questions 14 kolom
  const legacy14 = get(gas, "getQuestions").data[0];
  assert.equal(legacy14.id_soal, "Q1");
  assert.equal("data_soal" in legacy14, false, "baris 14 kolom tidak boleh memunculkan data_soal");

  const state16 = baseState();
  state16.Questions = [
    QUESTION_HEADER.slice(0, 16),
    ["Q1", 1, "SINGLE", "Soal lama", "", "A", "B", "C", "D", "", "A", 1, "Mudah", "MAPEL_A", "AKTIF", ""],
  ];
  const gas16 = loadGas(state16);
  const legacy16 = get(gas16, "getQuestions").data[0];
  assert.equal(legacy16.bobot, 1, "kolom 1-16 tidak boleh bergeser");
  assert.equal(legacy16.kategori, "Mudah");
  assert.equal("data_soal" in legacy16, false);
  // Soal legacy tetap dapat diedit.
  const edit = post(gas16, "updateQuestion", { id_soal: "Q1", data: unchangedQ1 });
  assert.equal(edit.success, true, edit.message);
  assert.equal(gas16.__sheets.Questions.rows[1][16], "", "edit tanpa data_soal tetap menulis kolom 17 kosong");
}

// ── 32. B. Baris 17 kolom: data_soal terbaca sebagai objek ─────────────────
{
  const gas = loadGas(stateWithDataSoal());
  const student = get(gas, "getQuestions").data[0];
  assert.deepEqual(student.data_soal, DATA_SOAL_SAMPLE);
  const admin = get(gas, "getAdminQuestions").data[0];
  assert.deepEqual(admin.data_soal, DATA_SOAL_SAMPLE);
}

// ── 33. C. questionRowValues() menghasilkan 17 kolom, posisi 1-16 tetap ────
{
  const gas = loadGas(baseState());
  const legacyRow = gas.questionRowValues("Q9", validSingle, "AKTIF", "Q0");
  const withData = gas.questionRowValues(
    "Q9", Object.assign({}, validSingle, { data_soal: DATA_SOAL_SAMPLE }), "AKTIF", "Q0"
  );

  assert.equal(legacyRow.length, 17, "questionRowValues wajib 17 kolom");
  assert.deepEqual(legacyRow.slice(0, 16), withData.slice(0, 16), "kolom 1-16 tidak boleh berubah");
  assert.deepEqual(Array.from(legacyRow).slice(0, 16), [
    "Q9", 2, "SINGLE", "<p>Berapa 2+2?</p>", "", "3", "4", "5", "6", "",
    "B", 1, "Mudah", "MAPEL_A", "AKTIF", "Q0",
  ], "urutan kolom 1-16 menyimpang");
  assert.equal(legacyRow[16], "", "tanpa data_soal kolom 17 kosong");
  assert.equal(withData[16], DATA_SOAL_JSON, "data_soal harus berada di index 16 sebagai JSON string");
}

// ── 34. D. questionContentEquals() membandingkan data_soal secara semantik ──
{
  const gas = loadGas(baseState());
  const row = gas.questionRowValues("Q1", Object.assign({}, unchangedQ1, { data_soal: { a: 1, b: 2 } }),
    "AKTIF", "");

  assert.equal(
    gas.questionContentEquals(row, Object.assign({}, unchangedQ1, { data_soal: { b: 2, a: 1 } })),
    true,
    "urutan kunci JSON berbeda bukan perubahan isi"
  );
  assert.equal(
    gas.questionContentEquals(row, Object.assign({}, unchangedQ1, { data_soal: { a: 1, b: 3 } })),
    false,
    "nilai data_soal berbeda wajib terbaca sebagai perubahan isi"
  );
  assert.equal(
    gas.questionContentEquals(row, unchangedQ1),
    false,
    "menghapus data_soal juga perubahan isi"
  );
  // Metadata versioning dan nomor_urut tetap bukan isi.
  const meta = gas.questionRowValues("Q1", Object.assign({}, unchangedQ1, { data_soal: { a: 1, b: 2 } }),
    "ARSIP", "Q0");
  assert.equal(
    gas.questionContentEquals(meta, Object.assign({}, unchangedQ1, { nomor_urut: 9, data_soal: { b: 2, a: 1 } })),
    true,
    "status_soal/versi_dari/nomor_urut bukan isi historis"
  );
}

// ── 35. E. Edit data_soal pada soal historis wajib menjadi versi baru ───────
{
  const state = answeredState();
  state.Questions = stateWithDataSoal("").Questions;      // Q1 17 kolom, data_soal kosong
  const gas = loadGas(state);

  const res = post(gas, "updateQuestion", {
    id_soal: "Q1",
    data: Object.assign({}, unchangedQ1, { data_soal: DATA_SOAL_SAMPLE }),
  });
  assert.equal(res.success, true, res.message);
  assert.equal(res.versioned, true, "perubahan data_soal wajib memicu versi baru");
  assert.equal(res.previous_id_soal, "Q1");

  const rows = gas.__sheets.Questions.rows;
  const old = rows.find((r) => r[0] === "Q1");
  const fresh = rows.find((r) => r[0] === res.id_soal);
  assert.equal(old[14], "ARSIP", "versi lama wajib diarsipkan");
  assert.equal(old[16], "", "isi historis tidak boleh tersentuh");
  assert.equal(fresh[16], DATA_SOAL_JSON, "versi baru menyimpan data_soal di kolom 17");
  assert.equal(fresh[15], "Q1", "versi_dari menunjuk soal asal");
}

// ── 36. F. Edit nomor_urut saja tetap in-place walau data_soal terisi ───────
{
  const state = answeredState();
  state.Questions = stateWithDataSoal().Questions;
  const gas = loadGas(state);

  const res = post(gas, "updateQuestion", {
    id_soal: "Q1",
    // data_soal identik, hanya urutan kunci JSON dan nomor_urut yang berbeda.
    data: Object.assign({}, unchangedQ1, {
      nomor_urut: 7,
      data_soal: { pernyataan: [{ teks: "Jakarta ibu kota", id: "1" }] },
    }),
  });
  assert.equal(res.versioned, false, "nomor_urut bukan isi historis");
  assert.equal(gas.__sheets.Questions.rows.length, 2, "tidak boleh ada versi baru");
  assert.equal(gas.__sheets.Questions.rows[1][1], 7);
  assert.equal(gas.__sheets.Questions.rows[1][16], DATA_SOAL_JSON, "data_soal tidak berubah");
}

// ── 37. G/H. Regresi SINGLE dan COMPLEX legacy tanpa data_soal ─────────────
{
  const gas = loadGas(baseState());
  const single = post(gas, "createQuestion", { data: validSingle });
  assert.equal(single.success, true, single.message);
  const complex = post(gas, "createQuestion", {
    data: Object.assign({}, validSingle, { tipe: "COMPLEX", kunci_jawaban: "A,C", nomor_urut: 3 }),
  });
  assert.equal(complex.success, true, complex.message);

  const rows = gas.__sheets.Questions.rows;
  assert.equal(rows[1].length, 14, "baris lama tidak boleh dimigrasi");
  assert.equal(rows[2].length, 17);
  assert.equal(rows[3].length, 17);
  assert.equal(rows[3][16], "", "SINGLE/COMPLEX tidak menulis data_soal");
  assert.equal(rows[3][10], "A,C", "kunci COMPLEX tetap di kolom 11");

  const student = get(gas, "getQuestions").data;
  assert.equal(student.length, 3);
  assert.equal(student.every((q) => !("data_soal" in q)), true);
}

// ── 38. I. Proyeksi siswa: data_soal boleh, field admin tidak ──────────────
{
  const state = stateWithDataSoal();
  state.Questions[1][10] = "A";
  state.Questions[1][15] = "Q0";
  const gas = loadGas(state);

  const student = get(gas, "getQuestions").data[0];
  assert.equal(
    Object.keys(student).every((field) => contract.student_fields.includes(field)),
    true,
    "proyeksi siswa memuat field di luar allowlist"
  );
  assert.deepEqual(student.data_soal, DATA_SOAL_SAMPLE);
  for (const forbidden of contract.admin_only_fields) {
    assert.equal(forbidden in student, false, "field admin " + forbidden + " bocor ke siswa");
  }
  assert.equal(JSON.stringify(student).indexOf("kunci") === -1, true, "kunci muncul di payload siswa");
}

// ── 39. J. data_soal rusak: ditangani defensif, tidak crash diam-diam ───────
{
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(String(message));
  try {
    const state = answeredState();
    state.Questions = stateWithDataSoal("{bukan json").Questions;
    const gas = loadGas(state);

    const student = get(gas, "getQuestions");
    assert.equal(student.success, true, "data_soal rusak tidak boleh menggagalkan seluruh request");
    assert.equal("data_soal" in student.data[0], false, "isi rusak tidak boleh diteruskan ke siswa");
    assert.equal(warnings.some((w) => w.indexOf("data_soal tidak valid") !== -1), true,
      "data_soal rusak wajib tercatat, bukan gagal diam-diam");

    // Menyimpan ulang soal historis dengan data_soal sah = perubahan isi.
    const res = post(gas, "updateQuestion", {
      id_soal: "Q1",
      data: Object.assign({}, unchangedQ1, { data_soal: DATA_SOAL_SAMPLE }),
    });
    assert.equal(res.versioned, true, "sel rusak tidak boleh dianggap sama dengan data_soal sah");

    // Payload data_soal yang bukan objek ditolak di boundary.
    const bad = post(gas, "createQuestion", {
      data: Object.assign({}, validSingle, { data_soal: "{bukan json" }),
    });
    assert.equal(bad.success, false);
    assert.match(bad.message, /data_soal harus berupa objek/);
  } finally {
    console.warn = originalWarn;
  }
}

// ── 40. Sheet yang kolomnya dipangkas diperlebar sebelum menulis 17 kolom ──
{
  const gas = loadGas(baseState());
  const sheet = gas.__sheets.Questions;
  sheet.insertColumnsAfter(0, 16);                      // pangkas grid tiruan ke 16 kolom
  assert.equal(sheet.getMaxColumns(), 16);
  gas.ensureQuestionColumns(sheet);
  assert.equal(sheet.getMaxColumns(), 17, "grid wajib diperlebar sebelum menulis kolom 17");
}

// ── 41. MUTATION TEST: questionContentEquals() wajib melihat kolom 17 ───────
// Implementasi sengaja dibuat mengabaikan data_soal. Bila test 35 benar, build
// cacat ini harus berperilaku berbeda (menimpa baris historis, tanpa versi baru).
{
  const mutate = (source) => {
    const mutated = source.replace(
      "  const d = QUESTION_DATA_COL - 1;\n  return canonicalDataSoalCell(row[d]) === canonicalDataSoalCell(next[d]);",
      "  return true;"
    );
    assert.notEqual(mutated, source, "titik mutasi tidak ditemukan — mutation test kedaluwarsa");
    return mutated;
  };

  const state = answeredState();
  state.Questions = stateWithDataSoal("").Questions;
  const broken = loadGas(state, mutate);
  const res = post(broken, "updateQuestion", {
    id_soal: "Q1",
    data: Object.assign({}, unchangedQ1, { data_soal: DATA_SOAL_SAMPLE }),
  });
  assert.equal(res.versioned, false, "mutasi tidak mengubah perilaku — test 35 tidak mendeteksi regresi");
  assert.equal(
    broken.__sheets.Questions.rows.length, 2,
    "build cacat tidak membuat versi baru — inilah regresi yang dijaga test 35"
  );
  assert.equal(
    broken.__sheets.Questions.rows[1][16], "",
    "build cacat membuang perubahan data_soal tanpa jejak"
  );

  // Implementasi asli pada state identik tetap membuat versi baru.
  const fixedState = answeredState();
  fixedState.Questions = stateWithDataSoal("").Questions;
  const fixed = loadGas(fixedState);
  assert.equal(
    post(fixed, "updateQuestion", {
      id_soal: "Q1",
      data: Object.assign({}, unchangedQ1, { data_soal: DATA_SOAL_SAMPLE }),
    }).versioned,
    true
  );
}

console.log("questionBank423: data_soal kolom 17 + integritas historis PASS");


console.log("questionBank: validasi, integritas historis, safe edit/delete PASS");

// TASK 4.2.4 — type-aware scoring engine. Tipe baru hanya diuji pada engine;
// VALID_QUESTION_TYPES tetap SINGLE/COMPLEX sampai task UI/delivery terpisah.
function scoreFixture(tipe, kunci, bobot, dataSoal) {
  return { tipe, kunci_jawaban: kunci, bobot, data_soal: dataSoal };
}

{
  const gas = loadGas(baseState());
  let cases = 0;
  const expectScore = (question, answer, expected, message) => {
    cases++;
    assert.equal(gas.scoreQuestion(question, answer), expected, message);
  };

  const single = scoreFixture("SINGLE", "B", 10, null);
  expectScore(single, "B", 10, "SINGLE benar = penuh");                         // 1
  expectScore(single, "A", 0, "SINGLE salah = 0");                             // 2
  expectScore(single, "", 0, "SINGLE kosong = 0");                             // 3

  const complex = scoreFixture("COMPLEX", "A,C", 20, null);
  expectScore(complex, ["A", "C"], 20, "COMPLEX exact = penuh");                // 4
  const reversed = ["C", "A"];
  expectScore(complex, reversed, 20, "COMPLEX tidak bergantung urutan");         // 5
  assert.deepEqual(reversed, ["C", "A"], "scorer tidak boleh memutasi jawaban client");
  expectScore(complex, ["A"], 0, "COMPLEX parsial tetap 0");                    // 6
  expectScore(complex, ["A", "B"], 0, "COMPLEX salah tetap 0");                // 7
  expectScore(complex, [], 0, "COMPLEX kosong = 0");                            // 8

  const tfData = { pernyataan: [{ id: "1", teks: "P1" }, { id: "2", teks: "P2" }] };
  const tf = scoreFixture("TRUE_FALSE", '{"1":"BENAR","2":"SALAH"}', 40, tfData);
  expectScore(tf, { "1": "BENAR", "2": "SALAH" }, 40, "TRUE_FALSE semua benar"); // 9
  expectScore(tf, { "1": "BENAR", "2": "BENAR" }, 20, "TRUE_FALSE parsial");     // 10
  expectScore(tf, { "1": "SALAH", "2": "BENAR" }, 0, "TRUE_FALSE semua salah"); // 11
  expectScore(tf, {}, 0, "TRUE_FALSE kosong");                                  // 12
  expectScore(tf, { "1": "BENAR", "2": {} }, 20, "TRUE_FALSE bagian rusak = 0"); // 13
  expectScore(tf, "bukan-json", 0, "TRUE_FALSE jawaban rusak tidak crash");     // 14
  expectScore(tf, '{"1":"BENAR","2":"SALAH"}', 0,
    "TRUE_FALSE jawaban client wajib object canonical");
  expectScore(scoreFixture("TRUE_FALSE", "{rusak", 40, tfData), { "1": "BENAR" }, 0,
    "TRUE_FALSE kunci rusak gagal tertutup");                                    // 15
  expectScore(scoreFixture("TRUE_FALSE", '{"1":"YA","2":"SALAH"}', 40, tfData),
    { "1": "YA", "2": "SALAH" }, 20, "nilai kunci TF invalid tidak diberi poin"); // 16

  const matchingData = {
    kiri: [{ id: "1", teks: "K1" }, { id: "2", teks: "K2" }],
    kanan: [{ id: "A", teks: "R1" }, { id: "B", teks: "R2" }],
  };
  const matching = scoreFixture("MATCHING", '{"1":"A","2":"B"}', 40, matchingData);
  expectScore(matching, { "1": "A", "2": "B" }, 40, "MATCHING semua benar"); // 17
  expectScore(matching, { "1": "A", "2": "A" }, 20, "MATCHING parsial");     // 18
  expectScore(matching, { "1": "B", "2": "A" }, 0, "MATCHING semua salah"); // 19
  expectScore(matching, {}, 0, "MATCHING kosong");                               // 20
  expectScore(matching, { "1": "A", "2": {} }, 20, "MATCHING bagian rusak = 0"); // 21
  expectScore(matching, "bukan-json", 0, "MATCHING jawaban rusak tidak crash"); // 22
  expectScore(matching, '{"1":"A","2":"B"}', 0,
    "MATCHING jawaban client wajib object canonical");
  expectScore(scoreFixture("MATCHING", '{"1":"Z","2":"B"}', 40, matchingData),
    { "1": "Z", "2": "B" }, 20, "target kunci di luar kanan tidak diberi poin"); // 23
  expectScore(scoreFixture("MATCHING", '{"1":"A"}', 40, { kiri: matchingData.kiri }),
    { "1": "A" }, 0, "MATCHING tanpa daftar kanan = 0");                       // 24

  const fill = scoreFixture("FILL_IN", '{"accepted_answers":["Jakarta","DKI Jakarta"]}', 10, null);
  expectScore(fill, "Jakarta", 10, "FILL_IN exact");                            // 25
  expectScore(fill, "JAKARTA", 10, "FILL_IN default case-insensitive");         // 26
  expectScore(fill, "  Jakarta  ", 10, "FILL_IN default trim");                 // 27
  expectScore(fill, "Bandung", 0, "FILL_IN salah");                             // 28
  expectScore(fill, "", 0, "FILL_IN kosong");                                  // 29
  expectScore(fill, "dki jakarta", 10, "FILL_IN banyak accepted answer");       // 30
  expectScore(scoreFixture("FILL_IN", "{rusak", 10, null), "Jakarta", 0,
    "FILL_IN kunci rusak gagal tertutup");                                       // 31
  expectScore(fill, "Jakart", 0, "FILL_IN tidak fuzzy");                        // 32
  expectScore(scoreFixture("FILL_IN", {
    accepted_answers: ["Jakarta"], case_sensitive: true,
  }, 10, null), "jakarta", 0, "FILL_IN case_sensitive dihormati");              // 33
  expectScore(scoreFixture("FILL_IN", {
    accepted_answers: ["Jakarta"], trim: false,
  }, 10, null), " Jakarta ", 0, "FILL_IN trim=false dihormati");                 // 34

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(String(message));
  try {
    expectScore(scoreFixture("ESSAY", "x", 10, null), "x", 0, "tipe asing = 0"); // 35
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.some((warning) => warning.includes("ESSAY")), true,
    "tipe asing harus tercatat");
  expectScore(scoreFixture("SINGLE", "B", 0, null), "B", 0, "bobot nol = 0");  // 36
  expectScore(scoreFixture("SINGLE", "B", "", null), "B", 1,
    "bobot kosong legacy tetap default 1");                                      // 37

  assert.ok(cases >= 32, `matrix scoring kurang: ${cases}`);
}

// Integrasi scoreExam: dispatch campuran, denominator, arsip, dan filter mapel.
{
  const gas = loadGas(baseState());
  const rows = [
    QUESTION_HEADER,
    ["S", 1, "SINGLE", "", "", "", "", "", "", "", "A", 10, "", "M", "AKTIF", "", ""],
    ["C", 2, "COMPLEX", "", "", "", "", "", "", "", "A,C", 20, "", "M", "AKTIF", "", ""],
    ["T", 3, "TRUE_FALSE", "", "", "", "", "", "", "", '{"1":"BENAR","2":"SALAH"}', 40, "", "M", "AKTIF", "", JSON.stringify({ pernyataan: [{ id: "1" }, { id: "2" }] })],
    ["P", 4, "MATCHING", "", "", "", "", "", "", "", '{"1":"A","2":"B"}', 40, "", "M", "AKTIF", "", JSON.stringify({ kiri: [{ id: "1" }, { id: "2" }], kanan: [{ id: "A" }, { id: "B" }] })],
    ["F", 5, "FILL_IN", "", "", "", "", "", "", "", '{"accepted_answers":["Jakarta"]}', 10, "", "M", "AKTIF", "", ""],
    ["OLD", 6, "SINGLE", "", "", "", "", "", "", "", "A", 100, "", "M", "ARSIP", "", ""],
    ["OTHER", 7, "SINGLE", "", "", "", "", "", "", "", "A", 100, "", "LAIN", "AKTIF", "", ""],
  ];
  const result = gas.scoreExam(rows, {
    S: "A", C: ["C", "A"], T: { "1": "BENAR", "2": "BENAR" },
    P: { "1": "A", "2": "A" }, F: "jakarta", OLD: "A", OTHER: "A",
  }, "M");
  assert.equal(result.totalScore, 80);
  assert.equal(result.maxScore, 120, "arsip dan mapel lain keluar dari denominator");
  assert.equal(result.finalScore.toFixed(2), "66.67");
}

// Boundary submit: skor dari client diabaikan dan jawaban non-object tidak crash.
{
  const state = scoringState();
  const gas = loadGas(state);
  const result = post(gas, "submitExam", {
    id_siswa: "S1", answers: { Q1: "A" }, score: 100,
  });
  assert.equal(result.score, "0.00", "server wajib menghitung dari Questions sendiri");
  assert.equal(gas.__sheets.Users.rows[1][8], "0.00");

  const malformed = post(loadGas(scoringState()), "submitExam", {
    id_siswa: "S1", answers: null,
  });
  assert.equal(malformed.score, "0.00", "answers non-object gagal tertutup");
}

// Mutation guards A-D: tiap implementasi rusak harus mematahkan assertion,
// lalu registry asli dipulihkan dan assertion yang sama wajib lulus.
{
  const gas = loadGas(baseState());
  const registry = gas.__eval("QUESTION_SCORERS");
  const tfData = { pernyataan: [{ id: "1" }, { id: "2" }] };
  const matchingData = {
    kiri: [{ id: "1" }, { id: "2" }], kanan: [{ id: "A" }, { id: "B" }],
  };
  const tf = scoreFixture("TRUE_FALSE", '{"1":"BENAR","2":"SALAH"}', 40, tfData);
  const matching = scoreFixture("MATCHING", '{"1":"A","2":"B"}', 40, matchingData);
  const fill = scoreFixture("FILL_IN", '{"accepted_answers":["Jakarta"]}', 10, null);

  const guardMutation = (type, mutant, expectedAssertion, label) => {
    const original = registry[type];
    try {
      registry[type] = mutant(original);
      assert.throws(expectedAssertion, undefined, `${label}: test tidak mendeteksi mutasi`);
    } finally {
      registry[type] = original;
    }
    expectedAssertion();
  };

  guardMutation("TRUE_FALSE", () => registry.SINGLE,
    () => assert.equal(gas.scoreQuestion(tf, { "1": "BENAR", "2": "SALAH" }), 40),
    "A dispatch TRUE_FALSE ke SINGLE");

  guardMutation("TRUE_FALSE", (original) => (question, answer) =>
    original(question, answer) === question.bobot ? question.bobot : 0,
  () => assert.equal(gas.scoreQuestion(tf, { "1": "BENAR", "2": "BENAR" }), 20),
  "B TRUE_FALSE all-or-nothing");

  guardMutation("MATCHING", (original) => (question, answer) =>
    original(question, answer) === question.bobot ? question.bobot : 0,
  () => assert.equal(gas.scoreQuestion(matching, { "1": "A", "2": "A" }), 20),
  "C MATCHING all-or-nothing");

  guardMutation("FILL_IN", (original) => (question, answer) => original(Object.assign({}, question, {
    kunci_jawaban: { accepted_answers: ["Jakarta"], case_sensitive: true },
  }), answer),
  () => assert.equal(gas.scoreQuestion(fill, "jakarta"), 10),
  "D FILL_IN selalu case-sensitive");
}

console.log("questionBank424: type-aware scoring 39 cases + mutations A-D PASS");

// TASK 4.2.5 — TRUE_FALSE production vertical slice.
function trueFalsePayload(overrides) {
  return Object.assign({
    nomor_urut: 2,
    tipe: "TRUE_FALSE",
    pertanyaan: "Nilai setiap pernyataan",
    gambar_url: "",
    kunci_jawaban: { "1": "BENAR", "2": "SALAH" },
    bobot: 40,
    kategori: "Sedang",
    id_mapel: "MAPEL_A",
    data_soal: {
      pernyataan: [
        { id: "1", teks: "Matahari terbit dari timur" },
        { id: "2", teks: "Air membeku pada 100°C" },
      ],
    },
  }, overrides || {});
}

function trueFalseRow(id, status) {
  return [
    id || "TF1", 1, "TRUE_FALSE", "Nilai setiap pernyataan", "", "", "", "", "", "",
    '{"1":"BENAR","2":"SALAH"}', 40, "Sedang", "MAPEL_A", status || "AKTIF", "",
    JSON.stringify(trueFalsePayload().data_soal),
  ];
}

function trueFalseExamState() {
  const state = baseState();
  state.Questions = [QUESTION_HEADER, trueFalseRow()];
  state.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""],
  ];
  return state;
}

function historicalTrueFalseState() {
  const state = baseState();
  state.Questions = [QUESTION_HEADER, trueFalseRow()];
  state.Responses.push([
    new Date(), "S1", "Siswa", "6A", JSON.stringify({ TF1: { "1": "BENAR", "2": "SALAH" } }),
    "100.00", 10, "", "",
  ]);
  return state;
}

// ADMIN validation: valid exact contract diterima; semua bentuk parsial ditolak.
{
  let cases = 0;
  const expectCreate = (payload, success, pattern) => {
    cases++;
    const result = post(loadGas(baseState()), "createQuestion", { data: payload });
    assert.equal(result.success, success, result.message);
    if (pattern) assert.match(result.message, pattern);
  };

  expectCreate(trueFalsePayload(), true);                                                    // 1
  expectCreate(trueFalsePayload({ kunci_jawaban: '{"1":"BENAR","2":"SALAH"}' }), true,
    undefined); // carrier JSON dari form production
  expectCreate(trueFalsePayload({ data_soal: undefined }), false, /daftar pernyataan/);       // 2
  expectCreate(trueFalsePayload({ data_soal: { pernyataan: [] } }), false, /minimal/);        // 3
  expectCreate(trueFalsePayload({ data_soal: { pernyataan: [
    { id: "1", teks: "a" }, { id: "1", teks: "b" },
  ] } }), false, /unik/);                                                                     // 4
  expectCreate(trueFalsePayload({ kunci_jawaban: undefined }), false, /berupa objek/);
  expectCreate(trueFalsePayload({ kunci_jawaban: { "1": "BENAR" } }), false, /seluruh/);    // 5
  expectCreate(trueFalsePayload({ kunci_jawaban: { "1": "YA", "2": "SALAH" } }), false, /BENAR atau SALAH/); // 6
  expectCreate(trueFalsePayload({ kunci_jawaban: { "1": "BENAR", "2": "SALAH", "3": "BENAR" } }), false, /seluruh|tidak memiliki/); // 7
  expectCreate(trueFalsePayload({ data_soal: "rusak" }), false, /daftar pernyataan/);        // 8
  expectCreate(trueFalsePayload({ data_soal: { pernyataan: [{ teks: "tanpa id" }] } }), false, /id/i); // 9
  expectCreate(trueFalsePayload({ data_soal: { pernyataan: [{ id: "1", teks: "<p></p>" }] }, kunci_jawaban: { "1": "BENAR" } }), false, /teks/); // 10
  expectCreate(trueFalsePayload({ data_soal: { pernyataan: [{ id: "1", teks: "x" }], ekstra: true }, kunci_jawaban: { "1": "BENAR" } }), false, /hanya boleh/); // 11
  expectCreate(trueFalsePayload({ data_soal: { pernyataan: [{ id: "1", teks: "x", jawaban: "BENAR" }] }, kunci_jawaban: { "1": "BENAR" } }), false, /struktur/i); // 12
  assert.equal(cases, 14);
}

// Persistence + round-trip admin/student projection.
{
  const gas = loadGas(baseState());
  const created = post(gas, "createQuestion", { data: trueFalsePayload({
    kunci_jawaban: '{"1":"BENAR","2":"SALAH"}',
  }) });
  assert.equal(created.success, true);                                                         // 13
  const row = gas.__sheets.Questions.rows.find((candidate) => candidate[0] === created.id_soal);
  assert.deepEqual(JSON.parse(row[16]), trueFalsePayload().data_soal);                          // 14
  assert.deepEqual(JSON.parse(row[10]), { "1": "BENAR", "2": "SALAH" });                   // 15

  const admin = get(gas, "getAdminQuestions").data.find((question) => question.id_soal === created.id_soal);
  assert.deepEqual(admin.data_soal, trueFalsePayload().data_soal);                              // 16
  assert.deepEqual(JSON.parse(admin.kunci_jawaban), { "1": "BENAR", "2": "SALAH" });       // 17

  const student = get(gas, "getQuestions").data.find((question) => question.id_soal === created.id_soal);
  assert.deepEqual(student.data_soal, trueFalsePayload().data_soal);                            // 18
  assert.equal("kunci_jawaban" in student, false);                                             // 19
  assert.equal("status_soal" in student, false);                                               // 20
  assert.equal("versi_dari" in student, false);                                                // 21
  assert.equal(["opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e"].some((field) => field in student), false); // 22
}

// Submit integration memakai scorer 4.2.4, bukan kalkulasi baru di UI.
{
  const submit = (answer) => post(loadGas(trueFalseExamState()), "submitExam", {
    id_siswa: "S1", answers: { TF1: answer }, score: 100,
  });
  assert.equal(submit({ "1": "BENAR", "2": "SALAH" }).score, "100.00");                    // 23
  assert.equal(submit({ "1": "BENAR", "2": "BENAR" }).score, "50.00");                   // 24
  assert.equal(submit({ "1": "SALAH", "2": "BENAR" }).score, "0.00");                   // 25
  assert.equal(submit("rusak").score, "0.00");                                               // 26
}

// Historical content edits version; nomor-only/no-op tetap in-place.
{
  const expectVersion = (payload, expected, message) => {
    const gas = loadGas(historicalTrueFalseState());
    const result = post(gas, "updateQuestion", { id_soal: "TF1", data: payload });
    assert.equal(result.versioned, expected, message);
    if (expected) {
      assert.equal(gas.__sheets.Questions.rows[1][14], "ARSIP");
      assert.equal(gas.__sheets.Questions.rows.length, 3);
    } else {
      assert.equal(gas.__sheets.Questions.rows.length, 2);
    }
  };

  const textChanged = trueFalsePayload({ nomor_urut: 1, data_soal: {
    pernyataan: [{ id: "1", teks: "Teks berubah" }, { id: "2", teks: "Air membeku pada 100°C" }],
  } });
  expectVersion(textChanged, true, "ubah teks wajib versioning");                              // 27
  expectVersion(trueFalsePayload({ nomor_urut: 1, kunci_jawaban: { "1": "SALAH", "2": "SALAH" } }), true,
    "ubah key wajib versioning");                                                              // 28
  expectVersion(trueFalsePayload({ nomor_urut: 1, data_soal: { pernyataan: [
    ...trueFalsePayload().data_soal.pernyataan, { id: "3", teks: "Pernyataan baru" },
  ] }, kunci_jawaban: { "1": "BENAR", "2": "SALAH", "3": "BENAR" } }), true,
  "tambah statement wajib versioning");                                                       // 29
  expectVersion(trueFalsePayload({ nomor_urut: 1, data_soal: { pernyataan: [
    { id: "1", teks: "Matahari terbit dari timur" },
  ] }, kunci_jawaban: { "1": "BENAR" } }), true, "hapus statement wajib versioning");      // 30
  expectVersion(trueFalsePayload({ nomor_urut: 9 }), false, "nomor-only harus in-place");      // 31
  expectVersion(trueFalsePayload({ nomor_urut: 1 }), false, "no-op tidak boleh membuat versi"); // 32
}

// Regression + scope lock: hanya TRUE_FALSE yang diaktifkan.
{
  const gas = loadGas(baseState());
  assert.equal(post(gas, "createQuestion", { data: validSingle }).success, true);               // 33
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, {
    tipe: "COMPLEX", kunci_jawaban: "A,C",
  }) }).success, true);                                                                         // 34
  // FILL_IN (4.2.7) dan MATCHING (4.2.6) kini aktif; keduanya punya suite sendiri.
  // Di sini cukup dipastikan tipe di luar model canonical tetap ditolak.
  {
    const result = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { tipe: "ESSAY" }) });
    assert.equal(result.success, false, "tipe tak dikenal tidak boleh aktif");                   // 35-36
    assert.match(result.message, /tidak dikenal/);
  }
}

// Mutation A/D/E: whitelist, projection, dan partial scorer benar-benar dijaga.
{
  const valid = trueFalsePayload();
  const whitelistMutation = (source) => {
    const mutated = source.replace(
      'const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"];',
      'const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX"];',
    );
    assert.notEqual(mutated, source, "titik mutation A tidak ditemukan");
    return mutated;
  };
  const brokenWhitelist = loadGas(baseState(), whitelistMutation);
  assert.throws(() => assert.equal(
    post(brokenWhitelist, "createQuestion", { data: valid }).success, true,
  ), undefined, "mutation A tidak terdeteksi");
  assert.equal(post(loadGas(baseState()), "createQuestion", { data: valid }).success, true);

  const projectionMutation = (source) => {
    const mutated = source.replace("    if (skipMapelFilter) {", "    if (true) {");
    assert.notEqual(mutated, source, "titik mutation D tidak ditemukan");
    return mutated;
  };
  const assertSafeProjection = (gas) => assert.equal(
    "kunci_jawaban" in get(gas, "getQuestions").data[0], false,
  );
  assert.throws(() => assertSafeProjection(loadGas(trueFalseExamState(), projectionMutation)), undefined,
    "mutation D tidak terdeteksi");
  assertSafeProjection(loadGas(trueFalseExamState()));

  const scoringGas = loadGas(baseState());
  const registry = scoringGas.__eval("QUESTION_SCORERS");
  const original = registry.TRUE_FALSE;
  const question = scoreFixture("TRUE_FALSE", '{"1":"BENAR","2":"SALAH"}', 40,
    trueFalsePayload().data_soal);
  try {
    registry.TRUE_FALSE = (q, answer) => original(q, answer) === q.bobot ? q.bobot : 0;
    assert.throws(() => assert.equal(scoringGas.scoreQuestion(question, {
      "1": "BENAR", "2": "BENAR",
    }), 20), undefined, "mutation E tidak terdeteksi");
  } finally {
    registry.TRUE_FALSE = original;
  }
  assert.equal(scoringGas.scoreQuestion(question, { "1": "BENAR", "2": "BENAR" }), 20);
}

console.log("questionBank425: TRUE_FALSE E2E 38 cases + mutations A/D/E PASS");

// ═══════════════════════════════════════════════════════════════════════════
// TASK 4.2.7 — FILL_IN production vertical slice
// ═══════════════════════════════════════════════════════════════════════════

function fillInPayload(overrides) {
  return Object.assign({
    nomor_urut: 2,
    tipe: "FILL_IN",
    pertanyaan: "Apa ibu kota Indonesia?",
    gambar_url: "",
    kunci_jawaban: { accepted_answers: ["Jakarta", "DKI Jakarta"], case_sensitive: false, trim: true },
    bobot: 20,
    kategori: "Mudah",
    id_mapel: "MAPEL_A",
    data_soal: { petunjuk: "<p>Tulis nama kota.</p>" },
  }, overrides || {});
}

function fillInKey(overrides) {
  return Object.assign({ accepted_answers: ["Jakarta"], case_sensitive: false, trim: true }, overrides || {});
}

function fillInRow(id, status, key) {
  return [
    id || "FI1", 1, "FILL_IN", "Apa ibu kota Indonesia?", "", "", "", "", "", "",
    JSON.stringify(key || fillInPayload().kunci_jawaban), 20, "Mudah", "MAPEL_A", status || "AKTIF", "",
    JSON.stringify(fillInPayload().data_soal),
  ];
}

function fillInExamState() {
  const state = baseState();
  state.Questions = [QUESTION_HEADER, fillInRow()];
  state.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""],
  ];
  return state;
}

function historicalFillInState() {
  const state = baseState();
  state.Questions = [QUESTION_HEADER, fillInRow()];
  state.Responses.push([
    new Date(), "S1", "Siswa", "6A", JSON.stringify({ FI1: "Jakarta" }), "100.00", 10, "", "",
  ]);
  return state;
}

// ADMIN validation (1-8): kontrak diterima utuh, bentuk parsial ditolak.
{
  let cases = 0;
  const expectCreate = (payload, success, pattern) => {
    cases++;
    const result = post(loadGas(baseState()), "createQuestion", { data: payload });
    assert.equal(result.success, success, result.message);
    if (pattern) assert.match(result.message, pattern);
  };

  expectCreate(fillInPayload(), true);                                                           // 1
  expectCreate(fillInPayload({ kunci_jawaban: JSON.stringify(fillInKey()) }), true);             // carrier JSON form
  expectCreate(fillInPayload({ kunci_jawaban: { accepted_answers: ["Jakarta"] } }), true);       // flag opsional
  expectCreate(fillInPayload({ data_soal: undefined }), false, /petunjuk/i);                     // 2
  expectCreate(fillInPayload({ data_soal: { petunjuk: "<p>  </p>" } }), false, /Petunjuk/);       // 2
  expectCreate(fillInPayload({ kunci_jawaban: fillInKey({ accepted_answers: [] }) }), false, /minimal/); // 3
  expectCreate(fillInPayload({ kunci_jawaban: fillInKey({ accepted_answers: ["Jakarta", 7] }) }), false, /teks/); // 4
  expectCreate(fillInPayload({ kunci_jawaban: fillInKey({ accepted_answers: ["   "] }) }), false, /kosong/); // 5
  expectCreate(fillInPayload({ data_soal: "rusak" }), false, /petunjuk/i);                       // 6
  expectCreate(fillInPayload({ data_soal: { petunjuk: "x", ekstra: true } }), false, /hanya boleh/); // 6
  expectCreate(fillInPayload({ kunci_jawaban: undefined }), false, /berupa objek/);              // 7
  expectCreate(fillInPayload({ kunci_jawaban: "bukan json" }), false, /berupa objek/);           // 7
  expectCreate(fillInPayload({ kunci_jawaban: fillInKey({ case_sensitive: "ya" }) }), false, /case_sensitive/); // 8
  expectCreate(fillInPayload({ kunci_jawaban: fillInKey({ trim: 1 }) }), false, /trim/);         // 8
  expectCreate(fillInPayload({ kunci_jawaban: fillInKey({ fuzzy: true }) }), false, /hanya boleh/); // 8
  // Duplikat setelah normalisasi ditolak, bukan didedupe diam-diam.
  expectCreate(fillInPayload({ kunci_jawaban: fillInKey({ accepted_answers: ["Jakarta", " jakarta "] }) }),
    false, /duplikat/);
  // Duplikat itu sah ketika case_sensitive aktif — keduanya memang berbeda.
  expectCreate(fillInPayload({ kunci_jawaban: fillInKey({ accepted_answers: ["Jakarta", "jakarta"], case_sensitive: true }) }), true);
  assert.equal(cases, 17);
}

// NORMALIZATION + SCORING (9-13, 30-39) lewat scorer produksi.
{
  const gas = loadGas(baseState());
  let cases = 0;
  const expectScore = (key, answer, expected, message) => {
    cases++;
    assert.equal(
      gas.scoreQuestion(scoreFixture("FILL_IN", JSON.stringify(key), 20, fillInPayload().data_soal), answer),
      expected, message,
    );
  };

  const base = fillInKey({ accepted_answers: ["Jakarta"] });
  expectScore(base, "Jakarta", 20, "exact match wajib penuh");                                   // 30
  expectScore(base, "JAKARTA", 20, "default case-insensitive");                                  // 9/31
  expectScore(base, "  jakarta  ", 20, "default trim");                                          // 10/32
  expectScore(base, "Bandung", 0, "jawaban salah wajib nol");                                    // 33
  expectScore(fillInKey({ accepted_answers: ["Jakarta", "DKI Jakarta"] }), "dki jakarta", 20,
    "salah satu accepted answer cukup");                                                         // 34

  const caseSensitive = fillInKey({ accepted_answers: ["Jakarta"], case_sensitive: true });
  expectScore(caseSensitive, "Jakarta", 20, "case-sensitive tetap menerima bentuk persis");       // 11
  expectScore(caseSensitive, "jakarta", 0, "case-sensitive wajib menolak beda huruf");            // 35
  expectScore(caseSensitive, "  Jakarta  ", 20, "trim tetap berlaku saat case_sensitive");        // 13

  const noTrim = fillInKey({ accepted_answers: ["Jakarta"], trim: false });
  expectScore(noTrim, "Jakarta", 20, "trim=false tetap menerima jawaban persis");                 // 12
  expectScore(noTrim, " Jakarta ", 0, "trim=false wajib menolak spasi ekstra");                   // 36
  expectScore(fillInKey({ accepted_answers: ["Jakarta"], trim: false, case_sensitive: true }), "jakarta ", 0,
    "kombinasi flag tetap exact");                                                                // 13

  // Kunci dan jawaban rusak: nol, tanpa exception.
  expectScore({ accepted_answers: "Jakarta" }, "Jakarta", 0, "accepted_answers bukan array");      // 37
  expectScore({}, "Jakarta", 0, "kunci tanpa accepted_answers");                                   // 37
  expectScore(base, { curang: true }, 0, "jawaban objek bukan string");                            // 38
  expectScore(base, ["Jakarta"], 0, "jawaban array bukan string");                                 // 38
  expectScore(fillInKey({ accepted_answers: ["Jakarta", 5] }), "Jakarta", 20,
    "entri rusak dilewati, entri sah tetap dinilai");                                              // 37
  // Fuzzy/typo/substring tidak pernah benar.
  expectScore(base, "Jakartaa", 0, "typo bukan jawaban benar");                                    // 39
  expectScore(base, "Jakarta Selatan", 0, "superstring bukan jawaban benar");                      // 39
  expectScore(base, "jakar", 0, "substring bukan jawaban benar");                                  // 39
  // Kosong dan whitespace-only tidak pernah penuh.
  expectScore(base, "", 0, "jawaban kosong nol");                                                  // 27
  expectScore(base, "   ", 0, "whitespace-only nol setelah normalisasi");                          // 27
  expectScore(fillInKey({ accepted_answers: ["Jakarta"], trim: false }), "   ", 0,
    "whitespace-only nol walau trim dimatikan");
  assert.equal(cases, 22);

  // Malformed kunci di kolom 11 tidak menggagalkan request submit.
  const malformedState = fillInExamState();
  malformedState.Questions[1][10] = "{bukan json";
  const malformedSubmit = post(loadGas(malformedState), "submitExam", {
    id_siswa: "S1", answers: { FI1: "Jakarta" }, score: 100,
  });
  assert.equal(malformedSubmit.success, true, "kunci rusak tidak boleh membuat submit gagal");
  assert.equal(malformedSubmit.score, "0.00");                                                     // 37
}

// PERSISTENCE + PROJECTION (14-15, 20-26).
{
  const gas = loadGas(baseState());
  const created = post(gas, "createQuestion", {
    data: fillInPayload({ kunci_jawaban: JSON.stringify(fillInPayload().kunci_jawaban) }),
  });
  assert.equal(created.success, true, created.message);
  const row = gas.__sheets.Questions.rows.find((candidate) => candidate[0] === created.id_soal);
  assert.equal(row.length, 17);
  assert.deepEqual(JSON.parse(row[16]), fillInPayload().data_soal);                                // 14
  assert.deepEqual(JSON.parse(row[10]), fillInPayload().kunci_jawaban);                            // 15

  const admin = get(gas, "getAdminQuestions").data.find((q) => q.id_soal === created.id_soal);
  assert.deepEqual(admin.data_soal, fillInPayload().data_soal);
  assert.deepEqual(JSON.parse(admin.kunci_jawaban), fillInPayload().kunci_jawaban);                // 15

  const student = get(gas, "getQuestions").data.find((q) => q.id_soal === created.id_soal);
  assert.equal(student.data_soal.petunjuk, fillInPayload().data_soal.petunjuk);                    // 20
  assert.equal("kunci_jawaban" in student, false);                                                 // 22
  assert.equal("status_soal" in student, false);                                                   // 25
  assert.equal("versi_dari" in student, false);                                                    // 26
  assert.equal(["opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e"].some((f) => f in student), false);
  const serialized = JSON.stringify(student);
  assert.equal(serialized.indexOf("accepted_answers"), -1, "accepted_answers bocor ke siswa");      // 21
  assert.equal(serialized.indexOf("case_sensitive"), -1, "case_sensitive bocor ke siswa");          // 23
  assert.equal(serialized.indexOf("trim"), -1, "trim bocor ke siswa");                              // 24
  assert.equal(serialized.indexOf("Jakarta"), -1, "isi kunci bocor ke siswa");
}

// ANSWER + SUBMIT (27-29): string jawaban lewat autosave dan submit apa adanya.
{
  const saved = post(loadGas(fillInExamState()), "syncAnswers", {
    id_siswa: "S1", answers: { FI1: "  Jakarta " },
  });
  assert.equal(saved.success, true, saved.message);

  const gas = loadGas(fillInExamState());
  post(gas, "syncAnswers", { id_siswa: "S1", answers: { FI1: "  Jakarta " } });
  const stored = gas.__sheets.Users.rows[1][13];
  assert.deepEqual(JSON.parse(stored), { FI1: "  Jakarta " }, "string jawaban dipertahankan apa adanya"); // 28/29

  const submit = (answer) => post(loadGas(fillInExamState()), "submitExam", {
    id_siswa: "S1", answers: { FI1: answer }, score: 100,
  });
  assert.equal(submit("Jakarta").score, "100.00");                                                  // 30
  assert.equal(submit(" dki jakarta ").score, "100.00");                                            // 31/32/34
  assert.equal(submit("Bandung").score, "0.00");                                                    // 33
  assert.equal(submit("").score, "0.00");                                                           // 27
  assert.equal(submit({ curang: true }).score, "0.00");                                             // 38
  assert.equal(gas.__eval("isAnswerFilled")(""), false, "string kosong = belum dijawab");            // 27
  assert.equal(gas.__eval("isAnswerFilled")("Jakarta"), true);                                       // 28
}

// HISTORICAL (40-47): seluruh perubahan isi FILL_IN wajib versioning.
{
  const expectVersion = (payload, expected, message) => {
    const gas = loadGas(historicalFillInState());
    const before = gas.__sheets.Questions.rows[1].slice();
    const result = post(gas, "updateQuestion", { id_soal: "FI1", data: payload });
    assert.equal(result.success, true, result.message);
    assert.equal(result.versioned, expected, message);
    if (expected) {
      assert.equal(gas.__sheets.Questions.rows.length, 3);
      assert.equal(gas.__sheets.Questions.rows[1][14], "ARSIP");
      assert.deepEqual(gas.__sheets.Questions.rows[1].slice(0, 14), before.slice(0, 14),
        "baris historis wajib immutable");
      assert.deepEqual(gas.__sheets.Questions.rows[1][16], before[16]);
    } else {
      assert.equal(gas.__sheets.Questions.rows.length, 2);
    }
  };
  const current = fillInPayload({ nomor_urut: 1 });

  expectVersion(fillInPayload({ nomor_urut: 1, data_soal: { petunjuk: "<p>Petunjuk baru.</p>" } }),
    true, "ubah petunjuk wajib versioning");                                                         // 40
  expectVersion(fillInPayload({ nomor_urut: 1, kunci_jawaban: fillInKey({ accepted_answers: ["Bandung"] }) }),
    true, "ubah accepted answer wajib versioning");                                                  // 41
  expectVersion(fillInPayload({ nomor_urut: 1, kunci_jawaban: fillInKey({
    accepted_answers: ["Jakarta", "DKI Jakarta", "Batavia"],
  }) }), true, "tambah accepted answer wajib versioning");                                            // 42
  expectVersion(fillInPayload({ nomor_urut: 1, kunci_jawaban: fillInKey({ accepted_answers: ["Jakarta"] }) }),
    true, "hapus accepted answer wajib versioning");                                                  // 43
  expectVersion(fillInPayload({ nomor_urut: 1, kunci_jawaban: Object.assign({}, fillInPayload().kunci_jawaban, {
    case_sensitive: true,
  }) }), true, "ubah case_sensitive wajib versioning");                                               // 44
  expectVersion(fillInPayload({ nomor_urut: 1, kunci_jawaban: Object.assign({}, fillInPayload().kunci_jawaban, {
    trim: false,
  }) }), true, "ubah trim wajib versioning");                                                         // 45
  expectVersion(fillInPayload({ nomor_urut: 9 }), false, "nomor-only harus in-place");                // 46
  expectVersion(current, false, "no-op tidak boleh membuat versi");                                   // 47
  // Urutan kunci JSON berbeda bukan perubahan isi.
  expectVersion(fillInPayload({ nomor_urut: 1, kunci_jawaban: {
    trim: true, case_sensitive: false, accepted_answers: ["Jakarta", "DKI Jakarta"],
  } }), false, "urutan field kunci bukan perubahan isi");                                             // 47
}

// FEATURE GATE + REGRESI (48-53).
{
  const gas = loadGas(baseState());
  assert.equal(post(gas, "createQuestion", { data: fillInPayload() }).success, true);                 // 48
  assert.equal(post(gas, "createQuestion", { data: trueFalsePayload() }).success, true);              // 50
  assert.equal(post(gas, "createQuestion", { data: validSingle }).success, true);                     // 51
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, {
    tipe: "COMPLEX", kunci_jawaban: "A,C",
  }) }).success, true);                                                                                // 52
  // MATCHING diaktifkan pada Task 4.2.6 recovery; tipe di luar model tetap ditolak.
  for (const tipe of ["ESSAY"]) {
    const result = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { tipe }) });
    assert.equal(result.success, false, tipe + " tidak boleh ikut aktif");                             // 49/53
  }
  assert.deepEqual(
    Array.from(gas.__eval("VALID_QUESTION_TYPES")),
    ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"],
    "whitelist tipe menyimpang dari scope task",
  );

  // Regresi scoring tipe lain tidak berubah oleh normalisasi FILL_IN.
  assert.equal(gas.scoreQuestion(scoreFixture("SINGLE", "B", 10, null), "B"), 10);                      // 51
  assert.equal(gas.scoreQuestion(scoreFixture("SINGLE", "B", 10, null), "b"), 0,
    "SINGLE tetap case-sensitive seperti sebelumnya");
  assert.equal(gas.scoreQuestion(scoreFixture("COMPLEX", "A,C", 10, null), ["C", "A"]), 10);           // 52
  assert.equal(gas.scoreQuestion(
    scoreFixture("TRUE_FALSE", '{"1":"BENAR","2":"SALAH"}', 40, trueFalsePayload().data_soal),
    { "1": "BENAR", "2": "BENAR" },
  ), 20);                                                                                              // 50
}

// MUTATION A/D/F/G/H: whitelist, projection, exact match, full/0, empty answer.
{
  const valid = fillInPayload();

  // A. FILL_IN dicabut dari whitelist → admin test gagal.
  const whitelistMutation = (source) => {
    const mutated = source.replace(
      'const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"];',
      'const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE"];',
    );
    assert.notEqual(mutated, source, "titik mutation A tidak ditemukan");
    return mutated;
  };
  assert.throws(() => assert.equal(
    post(loadGas(baseState(), whitelistMutation), "createQuestion", { data: valid }).success, true,
  ), undefined, "mutation A tidak terdeteksi");
  assert.equal(post(loadGas(baseState()), "createQuestion", { data: valid }).success, true);

  // B/D. Kunci FILL_IN (accepted_answers + flag) bocor ke proyeksi siswa.
  const projectionMutation = (source) => {
    const mutated = source.replace("    if (skipMapelFilter) {", "    if (true) {");
    assert.notEqual(mutated, source, "titik mutation B tidak ditemukan");
    return mutated;
  };
  const assertNoKeyLeak = (gas) => {
    const student = get(gas, "getQuestions").data[0];
    assert.equal(JSON.stringify(student).indexOf("accepted_answers"), -1);
  };
  assert.throws(() => assertNoKeyLeak(loadGas(fillInExamState(), projectionMutation)), undefined,
    "mutation B tidak terdeteksi");
  assertNoKeyLeak(loadGas(fillInExamState()));

  const scoringGas = loadGas(baseState());
  const registry = scoringGas.__eval("QUESTION_SCORERS");
  const original = registry.FILL_IN;
  const question = (key) => scoreFixture("FILL_IN", JSON.stringify(key), 20, fillInPayload().data_soal);

  try {
    // D. case_sensitive=false diabaikan → normalisasi case gagal.
    registry.FILL_IN = (q, answer) => {
      const key = JSON.parse(q.kunci_jawaban);
      return key.accepted_answers.indexOf(String(answer).trim()) !== -1 ? q.bobot : 0;
    };
    assert.throws(() => assert.equal(scoringGas.scoreQuestion(question(fillInKey()), "JAKARTA"), 20),
      undefined, "mutation D tidak terdeteksi");

    // E. Flag trim diabaikan → test trim gagal.
    registry.FILL_IN = (q, answer) => {
      const key = JSON.parse(q.kunci_jawaban);
      return key.accepted_answers.some((value) => value.toLowerCase() === String(answer).toLowerCase())
        ? q.bobot : 0;
    };
    assert.throws(() => assert.equal(scoringGas.scoreQuestion(question(fillInKey()), " jakarta "), 20),
      undefined, "mutation E tidak terdeteksi");

    // F. Exact match diganti contains → jawaban salah ikut bernilai penuh.
    registry.FILL_IN = (q, answer) => {
      const key = JSON.parse(q.kunci_jawaban);
      return key.accepted_answers.some((value) =>
        String(answer).toLowerCase().indexOf(value.toLowerCase()) !== -1) ? q.bobot : 0;
    };
    assert.throws(() => assert.equal(scoringGas.scoreQuestion(question(fillInKey()), "Jakarta Selatan"), 0),
      undefined, "mutation F tidak terdeteksi");

    // G. Full/0 diganti partial → skor parsial lolos.
    registry.FILL_IN = (q, answer) => (original(q, answer) === q.bobot ? q.bobot : q.bobot / 2);
    assert.throws(() => assert.equal(scoringGas.scoreQuestion(question(fillInKey()), "Bandung"), 0),
      undefined, "mutation G tidak terdeteksi");

    // H. Jawaban kosong setelah normalisasi bernilai penuh. Diuji langsung pada
    // scorer: scoreQuestion sudah menyaringnya lebih dulu lewat isAnswerFilled,
    // jadi lapisan scorer harus punya penolakannya sendiri.
    registry.FILL_IN = (q, answer) => (String(answer).trim() === "" ? q.bobot : original(q, answer));
    assert.throws(() => assert.equal(registry.FILL_IN(question(fillInKey()), "   "), 0),
      undefined, "mutation H tidak terdeteksi");
  } finally {
    registry.FILL_IN = original;
  }

  // Implementasi asli: seluruh assertion di atas kembali benar.
  assert.equal(scoringGas.scoreQuestion(question(fillInKey()), "JAKARTA"), 20);
  assert.equal(scoringGas.scoreQuestion(question(fillInKey()), " jakarta "), 20);
  assert.equal(scoringGas.scoreQuestion(question(fillInKey()), "Jakarta Selatan"), 0);
  assert.equal(scoringGas.scoreQuestion(question(fillInKey()), "Bandung"), 0);
  assert.equal(scoringGas.scoreQuestion(question(fillInKey()), "   "), 0);
  assert.equal(scoringGas.__eval("scoreFillIn")(question(fillInKey()), "   "), 0,
    "scorer sendiri wajib menolak jawaban kosong, bukan hanya isAnswerFilled");
}

console.log("questionBank427: FILL_IN E2E 53 cases + mutations A/B/D/E/F/G/H PASS");

// ═══════════════════════════════════════════════════════════════════════════
// TASK 4.2.6 RECOVERY — MATCHING production vertical slice
// ═══════════════════════════════════════════════════════════════════════════

function matchingData(overrides) {
  return Object.assign({
    kiri: [
      { id: "1", teks: "Jakarta" },
      { id: "2", teks: "Bandung" },
    ],
    kanan: [
      { id: "A", teks: "Jawa Barat" },
      { id: "B", teks: "DKI Jakarta" },
    ],
  }, overrides || {});
}

function matchingPayload(overrides) {
  return Object.assign({
    nomor_urut: 2,
    tipe: "MATCHING",
    pertanyaan: "Jodohkan kota dengan provinsinya",
    gambar_url: "",
    kunci_jawaban: { "1": "B", "2": "A" },
    bobot: 40,
    kategori: "Sedang",
    id_mapel: "MAPEL_A",
    data_soal: matchingData(),
  }, overrides || {});
}

function matchingRow(id, status) {
  return [
    id || "MT1", 1, "MATCHING", "Jodohkan kota dengan provinsinya", "", "", "", "", "", "",
    '{"1":"B","2":"A"}', 40, "Sedang", "MAPEL_A", status || "AKTIF", "",
    JSON.stringify(matchingData()),
  ];
}

function matchingExamState() {
  const state = baseState();
  state.Questions = [QUESTION_HEADER, matchingRow()];
  state.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""],
  ];
  return state;
}

function historicalMatchingState() {
  const state = baseState();
  state.Questions = [QUESTION_HEADER, matchingRow()];
  state.Responses.push([
    new Date(), "S1", "Siswa", "6A", JSON.stringify({ MT1: { "1": "B", "2": "A" } }), "100.00", 10, "", "",
  ]);
  return state;
}

// ADMIN validation (1-11).
{
  let cases = 0;
  const expectCreate = (payload, success, pattern) => {
    cases++;
    const result = post(loadGas(baseState()), "createQuestion", { data: payload });
    assert.equal(result.success, success, result.message);
    if (pattern) assert.match(result.message, pattern);
  };

  expectCreate(matchingPayload(), true);                                                          // 1
  expectCreate(matchingPayload({ kunci_jawaban: '{"1":"B","2":"A"}' }), true);                     // carrier JSON form
  // Jumlah kiri dan kanan tidak wajib sama.
  expectCreate(matchingPayload({
    data_soal: matchingData({ kanan: [
      { id: "A", teks: "Jawa Barat" }, { id: "B", teks: "DKI Jakarta" }, { id: "C", teks: "Jawa Timur" },
    ] }),
  }), true);
  expectCreate(matchingPayload({ data_soal: matchingData({ kiri: [] }) }), false, /kiri/);         // 2
  expectCreate(matchingPayload({ data_soal: matchingData({ kanan: [] }) }), false, /kanan/);       // 3
  expectCreate(matchingPayload({ data_soal: matchingData({ kiri: [
    { id: "1", teks: "Jakarta" }, { id: "1", teks: "Bandung" },
  ] }) }), false, /unik/);                                                                          // 4
  expectCreate(matchingPayload({
    data_soal: matchingData({ kanan: [{ id: "A", teks: "x" }, { id: "A", teks: "y" }] }),
    kunci_jawaban: { "1": "A", "2": "A" },
  }), false, /unik/);                                                                               // 5
  expectCreate(matchingPayload({ data_soal: matchingData({ kiri: [
    { id: "1", teks: "<p> </p>" }, { id: "2", teks: "Bandung" },
  ] }) }), false, /teks/);                                                                           // 6
  expectCreate(matchingPayload({ data_soal: matchingData({ kanan: [
    { id: "A", teks: "" }, { id: "B", teks: "DKI Jakarta" },
  ] }) }), false, /teks/);                                                                           // 7
  expectCreate(matchingPayload({ kunci_jawaban: { "1": "B" } }), false, /seluruh item kiri/);       // 8
  expectCreate(matchingPayload({ kunci_jawaban: { "1": "B", "2": "A", "3": "A" } }), false,
    /seluruh item kiri|item kiri yang tidak ada/);                                                  // 9
  expectCreate(matchingPayload({ kunci_jawaban: { "1": "B", "2": "Z" } }), false,
    /item kanan yang tidak ada/);                                                                   // 10
  expectCreate(matchingPayload({ data_soal: "rusak" }), false, /daftar kiri dan kanan/);            // 11
  expectCreate(matchingPayload({ data_soal: { kiri: matchingData().kiri } }), false, /daftar kiri dan kanan/); // 11
  expectCreate(matchingPayload({ data_soal: matchingData({ ekstra: true }) }), false, /hanya boleh/); // 11
  expectCreate(matchingPayload({ data_soal: matchingData({ kiri: [{ teks: "tanpa id" }] }) }), false, /id/i);
  expectCreate(matchingPayload({ kunci_jawaban: undefined }), false, /berupa objek/);
  expectCreate(matchingPayload({ kunci_jawaban: { "1": "B", "2": 7 } }), false, /item kanan yang tidak ada/);
  // ID kiri dan kanan hidup di ruang nama terpisah.
  expectCreate(matchingPayload({
    data_soal: { kiri: [{ id: "A", teks: "Jakarta" }], kanan: [{ id: "A", teks: "DKI Jakarta" }] },
    kunci_jawaban: { A: "A" },
  }), true);
  assert.equal(cases, 19);

  // Payload ditolak tidak boleh meninggalkan baris separuh jadi.
  const gas = loadGas(baseState());
  const before = gas.__sheets.Questions.rows.length;
  post(gas, "createQuestion", { data: matchingPayload({ kunci_jawaban: { "1": "Z", "2": "A" } }) });
  assert.equal(gas.__sheets.Questions.rows.length, before, "payload invalid tidak boleh tersimpan sebagian");
}

// PERSISTENCE + PROJECTION (12-13, 18-23).
{
  const gas = loadGas(baseState());
  const created = post(gas, "createQuestion", { data: matchingPayload({
    kunci_jawaban: '{"1":"B","2":"A"}',
  }) });
  assert.equal(created.success, true, created.message);

  const row = gas.__sheets.Questions.rows.find((candidate) => candidate[0] === created.id_soal);
  assert.equal(row.length, 17, "kolom 1-16 tidak bergeser");
  assert.deepEqual(JSON.parse(row[16]), matchingData());                                           // 12
  assert.deepEqual(JSON.parse(row[10]), { "1": "B", "2": "A" });                                   // 13

  const admin = get(gas, "getAdminQuestions").data.find((q) => q.id_soal === created.id_soal);
  assert.deepEqual(admin.data_soal, matchingData());
  assert.deepEqual(JSON.parse(admin.kunci_jawaban), { "1": "B", "2": "A" });

  const student = get(gas, "getQuestions").data.find((q) => q.id_soal === created.id_soal);
  assert.deepEqual(student.data_soal.kiri, matchingData().kiri);                                   // 18
  assert.deepEqual(student.data_soal.kanan, matchingData().kanan);                                 // 19
  assert.equal("kunci_jawaban" in student, false);                                                  // 20
  assert.equal("status_soal" in student, false);                                                    // 21
  assert.equal("versi_dari" in student, false);                                                     // 22
  assert.equal(["opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e"].some((f) => f in student), false);
  assert.equal(
    Object.keys(student).every((field) => contract.student_fields.includes(field)), true,
    "proyeksi MATCHING memuat field di luar allowlist",
  );
  // Mapping kunci tidak boleh terbaca dari payload siswa.
  assert.equal(JSON.stringify(student).indexOf('"1":"B"'), -1, "mapping kunci bocor ke siswa");

  // Regresi tipe lain pada sheet yang sama (14-17).
  assert.equal(post(gas, "createQuestion", { data: validSingle }).success, true);                   // 14
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, {
    tipe: "COMPLEX", kunci_jawaban: "A,C", nomor_urut: 4,
  }) }).success, true);                                                                              // 15
  assert.equal(post(gas, "createQuestion", { data: trueFalsePayload({ nomor_urut: 5 }) }).success, true); // 16
  const fillInCreated = post(gas, "createQuestion", { data: fillInPayload({ nomor_urut: 6 }) });
  assert.equal(fillInCreated.success, true, fillInCreated.message);                                  // 17
  const fillInStudent = get(gas, "getQuestions").data.find((q) => q.id_soal === fillInCreated.id_soal);
  assert.equal(JSON.stringify(fillInStudent).indexOf("accepted_answers"), -1,
    "accepted_answers FILL_IN bocor setelah MATCHING aktif");                                        // 23
}

// SCORING (29-33) memakai scorer 4.2.4, berbasis ID canonical.
{
  const gas = loadGas(baseState());
  let cases = 0;
  const question = (key, data) => scoreFixture("MATCHING", JSON.stringify(key || { "1": "B", "2": "A" }),
    40, data || matchingData());
  const expectScore = (answer, expected, message, key, data) => {
    cases++;
    assert.equal(gas.scoreQuestion(question(key, data), answer), expected, message);
  };

  expectScore({ "1": "B", "2": "A" }, 40, "semua pasangan benar");                                  // 29
  expectScore({ "1": "B", "2": "B" }, 20, "separuh benar");                                         // 30
  expectScore({ "1": "A", "2": "B" }, 0, "semua salah");                                            // 31
  expectScore({ "1": "B" }, 20, "parsial: hanya pasangan terisi yang dinilai");                      // 32
  expectScore({ "1": "B", "2": "" }, 20, "pasangan kosong tidak menambah skor");                     // 32
  expectScore({}, 0, "tanpa pasangan = 0");                                                          // 32
  expectScore({ "1": "Z", "2": "A" }, 20, "tujuan tidak dikenal tidak mendapat skor");               // 33
  expectScore({ "1": "B", "2": {} }, 20, "nilai rusak = 0 untuk pasangan itu");                      // 33
  expectScore("bukan-object", 0, "jawaban bukan object tidak crash");                                // 33
  expectScore(["B", "A"], 0, "array bukan bentuk jawaban MATCHING");                                 // 33
  // Kunci yang menunjuk id kanan tak dikenal tidak pernah menghasilkan skor palsu.
  expectScore({ "1": "Z" }, 0, "kunci rusak tidak memberi skor", { "1": "Z", "2": "A" });
  // Teks tidak pernah jadi dasar perbandingan.
  expectScore({ "1": "DKI Jakarta", "2": "Jawa Barat" }, 0, "perbandingan wajib memakai ID, bukan teks");
  // Urutan array tidak menentukan kebenaran: ID yang menentukan.
  expectScore({ "1": "B", "2": "A" }, 40, "urutan daftar tidak mengubah arti ID", undefined,
    matchingData({ kanan: [{ id: "B", teks: "DKI Jakarta" }, { id: "A", teks: "Jawa Barat" }] }));
  assert.equal(cases, 13);

  // Submit end-to-end memakai scorer yang sama.
  const submit = (answer) => post(loadGas(matchingExamState()), "submitExam", {
    id_siswa: "S1", answers: { MT1: answer }, score: 100,
  });
  assert.equal(submit({ "1": "B", "2": "A" }).score, "100.00");
  assert.equal(submit({ "1": "B" }).score, "50.00");
  assert.equal(submit({ "1": "A", "2": "B" }).score, "0.00");
  assert.equal(submit("rusak").score, "0.00");

  // Kunci rusak di kolom 11 tidak menggagalkan submit.
  const malformed = matchingExamState();
  malformed.Questions[1][10] = "{bukan json";
  const malformedSubmit = post(loadGas(malformed), "submitExam", {
    id_siswa: "S1", answers: { MT1: { "1": "B" } }, score: 100,
  });
  assert.equal(malformedSubmit.success, true, "kunci rusak tidak boleh menggagalkan submit");
  assert.equal(malformedSubmit.score, "0.00");
}

// ANSWER + AUTOSAVE/RECOVERY (24-28).
{
  const gas = loadGas(matchingExamState());
  const partial = { "1": "B" };
  assert.equal(gas.__eval("isAnswerFilled")({}), false, "objek kosong = belum dijawab");            // 24
  assert.equal(gas.__eval("isAnswerFilled")(partial), true, "pasangan parsial tetap terisi");        // 25

  const saved = post(gas, "syncAnswers", { id_siswa: "S1", answers: { MT1: partial } });
  assert.equal(saved.success, true, saved.message);
  assert.deepEqual(JSON.parse(gas.__sheets.Users.rows[1][13]), { MT1: partial },
    "pasangan parsial tersimpan apa adanya");                                                        // 25/28

  const full = { "1": "B", "2": "A" };
  post(gas, "syncAnswers", { id_siswa: "S1", answers: { MT1: full } });
  assert.deepEqual(JSON.parse(gas.__sheets.Users.rows[1][13]), { MT1: full });                        // 26

  // Tujuan tidak dikenal tetap tersimpan tanpa error; scoring yang menolaknya.
  const stray = { "1": "Z" };
  post(gas, "syncAnswers", { id_siswa: "S1", answers: { MT1: stray } });
  assert.deepEqual(JSON.parse(gas.__sheets.Users.rows[1][13]), { MT1: stray });                       // 27
  assert.equal(gas.scoreQuestion(
    scoreFixture("MATCHING", '{"1":"B","2":"A"}', 40, matchingData()), stray,
  ), 0);                                                                                              // 27

  // Login mengembalikan jawaban tersimpan (jalur recovery existing).
  const recoveryState = matchingExamState();
  recoveryState.Users[1][5] = false;
  recoveryState.Users[1][13] = JSON.stringify({ MT1: partial });
  const recovered = post(loadGas(recoveryState), "login", { username: "siswa", password: "pw" });
  assert.equal(recovered.success, true, recovered.message);
  assert.deepEqual(recovered.data.saved_answers, { MT1: partial }, "recovery mengembalikan objek sama"); // 28
}

// HISTORICAL (34-42).
{
  const expectVersion = (payload, expected, message) => {
    const gas = loadGas(historicalMatchingState());
    const before = gas.__sheets.Questions.rows[1].slice();
    const result = post(gas, "updateQuestion", { id_soal: "MT1", data: payload });
    assert.equal(result.success, true, result.message);
    assert.equal(result.versioned, expected, message);
    if (expected) {
      assert.equal(gas.__sheets.Questions.rows.length, 3);
      assert.equal(gas.__sheets.Questions.rows[1][14], "ARSIP");
      assert.deepEqual(gas.__sheets.Questions.rows[1].slice(0, 14), before.slice(0, 14),
        "baris historis wajib immutable");
      assert.equal(gas.__sheets.Questions.rows[1][16], before[16]);
    } else {
      assert.equal(gas.__sheets.Questions.rows.length, 2);
    }
  };

  expectVersion(matchingPayload({ nomor_urut: 1, data_soal: matchingData({ kiri: [
    { id: "1", teks: "Kota Jakarta" }, { id: "2", teks: "Bandung" },
  ] }) }), true, "ubah teks kiri wajib versioning");                                                 // 34
  expectVersion(matchingPayload({ nomor_urut: 1, data_soal: matchingData({ kanan: [
    { id: "A", teks: "Provinsi Jawa Barat" }, { id: "B", teks: "DKI Jakarta" },
  ] }) }), true, "ubah teks kanan wajib versioning");                                                // 35
  expectVersion(matchingPayload({ nomor_urut: 1, kunci_jawaban: { "1": "A", "2": "B" } }), true,
    "ubah mapping wajib versioning");                                                                // 36
  expectVersion(matchingPayload({ nomor_urut: 1, data_soal: matchingData({ kiri: [
    ...matchingData().kiri, { id: "3", teks: "Surabaya" },
  ] }), kunci_jawaban: { "1": "B", "2": "A", "3": "A" } }), true, "tambah kiri wajib versioning");   // 37
  expectVersion(matchingPayload({ nomor_urut: 1, data_soal: matchingData({ kanan: [
    ...matchingData().kanan, { id: "C", teks: "Jawa Timur" },
  ] }) }), true, "tambah kanan wajib versioning");                                                   // 38
  expectVersion(matchingPayload({ nomor_urut: 1, data_soal: matchingData({
    kiri: [{ id: "1", teks: "Jakarta" }],
  }), kunci_jawaban: { "1": "B" } }), true, "hapus kiri wajib versioning");                          // 39
  expectVersion(matchingPayload({ nomor_urut: 1, data_soal: matchingData({
    kanan: [{ id: "B", teks: "DKI Jakarta" }],
  }), kunci_jawaban: { "1": "B", "2": "B" } }), true, "hapus kanan wajib versioning");               // 40
  expectVersion(matchingPayload({ nomor_urut: 9 }), false, "nomor-only harus in-place");             // 41
  expectVersion(matchingPayload({ nomor_urut: 1 }), false, "no-op tidak boleh membuat versi");       // 42
  // Urutan field kunci JSON bukan perubahan isi.
  expectVersion(matchingPayload({ nomor_urut: 1, kunci_jawaban: { "2": "A", "1": "B" } }), false,
    "urutan field kunci bukan perubahan isi");                                                       // 42
}

// FEATURE GATE (43-48) — seluruh whitelist konsisten dengan kontrak.
{
  const gas = loadGas(baseState());
  assert.equal(post(gas, "createQuestion", { data: matchingPayload() }).success, true);              // 43
  assert.equal(post(gas, "createQuestion", { data: fillInPayload({ nomor_urut: 3 }) }).success, true); // 44
  assert.equal(post(gas, "createQuestion", { data: trueFalsePayload({ nomor_urut: 4 }) }).success, true); // 45
  assert.equal(post(gas, "createQuestion", { data: validSingle }).success, true);                     // 46
  assert.equal(post(gas, "createQuestion", { data: Object.assign({}, validSingle, {
    tipe: "COMPLEX", kunci_jawaban: "A,C", nomor_urut: 6,
  }) }).success, true);                                                                                // 47
  for (const tipe of ["ESSAY", "DRAG_DROP", ""]) {
    const result = post(gas, "createQuestion", { data: Object.assign({}, validSingle, { tipe }) });
    assert.equal(result.success, false, "tipe " + tipe + " tidak boleh aktif");                        // 48
    assert.match(result.message, /tidak dikenal/);
  }
  assert.deepEqual(
    Array.from(gas.__eval("VALID_QUESTION_TYPES")),
    ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"],
  );
  assert.deepEqual(
    Array.from(gas.__eval("VALID_QUESTION_TYPES")).sort(),
    contract.types_implemented.slice().sort(),
    "whitelist GAS menyimpang dari kontrak bersama",
  );
  assert.deepEqual(
    Object.keys(gas.__eval("QUESTION_TYPE_VALIDATORS")).sort(),
    contract.types_implemented.slice().sort(),
    "tabel validator tidak menutupi seluruh tipe aktif",
  );
  assert.deepEqual(
    Array.from(gas.__eval("STRUCTURED_KEY_TYPES")).sort(),
    ["FILL_IN", "MATCHING", "TRUE_FALSE"],
  );
}

// MUTATION A/B/D/E/G.
{
  const valid = matchingPayload();

  // A. MATCHING dicabut dari whitelist.
  const whitelistMutation = (source) => {
    const mutated = source.replace(
      'const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"];',
      'const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "FILL_IN"];',
    );
    assert.notEqual(mutated, source, "titik mutation A tidak ditemukan");
    return mutated;
  };
  assert.throws(() => assert.equal(
    post(loadGas(baseState(), whitelistMutation), "createQuestion", { data: valid }).success, true,
  ), undefined, "mutation A tidak terdeteksi");
  assert.equal(post(loadGas(baseState()), "createQuestion", { data: valid }).success, true);

  // B. Mapping kunci bocor ke proyeksi siswa.
  const projectionMutation = (source) => {
    const mutated = source.replace("    if (skipMapelFilter) {", "    if (true) {");
    assert.notEqual(mutated, source, "titik mutation B tidak ditemukan");
    return mutated;
  };
  const assertNoKeyLeak = (gas) => {
    const student = get(gas, "getQuestions").data[0];
    assert.equal("kunci_jawaban" in student, false);
    assert.equal(JSON.stringify(student).indexOf('"1":"B"'), -1);
  };
  assert.throws(() => assertNoKeyLeak(loadGas(matchingExamState(), projectionMutation)), undefined,
    "mutation B tidak terdeteksi");
  assertNoKeyLeak(loadGas(matchingExamState()));

  const scoringGas = loadGas(baseState());
  const registry = scoringGas.__eval("QUESTION_SCORERS");
  const original = registry.MATCHING;
  const question = scoreFixture("MATCHING", '{"1":"B","2":"A"}', 40, matchingData());

  try {
    // D. Perbandingan memakai teks, bukan ID.
    registry.MATCHING = (q, answer) => {
      const key = JSON.parse(q.kunci_jawaban);
      const rightText = Object.create(null);
      for (const right of q.data_soal.kanan) rightText[right.id] = right.teks;
      let correct = 0;
      for (const left of q.data_soal.kiri) {
        if (answer[left.id] === rightText[key[left.id]]) correct++;
      }
      return q.bobot * correct / q.data_soal.kiri.length;
    };
    assert.throws(() => assert.equal(scoringGas.scoreQuestion(question, { "1": "B", "2": "A" }), 40),
      undefined, "mutation D tidak terdeteksi");

    // E. Partial diganti all-or-nothing.
    registry.MATCHING = (q, answer) => (original(q, answer) === q.bobot ? q.bobot : 0);
    assert.throws(() => assert.equal(scoringGas.scoreQuestion(question, { "1": "B", "2": "B" }), 20),
      undefined, "mutation E tidak terdeteksi");

    // G. Posisi array dipakai sebagai identitas: item kiri ke-i dianggap
    // berpasangan dengan item kanan ke-i, bukan dengan ID dari kunci.
    registry.MATCHING = (q, answer) => {
      let correct = 0;
      for (let i = 0; i < q.data_soal.kiri.length; i++) {
        const expected = q.data_soal.kanan[i];
        if (expected && answer[q.data_soal.kiri[i].id] === expected.id) correct++;
      }
      return q.bobot * correct / q.data_soal.kiri.length;
    };
    assert.throws(() => assert.equal(
      scoringGas.scoreQuestion(question, { "1": "B", "2": "A" }), 40,
    ), undefined, "mutation G tidak terdeteksi");
  } finally {
    registry.MATCHING = original;
  }

  assert.equal(scoringGas.scoreQuestion(question, { "1": "B", "2": "A" }), 40);
  assert.equal(scoringGas.scoreQuestion(question, { "1": "B", "2": "B" }), 20);
  assert.equal(scoringGas.scoreQuestion(question, { "2": "A", "1": "B" }), 40,
    "urutan properti jawaban tidak boleh mengubah skor");
  assert.equal(scoringGas.scoreQuestion(question, { "1": "DKI Jakarta", "2": "Jawa Barat" }), 0);
}

console.log("questionBank426: MATCHING E2E 48 cases + mutations A/B/D/E/G PASS");

// Soal canonical untuk scorer, dibangun dari payload admin per tipe.
function scoringQuestionFixtureFor(tipe, payload) {
  return scoreFixture(tipe, typeof payload.kunci_jawaban === "string"
    ? payload.kunci_jawaban
    : JSON.stringify(payload.kunci_jawaban), payload.bobot, payload.data_soal || null);
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK 4.3 — Audit & hardening lintas 5 tipe
// ═══════════════════════════════════════════════════════════════════════════

// Satu payload sah per tipe aktif, dipakai ulang di seluruh matrix di bawah.
const TYPE_FIXTURES = {
  SINGLE: () => Object.assign({}, validSingle, { nomor_urut: 1 }),
  COMPLEX: () => Object.assign({}, validSingle, { nomor_urut: 1, tipe: "COMPLEX", kunci_jawaban: "A,C" }),
  TRUE_FALSE: () => trueFalsePayload({ nomor_urut: 1 }),
  MATCHING: () => matchingPayload({ nomor_urut: 1 }),
  FILL_IN: () => fillInPayload({ nomor_urut: 1 }),
};
const ACTIVE_TYPES = Object.keys(TYPE_FIXTURES);

// Jawaban benar penuh dan jawaban salah per tipe, untuk matrix scoring/recovery.
const TYPE_ANSWERS = {
  SINGLE: { correct: "B", wrong: "A", shape: "string" },
  COMPLEX: { correct: ["A", "C"], wrong: ["A"], shape: "array" },
  TRUE_FALSE: { correct: { "1": "BENAR", "2": "SALAH" }, wrong: { "1": "SALAH", "2": "BENAR" }, shape: "object" },
  MATCHING: { correct: { "1": "B", "2": "A" }, wrong: { "1": "A", "2": "B" }, shape: "object" },
  FILL_IN: { correct: "Jakarta", wrong: "Bandung", shape: "string" },
};

// ── MATRIX: create + persistence round-trip + projection untuk 5 tipe ───────
{
  assert.deepEqual(ACTIVE_TYPES.slice().sort(), contract.types_implemented.slice().sort(),
    "fixture matrix tidak menutupi seluruh tipe aktif");

  for (const tipe of ACTIVE_TYPES) {
    const gas = loadGas(baseState());
    const payload = TYPE_FIXTURES[tipe]();
    const created = post(gas, "createQuestion", { data: payload });
    assert.equal(created.success, true, tipe + " gagal dibuat: " + created.message);

    const row = gas.__sheets.Questions.rows.find((candidate) => candidate[0] === created.id_soal);
    assert.equal(row.length, 17, tipe + ": baris wajib 17 kolom");
    assert.equal(row[2], tipe, tipe + ": kolom tipe bergeser");
    assert.equal(String(row[14]), "AKTIF", tipe + ": status_soal bukan AKTIF");

    // Isi terstruktur hanya untuk tipe yang memang punya data_soal.
    const structured = tipe === "TRUE_FALSE" || tipe === "MATCHING" || tipe === "FILL_IN";
    assert.equal(row[16] !== "", structured, tipe + ": isi kolom 17 tidak sesuai tipe");
    if (structured) assert.deepEqual(JSON.parse(row[16]), payload.data_soal, tipe + ": data_soal round-trip rusak");

    // Kunci: legacy huruf untuk SINGLE/COMPLEX, JSON untuk tipe terstruktur.
    if (tipe === "SINGLE" || tipe === "COMPLEX") {
      assert.equal(row[10], payload.kunci_jawaban, tipe + ": kunci legacy berubah bentuk");
    } else {
      assert.deepEqual(JSON.parse(row[10]), payload.kunci_jawaban, tipe + ": kunci JSON round-trip rusak");
    }

    // Admin melihat kunci; siswa tidak pernah.
    const admin = get(gas, "getAdminQuestions").data.find((q) => q.id_soal === created.id_soal);
    assert.equal(admin.tipe, tipe);
    assert.ok(admin.kunci_jawaban, tipe + ": admin kehilangan kunci");

    const student = get(gas, "getQuestions").data.find((q) => q.id_soal === created.id_soal);
    assert.ok(student, tipe + ": soal hilang dari daftar siswa");
    for (const forbidden of contract.admin_only_fields) {
      assert.equal(forbidden in student, false, tipe + ": field admin " + forbidden + " bocor");
    }
    assert.equal(Object.keys(student).every((f) => contract.student_fields.includes(f)), true,
      tipe + ": proyeksi memuat field di luar allowlist");
    // Opsi A-E hanya milik tipe pilihan; tipe lain tidak boleh dikonversi ke sana.
    const hasOptions = ["opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e"].some((f) => f in student);
    assert.equal(hasOptions, tipe === "SINGLE" || tipe === "COMPLEX", tipe + ": bentuk opsi legacy salah");

    // Serialized payload siswa tidak boleh memuat isi kunci apa pun.
    const serialized = JSON.stringify(student);
    for (const secret of ['"kunci_jawaban"', "accepted_answers", "case_sensitive", '"trim"', '"1":"BENAR"', '"1":"B"']) {
      assert.equal(serialized.indexOf(secret), -1, tipe + ": rahasia " + secret + " bocor ke siswa");
    }
    if (tipe === "SINGLE" || tipe === "COMPLEX") {
      assert.equal(serialized.indexOf('"A,C"'), -1, tipe + ": kunci legacy bocor ke siswa");
    }
  }
}

// ── MATRIX: scoring + submit + recovery shape untuk 5 tipe ─────────────────
{
  const gas = loadGas(baseState());
  for (const tipe of ACTIVE_TYPES) {
    const payload = TYPE_FIXTURES[tipe]();
    const answers = TYPE_ANSWERS[tipe];
    const question = scoringQuestionFixtureFor(tipe, payload);

    assert.equal(gas.scoreQuestion(question, answers.correct), question.bobot, tipe + ": jawaban benar bukan bobot penuh");
    assert.equal(gas.scoreQuestion(question, answers.wrong) < question.bobot, true, tipe + ": jawaban salah dinilai penuh");
    assert.equal(gas.scoreQuestion(question, undefined), 0, tipe + ": jawaban kosong bukan nol");

    // Bentuk jawaban tipe lain tidak boleh mendapat skor.
    for (const other of ACTIVE_TYPES) {
      if (other === tipe) continue;
      const foreign = TYPE_ANSWERS[other].correct;
      if (TYPE_ANSWERS[other].shape === answers.shape) continue;
      assert.equal(gas.scoreQuestion(question, foreign), 0,
        tipe + ": jawaban berbentuk " + other + " tidak boleh mendapat skor");
    }
  }

  // Tipe tak dikenal tidak pernah memakai scorer tipe lain.
  assert.equal(gas.scoreQuestion(scoreFixture("ESSAY", "B", 10, null), "B"), 0, "tipe tak dikenal wajib nol");
  assert.equal(gas.scoreQuestion(scoreFixture("", "B", 10, null), "B"), 0, "tipe kosong wajib nol");

  // FILL_IN normalization tidak boleh merembes ke tipe lain.
  assert.equal(gas.scoreQuestion(scoreFixture("SINGLE", "B", 10, null), "b"), 0, "SINGLE tetap case-sensitive");
  assert.equal(gas.scoreQuestion(scoreFixture("SINGLE", "B", 10, null), " B "), 0, "SINGLE tidak boleh di-trim");
  assert.equal(gas.scoreQuestion(scoreFixture("COMPLEX", "A,C", 10, null), ["a", "c"]), 0, "COMPLEX tetap case-sensitive");
}

// ── MATRIX: autosave + recovery mempertahankan bentuk jawaban tiap tipe ────
{
  const answers = {};
  for (const tipe of ACTIVE_TYPES) answers["Q_" + tipe] = TYPE_ANSWERS[tipe].correct;

  const state = baseState();
  state.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""],
  ];
  const gas = loadGas(state);
  assert.equal(post(gas, "syncAnswers", { id_siswa: "S1", answers: answers }).success, true);
  assert.deepEqual(JSON.parse(gas.__sheets.Users.rows[1][13]), answers,
    "autosave mengubah bentuk jawaban salah satu tipe");

  // Login mengembalikan bentuk yang sama persis (jalur recovery existing).
  const recoveryState = baseState();
  recoveryState.Users = [
    USER_HEADER,
    ["S1", "siswa", "pw", "Siswa", "6A", false, new Date(), "", "", 0, "SEDANG", "", "", JSON.stringify(answers)],
  ];
  const recovered = post(loadGas(recoveryState), "login", { username: "siswa", password: "pw" });
  assert.equal(recovered.success, true, recovered.message);
  assert.deepEqual(recovered.data.saved_answers, answers, "recovery mengubah bentuk jawaban");
  assert.equal(typeof recovered.data.saved_answers.Q_SINGLE, "string");
  assert.equal(Array.isArray(recovered.data.saved_answers.Q_COMPLEX), true);
  assert.equal(typeof recovered.data.saved_answers.Q_TRUE_FALSE, "object");
  assert.equal(typeof recovered.data.saved_answers.Q_MATCHING, "object");
  assert.equal(typeof recovered.data.saved_answers.Q_FILL_IN, "string");
}

// ── TYPE TRANSITION: perubahan tipe adalah content change ─────────────────
{
  // Soal historis: ganti tipe wajib membuat versi baru dan meninggalkan baris lama utuh.
  const historicalFor = (tipe) => {
    const state = baseState();
    const rows = {
      SINGLE: ["QX", 1, "SINGLE", "Soal lama", "", "A", "B", "C", "D", "", "A", 1, "Mudah", "MAPEL_A", "AKTIF", "", ""],
      TRUE_FALSE: trueFalseRow("QX"),
      MATCHING: matchingRow("QX"),
      FILL_IN: fillInRow("QX"),
    };
    state.Questions = [QUESTION_HEADER, rows[tipe]];
    state.Responses.push([new Date(), "S1", "Siswa", "6A", JSON.stringify({ QX: "A" }), "100.00", 10, "", ""]);
    return state;
  };

  const transitions = [
    ["SINGLE", "TRUE_FALSE"], ["SINGLE", "MATCHING"], ["SINGLE", "FILL_IN"],
    ["TRUE_FALSE", "MATCHING"], ["TRUE_FALSE", "FILL_IN"], ["MATCHING", "FILL_IN"],
    ["FILL_IN", "SINGLE"], ["MATCHING", "TRUE_FALSE"],
  ];
  for (const [from, to] of transitions) {
    const gas = loadGas(historicalFor(from));
    const before = gas.__sheets.Questions.rows[1].slice();
    const result = post(gas, "updateQuestion", { id_soal: "QX", data: TYPE_FIXTURES[to]() });
    assert.equal(result.success, true, from + "→" + to + ": " + result.message);
    assert.equal(result.versioned, true, from + "→" + to + " wajib membuat versi baru");
    assert.deepEqual(gas.__sheets.Questions.rows[1].slice(0, 14), before.slice(0, 14),
      from + "→" + to + ": baris historis ikut berubah");
    assert.equal(gas.__sheets.Questions.rows[1][16], before[16], "data_soal historis ikut berubah");
    assert.equal(gas.__sheets.Questions.rows[1][14], "ARSIP");

    // Versi baru tidak boleh membawa sisa isi tipe lama.
    const fresh = gas.__sheets.Questions.rows.find((r) => r[0] === result.id_soal);
    assert.equal(fresh[2], to);
    const structured = to === "TRUE_FALSE" || to === "MATCHING" || to === "FILL_IN";
    assert.equal(fresh[16] !== "", structured, from + "→" + to + ": kolom 17 tidak sesuai tipe baru");
    if (!structured) {
      assert.equal(fresh[16], "", from + "→" + to + ": data_soal lama tertinggal");
      assert.equal(fresh[10], TYPE_FIXTURES[to]().kunci_jawaban, "kunci lama tertinggal");
    }
  }
}

// ── TYPE TRANSITION non-historis: in-place, tanpa sisa tipe lama ──────────
{
  for (const [from, to] of [["MATCHING", "FILL_IN"], ["TRUE_FALSE", "SINGLE"], ["FILL_IN", "MATCHING"]]) {
    const gas = loadGas(baseState());
    const created = post(gas, "createQuestion", { data: TYPE_FIXTURES[from]() });
    assert.equal(created.success, true, created.message);

    const changed = post(gas, "updateQuestion", { id_soal: created.id_soal, data: TYPE_FIXTURES[to]() });
    assert.equal(changed.success, true, from + "→" + to + ": " + changed.message);
    assert.equal(changed.versioned, false, "soal tanpa histori diperbarui di tempat");

    const row = gas.__sheets.Questions.rows.find((r) => r[0] === created.id_soal);
    assert.equal(row[2], to);
    const structured = to === "TRUE_FALSE" || to === "MATCHING" || to === "FILL_IN";
    assert.equal(row[16] !== "", structured, from + "→" + to + ": stale data_soal lintas tipe");
    if (structured) assert.deepEqual(JSON.parse(row[16]), TYPE_FIXTURES[to]().data_soal);
    // Opsi legacy hanya terisi untuk tipe pilihan.
    if (to === "SINGLE") {
      assert.equal(row[5], TYPE_FIXTURES.SINGLE().opsi_a);
    } else {
      assert.equal(String(row[5] || ""), "", from + "→" + to + ": opsi legacy tertinggal");
    }
  }
}

// ── LEGACY SHEET: 14 / 16 / 17 kolom hidup berdampingan ───────────────────
{
  const state = baseState();
  state.Questions = [
    QUESTION_HEADER.slice(0, 14),
    ["L14", 1, "SINGLE", "Legacy 14", "", "A", "B", "C", "D", "", "A", 1, "Mudah", "MAPEL_A"],
    ["L16", 2, "COMPLEX", "Legacy 16", "", "A", "B", "C", "D", "", "A,C", 1, "Mudah", "MAPEL_A", "AKTIF", ""],
    trueFalseRow("L17"),
  ];
  const gas = loadGas(state);

  const students = get(gas, "getQuestions").data;
  assert.equal(students.length, 3, "baris legacy hilang dari daftar siswa");
  assert.equal(students.find((q) => q.id_soal === "L14").opsi_a, "A", "kolom legacy bergeser");
  assert.equal("data_soal" in students.find((q) => q.id_soal === "L14"), false);
  assert.equal("data_soal" in students.find((q) => q.id_soal === "L16"), false);
  assert.deepEqual(students.find((q) => q.id_soal === "L17").data_soal, trueFalsePayload().data_soal);
  for (const q of students) {
    for (const forbidden of contract.admin_only_fields) assert.equal(forbidden in q, false);
  }

  // Edit baris 14 kolom tetap aman dan melebarkan baris ke 17 kolom.
  const edited = post(gas, "updateQuestion", {
    id_soal: "L14", data: Object.assign({}, validSingle, { nomor_urut: 1 }),
  });
  assert.equal(edited.success, true, edited.message);
  assert.equal(gas.__sheets.Questions.rows[1].length, 17);
  assert.equal(gas.__sheets.Questions.rows[2][10], "A,C", "baris tetangga ikut tertimpa");
}

// ── VERSIONING: kunci/data_soal urutan field bukan perubahan isi ──────────
{
  const cases = [
    ["TRUE_FALSE", trueFalseRow("QV"), trueFalsePayload({ nomor_urut: 1, kunci_jawaban: { "2": "SALAH", "1": "BENAR" } }), false],
    ["MATCHING", matchingRow("QV"), matchingPayload({ nomor_urut: 1, data_soal: {
      kanan: matchingData().kanan, kiri: matchingData().kiri,
    } }), false],
    ["FILL_IN", fillInRow("QV"), fillInPayload({ nomor_urut: 1, kunci_jawaban: {
      trim: true, case_sensitive: false, accepted_answers: ["Jakarta", "DKI Jakarta"],
    } }), false],
    ["TRUE_FALSE", trueFalseRow("QV"), trueFalsePayload({ nomor_urut: 8 }), false],
    ["MATCHING", matchingRow("QV"), matchingPayload({ nomor_urut: 1, kunci_jawaban: { "1": "A", "2": "B" } }), true],
    ["FILL_IN", fillInRow("QV"), fillInPayload({ nomor_urut: 1, data_soal: { petunjuk: "<p>Baru.</p>" } }), true],
  ];
  for (const [label, row, payload, expected] of cases) {
    const state = baseState();
    state.Questions = [QUESTION_HEADER, row];
    state.Responses.push([new Date(), "S1", "Siswa", "6A", JSON.stringify({ QV: "x" }), "100.00", 10, "", ""]);
    const gas = loadGas(state);
    const result = post(gas, "updateQuestion", { id_soal: "QV", data: payload });
    assert.equal(result.success, true, label + ": " + result.message);
    assert.equal(result.versioned, expected, label + ": keputusan versioning salah");
  }
}

// ── DELETE / ARCHIVE guard berlaku untuk seluruh tipe ─────────────────────
{
  for (const [tipe, row] of [["TRUE_FALSE", trueFalseRow("QD")], ["MATCHING", matchingRow("QD")], ["FILL_IN", fillInRow("QD")]]) {
    // Pernah dijawab → diarsipkan, bukan dihapus.
    const historical = baseState();
    historical.Questions = [QUESTION_HEADER, row.slice()];
    historical.Responses.push([new Date(), "S1", "Siswa", "6A", JSON.stringify({ QD: "x" }), "100.00", 10, "", ""]);
    const gasHistorical = loadGas(historical);
    const archived = post(gasHistorical, "deleteQuestion", { id_soal: "QD" });
    assert.equal(archived.archived, true, tipe + ": soal historis wajib diarsipkan");
    assert.equal(gasHistorical.__sheets.Questions.rows.length, 2, tipe + ": baris historis terhapus");
    assert.equal(gasHistorical.__sheets.Questions.rows[1][14], "ARSIP");

    // Belum pernah dijawab → boleh dihapus.
    const unused = baseState();
    unused.Questions = [QUESTION_HEADER, row.slice()];
    const gasUnused = loadGas(unused);
    assert.equal(post(gasUnused, "deleteQuestion", { id_soal: "QD" }).archived, false, tipe + ": hapus biasa berubah");
    assert.equal(gasUnused.__sheets.Questions.rows.length, 1);

    // Ujian berjalan → dilindungi untuk seluruh tipe.
    const running = baseState();
    running.Questions = [QUESTION_HEADER, row.slice()];
    running.Users = [USER_HEADER, ["S1", "siswa", "pw", "Siswa", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", ""]];
    const gasRunning = loadGas(running);
    assert.equal(post(gasRunning, "deleteQuestion", { id_soal: "QD" }).success, false, tipe + ": guard ujian bocor");
    assert.equal(post(gasRunning, "updateQuestion", {
      id_soal: "QD", data: TYPE_FIXTURES[tipe](),
    }).success, false, tipe + ": edit saat ujian berjalan lolos");
  }

  // Soal arsip tidak pernah masuk ujian maupun perhitungan skor.
  const archivedState = baseState();
  archivedState.Questions = [QUESTION_HEADER, matchingRow("QA", "ARSIP")];
  const gasArchived = loadGas(archivedState);
  assert.equal(get(gasArchived, "getQuestions").data.length, 0, "soal arsip terkirim ke siswa");
  assert.equal(get(gasArchived, "getAdminQuestions").data.length, 1, "soal arsip hilang dari admin");
}

// ── MUTATION A/B/E/F/G/H lintas tipe ──────────────────────────────────────
{
  // A. Satu tipe aktif dicabut dari whitelist → create tipe itu gagal.
  for (const tipe of ["TRUE_FALSE", "MATCHING", "FILL_IN"]) {
    const mutation = (source) => {
      const mutated = source.replace(
        'const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"];',
        'const VALID_QUESTION_TYPES = ' + JSON.stringify(ACTIVE_TYPES.filter((t) => t !== tipe)) + ';',
      );
      assert.notEqual(mutated, source, "titik mutation A tidak ditemukan");
      return mutated;
    };
    assert.throws(() => assert.equal(
      post(loadGas(baseState(), mutation), "createQuestion", { data: TYPE_FIXTURES[tipe]() }).success, true,
    ), undefined, "mutation A (" + tipe + ") tidak terdeteksi");
    assert.equal(post(loadGas(baseState()), "createQuestion", { data: TYPE_FIXTURES[tipe]() }).success, true);
  }

  // B. Proyeksi siswa ikut membawa kunci.
  const projectionMutation = (source) => {
    const mutated = source.replace("    if (skipMapelFilter) {", "    if (true) {");
    assert.notEqual(mutated, source, "titik mutation B tidak ditemukan");
    return mutated;
  };
  const assertNoKeyLeak = (gas) => {
    for (const q of get(gas, "getQuestions").data) {
      assert.equal("kunci_jawaban" in q, false);
    }
  };
  const leakState = baseState();
  leakState.Questions = [QUESTION_HEADER, trueFalseRow("K1"), matchingRow("K2"), fillInRow("K3")];
  assert.throws(() => assertNoKeyLeak(loadGas(leakState, projectionMutation)), undefined,
    "mutation B tidak terdeteksi");
  assertNoKeyLeak(loadGas(leakState));

  // E. Kolom tipe tidak ikut dibandingkan saat menilai perubahan isi.
  // Diuji langsung pada questionContentEquals: lewat API, mengubah tipe selalu
  // memaksa kunci ikut berubah (COMPLEX butuh >=2 kunci), jadi hanya pemanggilan
  // langsung yang benar-benar mengisolasi kolom tipe.
  const typeBlindMutation = (source) => {
    const mutated = source.replace("  for (let c = 2; c <= 13; c++) {", "  for (let c = 3; c <= 13; c++) {");
    assert.notEqual(mutated, source, "titik mutation E tidak ditemukan");
    return mutated;
  };
  const onlyTypeChanged = Object.assign({}, validSingle, { tipe: "COMPLEX" });
  const brokenType = loadGas(baseState(), typeBlindMutation);
  const brokenRow = brokenType.questionRowValues("QX", validSingle, "AKTIF", "");
  assert.throws(() => assert.equal(brokenType.questionContentEquals(brokenRow, onlyTypeChanged), false),
    undefined, "mutation E tidak terdeteksi");

  const intactType = loadGas(baseState());
  const intactRow = intactType.questionRowValues("QX", validSingle, "AKTIF", "");
  assert.equal(intactType.questionContentEquals(intactRow, onlyTypeChanged), false,
    "perubahan tipe wajib terbaca sebagai perubahan isi");
  assert.equal(intactType.questionContentEquals(intactRow, validSingle), true,
    "payload identik tidak boleh dianggap berubah");

  // F. data_soal diabaikan saat membandingkan isi.
  const dataBlindMutation = (source) => {
    const mutated = source.replace(
      "  const d = QUESTION_DATA_COL - 1;\n  return canonicalDataSoalCell(row[d]) === canonicalDataSoalCell(next[d]);",
      "  return true;",
    );
    assert.notEqual(mutated, source, "titik mutation F tidak ditemukan");
    return mutated;
  };
  const historicalTF = () => {
    const state = baseState();
    state.Questions = [QUESTION_HEADER, trueFalseRow("QT")];
    state.Responses.push([new Date(), "S1", "Siswa", "6A", JSON.stringify({ QT: "x" }), "100.00", 10, "", ""]);
    return state;
  };
  const editedStatement = trueFalsePayload({ nomor_urut: 1, data_soal: { pernyataan: [
    { id: "1", teks: "Teks berubah" }, { id: "2", teks: "Air membeku pada 100°C" },
  ] } });
  assert.throws(() => assert.equal(
    post(loadGas(historicalTF(), dataBlindMutation), "updateQuestion", {
      id_soal: "QT", data: editedStatement,
    }).versioned, true,
  ), undefined, "mutation F tidak terdeteksi");
  assert.equal(post(loadGas(historicalTF()), "updateQuestion", {
    id_soal: "QT", data: editedStatement,
  }).versioned, true);

  // G. Tipe baru memakai scorer SINGLE.
  const scoringGas = loadGas(baseState());
  const registry = scoringGas.__eval("QUESTION_SCORERS");
  for (const tipe of ["TRUE_FALSE", "MATCHING", "FILL_IN"]) {
    const original = registry[tipe];
    const payload = TYPE_FIXTURES[tipe]();
    const question = scoringQuestionFixtureFor(tipe, payload);
    try {
      registry[tipe] = registry.SINGLE;
      assert.throws(() => assert.equal(
        scoringGas.scoreQuestion(question, TYPE_ANSWERS[tipe].correct), question.bobot,
      ), undefined, "mutation G (" + tipe + ") tidak terdeteksi");
    } finally {
      registry[tipe] = original;
    }
    assert.equal(scoringGas.scoreQuestion(question, TYPE_ANSWERS[tipe].correct), question.bobot);
  }

  // H. Normalisasi FILL_IN merembes ke SINGLE.
  const singleQuestion = scoreFixture("SINGLE", "B", 10, null);
  const originalSingle = registry.SINGLE;
  try {
    registry.SINGLE = (q, answer) =>
      String(answer).trim().toLowerCase() === String(q.kunci_jawaban).trim().toLowerCase() ? q.bobot : 0;
    assert.throws(() => assert.equal(scoringGas.scoreQuestion(singleQuestion, " b "), 0),
      undefined, "mutation H tidak terdeteksi");
  } finally {
    registry.SINGLE = originalSingle;
  }
  assert.equal(scoringGas.scoreQuestion(singleQuestion, " b "), 0);
}

console.log("questionBank43: audit matrix 5 tipe + mutations A/B/E/F/G/H PASS");
