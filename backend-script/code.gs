// =====================================
// CBT Serverless - Google Apps Script Backend
// Version: 3.0
// =====================================

// ===== CONFIGURATION =====
const CACHE_DURATION = 60; // seconds
const cache = CacheService.getScriptCache();

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
      return "https://drive.google.com/uc?export=view&id=" + match[1];
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
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
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
    return createJsonResponse({ success: false, message: error.toString() });
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

    // Filter per mapel jika exam_mapel dikonfigurasi (dilewati untuk admin)
    if (!skipMapelFilter && exam_mapel && id_mapel !== exam_mapel) continue;

    const entry = {
      id_soal: row[0],
      nomor_urut: row[1],
      tipe: row[2],
      pertanyaan: row[3],
      gambar_url: parseGDriveImageUrl(row[4]),
      opsi_a: row[5],
      opsi_b: row[6],
      opsi_c: row[7],
      opsi_d: row[8],
      opsi_e: row[9] || null,
      bobot: row[11] || 1,
      kategori: row[12] || null,
      id_mapel: id_mapel,
      nama_mapel: id_mapel ? (mapelLookup[id_mapel] || null) : null,
    };
    // Kirim kunci_jawaban hanya untuk admin (skipMapelFilter=true)
    if (skipMapelFilter) entry.kunci_jawaban = row[10] || "";
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
      skor_akhir: row[8],
      violation_count: row[9] || 0,
      status_ujian: row[10] || "BELUM",
      last_seen: row[11] ? new Date(row[11]).toLocaleString("id-ID") : null,
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

      sheet.getRange(i + 1, 6).setValue(true);
      if (!row[6]) {
        sheet.getRange(i + 1, 7).setValue(new Date());
        sheet.getRange(i + 1, 11).setValue("SEDANG");
      }
      sheet.getRange(i + 1, 12).setValue(new Date());

      const config = getConfig();

      return {
        success: true,
        data: {
          id_siswa: row[0],
          username: row[1],
          nama_lengkap: row[3],
          kelas: row[4],
          status_ujian: row[10] || "SEDANG",
          waktu_mulai: row[6] ? row[6] : new Date().toISOString(),
          exam_duration: parseInt(config.exam_duration) || 90,
        },
      };
    }
  }

  return { success: false, message: "Username atau password salah." };
}

function handleSyncAnswers(params) {
  const { id_siswa, answers } = params;
  cache.put("answers_" + id_siswa, JSON.stringify(answers), 3600);

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      sheet.getRange(i + 1, 12).setValue(new Date());
      break;
    }
  }

  return { success: true, message: "Synced" };
}

function handleSubmitExam(params) {
  const { id_siswa, answers, forced } = params;

  const config = getConfig();
  const exam_mapel = config.exam_mapel || "";

  const qSheet = getSheet("Questions");
  const questions = qSheet.getDataRange().getValues();

  let totalScore = 0, maxScore = 0;

  for (let i = 1; i < questions.length; i++) {
    const q = questions[i];
    if (!q[0]) continue;

    const id_soal = q[0];
    const tipe = q[2];
    const kunci = q[10];
    const bobot = q[11] || 1;
    const id_mapel_soal = q[13] || null;

    // Hanya hitung soal yang benar-benar ditampilkan ke siswa
    if (exam_mapel && id_mapel_soal !== exam_mapel) continue;

    const jawaban = answers[id_soal];

    maxScore += bobot;
    if (!jawaban) continue;

    if (tipe === "SINGLE") {
      if (jawaban === kunci) totalScore += bobot;
    } else if (tipe === "COMPLEX") {
      const kunciArray = kunci.toString().split(",").map(function(k) { return k.trim(); }).sort();
      const jawabanArray = Array.isArray(jawaban)
        ? jawaban.sort()
        : jawaban.toString().split(",").map(function(j) { return j.trim(); }).sort();

      if (JSON.stringify(kunciArray) === JSON.stringify(jawabanArray)) {
        totalScore += bobot;
      }
    }
  }

  const finalScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

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
      break;
    }
  }

  const durasiMenit = waktuMulai
    ? Math.round((new Date() - new Date(waktuMulai)) / 60000)
    : 0;

  const rSheet = getSheet("Responses");
  rSheet.appendRow([
    new Date(), id_siswa, userName, userClass,
    JSON.stringify(answers), finalScore.toFixed(2), durasiMenit,
    forced ? "DISKUALIFIKASI - Auto Submit" : violationLog, "",
  ]);

  cache.remove("questions"); cache.remove("questions_all");

  return {
    success: true,
    score: finalScore.toFixed(2),
    status: forced ? "DISKUALIFIKASI" : "SELESAI",
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

function handleCreateQuestion(params) {
  const sheet = getSheet("Questions");
  const { data } = params;

  // Auto-generate id_soal jika tidak disediakan FE
  const id_soal = (data.id_soal && data.id_soal.toString().trim())
    ? data.id_soal
    : "Q" + Date.now().toString(36).toUpperCase();

  sheet.appendRow([
    id_soal,
    data.nomor_urut,
    data.tipe,
    data.pertanyaan,
    data.gambar_url || "",
    data.opsi_a,
    data.opsi_b,
    data.opsi_c,
    data.opsi_d,
    data.opsi_e || "",
    data.kunci_jawaban,
    data.bobot || 1,
    data.kategori || "",
    data.id_mapel || "",   // kolom 14
  ]);

  cache.remove("questions"); cache.remove("questions_all");
  return { success: true, message: "Question created", id_soal: id_soal };
}

function handleUpdateQuestion(params) {
  const sheet = getSheet("Questions");
  const { id_soal, data } = params;
  const allData = sheet.getDataRange().getValues();

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === id_soal) {
      const row = i + 1;
      sheet.getRange(row, 1, 1, 14).setValues([[
        id_soal,                    // pertahankan id yang ada
        data.nomor_urut,
        data.tipe,
        data.pertanyaan,
        data.gambar_url || "",
        data.opsi_a,
        data.opsi_b,
        data.opsi_c,
        data.opsi_d,
        data.opsi_e || "",
        data.kunci_jawaban,
        data.bobot || 1,
        data.kategori || "",
        data.id_mapel || "",        // kolom 14
      ]]);

      cache.remove("questions"); cache.remove("questions_all");
      return { success: true, message: "Question updated" };
    }
  }

  return { success: false, message: "Question not found" };
}

function handleDeleteQuestion(params) {
  const sheet = getSheet("Questions");
  const { id_soal } = params;
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_soal) {
      sheet.deleteRow(i + 1);
      cache.remove("questions"); cache.remove("questions_all");
      return { success: true, message: "Question deleted" };
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
      mimeType || "image/jpeg",
      fileName || ("soal_" + Date.now() + ".jpg")
    );

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;

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
    false, "", "", "", 0, "BELUM", "",
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
      student.kelas || "", false, "", "", "", 0, "BELUM", "",
    ]);

    existingUsernames.add(student.username.toLowerCase());
    added++;
  }

  const msg = added + " siswa berhasil diimpor" +
    (skipped > 0 ? ", " + skipped + " dilewati (duplikat/data tidak lengkap)" : "");

  return { success: true, message: msg, data: { added, skipped } };
}
