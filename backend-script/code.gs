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

// CacheService menolak nilai di atas ~100 KB dan melempar. Sekolah dengan ratusan
// siswa bisa melewatinya, dan kegagalan cache tidak boleh menggagalkan permintaan
// yang datanya sendiri sudah benar.
const CACHE_MAX_VALUE_BYTES = 95 * 1024;

function cachePutSafe(key, value, seconds) {
  if (value.length > CACHE_MAX_VALUE_BYTES) return;
  try {
    cache.put(key, value, seconds);
  } catch (error) {
    console.warn("Cache put dilewati untuk " + key);
  }
}

// TTL pendek: layar guru dan layar monitoring memang memanggil tiap 5 detik.
// Yang dihilangkan cache ini bukan kesegaran data, melainkan pembacaan sheet
// berulang ketika beberapa layar memanggil pada jendela waktu yang sama.
const USERS_CACHE_TTL = 4;
const USERS_CACHE_KEY = "users_list";
const LIVE_SCORE_CACHE_KEY = "live_score";

// Dipanggil setiap kali status siswa BERUBAH ARTI bagi layar pemantauan:
// login, submit, pelanggaran, reset, dan perubahan data siswa. Autosave sengaja
// tidak memanggilnya — yang disentuhnya hanya last_seen dan saved_answers, dan
// TTL 4 detik sudah lebih pendek dari satu siklus polling.
// Action yang mengubah kolom Users yang terlihat di layar guru atau papan skor.
// syncAnswers sengaja TIDAK di sini: yang ditulisnya hanya last_seen dan
// saved_answers, dan TTL 4 detik sudah lebih pendek dari satu siklus polling.
const USERS_MUTATING_ACTIONS = Object.freeze({
  login: true,
  submitExam: true,
  reportViolation: true,
  resetUserLogin: true,
  createStudent: true,
  updateStudent: true,
  deleteStudent: true,
  deleteAllStudents: true,
  importStudents: true,
});

function invalidateUsersCache() {
  cache.remove(USERS_CACHE_KEY);
  cache.remove(LIVE_SCORE_CACHE_KEY);
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
const QUESTION_COLUMNS = 18;
const QUESTION_STATUS_COL = 15;
const QUESTION_ORIGIN_COL = 16;
// Kolom 17 = data_soal (JSON string). Baris lama 14/16 kolom tetap sah: sel yang
// tidak ada dibaca sebagai kosong, bukan error, dan tidak menggeser kolom lain.
const QUESTION_DATA_COL = 17;
const QUESTION_STATUS_ACTIVE = "AKTIF";
const QUESTION_STATUS_ARCHIVED = "ARSIP";
// Kolom 18 = id_kumpulan. Sel kosong berarti soal belum dikelompokkan dan ikut
// bucket legacy (KUMPULAN_LEGACY_ID) — tidak ada migrasi, tidak ada tulisan ke
// baris lama, dan tenant yang belum pernah membuat kumpulan berperilaku persis
// seperti sebelum fitur ini ada.
const QUESTION_COLLECTION_COL = 18;
// Seluruh tipe yang dikenal model canonical (lihat question-contract.json).
const CANONICAL_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"];
// Tipe yang benar-benar didukung end-to-end. Sisanya ditolak sampai dikerjakan.
const VALID_QUESTION_TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"];
// Tipe yang kuncinya berupa objek JSON pada kolom 11, bukan string "A"/"A,C".
const STRUCTURED_KEY_TYPES = ["TRUE_FALSE", "MATCHING", "FILL_IN"];
const OPTION_LETTERS = ["A", "B", "C", "D", "E"];
const QUESTION_ALLOWED_FIELDS = [
  "id_soal", "nomor_urut", "tipe", "pertanyaan", "gambar_url",
  "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e",
  "kunci_jawaban", "bobot", "kategori", "id_mapel", "data_soal",
  "id_kumpulan",
];
// Allowlist proyeksi siswa canonical. data_soal student-visible dan bukan tempat
// kunci jawaban — lihat FORBIDDEN_DATA_SOAL_KEYS.
const STUDENT_QUESTION_FIELDS = [
  "id_soal", "nomor_urut", "tipe", "pertanyaan", "gambar_url",
  "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e",
  "bobot", "kategori", "id_mapel", "nama_mapel", "data_soal",
];
const ADMIN_ONLY_QUESTION_FIELDS = ["kunci_jawaban", "status_soal", "versi_dari", "id_kumpulan"];
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
// Mapel yang sedang diujikan dibaca dari binding attempt, bukan dari Config:
// mengganti Config.exam_mapel di tengah ujian dulu membuka kunci soal yang justru
// sedang dikerjakan siswa.
function isExamRunningForMapel(id_mapel) {
  const sheet = getSheet("Users");
  if (!sheet) return false;
  const mapel = String(id_mapel || "");
  const fallbackMapel = String(getConfig().exam_mapel || "");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0] || data[i][10] !== "SEDANG") continue;
    const binding = parseExamBinding(data[i]);
    // Attempt lama tanpa binding: Config adalah perkiraan terbaik yang tersedia.
    const attemptMapel = binding ? binding.exam_mapel : fallbackMapel;
    if (attemptMapel && attemptMapel !== mapel) continue;
    return true;
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

// ===== KUMPULAN SOAL =====
// Bank Soal → Kumpulan Soal → Soal. Kumpulan adalah wadah yang dinamai guru
// ("UH Bab 1"), punya status Aktif/Tidak aktif, dan menentukan soal mana yang
// ditawarkan saat membuat ujian. Tidak aktif TIDAK menghapus, mengarsipkan, atau
// menyembunyikan soal dari Bank Soal — hanya soalnya tidak ikut ujian baru.
//
// Status hidup pada sheet KumpulanSoal, bukan pada tiap baris soal: menonaktifkan
// 50 soal adalah satu tulisan sel, bukan lima puluh.
const COLLECTION_SHEET = "KumpulanSoal";
const COLLECTION_HEADERS = ["id_kumpulan", "nama_kumpulan", "id_mapel", "status", "dibuat", "terakhir_dipakai"];
const COLLECTION_STATUS_ACTIVE = "AKTIF";
const COLLECTION_STATUS_INACTIVE = "NONAKTIF";
// Soal lama yang belum punya kumpulan tetap dapat dilihat, dipakai, dan diatur
// statusnya lewat satu bucket implisit. Barisnya baru ditulis ke sheet saat guru
// benar-benar mengubah statusnya, jadi tenant lama tidak tersentuh sama sekali.
const KUMPULAN_LEGACY_ID = "K_LAMA";
const KUMPULAN_LEGACY_NAME = "Soal Lama";
const COLLECTION_NAME_MAX_LENGTH = 80;

// Sheet KumpulanSoal tidak dibuat saat membaca: tenant yang belum pernah membuat
// kumpulan harus tetap berjalan seperti sebelum fitur ini ada.
function getCollectionSheet(create) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COLLECTION_SHEET);
  if (!sheet && create) {
    sheet = ss.insertSheet(COLLECTION_SHEET);
    if (sheet) sheet.appendRow(COLLECTION_HEADERS);
  }
  return sheet || null;
}

// Sel kosong = belum dikelompokkan = bucket legacy.
function questionCollectionId(row) {
  const value = String(row[QUESTION_COLLECTION_COL - 1] || "").trim();
  return value === "" ? KUMPULAN_LEGACY_ID : value;
}

function normalizeCollectionStatus(value) {
  return String(value || "").toUpperCase() === COLLECTION_STATUS_INACTIVE
    ? COLLECTION_STATUS_INACTIVE
    : COLLECTION_STATUS_ACTIVE;
}

function readCollections() {
  const sheet = getCollectionSheet(false);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    list.push({
      row_number: i + 1,
      id_kumpulan: String(data[i][0]),
      nama_kumpulan: String(data[i][1] == null ? "" : data[i][1]),
      id_mapel: String(data[i][2] == null ? "" : data[i][2]),
      status: normalizeCollectionStatus(data[i][3]),
      dibuat: data[i][4] ? String(data[i][4]) : "",
      terakhir_dipakai: data[i][5] ? String(data[i][5]) : "",
    });
  }
  return list;
}

// id_kumpulan → status. Id yang tidak tercatat (termasuk bucket legacy yang belum
// pernah disentuh) dibaca AKTIF supaya soal lama tidak hilang dari ujian.
function readQuestionRows() {
  const sheet = getSheet("Questions");
  return sheet ? sheet.getDataRange().getValues() : [];
}

function collectionStatusMap(collections) {
  const map = {};
  const list = collections || readCollections();
  for (let i = 0; i < list.length; i++) map[list[i].id_kumpulan] = list[i].status;
  return map;
}

function isCollectionActive(statusMap, id_kumpulan) {
  return (statusMap[id_kumpulan] || COLLECTION_STATUS_ACTIVE) === COLLECTION_STATUS_ACTIVE;
}

// Config.exam_kumpulan disimpan sebagai daftar dipisah koma. Kosong berarti
// "semua kumpulan aktif pada mapel ini" — perilaku default dan jalur tenant lama.
function parseCollectionSelection(raw) {
  const parts = String(raw == null ? "" : raw).split(",");
  const ids = [];
  for (let i = 0; i < parts.length; i++) {
    const id = parts[i].trim();
    if (id !== "" && ids.indexOf(id) === -1) ids.push(id);
  }
  return ids;
}

// Jumlah soal aktif per kumpulan dari satu kali baca Questions.
function collectionQuestionCounts() {
  const sheet = getSheet("Questions");
  const rows = sheet ? sheet.getDataRange().getValues() : [];
  const counts = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || isQuestionArchived(row)) continue;
    const id = questionCollectionId(row);
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

function findCollection(list, id_kumpulan) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id_kumpulan === id_kumpulan) return list[i];
  }
  return null;
}

// ===== ACTIVE EXAM — SNAPSHOT & ATTEMPT BINDING =====
// Tetap satu ujian aktif per tenant. Yang berubah: begitu siswa mulai, identitas
// ujian + mapel + durasi + daftar id_soal dibekukan pada baris Users kolom 15.
// Config global boleh berubah setelah itu; attempt yang sedang berjalan tidak ikut
// berubah karena tidak lagi membaca Config sama sekali.
//
// Snapshot sengaja tidak disimpan sebagai entitas global: satu-satunya pemilik
// binding adalah baris siswa, sehingga tidak ada state global yang bisa setengah
// jadi dan tidak perlu sheet baru. exam_id adalah sidik jari isi snapshot, jadi
// dua siswa yang mulai di konfigurasi sama mendapat identitas yang sama dan
// perubahan Config/Bank Soal apa pun menghasilkan identitas berbeda.
const USER_BINDING_COL = 15;
// Kolom 16 = foto_url siswa (append-only). Sheets hanya menyimpan rujukan ke
// berkas di Drive, tidak pernah gambarnya sendiri.
const USER_PHOTO_COL = 16;
// Hanya URL yang memang dihasilkan handleUploadImage yang boleh tersimpan: guru
// tidak pernah mengetik URL, jadi apa pun bentuk lain berarti request buatan.
const DRIVE_PHOTO_URL = /^https:\/\/drive\.google\.com\/thumbnail\?id=[A-Za-z0-9_-]+(&sz=w\d+)?$/;
// Re-entry (RC-6): status_login hanya dianggap "perangkat lain" selama last_seen
// masih segar. Tab yang ditutup kedaluwarsa sendiri, tanpa reset admin.
// ponytail: satu ambang waktu global sudah cukup; naikkan ke device token bila
// kelak perlu membedakan dua perangkat yang sama-sama aktif.
const REENTRY_GRACE_MS = 90000;

function hashToken(text) {
  let hash = 5381;
  const value = String(text);
  for (let i = 0; i < value.length; i++) {
    hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).toUpperCase();
}

// Sidik jari isi soal: seluruh kolom yang menentukan makna jawaban ikut dihitung,
// termasuk nomor_urut karena urutan penyajian ikut dibekukan.
function questionFingerprint(row) {
  const parts = [];
  for (let c = 0; c <= 13; c++) parts.push(String(row[c] == null ? "" : row[c]));
  parts.push(canonicalDataSoalCell(row[QUESTION_DATA_COL - 1]));
  return parts.join("\u0001");
}

// Snapshot ujian aktif dari satu kali baca Config + Questions. Dipanggil hanya saat
// attempt dibuat, lalu hasilnya dibekukan pada baris siswa.
// Soal yang dipakai satu ujian: seluruh soal AKTIF pada mapel tersebut, dalam
// urutan deterministic (nomor_urut, lalu id_soal). Satu-satunya tempat aturan
// "soal apa yang masuk ujian" hidup — dipakai snapshot attempt maupun jumlah soal
// yang ditampilkan ke guru, jadi angka yang dilihat guru = soal yang diterima siswa.
// questionRows dan collectionStatus boleh dioper pemanggil yang SUDAH membaca
// kedua sheet itu, supaya satu permintaan tidak membaca sheet yang sama dua kali.
// Tanpa argumen, perilakunya persis seperti sebelumnya.
function collectExamQuestionRows(exam_mapel, collectionIds, questionRows, collectionStatus) {
  const mapel = String(exam_mapel || "");
  const rows = questionRows || readQuestionRows();
  const statusMap = collectionStatus || collectionStatusMap();
  // Daftar pilihan kosong = seluruh kumpulan aktif pada mapel ini.
  const wanted = {};
  const ids = collectionIds || [];
  for (let c = 0; c < ids.length; c++) wanted[String(ids[c])] = true;
  const hasSelection = ids.length > 0;

  const selected = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || isQuestionArchived(row)) continue;
    if (mapel && String(row[13] || "") !== mapel) continue;
    // Kumpulan yang dinonaktifkan guru tidak ikut ujian baru. Soalnya tetap utuh
    // di Bank Soal dan attempt yang sudah berjalan tidak terpengaruh: soal mereka
    // dibaca dari snapshot, bukan dari sini.
    const collection = questionCollectionId(row);
    if (!isCollectionActive(statusMap, collection)) continue;
    if (hasSelection && !wanted[collection]) continue;
    selected.push(row);
  }

  selected.sort(function (a, b) {
    const left = Number(a[1]);
    const right = Number(b[1]);
    const leftNum = isFinite(left) ? left : 0;
    const rightNum = isFinite(right) ? right : 0;
    if (leftNum !== rightNum) return leftNum - rightNum;
    return String(a[0]) < String(b[0]) ? -1 : (String(a[0]) > String(b[0]) ? 1 : 0);
  });
  return selected;
}

function buildExamSnapshot() {
  const config = getConfig();
  const exam_mapel = String(config.exam_mapel || "");
  const selected = collectExamQuestionRows(exam_mapel, parseCollectionSelection(config.exam_kumpulan));

  const question_ids = [];
  const fingerprints = [];
  for (let s = 0; s < selected.length; s++) {
    question_ids.push(String(selected[s][0]));
    fingerprints.push(questionFingerprint(selected[s]));
  }

  const exam_name = String(config.exam_name || "");
  const exam_duration = parseInt(config.exam_duration, 10) || 90;
  return {
    exam_id: "EX" + hashToken(
      [exam_name, exam_mapel, exam_duration, fingerprints.join("\u0002")].join("\u0003")
    ),
    exam_name: exam_name,
    exam_mapel: exam_mapel,
    exam_duration: exam_duration,
    question_ids: question_ids,
  };
}

// Baris Users kolom 15 → binding. Kosong (baris lama) maupun rusak dibaca null,
// dan pemanggil wajib punya fallback yang aman untuk itu.
function parseExamBinding(userRow) {
  if (!userRow) return null;
  const raw = userRow[USER_BINDING_COL - 1];
  const text = String(raw === null || raw === undefined ? "" : raw).trim();
  if (text === "") return null;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return null;
  }
  if (!isPlainQuestionObject(parsed) || !Array.isArray(parsed.question_ids)) return null;
  const duration = Number(parsed.exam_duration);
  return {
    exam_id: String(parsed.exam_id || ""),
    exam_name: String(parsed.exam_name || ""),
    exam_mapel: String(parsed.exam_mapel || ""),
    exam_duration: isFinite(duration) && duration >= 0 ? duration : 0,
    question_ids: parsed.question_ids.map(String),
  };
}

function findUserRowIndex(usersData, id_siswa) {
  if (!id_siswa) return -1;
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][0] === id_siswa) return i;
  }
  return -1;
}

function getAttemptBinding(id_siswa) {
  const sheet = getSheet("Users");
  if (!sheet || !id_siswa) return null;
  const data = sheet.getDataRange().getValues();
  const index = findUserRowIndex(data, id_siswa);
  return index === -1 ? null : parseExamBinding(data[index]);
}

// Soal yang dibekukan sebuah attempt diambil apa adanya berdasarkan id — termasuk
// bila sudah diarsipkan setelah ujian mulai — dan dalam urutan snapshot.
function resolveBoundQuestionRows(binding) {
  const sheet = getSheet("Questions");
  const rows = sheet ? sheet.getDataRange().getValues() : [];
  const byId = {};
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) byId[String(rows[i][0])] = rows[i];
  }
  const resolved = [];
  for (let q = 0; q < binding.question_ids.length; q++) {
    const row = byId[binding.question_ids[q]];
    if (row) resolved.push(row);
  }
  return resolved;
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

// Field yang boleh ada pada kunci FILL_IN. accepted_answers wajib; dua sisanya opsional.
const FILL_IN_KEY_FIELDS = ["accepted_answers", "case_sensitive", "trim"];

// Normalisasi FILL_IN — satu-satunya tempat aturan ini hidup, dipakai validator
// maupun scorer. Hanya trim dan case folding sesuai flag; perbandingan tetap
// exact. Tidak ada fuzzy matching, stemming, koreksi typo, atau sinonim.
// Default: trim aktif, case-insensitive.
function normalizeFillInValue(value, key) {
  if (typeof value !== "string") return null;
  const trimEnabled = !key || key.trim !== false;
  const caseSensitive = !!(key && key.case_sensitive === true);
  const normalized = trimEnabled ? value.trim() : value;
  return caseSensitive ? normalized : normalized.toLowerCase();
}

// Validasi opsi A–E dan kunci untuk tipe berbasis pilihan (SINGLE/COMPLEX).
// requiredOptionCount mempertahankan aturan tiap tipe tanpa mencampurnya.
function validateChoiceQuestion(data, minKeys, maxKeys, keyCountMessage, requiredOptionCount) {
  const available = [];
  let foundGap = false;
  for (let i = 0; i < OPTION_LETTERS.length; i++) {
    const letter = OPTION_LETTERS[i];
    const value = String(data["opsi_" + letter.toLowerCase()] || "").replace(/<[^>]*>/g, "").trim();
    if (value !== "") {
      if (foundGap) return "Opsi harus berurutan tanpa huruf kosong";
      available.push(letter);
    } else {
      if (i < requiredOptionCount) return "Opsi A sampai " + OPTION_LETTERS[requiredOptionCount - 1] + " wajib diisi";
      foundGap = true;
    }
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

// Validasi satu daftar item bernomor {id, teks} — bentuk yang sama dipakai
// pernyataan TRUE_FALSE maupun kolom kiri/kanan MATCHING. Mengembalikan pesan
// error, atau null plus daftar id yang sah lewat `outIds`.
// `noun` masuk ke pesan supaya teks error tetap spesifik per tipe.
function validateQuestionItemList(items, noun, outIds) {
  if (!Array.isArray(items) || items.length === 0) return "Minimal satu " + noun;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!isPlainQuestionObject(item) ||
        Object.keys(item).some(function (field) { return field !== "id" && field !== "teks"; })) {
      return "Struktur " + noun + " tidak valid";
    }
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const text = typeof item.teks === "string"
      ? item.teks.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
      : "";
    if (!id) return "Setiap " + noun + " wajib memiliki id";
    if (!text) return "Setiap " + noun + " wajib memiliki teks";
    if (outIds[id]) return "ID " + noun + " harus unik";
    outIds[id] = true;
  }
  return null;
}

// Validator per tipe. Tipe baru menambah satu entri di sini, bukan menumbuhkan
// satu conditional raksasa. Hanya tipe yang ada di tabel ini yang diterima.
const QUESTION_TYPE_VALIDATORS = {
  SINGLE: function (data) {
    return validateChoiceQuestion(data, 1, 1, "Soal SINGLE hanya boleh punya satu kunci jawaban", 3);
  },
  COMPLEX: function (data) {
    return validateChoiceQuestion(data, 2, 0, "Soal COMPLEX minimal punya dua kunci jawaban", 4);
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
    const itemError = validateQuestionItemList(statements, "pernyataan TRUE_FALSE", ids);
    if (itemError) return itemError;

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
  MATCHING: function (data) {
    if (!isPlainQuestionObject(data.data_soal) ||
        !Array.isArray(data.data_soal.kiri) || !Array.isArray(data.data_soal.kanan)) {
      return "MATCHING wajib memiliki daftar kiri dan kanan";
    }
    if (Object.keys(data.data_soal).some(function (field) {
      return field !== "kiri" && field !== "kanan";
    })) {
      return "data_soal MATCHING hanya boleh memuat kiri dan kanan";
    }

    // ID kiri dan kanan hidup di ruang nama terpisah: "A" boleh ada di keduanya.
    const leftIds = Object.create(null);
    const leftError = validateQuestionItemList(data.data_soal.kiri, "item kiri MATCHING", leftIds);
    if (leftError) return leftError;
    const rightIds = Object.create(null);
    const rightError = validateQuestionItemList(data.data_soal.kanan, "item kanan MATCHING", rightIds);
    if (rightError) return rightError;

    // Kunci adalah pemetaan id kiri → id kanan. Persis satu pasangan untuk setiap
    // item kiri; tidak boleh ada pasangan yatim atau tujuan yang tidak ada.
    const key = parseScoringObject(data.kunci_jawaban);
    if (!key) return "Kunci jawaban MATCHING harus berupa objek";
    const keyIds = Object.keys(key);
    if (keyIds.length !== Object.keys(leftIds).length) {
      return "Kunci MATCHING harus memasangkan seluruh item kiri";
    }
    for (let i = 0; i < keyIds.length; i++) {
      if (!leftIds[keyIds[i]]) return "Kunci MATCHING menunjuk item kiri yang tidak ada";
      const target = key[keyIds[i]];
      if (typeof target !== "string" || !rightIds[target]) {
        return "Pasangan MATCHING menunjuk item kanan yang tidak ada";
      }
    }
    return null;
  },
  FILL_IN: function (data) {
    if (!isPlainQuestionObject(data.data_soal)) return "FILL_IN wajib memiliki petunjuk";
    if (Object.keys(data.data_soal).some(function (field) { return field !== "petunjuk"; })) {
      return "data_soal FILL_IN hanya boleh memuat petunjuk";
    }
    const petunjuk = typeof data.data_soal.petunjuk === "string"
      ? data.data_soal.petunjuk.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
      : "";
    if (!petunjuk) return "Petunjuk FILL_IN wajib diisi";

    const key = parseScoringObject(data.kunci_jawaban);
    if (!key) return "Kunci jawaban FILL_IN harus berupa objek";
    if (Object.keys(key).some(function (field) {
      return FILL_IN_KEY_FIELDS.indexOf(field) === -1;
    })) {
      return "Kunci FILL_IN hanya boleh memuat accepted_answers, case_sensitive, dan trim";
    }
    if (key.case_sensitive !== undefined && typeof key.case_sensitive !== "boolean") {
      return "Flag case_sensitive FILL_IN harus boolean";
    }
    if (key.trim !== undefined && typeof key.trim !== "boolean") {
      return "Flag trim FILL_IN harus boolean";
    }
    if (!Array.isArray(key.accepted_answers) || key.accepted_answers.length === 0) {
      return "FILL_IN minimal memiliki satu accepted answer";
    }

    // Duplikat ditolak alih-alih di-dedupe diam-diam: guru melihat kesalahannya,
    // dan makna scoring tidak berubah tanpa sepengetahuannya.
    const seen = Object.create(null);
    for (let i = 0; i < key.accepted_answers.length; i++) {
      const value = key.accepted_answers[i];
      if (typeof value !== "string") return "Accepted answer FILL_IN harus berupa teks";
      const normalized = normalizeFillInValue(value, key);
      if (normalized === "") return "Accepted answer FILL_IN tidak boleh kosong";
      if (seen[normalized]) return "Accepted answer FILL_IN tidak boleh duplikat";
      seen[normalized] = true;
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
// Pastikan grid punya cukup baris untuk ditulisi sampai lastRowNeeded.
function ensureQuestionRows(sheet, lastRowNeeded) {
  if (!sheet || typeof sheet.getMaxRows !== "function" || typeof sheet.insertRowsAfter !== "function") return;
  const maxRows = sheet.getMaxRows();
  if (lastRowNeeded > maxRows) sheet.insertRowsAfter(maxRows, lastRowNeeded - maxRows);
}

function ensureQuestionColumns(sheet) {
  if (!sheet || typeof sheet.getMaxColumns !== "function") return;
  const current = sheet.getMaxColumns();
  if (current < QUESTION_COLUMNS) sheet.insertColumnsAfter(current, QUESTION_COLUMNS - current);
}

function questionRowValues(id_soal, data, statusValue, originId, collectionId) {
  const tipe = String(data.tipe).toUpperCase();
  const structuredKey = STRUCTURED_KEY_TYPES.indexOf(tipe) !== -1
    ? parseScoringObject(data.kunci_jawaban)
    : null;
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
    structuredKey ? stableStringify(structuredKey) : parseAnswerKeys(data.kunci_jawaban).join(","),
    Number(data.bobot),
    data.kategori || "",
    String(data.id_mapel || "").trim(),
    statusValue || QUESTION_STATUS_ACTIVE,
    originId || "",
    serializeDataSoal(data.data_soal),
    collectionId || "",
  ];
}

// id_kumpulan yang akan ditulis pada baris soal. Kosong berarti soal tetap pada
// bucket legacy — sah, dan itulah keadaan seluruh soal sebelum fitur ini ada.
// Kumpulan nonaktif tetap boleh menerima soal baru: guru sering menyiapkan
// kumpulan untuk dipakai minggu depan.
function resolveQuestionCollection(data, fallback) {
  const raw = data && data.id_kumpulan;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { id_kumpulan: String(fallback || "") };
  }
  const id = String(raw).trim();
  if (id === KUMPULAN_LEGACY_ID) return { id_kumpulan: "" };

  const found = findCollection(readCollections(), id);
  if (!found) return { error: "Kumpulan soal tidak ditemukan. Pilih ulang kumpulan soal." };

  const mapel = String((data && data.id_mapel) || "").trim();
  if (found.id_mapel && mapel && found.id_mapel !== mapel) {
    return { error: 'Kumpulan soal "' + found.nama_kumpulan + '" bukan milik mata pelajaran soal ini.' };
  }
  return { id_kumpulan: id };
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
        // id_siswa disuntik proxy dari sesi bertanda tangan, tidak pernah dari
        // input siswa; lihat cbt-sekolah-ui/src/lib/proxy.ts.
        result = handleGetQuestions(false, e.parameter.id_siswa);
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
      case "getStudentAnalysis":
        result = handleGetStudentAnalysis(e.parameter);
        break;
      case "getExamPinStatus":
        result = handleGetExamPinStatus();
        break;
      case "getExamStatus":
        result = handleGetExamStatus();
        break;
      case "getExamSummary":
        result = handleGetExamSummary();
        break;
      case "getMataPelajaran":
        result = handleGetMataPelajaran();
        break;
      case "getQuestionCollections":
        result = handleGetQuestionCollections();
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
      case "importQuestions":
        result = handleImportQuestions(params);
        break;
      case "moveQuestions":
        result = handleMoveQuestions(params);
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
      case "saveExamConfig":
        result = handleSaveExamConfig(params);
        break;
      // ── Gambar Soal ──────────────────────────────
      case "uploadImage":
        result = handleUploadImage(params);
        break;
      // ── Mata Pelajaran ───────────────────────────
      case "createQuestionCollection":
        result = handleCreateQuestionCollection(params);
        break;
      case "updateQuestionCollection":
        result = handleUpdateQuestionCollection(params);
        break;
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

    // Satu tempat invalidasi untuk seluruh penulis sheet Users. Dipasang di router,
    // bukan di tiap handler, supaya cabang return baru tidak bisa lupa memanggilnya.
    if (result && result.success && USERS_MUTATING_ACTIONS[action]) {
      invalidateUsersCache();
    }

    return createJsonResponse(result);
  } catch (error) {
    console.error("doPost failed", error);
    return createJsonResponse({ success: false, message: "Internal server error" });
  }
}

// ===== GET HANDLERS =====

// Sel Sheets bisa berupa number/boolean. Nilai Config yang kontraknya teks selalu
// keluar sebagai string; kosong tetap "".
function asConfigText(value) {
  return value === null || value === undefined ? "" : String(value);
}

function handleGetConfig() {
  const config = getConfig();
  // Sel Config yang dipakai client sebagai teks (dipotong, di-uppercase, dicari
  // digitnya) distringkan di sini: nomor WA dan nama ujian berupa angka terbaca
  // Sheets sebagai number, dan method string-nya tidak ada di sisi client.
  const safeConfig = {
    exam_name: asConfigText(config.exam_name),
    exam_duration: config.exam_duration,
    max_violations: config.max_violations,
    auto_submit: config.auto_submit,
    shuffle_questions: config.shuffle_questions,
    admin_wa: asConfigText(config.admin_wa),
    exam_status: asConfigText(config.exam_status) || "OPEN",
    exam_mapel: asConfigText(config.exam_mapel),
    kkm: resolveKkm(config),
    // Turunan, bukan PIN-nya: layar masuk ujian hanya perlu tahu "diminta atau
    // tidak". Nilai exam_pin sendiri tidak pernah ikut keluar dari server, sama
    // seperti admin_password dan live_score_pin yang juga tidak ada di allowlist.
    isPinRequired: String(config.exam_pin || "").trim() !== "",
  };
  return { success: true, data: safeConfig };
}

function handleGetQuestions(skipMapelFilter, id_siswa) {
  // Admin bank soal uses skipMapelFilter=true to see all questions regardless of exam_mapel
  // Siswa yang sudah punya attempt dilayani dari snapshot attempt itu: soal, urutan,
  // dan mapel-nya tidak lagi dipengaruhi Config maupun Bank Soal terbaru.
  const binding = skipMapelFilter ? null : getAttemptBinding(id_siswa);
  const cacheKey = skipMapelFilter
    ? "questions_all"
    : (binding ? "questions_" + binding.exam_id : "questions");
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
  // Admin melihat seluruh Bank Soal. Siswa dengan binding mendapat soal beku milik
  // attempt-nya, dalam urutan snapshot. Siswa tanpa binding (attempt lama) memakai
  // aturan pemilihan yang sama dengan snapshot — satu sumber kebenaran, jadi
  // kumpulan yang dinonaktifkan guru tidak bocor lewat jalur ini.
  const data = skipMapelFilter
    ? sheet.getDataRange().getValues().slice(1)
    : (binding
      ? resolveBoundQuestionRows(binding)
      : collectExamQuestionRows(exam_mapel, parseCollectionSelection(config.exam_kumpulan)));
  const questions = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const id_mapel = row[13] || null;
    const archived = isQuestionArchived(row);

    // Soal arsip tidak pernah dikirim ke siswa, tetapi tetap terlihat di admin
    // supaya soal historis dapat ditelusuri. Soal beku milik attempt tetap dikirim
    // walau diarsipkan setelah ujian dimulai — siswa harus bisa menyelesaikannya.
    if (!skipMapelFilter && !binding && archived) continue;

    // Filter per mapel jika exam_mapel dikonfigurasi (dilewati untuk admin dan
    // untuk attempt yang mapel-nya sudah dibekukan)
    if (!skipMapelFilter && !binding && exam_mapel && id_mapel !== exam_mapel) continue;

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
      // Pengelompokan adalah alat kerja guru; siswa tidak pernah menerimanya.
      entry.id_kumpulan = questionCollectionId(row);
    }
    questions.push(entry);
  }

  // Urutan attempt sudah dibekukan di snapshot; mengurutkan ulang di sini akan
  // memakai nomor_urut terbaru dan membatalkan pembekuan itu.
  if (!binding) questions.sort(function(a, b) { return a.nomor_urut - b.nomor_urut; });

  const result = { success: true, data: questions };
  cache.put(cacheKey, JSON.stringify(result), CACHE_DURATION);
  return result;
}

function handleGetLiveScore() {
  const cached = cache.get(LIVE_SCORE_CACHE_KEY);
  if (cached) return JSON.parse(cached);

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

  const result = {
    success: true,
    data: scores,
    stats: { total: totalUsers, sedang, selesai, diskualifikasi, belum },
  };
  cachePutSafe(LIVE_SCORE_CACHE_KEY, JSON.stringify(result), USERS_CACHE_TTL);
  return result;
}

function handleGetUsers(params) {
  const cached = cache.get(USERS_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    users.push({
      id_siswa: row[0],
      // Sheets mengembalikan sel numerik sebagai number (username/password berupa
      // angka), sedangkan client memperlakukannya sebagai teks. Distringkan di sini,
      // satu-satunya tempat data ini keluar.
      username: row[1] === null || row[1] === undefined ? "" : String(row[1]),
      // Kredensial ikut hanya di payload getUsers (khusus admin, lihat ACTION_RULES)
      // supaya kartu peserta bisa dicetak tanpa admin membuka sheet satu per satu.
      password: row[2] === null || row[2] === undefined ? "" : String(row[2]),
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
      foto_url: row[USER_PHOTO_COL - 1] || "",
    });
  }

  const result = { success: true, data: users };
  cachePutSafe(USERS_CACHE_KEY, JSON.stringify(result), USERS_CACHE_TTL);
  return result;
}

// ===== ANALISIS HASIL BELAJAR — STATISTIK DETERMINISTIC =====
// Semua angka yang dipakai fitur "Analisis dengan AI" dihitung di sini, memakai
// kunci jawaban dan scorer yang sama dengan penilaian ujian. AI hanya menafsirkan
// hasil ini; ia tidak pernah menghitung, tidak pernah mengubah nilai, dan tidak
// pernah menerima nama siswa (handler ini tidak mengembalikannya).
const DEFAULT_KKM = 70;

// KKM tunggal seluruh sistem: Config.kkm bila diisi guru, jika tidak 70.
function resolveKkm(config) {
  const raw = Number((config || {}).kkm);
  return isFinite(raw) && raw > 0 && raw <= 100 ? raw : DEFAULT_KKM;
}

// Baris Responses terakhir milik satu siswa. Ujian ulang menambah baris baru, jadi
// yang terakhir adalah hasil yang berlaku — sama dengan skor pada baris Users.
function latestResponseRow(id_siswa) {
  const sheet = getSheet("Responses");
  const rows = sheet ? sheet.getDataRange().getValues() : [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === id_siswa) return rows[i];
  }
  return null;
}

function parseResponseAnswers(raw) {
  try {
    const parsed = JSON.parse(String(raw || "{}"));
    return isPlainQuestionObject(parsed) ? parsed : {};
  } catch (err) {
    return {};
  }
}

// Statistik per kategori dari soal yang benar-benar dikerjakan siswa (snapshot
// attempt bila ada). `correct` tetap berarti jumlah soal dengan skor penuh;
// partial credit dipertahankan lewat earnedScore/maxScore dan menentukan accuracy.
// ponytail: kategori kosong tidak dikarang namanya — soal tanpa kategori hanya
// masuk hitungan total, dan UI/AI menyatakan data belum cukup bila semuanya kosong.
function buildCategoryStats(questionRows, answers) {
  const order = [];
  const byName = {};
  const totals = {
    total: 0, correct: 0, partial: 0, wrong: 0, unanswered: 0, uncategorized: 0,
  };

  for (let i = 0; i < questionRows.length; i++) {
    const row = questionRows[i];
    if (!row || !row[0]) continue;
    const question = scoringQuestionFromRow(row);
    const answer = answers[question.id_soal];
    const score = scoreQuestion(question, answer);
    const isCorrect = question.bobot > 0 && score >= question.bobot;

    totals.total++;
    if (!isAnswerFilled(answer)) totals.unanswered++;
    if (isCorrect) totals.correct++;
    else if (score > 0) totals.partial++;
    else totals.wrong++;

    const name = String(row[12] || "").trim();
    if (!name) {
      totals.uncategorized++;
      continue;
    }
    if (!byName[name]) {
      byName[name] = {
        name: name, correct: 0, total: 0, earnedScore: 0, maxScore: 0, accuracy: 0,
      };
      order.push(name);
    }
    byName[name].total++;
    if (isCorrect) byName[name].correct++;
    byName[name].earnedScore += score;
    byName[name].maxScore += question.bobot;
  }

  const categories = [];
  for (let c = 0; c < order.length; c++) {
    const entry = byName[order[c]];
    entry.earnedScore = Math.round(entry.earnedScore * 10000) / 10000;
    entry.maxScore = Math.round(entry.maxScore * 10000) / 10000;
    entry.accuracy = entry.maxScore > 0
      ? Math.round((entry.earnedScore / entry.maxScore) * 1000) / 10
      : 0;
    categories.push(entry);
  }
  // Area terlemah lebih dulu; akurasi sama → soal lebih banyak lebih dulu.
  categories.sort(function (a, b) {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.total - a.total;
  });

  return { categories: categories, totals: totals };
}

function handleGetStudentAnalysis(params) {
  const id_siswa = String((params && params.id_siswa) || "").trim();
  if (!id_siswa) return { success: false, message: "id_siswa wajib diisi" };

  const usersSheet = getSheet("Users");
  const usersData = usersSheet ? usersSheet.getDataRange().getValues() : [];
  const userIndex = findUserRowIndex(usersData, id_siswa);
  if (userIndex === -1) return { success: false, message: "Siswa tidak ditemukan" };

  const response = latestResponseRow(id_siswa);
  if (!response) return { success: false, message: "Siswa belum menyelesaikan ujian" };

  const config = getConfig();
  const kkm = resolveKkm(config);
  const binding = parseExamBinding(usersData[userIndex]);
  const exam_mapel = String(response[10] || (binding ? binding.exam_mapel : "") || "");
  const answers = parseResponseAnswers(response[4]);

  // Soal yang dinilai = soal yang dibekukan attempt; attempt lama tanpa binding
  // memakai soal aktif pada mapel yang tercatat di baris Responses.
  const questionRows = binding
    ? resolveBoundQuestionRows(binding)
    : collectExamQuestionRows(exam_mapel);

  const stats = buildCategoryStats(questionRows, answers);
  const score = Math.round(Number(response[5] || 0) * 100) / 100;

  const mapelSheet = getSheet("MataPelajaran");
  let mapel_nama = "";
  if (mapelSheet && exam_mapel) {
    const mapelData = mapelSheet.getDataRange().getValues();
    for (let m = 1; m < mapelData.length; m++) {
      if (String(mapelData[m][0]) === exam_mapel) {
        mapel_nama = String(mapelData[m][2] || "");
        break;
      }
    }
  }

  return {
    success: true,
    data: {
      exam_id: String(response[9] || (binding ? binding.exam_id : "")),
      exam_mapel: exam_mapel,
      mapel_nama: mapel_nama,
      kelas: String(response[3] || usersData[userIndex][4] || ""),
      score: score,
      kkm: kkm,
      status: score >= kkm ? "TUNTAS" : "PERLU_TINDAK_LANJUT",
      total_questions: stats.totals.total,
      correct: stats.totals.correct,
      partial: stats.totals.partial,
      wrong: stats.totals.wrong,
      unanswered: stats.totals.unanswered,
      uncategorized: stats.totals.uncategorized,
      categories: stats.categories,
      // Sidik jari hasil: jawaban/skor/soal berubah → cache analisis jadi stale.
      result_hash: hashToken([
        String(response[9] || ""), String(response[4] || ""), String(response[5] || ""),
        String(stats.totals.total), String(stats.totals.correct), String(stats.totals.partial),
        stableStringify(stats.categories),
      ].join("")),
    },
  };
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

      // RC-6: flag status_login yang tertinggal karena tab ditutup tidak boleh
      // mengunci siswa dari attempt-nya sendiri. Hanya sesi yang masih terlihat
      // hidup (last_seen segar) yang dianggap perangkat lain.
      const lastSeenMs = row[11] ? new Date(row[11]).getTime() : 0;
      if (row[5] === true && isFinite(lastSeenMs) && Date.now() - lastSeenMs < REENTRY_GRACE_MS) {
        return { success: false, message: "Akun sudah login di perangkat lain." };
      }

      // Re-entry memakai attempt yang sama: waktu_mulai, saved_answers, dan binding
      // tidak pernah ditulis ulang, jadi login kembali tidak memperpanjang waktu.
      const waktuMulai = row[6] || new Date();
      sheet.getRange(i + 1, 6).setValue(true);
      if (!row[6]) {
        sheet.getRange(i + 1, 7).setValue(waktuMulai);
        sheet.getRange(i + 1, 11).setValue("SEDANG");
      }
      sheet.getRange(i + 1, 12).setValue(new Date());

      // Snapshot dibekukan sekali per attempt. Attempt lama dari sebelum Task 5.1
      // belum punya binding; dibekukan sekarang dari Config yang berlaku supaya
      // sisa ujiannya tidak lagi ikut berubah.
      let binding = parseExamBinding(row);
      if (!binding) {
        binding = buildExamSnapshot();
        sheet.getRange(i + 1, USER_BINDING_COL).setValue(JSON.stringify(binding));
      }

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
          exam_duration: binding.exam_duration,
          exam_id: binding.exam_id,
          exam_mapel: binding.exam_mapel,
          saved_answers: savedAnswers,
        },
      };
    }
  }

  return { success: false, message: "Username atau password salah." };
}

function handleSyncAnswers(params) {
  const { id_siswa, answers } = params;

  // ponytail: ScriptLock dihapus. Setiap siswa punya row unik; device guard (RC-6)
  // mencegah dua sesi siswa yang sama berjalan bersamaan. Tidak ada shared mutable
  // state antar siswa berbeda, sehingga concurrent syncAnswers dari 10 siswa pun
  // tidak pernah menyentuh row yang sama. Submit-race ditangani oleh guard
  // "already_submitted" di bawah, bukan oleh lock.
  var sheet = getSheet("Users");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      // ponytail: server-side guard — reject sync after submit to close autosave race
      var status = data[i][10] || "BELUM";
      if (status === "SELESAI" || status === "DISKUALIFIKASI") {
        return { success: false, message: "already_submitted" };
      }
      // Deadline attempt memakai durasi beku; Config yang berubah di tengah ujian
      // tidak boleh memutus autosave siswa yang sedang berjalan.
      var syncBinding = parseExamBinding(data[i]);
      var syncDuration = syncBinding ? syncBinding.exam_duration : getConfig().exam_duration;
      if (isExamDeadlinePassed(data[i][6], syncDuration)) {
        return { success: false, message: "deadline_expired" };
      }
      // Stale-write guard. Tanpa ScriptLock, autosave yang berangkat lebih dulu
      // bisa tiba lebih akhir dan menimpa jawaban yang lebih baru. `rev` adalah
      // penghitung monoton milik klien (satu per browser, dibagi antar tab) yang
      // HANYA dipakai untuk mengurutkan autosave — bukan untuk identitas, bukan
      // untuk otorisasi, bukan untuk menentukan sudah-submit atau deadline.
      // Request tanpa rev tetap diterima supaya klien/tenant lama tidak rusak.
      var revKey = "syncrev_" + id_siswa;
      var incomingRev = Number(params.rev);
      var hasRev = isFinite(incomingRev) && incomingRev > 0;
      if (hasRev) {
        var storedRev = Number(cache.get(revKey));
        if (isFinite(storedRev) && storedRev > 0 && incomingRev < storedRev) {
          return { success: false, message: "stale_write" };
        }
      }
      var serialized = JSON.stringify(answers);
      cache.put("answers_" + id_siswa, serialized, 3600);
      if (hasRev) cache.put(revKey, String(incomingRev), 3600);
      sheet.getRange(i + 1, 12).setValue(new Date());  // last_seen
      sheet.getRange(i + 1, 14).setValue(serialized);  // saved_answers (col N)
      return { success: true, message: "Synced" };
    }
  }

  return { success: false, message: "User not found" };
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

// FILL_IN: full atau nol, tidak ada partial. Kunci atau jawaban rusak bernilai 0,
// bukan error.
function scoreFillIn(question, answer) {
  const key = parseScoringObject(question.kunci_jawaban);
  if (!key || !Array.isArray(key.accepted_answers) || typeof answer !== "string") return 0;

  const submitted = normalizeFillInValue(answer, key);
  // Jawaban yang menjadi kosong setelah normalisasi (mis. spasi saja) tidak pernah benar.
  if (submitted === "") return 0;

  for (let i = 0; i < key.accepted_answers.length; i++) {
    const accepted = key.accepted_answers[i];
    if (typeof accepted !== "string") continue;
    if (normalizeFillInValue(accepted, key) === submitted) return question.bobot;
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

// questionRows selalu berbentuk seperti sheet: indeks 0 adalah header dan dilewati.
// `frozen` menandai bahwa deretan baris sudah merupakan soal beku milik satu attempt
// — pada mode itu filter mapel dan arsip tidak berlaku lagi, karena seleksinya sudah
// dikunci saat attempt dibuat.
function scoreExam(questionRows, answers, examMapel, frozen) {
  const submitted = isPlainQuestionObject(answers) ? answers : {};
  let totalScore = 0;
  let maxScore = 0;

  for (let i = 1; i < questionRows.length; i++) {
    const row = questionRows[i];
    if (!row || !row[0]) continue;
    if (!frozen && isQuestionArchived(row)) continue;

    const question = scoringQuestionFromRow(row);
    if (!frozen && examMapel && question.id_mapel !== examMapel) continue;

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

  // Satu read saja untuk idempotency check, binding, dan write data.
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  // Idempotency: kalau siswa sudah pernah submit, kembalikan hasil yang tersimpan
  // tanpa menghitung ulang dan tanpa menambah baris Responses. Ini menutup retry
  // setelah browser timeout padahal server sebenarnya sudah sukses.
  for (let g = 1; g < data.length; g++) {
    if (data[g][0] === id_siswa) {
      const prevStatus = data[g][10];
      if (prevStatus === "SELESAI" || prevStatus === "DISKUALIFIKASI") {
        const prevScore = data[g][8];
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

  // Seluruh parameter penilaian diambil dari binding attempt. Config hanya dipakai
  // untuk attempt lama yang belum punya binding.
  const guardIndex = findUserRowIndex(data, id_siswa);
  const binding = guardIndex === -1 ? null : parseExamBinding(data[guardIndex]);
  const config = getConfig();
  const exam_mapel = binding ? binding.exam_mapel : (config.exam_mapel || "");
  const exam_id = binding ? binding.exam_id : "";
  const examDuration = binding ? binding.exam_duration : Number(config.exam_duration);
  const authoritativeStart = guardIndex === -1 ? null : data[guardIndex][6];
  const deadlineMs = getExamDeadlineMs(authoritativeStart, examDuration);
  if (deadlineMs === null) {
    return { success: false, message: "Waktu mulai ujian tidak valid" };
  }
  const isLate = Date.now() >= deadlineMs;

  const submittedAnswers = isPlainQuestionObject(answers) ? answers : {};
  // Soal yang dinilai adalah soal yang dibekukan saat attempt dimulai, bukan Bank
  // Soal terbaru: soal delivered == soal scored, walau bank soal sudah berubah.
  // [null] menempati posisi header supaya bentuknya sama dengan getValues().
  const scoring = binding
    ? scoreExam([null].concat(resolveBoundQuestionRows(binding)), submittedAnswers, "", true)
    : scoreExam(getSheet("Questions").getDataRange().getValues(), submittedAnswers, exam_mapel);
  const finalScore = scoring.finalScore;

  // Cari row siswa dari data yang sudah dibaca
  let userName = "", userClass = "", waktuMulai = null, violationLog = "";

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      userName = data[i][3];
      userClass = data[i][4];
      waktuMulai = data[i][6];
      violationLog = "Tab switch/violations: " + (data[i][9] || 0) + "x";

      // Batch write kolom 6–9 dalam satu operasi Sheets (range kontinu):
      //   col 6 = status_login (false)
      //   col 7 = waktu_mulai — tidak diubah, ditulis ulang nilai yang sudah ada
      //   col 8 = waktu_selesai (now)
      //   col 9 = skor_akhir
      // ponytail: col 7 ditulis ulang agar range tetap kontinu; nilainya identik.
      sheet.getRange(i + 1, 6, 1, 4).setValues([[false, data[i][6], new Date(), finalScore.toFixed(2)]]);
      sheet.getRange(i + 1, 11).setValue(forced ? "DISKUALIFIKASI" : "SELESAI");
      sheet.getRange(i + 1, 13).setValue(exam_mapel); // simpan mapel yang diujikan
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
  // Kolom 10 dan 11 ditambahkan append-only: baris Responses lama tetap sah dibaca,
  // arti kolom 1..9 tidak berubah, dan hasil baru dapat ditelusuri ke revisi ujian.
  rSheet.appendRow([
    new Date(), id_siswa, userName, userClass,
    JSON.stringify(submittedAnswers), finalScore.toFixed(2), durasiMenit,
    submissionLog, "", exam_id, exam_mapel,
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
    // Versi baru tetap tinggal di kumpulan yang sama, kecuali guru memindahkannya.
    const collection = resolveQuestionCollection(data, currentRow[QUESTION_COLLECTION_COL - 1] || "");
    if (collection.error) return { success: false, message: collection.error };
    sheet.appendRow(questionRowValues(newId, data, QUESTION_STATUS_ACTIVE, originId, collection.id_kumpulan));
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

    const collection = resolveQuestionCollection(data, "");
    if (collection.error) return { success: false, message: collection.error };

    ensureQuestionColumns(sheet);
    sheet.appendRow(questionRowValues(id_soal, data, QUESTION_STATUS_ACTIVE, "", collection.id_kumpulan));
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
          // Hanya urutan/kumpulan yang berubah: metadata penyajian dan
          // pengelompokan, bukan isi yang menentukan makna jawaban historis.
          if (String(current[1]) !== String(data.nomor_urut)) {
            sheet.getRange(i + 1, 2).setValue(data.nomor_urut);
            cache.remove("questions"); cache.remove("questions_all");
          }
          const moved = resolveQuestionCollection(data, current[QUESTION_COLLECTION_COL - 1] || "");
          if (moved.error) return { success: false, message: moved.error };
          if (String(current[QUESTION_COLLECTION_COL - 1] || "") !== moved.id_kumpulan) {
            ensureQuestionColumns(sheet);
            sheet.getRange(i + 1, QUESTION_COLLECTION_COL).setValue(moved.id_kumpulan);
            cache.remove("questions"); cache.remove("questions_all");
          }
          return { success: true, message: "Question updated", versioned: false };
        }
        return createQuestionVersion(sheet, i + 1, current, data, origin || id_soal);
      }

      const collection = resolveQuestionCollection(data, current[QUESTION_COLLECTION_COL - 1] || "");
      if (collection.error) return { success: false, message: collection.error };

      ensureQuestionColumns(sheet);
      sheet.getRange(i + 1, 1, 1, QUESTION_COLUMNS)
        .setValues([questionRowValues(id_soal, data, status, origin, collection.id_kumpulan)]);

      cache.remove("questions"); cache.remove("questions_all");
      return { success: true, message: "Question updated", versioned: false };
    }
  }

  return { success: false, message: "Question not found" };
}

// Import soal dari dokumen Word. Jalurnya persis jalur entri manual: validator,
// pembangun baris, dan penomoran id yang sama — hanya saja banyak soal sekaligus
// supaya 60-an soal tidak menjadi 60 kali perjalanan bolak-balik ke server.
// Soal yang ditolak validator dilaporkan per nomor; sisanya tetap masuk.
const IMPORT_QUESTIONS_MAX = 200;

function handleImportQuestions(params) {
  const items = params && params.questions;
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, message: "Tidak ada soal yang dikirim." };
  }
  if (items.length > IMPORT_QUESTIONS_MAX) {
    return {
      success: false,
      message: "Maksimal " + IMPORT_QUESTIONS_MAX + " soal sekali import. Bagi dokumen menjadi beberapa bagian.",
    };
  }

  // Lock dipegang dari baca id sampai write terakhir supaya dua import bersamaan
  // tidak menghasilkan id_soal yang sama.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { success: false, message: "Server sedang sibuk, coba lagi sebentar." };
  }

  try {
    const sheet = getSheet("Questions");
    if (!sheet) return { success: false, message: "Bank Soal belum tersedia." };
    const takenIds = collectQuestionIds(sheet.getDataRange().getValues());
    ensureQuestionColumns(sheet);

    // Satu kumpulan tujuan untuk seluruh batch: guru memilihnya sekali di layar
    // import, dan sheet KumpulanSoal cukup dibaca sekali, bukan per soal.
    const target = resolveQuestionCollection(
      { id_kumpulan: params.id_kumpulan, id_mapel: items[0] && items[0].id_mapel },
      ""
    );
    if (target.error) return { success: false, message: target.error };

    const added = [];
    const rejected = [];
    // ponytail: kumpulkan semua baris valid dahulu, tulis satu kali dengan setValues.
    // 200 appendRow = 200 Sheets API calls; satu setValues = 1 call.
    // Ordering terjaga karena baris dibangun dalam urutan items[].
    const rowsToWrite = [];
    for (let i = 0; i < items.length; i++) {
      const data = items[i];
      const invalid = validateQuestionPayload(data);
      if (invalid) {
        rejected.push({ nomor_urut: data && data.nomor_urut, message: invalid });
        continue;
      }
      const id_soal = generateQuestionId(takenIds);
      takenIds[id_soal] = true;
      rowsToWrite.push(questionRowValues(id_soal, data, QUESTION_STATUS_ACTIVE, "", target.id_kumpulan));
      added.push(id_soal);
    }

    if (rowsToWrite.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      // appendRow menumbuhkan grid sendiri; setValues tidak. Tanpa penjagaan ini
      // sheet yang mendekati batas baris membuat SELURUH import gagal, padahal
      // Bank Soal masih sanggup menampungnya.
      ensureQuestionRows(sheet, startRow + rowsToWrite.length - 1);
      sheet.getRange(startRow, 1, rowsToWrite.length, QUESTION_COLUMNS).setValues(rowsToWrite);
    }

    cache.remove("questions"); cache.remove("questions_all");
    return {
      success: true,
      message: added.length + " soal berhasil ditambahkan ke Bank Soal",
      data: { added: added.length, rejected: rejected },
    };
  } finally {
    lock.releaseLock();
  }
}

// Pindahkan soal antar kumpulan, atau keluarkan dari kumpulannya (id_kumpulan
// kosong). Ini murni perubahan pengelompokan: tidak ada baris yang dihapus, isi
// soal tidak disentuh, dan riwayat versinya tidak berubah. Attempt yang sedang
// berjalan juga tidak terpengaruh — soalnya dibaca dari snapshot attempt.
const MOVE_QUESTIONS_MAX = 500;

function handleMoveQuestions(params) {
  const ids = params && Array.isArray(params.id_soal) ? params.id_soal : [];
  if (ids.length === 0) return { success: false, message: "Pilih dulu soal yang ingin dipindahkan." };
  if (ids.length > MOVE_QUESTIONS_MAX) {
    return { success: false, message: "Maksimal " + MOVE_QUESTIONS_MAX + " soal sekali pindah." };
  }

  const requested = String((params && params.id_kumpulan) || "").trim();
  // Kosong maupun bucket bawaan sama-sama berarti "tidak masuk kumpulan mana pun".
  const target = requested === KUMPULAN_LEGACY_ID ? "" : requested;
  let targetCollection = null;
  if (target !== "") {
    targetCollection = findCollection(readCollections(), target);
    if (!targetCollection) {
      return { success: false, message: "Kumpulan soal tidak ditemukan. Pilih ulang kumpulan soal." };
    }
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { success: false, message: "Server sedang sibuk, coba lagi sebentar." };
  }

  try {
    const sheet = getSheet("Questions");
    if (!sheet) return { success: false, message: "Bank Soal belum tersedia." };
    ensureQuestionColumns(sheet);
    const rows = sheet.getDataRange().getValues();

    const rowNumberById = {};
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) rowNumberById[String(rows[i][0])] = i + 1;
    }

    const pending = [];
    const skipped = [];
    const seen = {};
    for (let i = 0; i < ids.length; i++) {
      const id = String(ids[i] == null ? "" : ids[i]).trim();
      if (id === "" || seen[id]) continue;
      seen[id] = true;
      const rowNumber = rowNumberById[id];
      if (!rowNumber) {
        skipped.push({ id_soal: id, message: "Soal tidak ditemukan." });
        continue;
      }
      // Kumpulan milik satu mapel tidak boleh menampung soal mapel lain; soal
      // seperti itu dilewati dan dilaporkan, bukan membatalkan seluruh aksi.
      const mapel = String(rows[rowNumber - 1][13] || "");
      if (targetCollection && targetCollection.id_mapel && mapel && targetCollection.id_mapel !== mapel) {
        skipped.push({ id_soal: id, message: "Mata pelajaran soal berbeda dengan kumpulan tujuan." });
        continue;
      }
      pending.push(rowNumber);
    }

    if (pending.length === 0) {
      return { success: false, message: "Tidak ada soal yang dapat dipindahkan.", data: { moved: 0, skipped: skipped } };
    }

    // Satu tulisan untuk seluruh blok baris terpilih, bukan satu per soal:
    // memindahkan 50 soal tetap satu operasi Sheets.
    let minRow = pending[0];
    let maxRow = pending[0];
    for (let p = 1; p < pending.length; p++) {
      if (pending[p] < minRow) minRow = pending[p];
      if (pending[p] > maxRow) maxRow = pending[p];
    }
    const column = [];
    for (let r = minRow; r <= maxRow; r++) {
      const existing = rows[r - 1] ? rows[r - 1][QUESTION_COLLECTION_COL - 1] : "";
      column.push([existing == null ? "" : existing]);
    }
    for (let p = 0; p < pending.length; p++) column[pending[p] - minRow][0] = target;
    sheet.getRange(minRow, QUESTION_COLLECTION_COL, column.length, 1).setValues(column);

    cache.remove("questions"); cache.remove("questions_all");
    const message = target === ""
      ? pending.length + " soal dikeluarkan dari kumpulan dan tetap tersimpan di Bank Soal."
      : pending.length + ' soal dipindahkan ke "' + targetCollection.nama_kumpulan + '".';
    return { success: true, message: message, data: { moved: pending.length, skipped: skipped } };
  } finally {
    lock.releaseLock();
  }
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
          message: "Soal ini sudah pernah dipakai dalam ujian, jadi tetap disimpan agar rekap hasil ujian " +
            "tidak berubah. Soal sudah tidak dipakai lagi untuk ujian berikutnya.",
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

// Drive menentukan jenis berkas dari ekstensi namanya. Berkas gambar yang diunggah
// tanpa ekstensi tersimpan sebagai berkas biasa, Drive tidak pernah membuat
// thumbnail untuknya, dan URL thumbnail yang kita kembalikan lalu gagal dimuat
// browser (ikon gambar rusak) walaupun berkasnya ada dan izinnya benar.
// Ekstensi dipastikan di sini, satu tempat untuk semua pemanggil unggah gambar.
const IMAGE_MIME_EXTENSION = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

function imageFileNameFor(fileName, mimeType) {
  const base = String(fileName == null ? "" : fileName).trim() || ("gambar_" + Date.now());
  const dot = base.lastIndexOf(".");
  const current = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  if (IMAGE_EXTENSIONS.indexOf(current) !== -1) return base;
  const extension = IMAGE_MIME_EXTENSION[String(mimeType || "").toLowerCase()] || "jpg";
  return base + "." + extension;
}

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
      imageFileNameFor(fileName, normalizedMime)
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

// ===== KUMPULAN SOAL HANDLERS =====
// Semua admin-only (lihat ACTION_RULES di proxy). Tidak ada aksi hapus: status
// Tidak aktif sudah menjawab "kumpulan ini tidak dipakai sekarang" tanpa pernah
// kehilangan satu soal pun.

function handleGetQuestionCollections() {
  return { success: true, data: collectionListPayload(null) };
}

function collectionNameError(nama) {
  if (!nama) return "Nama kumpulan soal wajib diisi.";
  if (nama.length > COLLECTION_NAME_MAX_LENGTH) {
    return "Nama kumpulan soal terlalu panjang, maksimal " + COLLECTION_NAME_MAX_LENGTH + " karakter.";
  }
  return null;
}

function handleCreateQuestionCollection(params) {
  const nama_kumpulan = String((params && params.nama_kumpulan) || "").trim();
  const id_mapel = String((params && params.id_mapel) || "").trim();
  const invalid = collectionNameError(nama_kumpulan);
  if (invalid) return { success: false, message: invalid };

  if (id_mapel) {
    const validMapel = getValidMapelIds();
    if (!validMapel || validMapel.indexOf(id_mapel) === -1) {
      return { success: false, message: "Mata pelajaran tidak ditemukan. Pilih ulang mata pelajaran." };
    }
  }

  // Lock dari baca id sampai append supaya dua pembuatan bersamaan tidak
  // menghasilkan id yang sama.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { success: false, message: "Server sedang sibuk, coba lagi sebentar." };
  }
  try {
    const sheet = getCollectionSheet(true);
    if (!sheet) return { success: false, message: "Kumpulan soal belum dapat disimpan. Coba lagi." };

    const existing = readCollections();
    let id_kumpulan = "K" + Date.now().toString(36).toUpperCase();
    while (findCollection(existing, id_kumpulan)) {
      id_kumpulan = "K" + Date.now().toString(36).toUpperCase() +
        Math.floor(Math.random() * 36 * 36).toString(36).toUpperCase();
    }

    sheet.appendRow([
      id_kumpulan, nama_kumpulan, id_mapel, COLLECTION_STATUS_ACTIVE, new Date().toISOString(), "",
    ]);
    return {
      success: true,
      message: 'Kumpulan soal "' + nama_kumpulan + '" dibuat.',
      data: { id_kumpulan: id_kumpulan, nama_kumpulan: nama_kumpulan, id_mapel: id_mapel },
    };
  } finally {
    lock.releaseLock();
  }
}

// Satu handler untuk ganti nama dan ubah status: keduanya menulis baris yang sama
// dan guru sering melakukannya dari layar yang sama.
function handleUpdateQuestionCollection(params) {
  const id_kumpulan = String((params && params.id_kumpulan) || "").trim();
  if (!id_kumpulan) return { success: false, message: "Kumpulan soal tidak ditemukan." };

  const hasName = params.nama_kumpulan !== undefined && params.nama_kumpulan !== null;
  const hasStatus = params.status !== undefined && params.status !== null && String(params.status) !== "";
  if (!hasName && !hasStatus) return { success: false, message: "Tidak ada perubahan yang dikirim." };

  const nama_kumpulan = hasName ? String(params.nama_kumpulan).trim() : "";
  if (hasName) {
    const invalid = collectionNameError(nama_kumpulan);
    if (invalid) return { success: false, message: invalid };
  }
  let status = "";
  if (hasStatus) {
    status = String(params.status).toUpperCase();
    if (status !== COLLECTION_STATUS_ACTIVE && status !== COLLECTION_STATUS_INACTIVE) {
      return { success: false, message: "Status kumpulan soal tidak valid." };
    }
  }

  const sheet = getCollectionSheet(true);
  if (!sheet) return { success: false, message: "Kumpulan soal belum dapat disimpan. Coba lagi." };
  const list = readCollections();
  const found = findCollection(list, id_kumpulan);

  // Bucket legacy belum punya baris sampai guru pertama kali mengaturnya. Barisnya
  // ditulis di sini, bukan lewat migrasi: tidak ada soal yang tersentuh.
  if (!found) {
    if (id_kumpulan !== KUMPULAN_LEGACY_ID) {
      return { success: false, message: "Kumpulan soal tidak ditemukan." };
    }
    sheet.appendRow([
      KUMPULAN_LEGACY_ID,
      hasName && nama_kumpulan ? nama_kumpulan : KUMPULAN_LEGACY_NAME,
      "",
      hasStatus ? status : COLLECTION_STATUS_ACTIVE,
      new Date().toISOString(),
      "",
    ]);
    cache.remove("questions"); cache.remove("questions_all");
    return { success: true, message: "Kumpulan soal diperbarui." };
  }

  if (hasName) sheet.getRange(found.row_number, 2).setValue(nama_kumpulan);
  if (hasStatus) sheet.getRange(found.row_number, 4).setValue(status);

  // Status kumpulan ikut menentukan soal ujian berikutnya, jadi cache soal harus
  // ikut kedaluwarsa. Attempt yang sedang berjalan tidak terpengaruh: soalnya
  // dibaca dari snapshot attempt, bukan dari Bank Soal.
  cache.remove("questions"); cache.remove("questions_all");

  const count = collectionQuestionCounts()[id_kumpulan] || 0;
  let message = "Kumpulan soal diperbarui.";
  if (hasStatus && status === COLLECTION_STATUS_INACTIVE) {
    message = count + " soal tetap tersimpan dan dapat diaktifkan kembali kapan saja.";
  } else if (hasStatus) {
    message = count + " soal kini tersedia untuk dipilih saat membuat ujian.";
  }
  return { success: true, message: message, data: { id_kumpulan: id_kumpulan, jumlah_soal: count } };
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
      if (key === "exam_mapel") cache.remove("questions");
      cache.remove("questions_all");
      return { success: true, message: "Config updated" };
    }
  }

  sheet.appendRow([key, value, ""]);
  cache.remove("config");
  if (key === "exam_mapel") cache.remove("questions");
  cache.remove("questions_all");
  return { success: true, message: "Config added" };
}

// ===== ADAKAN UJIAN — KONFIGURASI UJIAN AKTIF =====
// Satu aksi, satu konfigurasi utuh. Sebelumnya UI menyimpan nama/mapel/durasi
// lewat beberapa updateConfig terpisah, sehingga satu request gagal bisa
// meninggalkan ujian dengan mapel baru tetapi durasi lama.
const EXAM_NAME_MAX_LENGTH = 120;
const EXAM_DURATION_MIN = 1;
const EXAM_DURATION_MAX = 600;

// Tulis beberapa key Config dalam satu pass. Dipanggil di dalam lock.
// ponytail: setValue per baris sudah cukup untuk sheet Config sepanjang belasan
// baris; pindah ke satu setValues bila Config kelak tumbuh besar.
function writeConfigValues(values) {
  const sheet = getSheet("Config");
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  const keys = Object.keys(values);
  const pending = {};
  for (let k = 0; k < keys.length; k++) pending[keys[k]] = true;

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    if (pending[key]) {
      sheet.getRange(i + 1, 2).setValue(values[key]);
      delete pending[key];
    }
  }
  const remaining = Object.keys(pending);
  for (let r = 0; r < remaining.length; r++) {
    sheet.appendRow([remaining[r], values[remaining[r]], ""]);
  }

  cache.remove("config");
  cache.remove("questions");
  cache.remove("questions_all");
  return true;
}

// Ringkasan untuk layar "Adakan Ujian": konfigurasi aktif + jumlah soal aktif per
// mapel, supaya guru melihat jumlah soal berubah saat mengganti pilihan mapel
// tanpa memuat seluruh Bank Soal.
function handleGetExamSummary() {
  const config = getConfig();
  // Satu kali baca Questions dan satu kali baca KumpulanSoal untuk SELURUH angka
  // di layar guru. Sebelumnya kedua sheet itu dibaca ulang oleh helper di bawah,
  // jadi satu permintaan menghasilkan lima pembacaan sheet.
  const rows = readQuestionRows();
  const collections = readCollections();
  const statusMap = collectionStatusMap(collections);
  const counts = {};
  // Jumlah soal per kumpulan, per mapel, dan gabungan mapel dihitung dari satu
  // kali baca Questions — layar guru tidak perlu memuat seluruh Bank Soal.
  const collection_counts = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || isQuestionArchived(row)) continue;
    const id = questionCollectionId(row);
    collection_counts[id] = (collection_counts[id] || 0) + 1;
    const mapel = String(row[13] || "");
    if (!mapel) continue;
    // Angka per mapel mengikuti aturan yang sama dengan ujian: kumpulan nonaktif
    // tidak dihitung, supaya angka di layar = soal yang benar-benar diterima siswa.
    if (!isCollectionActive(statusMap, id)) continue;
    counts[mapel] = (counts[mapel] || 0) + 1;
  }

  const exam_mapel = String(config.exam_mapel || "");
  const exam_kumpulan = parseCollectionSelection(config.exam_kumpulan);
  return {
    success: true,
    data: {
      exam_name: String(config.exam_name || ""),
      exam_mapel: exam_mapel,
      exam_duration: parseInt(config.exam_duration, 10) || 90,
      exam_status: config.exam_status || "OPEN",
      question_counts: counts,
      question_count: collectExamQuestionRows(exam_mapel, exam_kumpulan, rows, statusMap).length,
      exam_kumpulan: exam_kumpulan,
      collections: collectionListPayload(collection_counts, collections),
    },
  };
}

// Daftar kumpulan untuk layar guru. Bucket legacy hanya muncul bila memang ada
// soal yang belum dikelompokkan.
function collectionListPayload(counts, collections) {
  const questionCounts = counts || collectionQuestionCounts();
  const list = collections || readCollections();
  const payload = [];
  let legacyListed = false;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.id_kumpulan === KUMPULAN_LEGACY_ID) legacyListed = true;
    payload.push({
      id_kumpulan: item.id_kumpulan,
      nama_kumpulan: item.nama_kumpulan,
      id_mapel: item.id_mapel,
      status: item.status,
      jumlah_soal: questionCounts[item.id_kumpulan] || 0,
      terakhir_dipakai: item.terakhir_dipakai,
      bawaan: item.id_kumpulan === KUMPULAN_LEGACY_ID,
    });
  }
  if (!legacyListed && questionCounts[KUMPULAN_LEGACY_ID]) {
    payload.push({
      id_kumpulan: KUMPULAN_LEGACY_ID,
      nama_kumpulan: KUMPULAN_LEGACY_NAME,
      id_mapel: "",
      status: COLLECTION_STATUS_ACTIVE,
      jumlah_soal: questionCounts[KUMPULAN_LEGACY_ID],
      terakhir_dipakai: "",
      bawaan: true,
    });
  }
  return payload;
}

function handleSaveExamConfig(params) {
  // Lock supaya dua guru yang menyimpan hampir bersamaan tidak menghasilkan
  // campuran nama baru + mapel lama.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { success: false, message: "Server sedang sibuk, coba lagi sebentar." };
  }
  try {
    return saveExamConfigLocked(params || {});
  } finally {
    lock.releaseLock();
  }
}

function saveExamConfigLocked(params) {
  const exam_name = String(params.exam_name == null ? "" : params.exam_name).trim();
  const exam_mapel = String(params.exam_mapel == null ? "" : params.exam_mapel).trim();
  const exam_status = String(params.exam_status || "").toUpperCase();

  if (!exam_name) return { success: false, message: "Nama ujian wajib diisi." };
  if (exam_name.length > EXAM_NAME_MAX_LENGTH) {
    return { success: false, message: "Nama ujian terlalu panjang, maksimal " + EXAM_NAME_MAX_LENGTH + " karakter." };
  }
  if (!exam_mapel) return { success: false, message: "Mata pelajaran wajib dipilih." };
  const validMapel = getValidMapelIds();
  if (!validMapel || validMapel.indexOf(exam_mapel) === -1) {
    return { success: false, message: "Mata pelajaran tidak ditemukan. Pilih ulang mata pelajaran." };
  }

  const exam_duration = Number(params.exam_duration);
  if (!isFinite(exam_duration) || Math.floor(exam_duration) !== exam_duration ||
      exam_duration < EXAM_DURATION_MIN || exam_duration > EXAM_DURATION_MAX) {
    return {
      success: false,
      message: "Durasi ujian harus berupa angka antara " + EXAM_DURATION_MIN + " dan " + EXAM_DURATION_MAX + " menit.",
    };
  }
  if (exam_status !== "OPEN" && exam_status !== "CLOSED") {
    return { success: false, message: "Status ujian tidak valid." };
  }

  // Kumpulan soal yang dipilih guru. Kosong = pakai semua kumpulan aktif pada
  // mapel tersebut, sehingga tenant yang belum memakai kumpulan tidak berubah.
  const exam_kumpulan = normalizeExamCollectionInput(params.exam_kumpulan);
  if (exam_kumpulan.length > 0) {
    const known = readCollections();
    const counts = collectionQuestionCounts();
    for (let i = 0; i < exam_kumpulan.length; i++) {
      const id = exam_kumpulan[i];
      const found = findCollection(known, id);
      // Bucket legacy sah walau belum punya baris sheet: ia mewakili soal yang
      // memang ada tetapi belum dikelompokkan.
      if (!found && !(id === KUMPULAN_LEGACY_ID && counts[KUMPULAN_LEGACY_ID])) {
        return { success: false, message: "Kumpulan soal tidak ditemukan. Pilih ulang kumpulan soal." };
      }
      if (found && found.status !== COLLECTION_STATUS_ACTIVE) {
        return {
          success: false,
          message: 'Kumpulan soal "' + found.nama_kumpulan + '" sedang tidak aktif. Aktifkan dulu di Bank Soal.',
        };
      }
      if (found && found.id_mapel && found.id_mapel !== exam_mapel) {
        return {
          success: false,
          message: 'Kumpulan soal "' + found.nama_kumpulan + '" bukan milik mata pelajaran yang dipilih.',
        };
      }
    }
  }

  // Jumlah soal dihitung ulang di server di dalam lock; angka dari layar guru
  // tidak pernah dipercaya. Ujian kosong tidak boleh dibuka.
  const questionCount = collectExamQuestionRows(exam_mapel, exam_kumpulan).length;
  if (exam_status === "OPEN" && questionCount === 0) {
    return {
      success: false,
      message: exam_kumpulan.length > 0
        ? "Kumpulan soal yang dipilih belum berisi soal. Pilih kumpulan lain atau tambahkan soal dulu."
        : "Belum ada soal aktif untuk mata pelajaran ini. Tambahkan soal di Bank Soal terlebih dahulu.",
    };
  }

  const written = writeConfigValues({
    exam_name: exam_name,
    exam_mapel: exam_mapel,
    exam_duration: exam_duration,
    exam_status: exam_status,
    exam_kumpulan: exam_kumpulan.join(","),
  });
  if (!written) return { success: false, message: "Gagal menyimpan pengaturan ujian. Silakan coba lagi." };

  if (exam_status === "OPEN") markCollectionsUsed(exam_kumpulan);

  return {
    success: true,
    message: exam_status === "OPEN" ? "Ujian berhasil dibuka" : "Pengaturan ujian tersimpan",
    data: {
      exam_name: exam_name,
      exam_mapel: exam_mapel,
      exam_duration: exam_duration,
      exam_status: exam_status,
      question_count: questionCount,
      exam_kumpulan: exam_kumpulan,
    },
  };
}

// Daftar kumpulan dari request: menerima array maupun string berkoma.
function normalizeExamCollectionInput(value) {
  if (Array.isArray(value)) {
    const ids = [];
    for (let i = 0; i < value.length; i++) {
      const id = String(value[i] == null ? "" : value[i]).trim();
      if (id !== "" && ids.indexOf(id) === -1) ids.push(id);
    }
    return ids;
  }
  return parseCollectionSelection(value);
}

// Catat kapan sebuah kumpulan terakhir dipakai ujian. Informasi tampilan saja;
// kegagalan menulisnya tidak boleh menggagalkan pembukaan ujian.
function markCollectionsUsed(ids) {
  if (!ids || ids.length === 0) return;
  const sheet = getCollectionSheet(false);
  if (!sheet) return;
  const list = readCollections();
  const stamp = new Date().toISOString();
  for (let i = 0; i < ids.length; i++) {
    const found = findCollection(list, ids[i]);
    if (found) sheet.getRange(found.row_number, 6).setValue(stamp);
  }
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
      sheet.getRange(row, USER_BINDING_COL).setValue(""); // exam_binding = kosong
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
  const { id_siswa, nama_lengkap, username, password, kelas, foto_url } = params;

  if (!id_siswa) return { success: false, message: "id_siswa diperlukan" };

  // foto_url opsional. String kosong berarti guru menghapus fotonya.
  const photoGiven = foto_url !== undefined && foto_url !== null;
  const photo = photoGiven ? String(foto_url).trim() : "";
  if (photoGiven && photo !== "" && !DRIVE_PHOTO_URL.test(photo)) {
    return { success: false, message: "Foto siswa tidak valid. Ulangi unggah fotonya." };
  }

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
      if (photoGiven)   sheet.getRange(i + 1, USER_PHOTO_COL).setValue(photo);
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
