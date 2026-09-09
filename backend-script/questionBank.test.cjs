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
  return context;
}

const QUESTION_HEADER = [
  "id_soal", "nomor_urut", "tipe", "pertanyaan", "gambar_url",
  "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e",
  "kunci_jawaban", "bobot", "kategori", "id_mapel", "status_soal",
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

console.log("questionBank: validasi, integritas historis, safe edit/delete PASS");
