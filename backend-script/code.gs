// =====================================
// CBT Serverless - Google Apps Script Backend
// Version: 3.0
// =====================================

// ===== CONFIGURATION =====
const CACHE_DURATION = 60; // seconds
const cache = CacheService.getScriptCache();
const PROXY_SECRET_PROPERTY = "SHARED_SECRET";

// ===== HELPER FUNCTIONS =====

function getSheet(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(tabName);
}

function parseGDriveImageUrl(url) {
  if (!url || url.trim() === "") return null;
  // Kalau sudah base64 data URL, kembalikan apa adanya (legacy support)
  if (url.startsWith("data:")) return url;

  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /file\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w800";
    }
  }

  return url;
}

function getConfig() {
  const cached = cache.get("config");
  if (cached) return JSON.parse(cached);

  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }

  cache.put("config", JSON.stringify(config), CACHE_DURATION);
  return config;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function secureEquals(left, right) {
  left = String(left || "");
  right = String(right || "");
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < right.length; i++) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

function getExamDeadlineMs(waktuMulai, examDurationMinutes) {
  if (!waktuMulai) return null;
  const startMs = new Date(waktuMulai).getTime();
  const duration = Number(examDurationMinutes);
  if (!isFinite(startMs) || !isFinite(duration) || duration < 0) return null;
  return startMs + duration * 60000;
}

function isExamDeadlinePassed(waktuMulai, examDurationMinutes) {
  const deadlineMs = getExamDeadlineMs(waktuMulai, examDurationMinutes);
  return deadlineMs !== null && Date.now() >= deadlineMs;
}

// Satu-satunya pemeriksa "jawaban sudah diisi" untuk scoring. Tidak memakai
// truthiness: string "0" dan (kelak) boolean false adalah jawaban valid, bukan
// kosong. Kosong = undefined | null | "" | [] | {}.
function isAnswerFilled(answer) {
  if (answer === undefined || answer === null) return false;
  if (typeof answer === "string") return answer.trim() !== "";
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "object") return Object.keys(answer).length > 0;
  return true; // boolean / number — defensif, tidak pernah truthiness bug
}

// ===== BANK SOAL — INTEGRITAS HISTORIS =====
// Questions kolom 15 = status_soal. Kosong dibaca sebagai AKTIF sehingga sheet
// lama (14 kolom) tetap terbaca tanpa migrasi.
const QUESTION_COLUMNS = 17;
const QUESTION_STATUS_COL = 15;
const QUESTION_ORIGIN_COL = 16;
// Kolom 17 = data_soal (JSON string). Baris lama 14/16 kolom tetap sah: sel yang
// tidak ada dibaca sebagai kosong, bukan error, dan tidak menggeser kolom lain.
const QUESTION_DATA_COL = 17;
const QUESTION_STATUS_ACTIVE = "AKTIF";
const QUESTION_STATUS_ARCHIVED = "ARSIP";
// Seluruh tipe yang dikenal model canonical (lihat question-contract.json).
const CANONICAL_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"];
// Tipe yang benar-benar didukung end-to-end. Sisanya ditolak sampai dikerjakan.
const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE"];
const OPTION_LETTERS = ["A", "B", "C", "D", "E"];
const QUESTION_ALLOWED_FIELDS = [
  "id_soal", "nomor_urut", "tipe", "pertanyaan", "gambar_url",
  "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e",
  "kunci_jawaban", "bobot", "kategori", "id_mapel", "data_soal",
];
// Allowlist proyeksi siswa canonical. data_soal student-visible dan bukan tempat
// kunci jawaban — lihat FORBIDDEN_DATA_SOAL_KEYS.
const STUDENT_QUESTION_FIELDS = [
  "id_soal", "nomor_urut", "tipe", "pertanyaan", "gambar_url",
  "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e",
  "bobot", "kategori", "id_mapel", "nama_mapel", "data_soal",
];
const ADMIN_ONLY_QUESTION_FIELDS = ["kunci_jawaban", "status_soal", "versi_dari"];
// kunci_jawaban adalah satu-satunya pembawa kunci. data_soal ikut ke siswa, jadi
// nama field yang menyerupai kunci ditolak di boundary (lihat question-contract.json).
const FORBIDDEN_DATA_SOAL_KEYS = ["kunci", "kunci_jawaban", "jawaban", "benar", "answer", "key"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

function isQuestionArchived(row) {
  return String(row[QUESTION_STATUS_COL - 1] || "").toUpperCase() === QUESTION_STATUS_ARCHIVED;
}

// Ujian dianggap berlangsung bila ada siswa berstatus SEDANG. Soal yang mapel-nya
// sedang diujikan tidak boleh berubah atau hilang selama itu.
function isExamRunningForMapel(id_mapel) {
  const config = getConfig();
  const exam_mapel = config.exam_mapel || "";
  if (exam_mapel && String(id_mapel || "") !== exam_mapel) return false;

  const sheet = getSheet("Users");
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][10] === "SEDANG") return true;
  }
  return false;
}

// Soal yang pernah dijawab siswa tercatat pada Responses kolom 5 (JSON answers,
// key = id_soal). Baris seperti itu tidak boleh hilang dari sheet agar jawaban
// historis tetap punya konteks soal.
function isQuestionAnsweredInHistory(id_soal) {
  const sheet = getSheet("Responses");
  if (!sheet || !id_soal) return false;
  const needle = '"' + String(id_soal) + '"';
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const raw = data[i][4];
    if (raw && String(raw).indexOf(needle) !== -1) return true;
  }
  return false;
}

function getValidMapelIds() {
  const sheet = getSheet("MataPelajaran");
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const ids = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) ids.push(String(data[i][0]));
  }
  return ids.length > 0 ? ids : null;
}

function parseAnswerKeys(rawKey) {
  const parts = String(rawKey == null ? "" : rawKey).split(",");
  const keys = [];
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i].trim().toUpperCase();
    if (key === "") continue;
    if (keys.indexOf(key) === -1) keys.push(key);
  }
  return keys;
}

// Validasi opsi A–E dan kunci untuk tipe berbasis pilihan (SINGLE/COMPLEX).
// minKeys/maxKeys yang membedakan keduanya; sisanya identik.
function validateChoiceQuestion(data, minKeys, maxKeys, keyCountMessage) {
  const available = [];
  for (let i = 0; i < OPTION_LETTERS.length; i++) {
    const letter = OPTION_LETTERS[i];
    const value = String(data["opsi_" + letter.toLowerCase()] || "").replace(/<[^>]*>/g, "").trim();
    if (value !== "") available.push(letter);
    else if (i < 4) return "Opsi A sampai D wajib diisi";
  }

  const keys = parseAnswerKeys(data.kunci_jawaban);
  if (keys.length === 0) return "Kunci jawaban wajib diisi";
  if (keys.length < minKeys || (maxKeys > 0 && keys.length > maxKeys)) return keyCountMessage;
  for (let k = 0; k < keys.length; k++) {
    if (available.indexOf(keys[k]) === -1) {
      return "Kunci jawaban " + keys[k] + " menunjuk opsi yang tidak tersedia";
    }
  }
  return null;
}

// Validator per tipe. Tipe baru menambah satu entri di sini, bukan menumbuhkan
// satu conditional raksasa. Hanya tipe yang ada di tabel ini yang diterima.
const QUESTION_TYPE_VALIDATORS = {
  SINGLE: function (data) {
    return validateChoiceQuestion(data, 1, 1, "Soal SINGLE hanya boleh punya satu kunci jawaban");
  },
  COMPLEX: function (data) {
    return validateChoiceQuestion(data, 2, 0, "Soal COMPLEX minimal punya dua kunci jawaban");
  },
  TRUE_FALSE: function (data) {
    if (!isPlainQuestionObject(data.data_soal) || !Array.isArray(data.data_soal.pernyataan)) {
      return "TRUE_FALSE wajib memiliki daftar pernyataan";
    }
    if (Object.keys(data.data_soal).some(function (field) { return field !== "pernyataan"; })) {
      return "data_soal TRUE_FALSE hanya boleh memuat pernyataan";
    }

    const statements = data.data_soal.pernyataan;
    if (statements.length === 0) return "TRUE_FALSE minimal memiliki satu pernyataan";

    const ids = Object.create(null);
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!isPlainQuestionObject(statement) ||
          Object.keys(statement).some(function (field) { return field !== "id" && field !== "teks"; })) {
        return "Struktur pernyataan TRUE_FALSE tidak valid";
      }
      const id = typeof statement.id === "string" ? statement.id.trim() : "";
      const text = typeof statement.teks === "string"
        ? statement.teks.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
        : "";
      if (!id) return "Setiap pernyataan TRUE_FALSE wajib memiliki id";
      if (!text) return "Setiap pernyataan TRUE_FALSE wajib memiliki teks";
      if (ids[id]) return "ID pernyataan TRUE_FALSE harus unik";
      ids[id] = true;
    }

    const key = parseScoringObject(data.kunci_jawaban);
    if (!key) return "Kunci jawaban TRUE_FALSE harus berupa objek";
    const keyIds = Object.keys(key);
    if (keyIds.length !== statements.length) return "Kunci TRUE_FALSE harus sesuai seluruh pernyataan";
    for (let i = 0; i < keyIds.length; i++) {
      if (!ids[keyIds[i]]) return "Kunci TRUE_FALSE tidak memiliki pernyataan";
      if (key[keyIds[i]] !== "BENAR" && key[keyIds[i]] !== "SALAH") {
        return "Kunci TRUE_FALSE hanya boleh BENAR atau SALAH";
      }
    }
    return null;
  },
};

// Validasi otoritatif di boundary GAS. Client boleh punya validasi sendiri, tetapi
// request dapat datang tanpa melewatinya.
function validateQuestionPayload(data) {
  if (!data || typeof data !== "object") return "Data soal tidak valid";

  for (const field in data) {
    if (Object.prototype.hasOwnProperty.call(data, field) && QUESTION_ALLOWED_FIELDS.indexOf(field) === -1) {
      return "Field tidak dikenal: " + field;
    }
  }

  const tipe = String(data.tipe || "").toUpperCase();
  if (CANONICAL_QUESTION_TYPES.indexOf(tipe) === -1) return "Tipe soal tidak dikenal: " + tipe;
  if (VALID_QUESTION_TYPES.indexOf(tipe) === -1) return "Tipe soal " + tipe + " belum didukung";
  const typeValidator = QUESTION_TYPE_VALIDATORS[tipe];
  if (!typeValidator) return "Tipe soal " + tipe + " belum didukung";

  const plainText = String(data.pertanyaan || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  if (!plainText) return "Redaksi soal wajib diisi";

  const typeError = typeValidator(data);
  if (typeError) return typeError;

  const bobot = Number(data.bobot);
  if (!isFinite(bobot) || bobot <= 0 || bobot > 100) return "Bobot harus angka antara 1 dan 100";

  if (data.nomor_urut !== undefined && data.nomor_urut !== null && data.nomor_urut !== "") {
    const nomor = Number(data.nomor_urut);
    if (!isFinite(nomor) || nomor < 1) return "Nomor urut tidak valid";
  }

  const id_mapel = String(data.id_mapel || "").trim();
  if (!id_mapel) return "Mata pelajaran wajib dipilih";
  const validMapel = getValidMapelIds();
  if (validMapel && validMapel.indexOf(id_mapel) === -1) return "Mata pelajaran tidak ditemukan";

  const gambar = String(data.gambar_url || "").trim();
  if (gambar && !/^(https?:\/\/|data:image\/)/i.test(gambar)) return "URL gambar tidak valid";

  // data_soal boleh absen (soal legacy dan SINGLE/COMPLEX). Bila ada, bentuknya
  // wajib objek — string JSON mentah tidak diterima supaya hanya ada satu jalur
  // serialisasi, yaitu serializeDataSoal().
  if (data.data_soal !== undefined && data.data_soal !== null && data.data_soal !== "") {
    if (!isPlainQuestionObject(data.data_soal)) return "data_soal harus berupa objek";
    const leaked = findForbiddenDataSoalKey(data.data_soal);
    if (leaked) return "data_soal tidak boleh memuat kunci jawaban: " + leaked;
  }

  return null;
}

// ===== data_soal (Questions kolom 17) =====
// Serialisasi stabil: kunci objek diurutkan supaya {"a":1,"b":2} dan {"b":2,"a":1}
// menghasilkan string identik. Tanpa ini, reorder kunci saja sudah terbaca sebagai
// perubahan isi dan memicu versi baru yang tidak perlu.
function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    const items = [];
    for (let i = 0; i < value.length; i++) items.push(stableStringify(value[i]));
    return "[" + items.join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const parts = [];
  for (let i = 0; i < keys.length; i++) {
    if (value[keys[i]] === undefined) continue;
    parts.push(JSON.stringify(keys[i]) + ":" + stableStringify(value[keys[i]]));
  }
  return "{" + parts.join(",") + "}";
}

function isPlainQuestionObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Cari nama field yang menyerupai kunci jawaban, di kedalaman berapa pun.
function findForbiddenDataSoalKey(value) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = findForbiddenDataSoalKey(value[i]);
      if (found) return found;
    }
    return null;
  }
  if (!isPlainQuestionObject(value)) return null;
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    if (FORBIDDEN_DATA_SOAL_KEYS.indexOf(String(keys[i]).toLowerCase()) !== -1) return keys[i];
    const found = findForbiddenDataSoalKey(value[keys[i]]);
    if (found) return found;
  }
  return null;
}

// Payload → sel kolom 17. Kosong/absen tetap menulis "" sehingga soal legacy dan
// SINGLE/COMPLEX tidak mendapat isi baru.
function serializeDataSoal(value) {
  if (value === undefined || value === null || value === "") return "";
  if (!isPlainQuestionObject(value) || Object.keys(value).length === 0) return "";
  return stableStringify(value);
}

// Sel kolom 17 → objek. null = kosong (termasuk baris 14/16 kolom lama),
// undefined = isi rusak dan tidak boleh dipakai diam-diam.
function parseDataSoalCell(raw) {
  const text = String(raw === null || raw === undefined ? "" : raw).trim();
  if (text === "") return null;
  try {
    const parsed = JSON.parse(text);
    if (!isPlainQuestionObject(parsed)) return undefined;
    return Object.keys(parsed).length === 0 ? null : parsed;
  } catch (err) {
    return undefined;
  }
}

// Bentuk kanonik untuk perbandingan isi. Sel rusak dibandingkan apa adanya dan
// tidak pernah sama dengan data_soal yang sah — perubahan tetap memicu versi baru.
function canonicalDataSoalCell(raw) {
  const parsed = parseDataSoalCell(raw);
  if (parsed === null) return "";
  if (parsed === undefined) return "malformed:" + String(raw);
  return stableStringify(parsed);
}

// Sheet lama bisa punya lebih sedikit kolom daripada QUESTION_COLUMNS; menulis
// 17 kolom ke sheet 16 kolom adalah error di Apps Script, bukan auto-expand.
function ensureQuestionColumns(sheet) {
  if (!sheet || typeof sheet.getMaxColumns !== "function") return;
  const current = sheet.getMaxColumns();
  if (current < QUESTION_COLUMNS) sheet.insertColumnsAfter(current, QUESTION_COLUMNS - current);
}

function questionRowValues(id_soal, data, statusValue, originId) {
  const tipe = String(data.tipe).toUpperCase();
  const structuredKey = tipe === "TRUE_FALSE" ? parseScoringObject(data.kunci_jawaban) : null;
  return [
    id_soal,
    data.nomor_urut,
    tipe,
    data.pertanyaan,
    data.gambar_url || "",
    data.opsi_a,
    data.opsi_b,
    data.opsi_c,
    data.opsi_d,
    data.opsi_e || "",
    tipe === "TRUE_FALSE" && structuredKey ? stableStringify(structuredKey) : parseAnswerKeys(data.kunci_jawaban).join(","),
    Number(data.bobot),
    data.kategori || "",
    String(data.id_mapel || "").trim(),
    statusValue || QUESTION_STATUS_ACTIVE,
    originId || "",
    serializeDataSoal(data.data_soal),
  ];
}

// Bandingkan isi soal yang menentukan makna jawaban historis: tipe, redaksi,
// gambar, opsi, kunci, bobot, kategori, mapel, data_soal. nomor_urut sengaja
// dikecualikan — urutan tampil tidak pernah tercatat pada Responses, jadi
// mengurutkan ulang soal tidak mengubah arti hasil lama dan tidak perlu memicu
// versi baru. status_soal dan versi_dari adalah metadata versioning, bukan isi.
function questionContentEquals(row, data) {
  const next = questionRowValues(row[0], data, QUESTION_STATUS_ACTIVE, "");
  for (let c = 2; c <= 13; c++) {           // kolom 3..14
    if (String(row[c] == null ? "" : row[c]) !== String(next[c] == null ? "" : next[c])) return false;
  }
  // Kolom 17 dibandingkan secara semantik, bukan string mentah.
  const d = QUESTION_DATA_COL - 1;
  return canonicalDataSoalCell(row[d]) === canonicalDataSoalCell(next[d]);
}

function isAuthorizedProxyRequest(params) {
  // ponytail: satu secret acak per tenant cukup untuk boundary ini; naikkan ke HMAC
  // bertimestamp jika secret harus melewati perantara yang tidak sepenuhnya dipercaya.
  const expected = PropertiesService.getScriptProperties().getProperty(PROXY_SECRET_PROPERTY);
  return expected && expected.length >= 32 && secureEquals(params && params.proxy_secret, expected);
}

// Pastikan sheet ada; jika tidak, buat dengan header
function ensureSheet(tabName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(headers);
  }
  return sheet;
}

// ===== MAIN ENDPOINTS =====

function doGet(e) {
  try {
    if (!isAuthorizedProxyRequest(e && e.parameter)) {
      return createJsonResponse({ success: false, message: "Unauthorized" });
    }
    const action = e.parameter.action;
    let result;

    switch (action) {
      case "getConfig":
        result = handleGetConfig();
        break;
      case "getQuestions":
        result = handleGetQuestions(false);
        break;
      case "getAdminQuestions":
        result = handleGetQuestions(true); // skip exam_mapel filter for admin bank soal
        break;
      case "getLiveScore":
        result = handleGetLiveScore();
        break;
      case "getUsers":
        result = handleGetUsers(e.parameter);
        break;
      case "exportResults":
        result = handleExportResults();
        break;
      case "getExamPinStatus":
        result = handleGetExamPinStatus();
        break;
      case "getExamStatus":
        result = handleGetExamStatus();
        break;
      case "getMataPelajaran":
        result = handleGetMataPelajaran();
        break;
      case "getKelas":
        result = handleGetKelas();
        break;
      case "getPrintSettings":
        result = handleGetPrintSettings();
        break;
      default:
        result = { success: false, message: "Unknown action: " + action };
    }

    return createJsonResponse(result);
  } catch (error) {
    console.error("doGet failed", error);
    return createJsonResponse({ success: false, message: "Internal server error" });
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    if (!isAuthorizedProxyRequest(params)) {
      return createJsonResponse({ success: false, message: "Unauthorized" });
    }
    const action = params.action;
    let result;

    switch (action) {
      case "login":
        result = handleLogin(params);
        break;
      case "syncAnswers":
        result = handleSyncAnswers(params);
        break;
      case "submitExam":
        result = handleSubmitExam(params);
        break;
      case "reportViolation":
        result = handleReportViolation(params);
        break;
      case "adminLogin":
        result = handleAdminLogin(params);
        break;
      case "createQuestion":
        result = handleCreateQuestion(params);
        break;
      case "updateQuestion":
        result = handleUpdateQuestion(params);
        break;
      case "deleteQuestion":
        result = handleDeleteQuestion(params);
        break;
      case "updateConfig":
        result = handleUpdateConfig(params);
        break;
      case "resetUserLogin":
        result = handleResetUserLogin(params);
        break;
      case "validateExamPin":
        result = handleValidateExamPin(params);
        break;
      case "setExamPin":
        result = handleSetExamPin(params);
        break;
      case "validateLiveScorePin":
        result = handleValidateLiveScorePin(params);
        break;
      case "createStudent":
        result = handleCreateStudent(params);
        break;
      case "updateStudent":
        result = handleUpdateStudent(params);
        break;
      case "deleteStudent":
        result = handleDeleteStudent(params);
        break;
      case "importStudents":
        result = handleImportStudents(params);
        break;
      case "deleteAllStudents":
        result = handleDeleteAllStudents();
        break;
      case "setExamStatus":
        result = handleSetExamStatus(params);
        break;
      // ── Gambar Soal ──────────────────────────────
      case "uploadImage":
        result = handleUploadImage(params);
        break;
      // ── Mata Pelajaran ───────────────────────────
      case "createMataPelajaran":
        result = handleCreateMataPelajaran(params);
        break;
      case "updateMataPelajaran":
        result = handleUpdateMataPelajaran(params);
        break;
      case "deleteMataPelajaran":
        result = handleDeleteMataPelajaran(params);
        break;
      case "deleteAllMataPelajaran":
        result = handleDeleteAllMataPelajaran();
        break;
      // ── Data Kelas ────────────────────────────────
      case "createKelas":
        result = handleCreateKelas(params);
        break;
      case "updateKelas":
        result = handleUpdateKelas(params);
        break;
      case "deleteKelas":
        result = handleDeleteKelas(params);
        break;
      case "deleteAllKelas":
        result = handleDeleteAllKelas();
        break;
      // ── Print Settings ────────────────────────────
      case "savePrintSettings":
        result = handleSavePrintSettings(params);
        break;
      default:
        result = { success: false, message: "Unknown action: " + action };
    }

    return createJsonResponse(result);
  } catch (error) {
    console.error("doPost failed", error);
    return createJsonResponse({ success: false, message: "Internal server error" });
  }
}

// ===== GET HANDLERS =====

function handleGetConfig() {
  const config = getConfig();
  const safeConfig = {
    exam_name: config.exam_name,
    exam_duration: config.exam_duration,
    max_violations: config.max_violations,
    auto_submit: config.auto_submit,
    shuffle_questions: config.shuffle_questions,
    admin_wa: config.admin_wa || "",
    exam_status: config.exam_status || "OPEN",
    exam_mapel: config.exam_mapel || "",
  };
  return { success: true, data: safeConfig };
}

function handleGetQuestions(skipMapelFilter) {
  // Admin bank soal uses skipMapelFilter=true to see all questions regardless of exam_mapel
  const cacheKey = skipMapelFilter ? "questions_all" : "questions";
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const config = getConfig();
  const exam_mapel = config.exam_mapel || "";

  // Build lookup: id_mapel → nama_mapel dari sheet MataPelajaran
  const mapelLookup = {};
  const mapelSheet = getSheet("MataPelajaran");
  if (mapelSheet) {
    const mapelData = mapelSheet.getDataRange().getValues();
    for (let m = 1; m < mapelData.length; m++) {
      if (mapelData[m][0]) {
        mapelLookup[mapelData[m][0]] = mapelData[m][2]; // id_mapel → nama_mapel
      }
    }
  }

  const sheet = getSheet("Questions");
  const data = sheet.getDataRange().getValues();
  const questions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const id_mapel = row[13] || null;
    const archived = isQuestionArchived(row);

    // Soal arsip tidak pernah dikirim ke siswa, tetapi tetap terlihat di admin
    // supaya soal historis dapat ditelusuri.
    if (!skipMapelFilter && archived) continue;

    // Filter per mapel jika exam_mapel dikonfigurasi (dilewati untuk admin)
    if (!skipMapelFilter && exam_mapel && id_mapel !== exam_mapel) continue;

    const entry = {
      id_soal: row[0],
      nomor_urut: row[1],
      tipe: row[2],
      pertanyaan: row[3],
      gambar_url: parseGDriveImageUrl(row[4]),
      bobot: row[11] || 1,
      kategori: row[12] || null,
      id_mapel: id_mapel,
      nama_mapel: id_mapel ? (mapelLookup[id_mapel] || null) : null,
    };
    // Opsi A-E hanya milik tipe pilihan. TRUE_FALSE memakai data_soal dan tidak
    // boleh menerima bentuk legacy yang tidak relevan.
    if (row[2] === "SINGLE" || row[2] === "COMPLEX") {
      entry.opsi_a = row[5];
      entry.opsi_b = row[6];
      entry.opsi_c = row[7];
      entry.opsi_d = row[8];
      entry.opsi_e = row[9] || null;
    }
    // data_soal hanya diikutkan bila kolom 17 berisi JSON objek yang sah. Sel rusak
    // dicatat dan dilewati, bukan menggagalkan seluruh request.
    const dataSoal = parseDataSoalCell(row[QUESTION_DATA_COL - 1]);
    if (dataSoal === undefined) {
      console.warn("data_soal tidak valid pada soal " + row[0] + "; field dilewati");
    } else if (dataSoal !== null) {
      entry.data_soal = dataSoal;
    }
    // Kirim kunci_jawaban hanya untuk admin (skipMapelFilter=true)
    if (skipMapelFilter) {
      entry.kunci_jawaban = row[10] || "";
      entry.status_soal = archived ? QUESTION_STATUS_ARCHIVED : QUESTION_STATUS_ACTIVE;
      entry.versi_dari = row[QUESTION_ORIGIN_COL - 1] || null;
    }
    questions.push(entry);
  }

  questions.sort(function(a, b) { return a.nomor_urut - b.nomor_urut; });

  const result = { success: true, data: questions };
  cache.put(cacheKey, JSON.stringify(result), CACHE_DURATION);
  return result;
}

function handleGetLiveScore() {
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const scores = [];

  let totalUsers = 0, sedang = 0, selesai = 0, diskualifikasi = 0, belum = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    totalUsers++;
    const status = row[10];

    if (status === "SEDANG") sedang++;
    else if (status === "SELESAI") selesai++;
    else if (status === "DISKUALIFIKASI") diskualifikasi++;
    else belum++;

    if (status === "SELESAI" || status === "DISKUALIFIKASI") {
      scores.push({
        rank: 0,
        nama: row[3],
        kelas: row[4],
        skor: parseFloat(row[8]) || 0,
        status: status,
        waktu_selesai: row[7] ? new Date(row[7]).toLocaleString("id-ID") : "-",
        waktu_submit_ms: row[7] ? new Date(row[7]).getTime() : 0,
      });
    }
  }

  scores.sort(function(a, b) {
    if (b.skor !== a.skor) return b.skor - a.skor;
    return a.waktu_submit_ms - b.waktu_submit_ms;
  });

  scores.forEach(function(item, index) { item.rank = index + 1; });

  return {
    success: true,
    data: scores,
    stats: { total: totalUsers, sedang, selesai, diskualifikasi, belum },
  };
}

function handleGetUsers(params) {
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    users.push({
      id_siswa: row[0],
      username: row[1],
      nama_lengkap: row[3],
      kelas: row[4],
      status_login: row[5],
      waktu_mulai: row[6] ? new Date(row[6]).toLocaleString("id-ID") : null,
      waktu_selesai: row[7] ? new Date(row[7]).toLocaleString("id-ID") : null,
      skor_akhir: row[8] !== "" && row[8] !== null && row[8] !== undefined ? parseFloat(row[8]) : null,
      violation_count: row[9] || 0,
      status_ujian: row[10] || "BELUM",
      last_seen: row[11] ? new Date(row[11]).toLocaleString("id-ID") : null,
      mapel_diujikan: row[12] || "",
    });
  }

  return { success: true, data: users };
}

function handleExportResults() {
  const sheet = getSheet("Responses");
  const data = sheet.getDataRange().getValues();
  return { success: true, data: data };
}

// ===== POST HANDLERS — AUTH & EXAM =====

function handleLogin(params) {
  const { username, password } = params;

  const examConfig = getConfig();
  if ((examConfig.exam_status || "OPEN") === "CLOSED") {
    return { success: false, message: "Ujian belum dibuka. Hubungi pengawas ujian." };
  }

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (
      row[1].toString().toLowerCase() === username.toLowerCase() &&
      row[2].toString() === password
    ) {
      const statusUjian = row[10];

      if (statusUjian === "SELESAI" || statusUjian === "DISKUALIFIKASI") {
        return { success: false, message: "Kamu sudah menyelesaikan ujian." };
      }

      if (row[5] === true) {
        return { success: false, message: "Akun sudah login di perangkat lain." };
      }

      const waktuMulai = row[6] || new Date();
      sheet.getRange(i + 1, 6).setValue(true);
      if (!row[6]) {
        sheet.getRange(i + 1, 7).setValue(waktuMulai);
        sheet.getRange(i + 1, 11).setValue("SEDANG");
      }
      sheet.getRange(i + 1, 12).setValue(new Date());

      const config = getConfig();

      // Read saved answers from col 14 (index 13) for recovery
      var savedRaw = row[13] ? row[13].toString() : "";
      var savedAnswers = null;
      if (savedRaw) {
        try { savedAnswers = JSON.parse(savedRaw); } catch (_e) { savedAnswers = null; }
      }

      return {
        success: true,
        data: {
          id_siswa: row[0],
          username: row[1],
          nama_lengkap: row[3],
          kelas: row[4],
          status_ujian: row[10] || "SEDANG",
          waktu_mulai: waktuMulai,
          exam_duration: parseInt(config.exam_duration) || 90,
          saved_answers: savedAnswers,
        },
      };
    }
  }

  return { success: false, message: "Username atau password salah." };
}

function handleSyncAnswers(params) {
  const { id_siswa, answers } = params;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { success: false, message: "Server busy, retry later" };
  }

  try {
    var sheet = getSheet("Users");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === id_siswa) {
        // ponytail: server-side guard — reject sync after submit to close autosave race
        var status = data[i][10] || "BELUM";
        if (status === "SELESAI" || status === "DISKUALIFIKASI") {
          return { success: false, message: "already_submitted" };
        }
        if (isExamDeadlinePassed(data[i][6], getConfig().exam_duration)) {
          return { success: false, message: "deadline_expired" };
        }
        var serialized = JSON.stringify(answers);
        cache.put("answers_" + id_siswa, serialized, 3600);
        sheet.getRange(i + 1, 12).setValue(new Date());  // last_seen
        sheet.getRange(i + 1, 14).setValue(serialized);  // saved_answers (col N)
        return { success: true, message: "Synced" };
      }
    }

    return { success: false, message: "User not found" };
  } finally {
    lock.releaseLock();
  }
}

// ===== TYPE-AWARE SCORING =====
// Semua scorer menerima soal canonical + jawaban yang tidak dipercaya. Kunci
// selalu berasal dari row Questions di server; scorer tidak membaca nilai dari
// payload lain dan gagal tertutup (0 poin) untuk bentuk yang rusak.
function scoringWeight(rawWeight) {
  if (rawWeight === undefined || rawWeight === null ||
      (typeof rawWeight === "string" && rawWeight.trim() === "")) return 1;
  const weight = Number(rawWeight);
  return isFinite(weight) && weight > 0 ? weight : 0;
}

function parseScoringObject(value) {
  if (isPlainQuestionObject(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const parsed = JSON.parse(value);
    return isPlainQuestionObject(parsed) ? parsed : null;
  } catch (err) {
    return null;
  }
}

function validScoringIds(items) {
  if (!Array.isArray(items)) return [];
  const ids = [];
  const seen = Object.create(null);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = isPlainQuestionObject(item) && typeof item.id === "string"
      ? item.id.trim()
      : "";
    if (id === "" || seen[id]) continue;
    seen[id] = true;
    ids.push(id);
  }
  return ids;
}

function scoreSingle(question, answer) {
  return answer === question.kunci_jawaban ? question.bobot : 0;
}

function scoreComplex(question, answer) {
  const key = String(question.kunci_jawaban).split(",").map(function(value) {
    return value.trim();
  }).sort();
  const submitted = (Array.isArray(answer) ? answer.slice() : String(answer).split(",").map(function(value) {
    return value.trim();
  })).sort();
  return JSON.stringify(key) === JSON.stringify(submitted) ? question.bobot : 0;
}

function scoreTrueFalse(question, answer) {
  const data = isPlainQuestionObject(question.data_soal) ? question.data_soal : {};
  const ids = validScoringIds(data.pernyataan);
  const key = parseScoringObject(question.kunci_jawaban);
  const submitted = isPlainQuestionObject(answer) ? answer : null;
  if (ids.length === 0 || !key || !submitted) return 0;

  let correct = 0;
  for (let i = 0; i < ids.length; i++) {
    const expected = key[ids[i]];
    if ((expected === "BENAR" || expected === "SALAH") && submitted[ids[i]] === expected) correct++;
  }
  return question.bobot * correct / ids.length;
}

function scoreMatching(question, answer) {
  const data = isPlainQuestionObject(question.data_soal) ? question.data_soal : {};
  const leftIds = validScoringIds(data.kiri);
  const rightIds = validScoringIds(data.kanan);
  const validRight = Object.create(null);
  for (let i = 0; i < rightIds.length; i++) validRight[rightIds[i]] = true;

  const key = parseScoringObject(question.kunci_jawaban);
  const submitted = isPlainQuestionObject(answer) ? answer : null;
  if (leftIds.length === 0 || !key || !submitted) return 0;

  let correct = 0;
  for (let i = 0; i < leftIds.length; i++) {
    const expected = key[leftIds[i]];
    if (typeof expected === "string" && validRight[expected] && submitted[leftIds[i]] === expected) correct++;
  }
  return question.bobot * correct / leftIds.length;
}

function scoreFillIn(question, answer) {
  const key = parseScoringObject(question.kunci_jawaban);
  if (!key || !Array.isArray(key.accepted_answers) || typeof answer !== "string") return 0;

  const trim = key.trim !== false;
  const caseSensitive = key.case_sensitive === true;
  const normalize = function(value) {
    let normalized = trim ? value.trim() : value;
    if (!caseSensitive) normalized = normalized.toLowerCase();
    return normalized;
  };
  const submitted = normalize(answer);
  for (let i = 0; i < key.accepted_answers.length; i++) {
    const accepted = key.accepted_answers[i];
    if (typeof accepted === "string" && normalize(accepted) === submitted) return question.bobot;
  }
  return 0;
}

const QUESTION_SCORERS = {
  SINGLE: scoreSingle,
  COMPLEX: scoreComplex,
  TRUE_FALSE: scoreTrueFalse,
  MATCHING: scoreMatching,
  FILL_IN: scoreFillIn,
};

function scoreQuestion(question, answer) {
  const weight = scoringWeight(question && question.bobot);
  if (weight === 0 || !isAnswerFilled(answer)) return 0;

  const tipe = String(question && question.tipe || "");
  const scorer = QUESTION_SCORERS[tipe];
  if (!scorer) {
    console.warn("Tipe soal tidak memiliki scorer: " + tipe);
    return 0;
  }

  const canonical = Object.assign({}, question, { bobot: weight });
  const score = Number(scorer(canonical, answer));
  if (!isFinite(score) || score <= 0) return 0;
  return Math.min(score, weight);
}

function scoringQuestionFromRow(row) {
  return {
    id_soal: row[0],
    tipe: row[2],
    kunci_jawaban: row[10],
    bobot: scoringWeight(row[11]),
    id_mapel: row[13] || null,
    data_soal: parseDataSoalCell(row[16]),
  };
}

function scoreExam(questionRows, answers, examMapel) {
  const submitted = isPlainQuestionObject(answers) ? answers : {};
  let totalScore = 0;
  let maxScore = 0;

  for (let i = 1; i < questionRows.length; i++) {
    const row = questionRows[i];
    if (!row || !row[0] || isQuestionArchived(row)) continue;

    const question = scoringQuestionFromRow(row);
    if (examMapel && question.id_mapel !== examMapel) continue;

    maxScore += question.bobot;
    totalScore += scoreQuestion(question, submitted[question.id_soal]);
  }

  return {
    totalScore: totalScore,
    maxScore: maxScore,
    finalScore: maxScore > 0 ? totalScore / maxScore * 100 : 0,
  };
}

function handleSubmitExam(params) {
  // Lock dipegang selama seluruh submit agar autosave (yang juga mengunci) tidak
  // berselang-seling, dan agar dua submit bersamaan tidak sama-sama lolos penjaga.
  var submitLock = LockService.getScriptLock();
  if (!submitLock.tryLock(10000)) {
    return { success: false, message: "Server sedang sibuk, coba lagi sebentar." };
  }
  try {
    return submitExamLocked(params);
  } finally {
    submitLock.releaseLock();
  }
}

function submitExamLocked(params) {
  const { id_siswa, answers, forced } = params;

  // Idempotency: kalau siswa sudah pernah submit, kembalikan hasil yang tersimpan
  // tanpa menghitung ulang dan tanpa menambah baris Responses. Ini menutup retry
  // setelah browser timeout padahal server sebenarnya sudah sukses.
  const guardSheet = getSheet("Users");
  const guardData = guardSheet.getDataRange().getValues();
  for (let g = 1; g < guardData.length; g++) {
    if (guardData[g][0] === id_siswa) {
      const prevStatus = guardData[g][10];
      if (prevStatus === "SELESAI" || prevStatus === "DISKUALIFIKASI") {
        const prevScore = guardData[g][8];
        return {
          success: true,
          score: (prevScore === "" || prevScore === null || prevScore === undefined)
            ? "0.00"
            : Number(prevScore).toFixed(2),
          status: prevStatus,
          duplicate: true,
        };
      }
      break;
    }
  }

  const config = getConfig();
  const exam_mapel = config.exam_mapel || "";
  const examDuration = Number(config.exam_duration);
  let authoritativeStart = null;
  for (let g = 1; g < guardData.length; g++) {
    if (guardData[g][0] === id_siswa) {
      authoritativeStart = guardData[g][6];
      break;
    }
  }
  const deadlineMs = getExamDeadlineMs(authoritativeStart, examDuration);
  if (deadlineMs === null) {
    return { success: false, message: "Waktu mulai ujian tidak valid" };
  }
  const isLate = Date.now() >= deadlineMs;

  const qSheet = getSheet("Questions");
  const questions = qSheet.getDataRange().getValues();
  const submittedAnswers = isPlainQuestionObject(answers) ? answers : {};
  const scoring = scoreExam(questions, submittedAnswers, exam_mapel);
  const finalScore = scoring.finalScore;

  const uSheet = getSheet("Users");
  const users = uSheet.getDataRange().getValues();
  let userName = "", userClass = "", waktuMulai = null, violationLog = "";

  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === id_siswa) {
      userName = users[i][3];
      userClass = users[i][4];
      waktuMulai = users[i][6];
      violationLog = "Tab switch/violations: " + (users[i][9] || 0) + "x";

      uSheet.getRange(i + 1, 6).setValue(false);
      uSheet.getRange(i + 1, 8).setValue(new Date());
      uSheet.getRange(i + 1, 9).setValue(finalScore.toFixed(2));
      uSheet.getRange(i + 1, 11).setValue(forced ? "DISKUALIFIKASI" : "SELESAI");
      uSheet.getRange(i + 1, 13).setValue(exam_mapel); // simpan mapel yang diujikan
      break;
    }
  }

  const durasiMenit = waktuMulai
    ? Math.round((new Date() - new Date(waktuMulai)) / 60000)
    : 0;

  const rSheet = getSheet("Responses");
  const submissionLog = [
    forced ? "DISKUALIFIKASI - Auto Submit" : violationLog,
    isLate ? "TERLAMBAT" : "",
  ].filter(Boolean).join(" | ");
  rSheet.appendRow([
    new Date(), id_siswa, userName, userClass,
    JSON.stringify(submittedAnswers), finalScore.toFixed(2), durasiMenit,
    submissionLog, "",
  ]);

  cache.remove("questions"); cache.remove("questions_all");

  return {
    success: true,
    score: finalScore.toFixed(2),
    status: forced ? "DISKUALIFIKASI" : "SELESAI",
    late: isLate,
  };
}

function handleReportViolation(params) {
  const { id_siswa, type } = params;

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const config = getConfig();
  const maxViolations = parseInt(config.max_violations) || 3;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      const newCount = (data[i][9] || 0) + 1;
      sheet.getRange(i + 1, 10).setValue(newCount);

      if (newCount >= maxViolations) {
        sheet.getRange(i + 1, 11).setValue("DISKUALIFIKASI");
        return { success: true, disqualified: true, violations: newCount };
      }

      return { success: true, disqualified: false, violations: newCount };
    }
  }

  return { success: false, message: "User not found" };
}

function handleAdminLogin(params) {
  const { password } = params;
  const config = getConfig();
  if (password === config.admin_password) {
    return { success: true, message: "Login successful" };
  }
  return { success: false, message: "Password salah" };
}

// ===== QUESTION HANDLERS =====
// Questions sheet columns (1-indexed):
//  1=id_soal  2=nomor_urut  3=tipe  4=pertanyaan  5=gambar_url
//  6=opsi_a   7=opsi_b      8=opsi_c  9=opsi_d    10=opsi_e
//  11=kunci_jawaban  12=bobot  13=kategori  14=id_mapel
//  15=status_soal (AKTIF/ARSIP)  16=versi_dari (id_soal asal untuk versi baru)
//  17=data_soal (JSON string; kosong untuk soal legacy dan SINGLE/COMPLEX)

function collectQuestionIds(sheetValues) {
  const taken = {};
  for (let i = 1; i < sheetValues.length; i++) {
    if (sheetValues[i][0]) taken[String(sheetValues[i][0])] = true;
  }
  return taken;
}

// Q + base36 timestamp dipertahankan agar format id lama tidak berubah; suffix
// acak hanya dipakai saat id ternyata sudah terpakai.
function generateQuestionId(takenIds) {
  let id_soal = "Q" + Date.now().toString(36).toUpperCase();
  while (takenIds[id_soal]) {
    id_soal = "Q" + Date.now().toString(36).toUpperCase() +
      Math.floor(Math.random() * 36 * 36).toString(36).toUpperCase();
  }
  return id_soal;
}

// Tulis isi baru sebagai baris baru dan arsipkan baris lama tanpa menyentuh
// isinya. Setelah ini, Responses lama tetap menunjuk id_soal lama yang isinya
// persis seperti saat dikerjakan, sementara ujian berikutnya memakai versi baru.
function createQuestionVersion(sheet, oldRowNumber, currentRow, data, originId) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { success: false, message: "Server sedang sibuk, coba lagi sebentar." };
  }

  try {
    const taken = collectQuestionIds(sheet.getDataRange().getValues());
    const newId = generateQuestionId(taken);

    ensureQuestionColumns(sheet);
    sheet.appendRow(questionRowValues(newId, data, QUESTION_STATUS_ACTIVE, originId));
    sheet.getRange(oldRowNumber, QUESTION_STATUS_COL).setValue(QUESTION_STATUS_ARCHIVED);
    if (!currentRow[QUESTION_ORIGIN_COL - 1]) {
      sheet.getRange(oldRowNumber, QUESTION_ORIGIN_COL).setValue(originId);
    }

    cache.remove("questions"); cache.remove("questions_all");
    return {
      success: true,
      versioned: true,
      id_soal: newId,
      previous_id_soal: currentRow[0],
      message: "Soal ini sudah pernah dijawab siswa. Perubahan disimpan sebagai versi baru; " +
        "versi lama diarsipkan agar hasil ujian yang sudah berjalan tetap utuh.",
    };
  } finally {
    lock.releaseLock();
  }
}

function handleCreateQuestion(params) {
  const { data } = params;
  const invalid = validateQuestionPayload(data);
  if (invalid) return { success: false, message: invalid };

  // Lock dipegang selama generate-id sampai append supaya dua create bersamaan
  // tidak dapat menghasilkan id_soal yang sama.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { success: false, message: "Server sedang sibuk, coba lagi sebentar." };
  }

  try {
    const sheet = getSheet("Questions");
    const takenIds = collectQuestionIds(sheet.getDataRange().getValues());

    let id_soal = String(data.id_soal || "").trim();
    if (id_soal) {
      if (takenIds[id_soal]) return { success: false, message: "id_soal sudah digunakan" };
    } else {
      id_soal = generateQuestionId(takenIds);
    }

    ensureQuestionColumns(sheet);
    sheet.appendRow(questionRowValues(id_soal, data, QUESTION_STATUS_ACTIVE, ""));
    cache.remove("questions"); cache.remove("questions_all");
    return { success: true, message: "Question created", id_soal: id_soal };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateQuestion(params) {
  const sheet = getSheet("Questions");
  const { id_soal, data } = params;
  if (!id_soal) return { success: false, message: "id_soal diperlukan" };

  const invalid = validateQuestionPayload(data);
  if (invalid) return { success: false, message: invalid };

  const allData = sheet.getDataRange().getValues();

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === id_soal) {
      const current = allData[i];

      // Ujian yang sudah berjalan memakai soal ini apa adanya; mengubah redaksi,
      // opsi, kunci, atau bobot di tengah ujian akan mengubah hasil siswa.
      if (isExamRunningForMapel(current[13]) || isExamRunningForMapel(data.id_mapel)) {
        return {
          success: false,
          message: "Soal sedang dipakai ujian yang berlangsung. Tutup ujian dulu sebelum mengubah soal.",
        };
      }

      const status = current[QUESTION_STATUS_COL - 1] || QUESTION_STATUS_ACTIVE;
      const origin = current[QUESTION_ORIGIN_COL - 1] || "";

      // Soal yang jawabannya sudah tercatat pada Responses tidak boleh ditimpa:
      // baris lama adalah satu-satunya rekaman soal seperti yang dikerjakan siswa.
      // Perubahan isi ditulis sebagai versi baru dengan id_soal baru, baris lama
      // diarsipkan apa adanya.
      if (isQuestionAnsweredInHistory(id_soal)) {
        if (questionContentEquals(current, data)) {
          // Hanya urutan yang berubah: metadata tampilan, bukan isi historis.
          if (String(current[1]) !== String(data.nomor_urut)) {
            sheet.getRange(i + 1, 2).setValue(data.nomor_urut);
            cache.remove("questions"); cache.remove("questions_all");
          }
          return { success: true, message: "Question updated", versioned: false };
        }
        return createQuestionVersion(sheet, i + 1, current, data, origin || id_soal);
      }

      ensureQuestionColumns(sheet);
      sheet.getRange(i + 1, 1, 1, QUESTION_COLUMNS)
        .setValues([questionRowValues(id_soal, data, status, origin)]);

      cache.remove("questions"); cache.remove("questions_all");
      return { success: true, message: "Question updated", versioned: false };
    }
  }

  return { success: false, message: "Question not found" };
}

function handleDeleteQuestion(params) {
  const sheet = getSheet("Questions");
  const { id_soal } = params;
  if (!id_soal) return { success: false, message: "id_soal diperlukan" };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_soal) {
      if (isExamRunningForMapel(data[i][13])) {
        return {
          success: false,
          message: "Soal sedang dipakai ujian yang berlangsung dan tidak dapat dihapus.",
        };
      }

      // Soal yang pernah dijawab diarsipkan, bukan dihapus: barisnya tetap ada
      // sehingga jawaban lama di Responses masih punya konteks soal.
      if (isQuestionAnsweredInHistory(id_soal)) {
        if (isQuestionArchived(data[i])) {
          return { success: true, message: "Soal sudah diarsipkan", archived: true };
        }
        sheet.getRange(i + 1, QUESTION_STATUS_COL).setValue(QUESTION_STATUS_ARCHIVED);
        cache.remove("questions"); cache.remove("questions_all");
        return {
          success: true,
          message: "Soal sudah pernah dijawab siswa, jadi diarsipkan agar histori ujian tetap utuh.",
          archived: true,
        };
      }

      sheet.deleteRow(i + 1);
      cache.remove("questions"); cache.remove("questions_all");
      return { success: true, message: "Question deleted", archived: false };
    }
  }

  return { success: false, message: "Question not found" };
}

// ===== UPLOAD GAMBAR KE GOOGLE DRIVE =====

function handleUploadImage(params) {
  const { base64Data, mimeType, fileName } = params;

  if (!base64Data) {
    return { success: false, message: "base64Data diperlukan" };
  }

  // Batas ukuran dan tipe divalidasi di server; batas 2 MB pada client hanya
  // mencegah upload yang jelas kebesaran, bukan request yang dibuat langsung.
  const normalizedMime = String(mimeType || "").toLowerCase().split(";")[0].trim();
  if (ALLOWED_IMAGE_MIME.indexOf(normalizedMime) === -1) {
    return { success: false, message: "Tipe gambar harus JPEG, PNG, GIF, atau WebP" };
  }
  const base64Length = String(base64Data).replace(/\s/g, "").length;
  if (Math.floor(base64Length * 3 / 4) > MAX_IMAGE_BYTES) {
    return { success: false, message: "Ukuran gambar melebihi 2 MB" };
  }

  try {
    // Cari atau buat folder gambar soal di samping spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ssFile = DriveApp.getFileById(ss.getId());
    const parents = ssFile.getParents();
    const parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();

    const config = getConfig();
    let folder = null;

    if (config.images_folder_id) {
      try {
        folder = DriveApp.getFolderById(config.images_folder_id);
      } catch (e) {
        folder = null; // Folder mungkin sudah dihapus
      }
    }

    if (!folder) {
      const existingFolders = parentFolder.getFoldersByName("CBT Soal Images");
      if (existingFolders.hasNext()) {
        folder = existingFolders.next();
      } else {
        folder = parentFolder.createFolder("CBT Soal Images");
      }

      // Simpan folder ID ke Config sheet
      const configSheet = getSheet("Config");
      const configData = configSheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < configData.length; i++) {
        if (configData[i][0] === "images_folder_id") {
          configSheet.getRange(i + 1, 2).setValue(folder.getId());
          found = true;
          break;
        }
      }
      if (!found) {
        configSheet.appendRow(["images_folder_id", folder.getId(), "Folder ID untuk gambar soal"]);
      }
      cache.remove("config");
    }

    // Decode base64 → Blob → upload ke Drive
    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(
      bytes,
      normalizedMime,
      fileName || ("soal_" + Date.now() + ".jpg")
    );

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const directUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800";

    return { success: true, data: { url: directUrl, fileId: fileId } };

  } catch (error) {
    return { success: false, message: "Gagal upload gambar: " + error.toString() };
  }
}

// ===== MATA PELAJARAN HANDLERS =====
// MataPelajaran sheet columns: 1=id_mapel  2=kode_mapel  3=nama_mapel

function handleGetMataPelajaran() {
  const sheet = ensureSheet("MataPelajaran", ["id_mapel", "kode_mapel", "nama_mapel"]);
  const data = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    list.push({
      id_mapel: row[0],
      kode_mapel: row[1],
      nama_mapel: row[2],
    });
  }

  return { success: true, data: list };
}

function handleCreateMataPelajaran(params) {
  const { kode_mapel, nama_mapel } = params;

  if (!kode_mapel || !nama_mapel) {
    return { success: false, message: "kode_mapel dan nama_mapel wajib diisi" };
  }

  const sheet = ensureSheet("MataPelajaran", ["id_mapel", "kode_mapel", "nama_mapel"]);
  const data = sheet.getDataRange().getValues();

  // Cek duplikat kode
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().toLowerCase() === kode_mapel.toLowerCase()) {
      return { success: false, message: "Kode mata pelajaran sudah digunakan" };
    }
  }

  const id_mapel = "MAPEL_" + Date.now().toString(36).toUpperCase();
  sheet.appendRow([id_mapel, kode_mapel.toUpperCase(), nama_mapel]);

  return { success: true, message: "Mata pelajaran berhasil ditambahkan", id_mapel: id_mapel };
}

function handleUpdateMataPelajaran(params) {
  const { id_mapel, kode_mapel, nama_mapel } = params;

  if (!id_mapel) return { success: false, message: "id_mapel diperlukan" };

  const sheet = ensureSheet("MataPelajaran", ["id_mapel", "kode_mapel", "nama_mapel"]);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_mapel) {
      sheet.getRange(i + 1, 1, 1, 3).setValues([[
        id_mapel,
        kode_mapel ? kode_mapel.toUpperCase() : data[i][1],
        nama_mapel || data[i][2],
      ]]);
      return { success: true, message: "Mata pelajaran diperbarui" };
    }
  }

  return { success: false, message: "Mata pelajaran tidak ditemukan" };
}

function handleDeleteMataPelajaran(params) {
  const { id_mapel } = params;
  if (!id_mapel) return { success: false, message: "id_mapel diperlukan" };

  const sheet = ensureSheet("MataPelajaran", ["id_mapel", "kode_mapel", "nama_mapel"]);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_mapel) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Mata pelajaran dihapus" };
    }
  }

  return { success: false, message: "Mata pelajaran tidak ditemukan" };
}

function handleDeleteAllMataPelajaran() {
  const sheet = ensureSheet("MataPelajaran", ["id_mapel", "kode_mapel", "nama_mapel"]);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true, message: "Semua mata pelajaran dihapus" };
}

// ===== DATA KELAS HANDLERS =====
// Kelas sheet columns: 1=id_kelas  2=nama_kelas  3=tingkat

function handleGetKelas() {
  const sheet = ensureSheet("Kelas", ["id_kelas", "nama_kelas", "tingkat"]);
  const data = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    list.push({
      id_kelas: row[0],
      nama_kelas: row[1],
      tingkat: String(row[2]),
    });
  }

  return { success: true, data: list };
}

function handleCreateKelas(params) {
  const { nama_kelas, tingkat } = params;

  if (!nama_kelas) {
    return { success: false, message: "nama_kelas wajib diisi" };
  }

  const sheet = ensureSheet("Kelas", ["id_kelas", "nama_kelas", "tingkat"]);
  const data = sheet.getDataRange().getValues();

  // Cek duplikat nama kelas
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().toLowerCase() === nama_kelas.toLowerCase()) {
      return { success: false, message: "Nama kelas sudah ada" };
    }
  }

  const id_kelas = "KELAS_" + Date.now().toString(36).toUpperCase();
  sheet.appendRow([id_kelas, nama_kelas, tingkat || ""]);

  return { success: true, message: "Kelas berhasil ditambahkan", id_kelas: id_kelas };
}

function handleUpdateKelas(params) {
  const { id_kelas, nama_kelas, tingkat } = params;

  if (!id_kelas) return { success: false, message: "id_kelas diperlukan" };

  const sheet = ensureSheet("Kelas", ["id_kelas", "nama_kelas", "tingkat"]);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_kelas) {
      sheet.getRange(i + 1, 1, 1, 3).setValues([[
        id_kelas,
        nama_kelas || data[i][1],
        tingkat !== undefined ? tingkat : data[i][2],
      ]]);
      return { success: true, message: "Kelas diperbarui" };
    }
  }

  return { success: false, message: "Kelas tidak ditemukan" };
}

function handleDeleteKelas(params) {
  const { id_kelas } = params;
  if (!id_kelas) return { success: false, message: "id_kelas diperlukan" };

  const sheet = ensureSheet("Kelas", ["id_kelas", "nama_kelas", "tingkat"]);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_kelas) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Kelas dihapus" };
    }
  }

  return { success: false, message: "Kelas tidak ditemukan" };
}

function handleDeleteAllKelas() {
  const sheet = ensureSheet("Kelas", ["id_kelas", "nama_kelas", "tingkat"]);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true, message: "Semua kelas dihapus" };
}

// ===== PRINT SETTINGS HANDLERS =====
// Disimpan di Config sheet dengan prefix "print_"

const PRINT_KEYS = [
  "print_school_name",
  "print_school_address",
  "print_school_city",
  "print_kepala_sekolah_nama",
  "print_kepala_sekolah_nip",
  "print_guru_mapel_nama",
  "print_guru_mapel_nip",
  "print_guru_mapel_mapel",
  "print_guru_wali_nama",
  "print_guru_wali_nip",
  "print_tahun_pelajaran",
  "print_semester",
];

function handleGetPrintSettings() {
  const config = getConfig();
  return {
    success: true,
    data: {
      school_name:            config.print_school_name            || "",
      school_address:         config.print_school_address         || "",
      school_city:            config.print_school_city            || "",
      kepala_sekolah_nama:    config.print_kepala_sekolah_nama    || "",
      kepala_sekolah_nip:     config.print_kepala_sekolah_nip     || "",
      guru_mapel_nama:        config.print_guru_mapel_nama        || "",
      guru_mapel_nip:         config.print_guru_mapel_nip         || "",
      guru_mapel_mapel:       config.print_guru_mapel_mapel       || "",
      guru_wali_nama:         config.print_guru_wali_nama         || "",
      guru_wali_nip:          config.print_guru_wali_nip          || "",
      tahun_pelajaran:        config.print_tahun_pelajaran        || "",
      semester:               config.print_semester               || "Ganjil",
    },
  };
}

function handleSavePrintSettings(params) {
  const { settings } = params;
  if (!settings) return { success: false, message: "settings diperlukan" };

  const pairs = [
    ["print_school_name",         settings.school_name            || ""],
    ["print_school_address",      settings.school_address         || ""],
    ["print_school_city",         settings.school_city            || ""],
    ["print_kepala_sekolah_nama", settings.kepala_sekolah_nama    || ""],
    ["print_kepala_sekolah_nip",  settings.kepala_sekolah_nip     || ""],
    ["print_guru_mapel_nama",     settings.guru_mapel_nama        || ""],
    ["print_guru_mapel_nip",      settings.guru_mapel_nip         || ""],
    ["print_guru_mapel_mapel",    settings.guru_mapel_mapel       || ""],
    ["print_guru_wali_nama",      settings.guru_wali_nama         || ""],
    ["print_guru_wali_nip",       settings.guru_wali_nip          || ""],
    ["print_tahun_pelajaran",     settings.tahun_pelajaran        || ""],
    ["print_semester",            settings.semester               || "Ganjil"],
  ];

  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();

  for (let p = 0; p < pairs.length; p++) {
    const key = pairs[p][0];
    const value = pairs[p][1];
    let found = false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        found = true;
        break;
      }
    }

    if (!found) {
      sheet.appendRow([key, value, ""]);
      // Tambahkan ke array lokal agar iterasi berikutnya tidak duplikat
      data.push([key, value, ""]);
    }
  }

  cache.remove("config");
  return { success: true, message: "Print settings tersimpan" };
}

// ===== CONFIG HANDLERS =====

function handleUpdateConfig(params) {
  const sheet = getSheet("Config");
  const { key, value } = params;
  const protectedKeys = ["shared_secret", "proxy_secret", "registry_secret", "session_signing_secret"];
  if (protectedKeys.indexOf(String(key || "").toLowerCase()) !== -1) {
    return { success: false, message: "Security config tidak dapat diubah melalui API" };
  }
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      cache.remove("config");
      if (key === "exam_mapel") cache.remove("questions"); cache.remove("questions_all");
      return { success: true, message: "Config updated" };
    }
  }

  sheet.appendRow([key, value, ""]);
  cache.remove("config");
  if (key === "exam_mapel") cache.remove("questions"); cache.remove("questions_all");
  return { success: true, message: "Config added" };
}

// ===== USER HANDLERS =====

function handleResetUserLogin(params) {
  const { id_siswa } = params;
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      const row = i + 1;
      sheet.getRange(row, 6).setValue(false);   // status_login = false
      sheet.getRange(row, 7).setValue("");       // waktu_mulai = kosong
      sheet.getRange(row, 8).setValue("");       // waktu_selesai = kosong
      sheet.getRange(row, 9).setValue("");       // skor_akhir = kosong
      sheet.getRange(row, 10).setValue(0);       // violation_count = 0
      sheet.getRange(row, 11).setValue("BELUM"); // status_ujian = BELUM
      sheet.getRange(row, 13).setValue("");      // mapel_diujikan = kosong
      sheet.getRange(row, 14).setValue("");      // saved_answers = kosong
      return { success: true, message: "Login reset successful" };
    }
  }

  return { success: false, message: "User not found" };
}

// ===== PIN HANDLERS =====

function handleGetExamPinStatus() {
  const config = getConfig();
  const examPin = String(config.exam_pin || "");
  return { success: true, data: { isPinRequired: examPin.trim() !== "" } };
}

function handleValidateExamPin(params) {
  if (!params || !params.pin) {
    return { success: false, message: "PIN is required" };
  }

  const { pin } = params;
  const config = getConfig();
  const examPin = String(config.exam_pin || "");

  if (examPin.trim() === "") {
    return { success: true, message: "No PIN required" };
  }

  if (String(pin).trim() === examPin.trim()) {
    return { success: true, message: "PIN valid" };
  }

  return { success: false, message: "PIN salah" };
}

function handleSetExamPin(params) {
  if (!params) return { success: false, message: "Invalid request" };

  const { pin, adminPassword } = params;
  const config = getConfig();
  if (adminPassword !== config.admin_password) {
    return { success: false, message: "Unauthorized" };
  }

  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "exam_pin") {
      sheet.getRange(i + 1, 2).setValue(pin || "");
      cache.remove("config");
      return { success: true, message: "PIN updated" };
    }
  }

  sheet.appendRow(["exam_pin", pin || "", "PIN for exam start"]);
  cache.remove("config");
  return { success: true, message: "PIN set" };
}

function handleValidateLiveScorePin(params) {
  if (!params || !params.pin) {
    return { success: false, message: "PIN is required" };
  }
  const { pin } = params;
  const config = getConfig();
  const liveScorePin = String(config.live_score_pin || "2026");

  if (String(pin).trim() === liveScorePin.trim()) {
    return { success: true, message: "PIN valid" };
  }
  return { success: false, message: "PIN salah" };
}

// ===== EXAM STATUS =====

function handleGetExamStatus() {
  const config = getConfig();
  return { success: true, data: { exam_status: config.exam_status || "OPEN" } };
}

function handleSetExamStatus(params) {
  const { status } = params;
  if (status !== "OPEN" && status !== "CLOSED") {
    return { success: false, message: "Status tidak valid. Gunakan OPEN atau CLOSED." };
  }

  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "exam_status") {
      sheet.getRange(i + 1, 2).setValue(status);
      cache.remove("config");
      return { success: true, message: status === "OPEN" ? "Ujian dibuka" : "Ujian ditutup" };
    }
  }

  sheet.appendRow(["exam_status", status, "Status ujian: OPEN atau CLOSED"]);
  cache.remove("config");
  return { success: true, message: status === "OPEN" ? "Ujian dibuka" : "Ujian ditutup" };
}

// ===== KELOLA SISWA =====

function handleCreateStudent(params) {
  const { id_siswa, username, password, nama_lengkap, kelas } = params;

  if (!username || !password || !nama_lengkap || !kelas) {
    return { success: false, message: "username, password, nama_lengkap, dan kelas wajib diisi" };
  }

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().toLowerCase() === username.toLowerCase()) {
      return { success: false, message: "Username sudah digunakan" };
    }
  }

  const studentId = (id_siswa && id_siswa.trim() !== "")
    ? id_siswa.trim()
    : "S" + String(Date.now()).slice(-6);

  sheet.appendRow([
    studentId, username, password, nama_lengkap, kelas,
    false, "", "", "", 0, "BELUM", "", "",
  ]);

  return { success: true, message: "Siswa berhasil ditambahkan" };
}

function handleUpdateStudent(params) {
  const { id_siswa, nama_lengkap, username, password, kelas } = params;

  if (!id_siswa) return { success: false, message: "id_siswa diperlukan" };

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  // Cek duplikat username (selain diri sendiri)
  if (username) {
    for (let i = 1; i < data.length; i++) {
      if (
        data[i][0] !== id_siswa &&
        data[i][1] &&
        data[i][1].toString().toLowerCase() === username.toLowerCase()
      ) {
        return { success: false, message: "Username sudah digunakan siswa lain" };
      }
    }
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      if (nama_lengkap) sheet.getRange(i + 1, 4).setValue(nama_lengkap);
      if (username)     sheet.getRange(i + 1, 2).setValue(username);
      if (password)     sheet.getRange(i + 1, 3).setValue(password);
      if (kelas)        sheet.getRange(i + 1, 5).setValue(kelas);
      return { success: true, message: "Data siswa diperbarui" };
    }
  }

  return { success: false, message: "Siswa tidak ditemukan" };
}

function handleDeleteStudent(params) {
  const { id_siswa } = params;
  if (!id_siswa) return { success: false, message: "id_siswa diperlukan" };

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Siswa berhasil dihapus" };
    }
  }

  return { success: false, message: "Siswa tidak ditemukan" };
}

function handleDeleteAllStudents() {
  const sheet = getSheet("Users");
  if (!sheet) return { success: false, message: "Sheet Users tidak ditemukan" };

  const lastRow = sheet.getLastRow();
  const deleted = lastRow > 1 ? lastRow - 1 : 0;
  if (deleted > 0) sheet.deleteRows(2, deleted); // baris 1 = header, sisakan

  return { success: true, message: deleted + " siswa dihapus", data: { deleted: deleted } };
}

function handleImportStudents(params) {
  const { students } = params;

  if (!Array.isArray(students) || students.length === 0) {
    return { success: false, message: "Data siswa tidak valid" };
  }

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const existingUsernames = new Set(
    data.slice(1).map(function(row) { return row[1] ? row[1].toString().toLowerCase() : ""; })
  );

  let added = 0, skipped = 0;

  for (let s = 0; s < students.length; s++) {
    const student = students[s];
    if (!student.username || !student.password || !student.nama_lengkap) { skipped++; continue; }
    if (existingUsernames.has(student.username.toLowerCase())) { skipped++; continue; }

    const studentId = (student.id_siswa && student.id_siswa.trim() !== "")
      ? student.id_siswa.trim()
      : "S" + String(Date.now() + added).slice(-6);

    sheet.appendRow([
      studentId, student.username, student.password, student.nama_lengkap,
      student.kelas || "", false, "", "", "", 0, "BELUM", "", "",
    ]);

    existingUsernames.add(student.username.toLowerCase());
    added++;
  }

  const msg = added + " siswa berhasil diimpor" +
    (skipped > 0 ? ", " + skipped + " dilewati (duplikat/data tidak lengkap)" : "");

  return { success: true, message: msg, data: { added, skipped } };
}
