// Harness bersama untuk test GAS: menjalankan code.gs asli di dalam vm dengan
// sheet tiruan yang mendukung tulis, hapus, dan append. Dipakai questionBank
// dan examSnapshot supaya definisi sheet palsu hanya hidup di satu tempat.

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
  // Stub Drive seperlunya untuk menguji unggah gambar: berkas yang dibuat direkam
  // apa adanya (nama, mime, sharing) supaya test bisa memeriksa berkas yang
  // benar-benar sampai ke Drive, bukan hanya nilai kembaliannya.
  const driveFiles = [];
  const driveFolder = {
    getId: () => "FOLDER_ID",
    getFoldersByName: () => ({ hasNext: () => false, next: () => null }),
    createFolder: () => driveFolder,
    createFile(blob) {
      const file = {
        blob,
        sharing: "",
        getId: () => "FILEID" + driveFiles.indexOf(file),
        setSharing(access, permission) { file.sharing = access + ":" + permission; return file; },
      };
      driveFiles.push(file);
      return file;
    },
  };

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
      getActiveSpreadsheet: () => ({
        getId: () => "SPREADSHEET_ID",
        getSheetByName: (name) => sheets[name] || null,
        insertSheet: () => null,
      }),
    },
    Utilities: {
      base64Decode: (text) => Buffer.from(String(text), "base64"),
      newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: "ANYONE_WITH_LINK" },
      Permission: { VIEW: "VIEW" },
      getRootFolder: () => driveFolder,
      getFolderById: () => driveFolder,
      getFileById: () => ({ getParents: () => ({ hasNext: () => true, next: () => driveFolder }) }),
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
  context.__driveFiles = driveFiles;
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

module.exports = {
  tenantSecret, makeSheet, loadGas, baseState, post, get,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
};
