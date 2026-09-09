// Answer Persistence & Recovery — menguji KODE NYATA, bukan salinan logika.
// Sisi klien diimpor langsung dari answerRecovery.ts.
// Sisi GAS dimuat dari backend-script/code.gs ke dalam VM dengan global Apps Script palsu.
// Jalankan: node --experimental-strip-types src/lib/answerPersistence.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { deserializeAnswers, pickAnswers, shouldRecover } from "./answerRecovery.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const CODE_GS = path.resolve(here, "../../../backend-script/code.gs");

// ===== Bagian 1: logika pemulihan sisi klien (impor langsung) =====

// deserializeAnswers menerima objek dan JSON yang sah
assert.deepEqual(deserializeAnswers('{"Q1":"A","Q2":["A","C"]}'), { Q1: "A", Q2: ["A", "C"] });
assert.deepEqual(deserializeAnswers({ Q1: "B" }), { Q1: "B" });

// deserializeAnswers menolak input kosong / rusak / bukan objek
for (const bad of ["", "   ", "{broken", "42", '"teks"', "[1,2,3]", null, undefined, [1, 2]]) {
  assert.equal(deserializeAnswers(bad), null, `harus null untuk ${JSON.stringify(bad)}`);
}

// pickAnswers: lokal menang bila ada isinya
assert.deepEqual(pickAnswers({ Q1: "A" }, { Q1: "Z", Q2: "Y" }), { Q1: "A" });
// pickAnswers: lokal kosong → pakai server
assert.deepEqual(pickAnswers({}, { Q1: "Z" }), { Q1: "Z" });
// pickAnswers: dua-duanya kosong → objek kosong, tidak melempar
assert.deepEqual(pickAnswers({}, null), {});
assert.deepEqual(pickAnswers(null, undefined), {});

// shouldRecover: hanya true saat lokal kosong DAN server punya isi yang sah
assert.equal(shouldRecover({}, '{"Q1":"A"}'), true);
assert.equal(shouldRecover({ Q1: "A" }, '{"Q2":"B"}'), false, "lokal berisi → jangan timpa");
assert.equal(shouldRecover({}, "{broken"), false, "server rusak → jangan pulihkan");
assert.equal(shouldRecover({}, "{}"), false, "server kosong → tidak ada yang dipulihkan");
assert.equal(shouldRecover({}, null), false);

// ===== Bagian 2: handler GAS nyata di dalam VM =====

const TENANT_SECRET = "tenant-shared-secret-32-characters-minimum";

interface SheetMap { [name: string]: unknown[][] }

// Mock sheet yang mencatat setiap setValue/appendRow supaya efek samping bisa diperiksa.
function loadGas(sheets: SheetMap) {
  const appended: Record<string, unknown[][]> = {};
  const writes: Array<{ sheet: string; row: number; col: number; value: unknown }> = [];
  let lockAcquired = 0;

  const makeSheet = (name: string) => ({
    getDataRange: () => ({ getValues: () => sheets[name] || [] }),
    getLastRow: () => (sheets[name] ? sheets[name].length : 0),
    getRange: (row: number, col: number) => ({
      setValue: (value: unknown) => {
        writes.push({ sheet: name, row, col, value });
        if (sheets[name] && sheets[name][row - 1]) sheets[name][row - 1][col - 1] = value;
      },
      setValues: () => {},
    }),
    appendRow: (r: unknown[]) => {
      (appended[name] ||= []).push(r);
      sheets[name] ||= [];
      sheets[name].push(r);
    },
    deleteRow: () => {},
    deleteRows: () => {},
  });

  const context: Record<string, unknown> = {
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text: string) => ({ text, setMimeType() { return this; } }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => (k === "SHARED_SECRET" ? TENANT_SECRET : null),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => { lockAcquired++; return true; },
        releaseLock: () => {},
      }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n: string) => (sheets[n] ? makeSheet(n) : null),
        insertSheet: (n: string) => { sheets[n] = []; return makeSheet(n); },
        getId: () => "sheet-id",
      }),
    },
    console,
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(CODE_GS, "utf8"), context);
  return { gas: context as Record<string, (p: unknown) => Record<string, unknown>>, appended, writes, lockCount: () => lockAcquired };
}

const USERS_HEADER = [
  "id_siswa", "username", "password", "nama_lengkap", "kelas", "status_login",
  "waktu_mulai", "waktu_selesai", "skor_akhir", "violation_count", "status_ujian",
  "last_seen", "mapel_diujikan", "saved_answers",
];
const QUESTIONS = [
  ["id", "nomor", "tipe", "pertanyaan", "gambar", "a", "b", "c", "d", "e", "kunci", "bobot", "kategori", "mapel"],
  ["Q1", 1, "SINGLE", "Soal 1", "", "A", "B", "C", "D", "", "A", 1, "", ""],
  ["Q2", 2, "SINGLE", "Soal 2", "", "A", "B", "C", "D", "", "B", 1, "", ""],
];
const CONFIG = [["key", "value"], ["exam_mapel", ""], ["exam_duration", 90], ["max_violations", 3]];

function activeStudent(saved: string = "") {
  return [USERS_HEADER, ["S001", "siswa", "pw", "Budi", "6A", true, new Date(), "", "", 0, "SEDANG", "", "", saved]];
}

// --- BR#2: syncAnswers menulis jawaban ke kolom 14, bukan hanya cache ---
{
  const { gas, writes } = loadGas({ Users: activeStudent(), Config: CONFIG, Questions: QUESTIONS });
  const res = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "A" } });
  assert.equal(res.success, true);
  const col14 = writes.find((w) => w.sheet === "Users" && w.col === 14);
  assert.ok(col14, "harus menulis ke kolom 14");
  assert.deepEqual(JSON.parse(String(col14!.value)), { Q1: "A" });
  assert.ok(writes.some((w) => w.col === 12), "last_seen tetap diperbarui");
  // BR#12: kolom 1-13 tidak boleh ditimpa selain last_seen (12)
  const touched = writes.filter((w) => w.sheet === "Users").map((w) => w.col).sort();
  assert.deepEqual(touched, [12, 14], "hanya kolom 12 dan 14 yang disentuh");
}

// --- BR#11: syncAnswers ditolak setelah siswa submit ---
for (const status of ["SELESAI", "DISKUALIFIKASI"]) {
  const rows = activeStudent();
  rows[1][10] = status;
  const { gas, writes } = loadGas({ Users: rows, Config: CONFIG, Questions: QUESTIONS });
  const res = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "CURANG" } });
  assert.equal(res.success, false, `status ${status} harus ditolak`);
  assert.equal(res.message, "already_submitted");
  assert.equal(writes.length, 0, "tidak boleh ada tulisan apa pun setelah submit");
}

// --- BR#4/#5: handleLogin mengembalikan saved_answers dari kolom 14 ---
{
  const saved = JSON.stringify({ Q1: "A", Q2: "B" });
  const rows = activeStudent(saved);
  rows[1][5] = false; // status_login false agar login diizinkan
  const { gas } = loadGas({ Users: rows, Config: CONFIG, Questions: QUESTIONS });
  const res = gas.handleLogin({ username: "siswa", password: "pw" }) as { success: boolean; data: Record<string, unknown> };
  assert.equal(res.success, true);
  // Objek lahir di dalam VM (realm berbeda), jadi bandingkan lewat JSON, bukan deepStrictEqual.
  assert.equal(JSON.stringify(res.data.saved_answers), JSON.stringify({ Q1: "A", Q2: "B" }));
}

// --- handleLogin tahan terhadap kolom 14 yang rusak ---
{
  const rows = activeStudent("{rusak");
  rows[1][5] = false;
  const { gas } = loadGas({ Users: rows, Config: CONFIG, Questions: QUESTIONS });
  const res = gas.handleLogin({ username: "siswa", password: "pw" }) as { success: boolean; data: Record<string, unknown> };
  assert.equal(res.success, true, "JSON rusak tidak boleh menggagalkan login");
  assert.equal(res.data.saved_answers, null);
}

// --- BR#10 (GAP A): submit kedua tidak menambah baris Responses ---
{
  const { gas, appended, lockCount } = loadGas({
    Users: activeStudent(), Config: CONFIG, Questions: QUESTIONS, Responses: [[]],
  });

  const first = gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A", Q2: "B" }, forced: false });
  assert.equal(first.success, true);
  assert.equal(first.status, "SELESAI");
  assert.equal(first.score, "100.00");
  assert.equal(first.late, false, "submit sebelum deadline harus on-time");
  assert.equal(appended.Responses?.length, 1, "submit pertama menulis satu baris");

  // Retry setelah browser timeout: server sudah sukses, klien mengirim ulang.
  const second = gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A", Q2: "B" }, forced: false });
  assert.equal(second.success, true, "retry tetap dijawab sukses supaya klien tidak macet");
  assert.equal(second.duplicate, true, "retry ditandai duplicate");
  assert.equal(second.score, "100.00", "skor yang dikembalikan adalah skor tersimpan");
  assert.equal(second.status, "SELESAI");
  assert.equal(appended.Responses?.length, 1, "TIDAK boleh ada baris Responses kedua");

  // GAP B: submit mengambil lock
  assert.ok(lockCount() >= 2, "setiap submit harus mengambil ScriptLock");
}

// --- Retry tidak boleh mengubah skor walau jawaban yang dikirim berbeda ---
{
  const { gas, appended } = loadGas({
    Users: activeStudent(), Config: CONFIG, Questions: QUESTIONS, Responses: [[]],
  });
  gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A" }, forced: false }); // 50.00
  const retry = gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A", Q2: "B" }, forced: false });
  assert.equal(retry.score, "50.00", "skor pertama yang menang, bukan hitungan ulang");
  assert.equal(appended.Responses?.length, 1);
}

// --- BR#8/#9: server memakai waktu mulai + durasi, bukan klaim client ---
{
  const rows = activeStudent();
  rows[1][6] = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const { gas, appended } = loadGas({
    Users: rows, Config: CONFIG, Questions: QUESTIONS, Responses: [[]],
  });
  const lateSync = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "A" } });
  assert.equal(lateSync.success, false);
  assert.equal(lateSync.message, "deadline_expired");

  const lateSubmit = gas.handleSubmitExam({
    id_siswa: "S001",
    answers: { Q1: "A" },
    forced: false,
    // Klaim client tidak boleh mengubah deadline server.
    timeRemaining: 999999,
  });
  assert.equal(lateSubmit.success, true, "jawaban late tetap disimpan");
  assert.equal(lateSubmit.late, true);
  assert.equal(appended.Responses?.length, 1);
  assert.match(String(appended.Responses?.[0]?.[7]), /TERLAMBAT/);
}

// --- BR#11: autosave yang datang setelah submit tidak merusak final state ---
{
  const rows = activeStudent();
  const { gas, appended } = loadGas({
    Users: rows, Config: CONFIG, Questions: QUESTIONS, Responses: [[]],
  });
  const submitted = gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A" }, forced: false });
  assert.equal(submitted.status, "SELESAI");

  const lateSync = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "CURANG" } });
  assert.equal(lateSync.success, false);
  assert.equal(lateSync.message, "already_submitted");
  assert.equal(rows[1][10], "SELESAI", "late autosave tidak boleh mengubah status final");
  assert.equal(appended.Responses?.length, 1, "late autosave tidak boleh membuat response kedua");
}

// --- resetUserLogin membersihkan kolom 14 agar siswa mulai bersih ---
{
  const rows = activeStudent(JSON.stringify({ Q1: "A" }));
  const { gas, writes } = loadGas({ Users: rows, Config: CONFIG, Questions: QUESTIONS });
  gas.handleResetUserLogin({ id_siswa: "S001" });
  const col14 = writes.find((w) => w.sheet === "Users" && w.col === 14);
  assert.ok(col14, "reset harus menyentuh kolom 14");
  assert.equal(col14!.value, "", "saved_answers dikosongkan");
}

// --- BR#12: siswa baru dibuat dengan 13 kolom, kolom 14 tetap kosong ---
{
  const { gas, appended } = loadGas({ Users: [USERS_HEADER], Config: CONFIG, Questions: QUESTIONS });
  gas.handleCreateStudent({ username: "baru", password: "p", nama_lengkap: "Baru", kelas: "6A" });
  const row = appended.Users![0];
  assert.equal(row.length, 13, "appendRow tetap 13 kolom — kolom 14 dibiarkan kosong");
  assert.equal(row[10], "BELUM");
}

console.log("answerPersistence: semua skenario PASS (kode nyata: answerRecovery.ts + code.gs)");
