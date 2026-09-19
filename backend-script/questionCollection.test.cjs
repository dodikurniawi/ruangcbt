// Bank Soal — Kumpulan Soal yang dapat disimpan, diaktifkan, dan dinonaktifkan.
//
// Kontrak yang diuji di sini:
//   1. Nonaktif BUKAN hapus: soal tetap utuh di sheet dan dapat diaktifkan lagi.
//   2. Guru menentukan kumpulan mana yang dipakai ujian; beberapa kumpulan boleh.
//   3. Soal lama tanpa kumpulan tetap hidup lewat bucket bawaan ("Soal Lama").
//   4. Attempt yang sudah berjalan membaca snapshot, jadi kebal perubahan status.
//
// Menjalankan code.gs asli lewat harness vm bersama (gasHarness.cjs).

const assert = require("node:assert/strict");
const {
  tenantSecret, loadGas, baseState, post, get,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
} = require("./gasHarness.cjs");

const COLLECTION_HEADER = ["id_kumpulan", "nama_kumpulan", "id_mapel", "status", "dibuat", "terakhir_dipakai"];

function getAs(gas, action, params) {
  return JSON.parse(
    gas.doGet({ parameter: Object.assign({ action, proxy_secret: tenantSecret }, params || {}) }).text
  );
}

// Baris soal 18 kolom; kolom 18 = id_kumpulan ("" berarti belum dikelompokkan).
function soalRow(id, nomor, kunci, mapel, kumpulan, status) {
  return [
    id, nomor, "SINGLE", "Soal " + id, "",
    "A", "B", "C", "D", "",
    kunci, 1, "", mapel, status || "AKTIF", "", "", kumpulan || "",
  ];
}

function userRow() {
  return ["S1", "siswa", "pw", "Siswa", "6A", false, "", "", "", 0, "BELUM", "", "", "", ""];
}

// Dua kumpulan: UH Bab 1 (aktif) dan UH Bab 2 (aktif), masing-masing 2 soal.
function bankState(overrides) {
  return baseState(Object.assign({
    Config: [
      ["key", "value"],
      ["exam_name", "Ulangan Harian"],
      ["exam_mapel", "MAPEL_A"],
      ["exam_duration", 90],
      ["exam_status", "OPEN"],
    ],
    MataPelajaran: [["id_mapel", "kode", "nama"], ["MAPEL_A", "MTK", "Matematika"]],
    KumpulanSoal: [
      COLLECTION_HEADER,
      ["K1", "UH Bab 1", "MAPEL_A", "AKTIF", "2026-01-01", ""],
      ["K2", "UH Bab 2", "MAPEL_A", "AKTIF", "2026-01-02", ""],
    ],
    Questions: [
      QUESTION_HEADER.concat(["id_kumpulan"]),
      soalRow("Q1", 1, "A", "MAPEL_A", "K1"),
      soalRow("Q2", 2, "B", "MAPEL_A", "K1"),
      soalRow("Q3", 3, "C", "MAPEL_A", "K2"),
      soalRow("Q4", 4, "D", "MAPEL_A", "K2"),
    ],
    Users: [USER_HEADER.concat(["exam_binding"]), userRow()],
    Responses: [RESPONSE_HEADER],
  }, overrides || {}));
}

function collections(gas) {
  const res = getAs(gas, "getQuestionCollections");
  assert.equal(res.success, true, res.message);
  return res.data;
}

function byId(list, id) {
  return list.find(function (item) { return item.id_kumpulan === id; });
}

function questionIds(res) {
  return res.data.map(function (q) { return q.id_soal; });
}

function examQuestionIds(gas) {
  // Soal yang akan diterima siswa berikutnya = isi snapshot ujian aktif.
  // Array dari dalam vm punya prototype realm lain; salin agar deepEqual adil.
  return Array.from(gas.__eval("buildExamSnapshot()").question_ids);
}

const validSingle = {
  nomor_urut: 9, tipe: "SINGLE", pertanyaan: "<p>Berapa 2+2?</p>", gambar_url: "",
  opsi_a: "3", opsi_b: "4", opsi_c: "5", opsi_d: "6", opsi_e: "",
  kunci_jawaban: "B", bobot: 1, kategori: "Mudah", id_mapel: "MAPEL_A",
};

// ── A. Buat kumpulan ───────────────────────────────────────────────────────
{
  const gas = loadGas(bankState());
  const res = post(gas, "createQuestionCollection", { nama_kumpulan: "PAS Ganjil", id_mapel: "MAPEL_A" });
  assert.equal(res.success, true, res.message);
  assert.ok(res.data.id_kumpulan, "kumpulan baru wajib punya identitas");

  const list = collections(gas);
  const created = byId(list, res.data.id_kumpulan);
  assert.equal(created.nama_kumpulan, "PAS Ganjil");
  assert.equal(created.status, "AKTIF", "kumpulan baru langsung dapat dipakai");
  assert.equal(created.jumlah_soal, 0, "kumpulan baru masih kosong");

  // Nama wajib diisi; mapel yang tidak dikenal ditolak.
  assert.equal(post(gas, "createQuestionCollection", { nama_kumpulan: "  " }).success, false);
  assert.equal(
    post(gas, "createQuestionCollection", { nama_kumpulan: "X", id_mapel: "MAPEL_HANTU" }).success,
    false,
  );

  // Dua kumpulan boleh bernama sama — identitasnya yang membedakan.
  const kembar = post(gas, "createQuestionCollection", { nama_kumpulan: "PAS Ganjil", id_mapel: "MAPEL_A" });
  assert.equal(kembar.success, true, kembar.message);
  assert.notEqual(kembar.data.id_kumpulan, res.data.id_kumpulan);
}

// ── B. Ganti nama ──────────────────────────────────────────────────────────
{
  const gas = loadGas(bankState());
  assert.equal(post(gas, "updateQuestionCollection", { id_kumpulan: "K1", nama_kumpulan: "UH Bab 1 (Revisi)" }).success, true);
  assert.equal(byId(collections(gas), "K1").nama_kumpulan, "UH Bab 1 (Revisi)");
  assert.equal(byId(collections(gas), "K1").jumlah_soal, 2, "ganti nama tidak menyentuh soal");

  assert.equal(post(gas, "updateQuestionCollection", { id_kumpulan: "K1", nama_kumpulan: "" }).success, false);
  assert.equal(post(gas, "updateQuestionCollection", { id_kumpulan: "K_TIDAK_ADA", nama_kumpulan: "X" }).success, false);
  assert.equal(post(gas, "updateQuestionCollection", { id_kumpulan: "K1" }).success, false, "tanpa perubahan = ditolak");
  assert.equal(post(gas, "updateQuestionCollection", { id_kumpulan: "K1", status: "HAPUS" }).success, false);
}

// ── C/D/E/F. Nonaktifkan, soal tetap utuh, aktifkan lagi ───────────────────
{
  const gas = loadGas(bankState());
  const before = gas.__sheets.Questions.rows.length;

  const off = post(gas, "updateQuestionCollection", { id_kumpulan: "K1", status: "NONAKTIF" });
  assert.equal(off.success, true, off.message);
  assert.match(off.message, /tetap tersimpan/, "guru harus diberi tahu soal tidak hilang");

  assert.equal(gas.__sheets.Questions.rows.length, before, "menonaktifkan tidak boleh menghapus baris soal");
  const nonaktif = byId(collections(gas), "K1");
  assert.equal(nonaktif.status, "NONAKTIF");
  assert.equal(nonaktif.jumlah_soal, 2, "soal kumpulan nonaktif tetap terhitung di Bank Soal");

  // Soal nonaktif tetap terlihat guru di Bank Soal.
  const admin = getAs(gas, "getAdminQuestions");
  assert.deepEqual(questionIds(admin).sort(), ["Q1", "Q2", "Q3", "Q4"]);

  // …tetapi tidak ikut ujian berikutnya.
  assert.deepEqual(examQuestionIds(gas), ["Q3", "Q4"], "kumpulan nonaktif tidak masuk ujian baru");

  const on = post(gas, "updateQuestionCollection", { id_kumpulan: "K1", status: "AKTIF" });
  assert.equal(on.success, true, on.message);
  assert.match(on.message, /tersedia untuk dipilih/);
  assert.deepEqual(examQuestionIds(gas), ["Q1", "Q2", "Q3", "Q4"], "aktifkan kembali tanpa upload ulang");
}

// ── G/H. Import masuk ke kumpulan yang dipilih, kumpulan lama tetap utuh ───
{
  const gas = loadGas(bankState());
  const res = post(gas, "importQuestions", {
    id_kumpulan: "K2",
    questions: [Object.assign({}, validSingle, { nomor_urut: 10 })],
  });
  assert.equal(res.success, true, res.message);
  assert.equal(res.data.added, 1);

  const rows = gas.__sheets.Questions.rows;
  const imported = rows[rows.length - 1];
  assert.equal(imported[17], "K2", "soal import wajib masuk kumpulan tujuan");

  const list = collections(gas);
  assert.equal(byId(list, "K2").jumlah_soal, 3);
  assert.equal(byId(list, "K1").jumlah_soal, 2, "kumpulan lain tidak terpengaruh import");

  // Import ke kumpulan nonaktif tetap boleh: guru sering menyiapkan lebih dulu.
  post(gas, "updateQuestionCollection", { id_kumpulan: "K1", status: "NONAKTIF" });
  const keNonaktif = post(gas, "importQuestions", {
    id_kumpulan: "K1",
    questions: [Object.assign({}, validSingle, { nomor_urut: 11 })],
  });
  assert.equal(keNonaktif.success, true, keNonaktif.message);
  assert.equal(byId(collections(gas), "K1").jumlah_soal, 3);

  // Kumpulan yang tidak dikenal ditolak — soal tidak boleh mendarat entah di mana.
  assert.equal(
    post(gas, "importQuestions", { id_kumpulan: "K_HANTU", questions: [validSingle] }).success,
    false,
  );
}

// ── I. Snapshot attempt kebal perubahan kumpulan ───────────────────────────
{
  const gas = loadGas(bankState());
  const login = post(gas, "login", { username: "siswa", password: "pw" });
  assert.equal(login.success, true, login.message);
  assert.deepEqual(questionIds(getAs(gas, "getQuestions", { id_siswa: "S1" })), ["Q1", "Q2", "Q3", "Q4"]);

  // Guru menonaktifkan kumpulan di tengah ujian yang sedang berjalan.
  post(gas, "updateQuestionCollection", { id_kumpulan: "K1", status: "NONAKTIF" });

  assert.deepEqual(
    questionIds(getAs(gas, "getQuestions", { id_siswa: "S1" })),
    ["Q1", "Q2", "Q3", "Q4"],
    "soal siswa yang sedang ujian tidak boleh berubah",
  );
  const submit = post(gas, "submitExam", {
    id_siswa: "S1", answers: { Q1: "A", Q2: "B", Q3: "C", Q4: "D" },
  });
  assert.equal(submit.success, true, submit.message);
  assert.equal(submit.score, "100.00", "penilaian tetap memakai soal beku attempt");
}

// ── J. Soal historis: pindah kumpulan bukan perubahan isi ──────────────────
{
  const gas = loadGas(bankState({
    Responses: [
      RESPONSE_HEADER,
      ["2026-01-03", "S9", "Lama", "6A", JSON.stringify({ Q1: "A" }), 100, 10, "", ""],
    ],
  }));

  const same = Object.assign({}, validSingle, {
    nomor_urut: 1, pertanyaan: "Soal Q1", opsi_a: "A", opsi_b: "B", opsi_c: "C", opsi_d: "D",
    kunci_jawaban: "A", kategori: "", id_kumpulan: "K2",
  });
  const moved = post(gas, "updateQuestion", { id_soal: "Q1", data: same });
  assert.equal(moved.success, true, moved.message);
  assert.equal(moved.versioned, false, "pindah kumpulan bukan versi baru");
  assert.equal(gas.__sheets.Questions.rows[1][17], "K2", "kumpulan soal berpindah");
  assert.equal(gas.__sheets.Questions.rows[1][14], "AKTIF", "soal historis tidak ikut diarsipkan");

  // Perubahan isi tetap melahirkan versi baru, dan versi itu mewarisi kumpulan.
  const edited = Object.assign({}, same, { pertanyaan: "<p>Soal Q1 direvisi</p>" });
  const versioned = post(gas, "updateQuestion", { id_soal: "Q1", data: edited });
  assert.equal(versioned.versioned, true, versioned.message);
  const fresh = gas.__sheets.Questions.rows.find(function (r) { return r[0] === versioned.id_soal; });
  assert.equal(fresh[17], "K2", "versi baru tetap di kumpulan yang sama");
}

// ── K. Tenant lama: soal tanpa kumpulan, sheet KumpulanSoal belum ada ──────
{
  const state = bankState();
  delete state.KumpulanSoal;                       // tenant yang belum pernah pakai fitur ini
  state.Questions = [
    QUESTION_HEADER.slice(0, 14),                  // sheet 14 kolom warisan
    ["L1", 1, "SINGLE", "Soal lama", "", "A", "B", "C", "D", "", "A", 1, "", "MAPEL_A"],
    ["L2", 2, "SINGLE", "Soal lama 2", "", "A", "B", "C", "D", "", "B", 1, "", "MAPEL_A"],
  ];
  const gas = loadGas(state);

  assert.deepEqual(examQuestionIds(gas), ["L1", "L2"], "tenant lama berjalan persis seperti sebelumnya");

  const list = collections(gas);
  assert.equal(list.length, 1, "hanya bucket bawaan yang muncul");
  assert.equal(list[0].id_kumpulan, "K_LAMA");
  assert.equal(list[0].jumlah_soal, 2);
  assert.equal(list[0].status, "AKTIF");
  assert.equal(list[0].bawaan, true);

  // Guru boleh menonaktifkan soal lama juga; barisnya baru ditulis sekarang.
  const off = post(gas, "updateQuestionCollection", { id_kumpulan: "K_LAMA", status: "NONAKTIF" });
  assert.equal(off.success, true, off.message);
  assert.equal(gas.__sheets.Questions.rows.length, 3, "tidak ada baris soal yang tersentuh");
  assert.deepEqual(examQuestionIds(gas), []);

  post(gas, "updateQuestionCollection", { id_kumpulan: "K_LAMA", status: "AKTIF" });
  assert.deepEqual(examQuestionIds(gas), ["L1", "L2"], "soal lama kembali tanpa upload ulang");
}

// ── M. Proyeksi siswa tidak membocorkan data guru ──────────────────────────
{
  const gas = loadGas(bankState());
  const students = get(gas, "getQuestions").data;
  assert.equal(students.length, 4);
  for (const q of students) {
    assert.equal("id_kumpulan" in q, false, "pengelompokan tidak pernah dikirim ke siswa");
    assert.equal("kunci_jawaban" in q, false);
    assert.equal("status_soal" in q, false);
  }
  const admin = getAs(gas, "getAdminQuestions").data;
  assert.equal(admin.find(function (q) { return q.id_soal === "Q1"; }).id_kumpulan, "K1");
}

// ── N/O/P/Q. Adakan Ujian memakai kumpulan yang dipilih guru ───────────────
{
  const gas = loadGas(bankState());

  // Satu kumpulan.
  const satu = post(gas, "saveExamConfig", {
    exam_name: "UH Bab 1", exam_mapel: "MAPEL_A", exam_duration: 60,
    exam_status: "OPEN", exam_kumpulan: ["K1"],
  });
  assert.equal(satu.success, true, satu.message);
  assert.equal(satu.data.question_count, 2);
  assert.deepEqual(examQuestionIds(gas), ["Q1", "Q2"]);

  // Beberapa kumpulan sekaligus tetap didukung.
  const dua = post(gas, "saveExamConfig", {
    exam_name: "UH Gabungan", exam_mapel: "MAPEL_A", exam_duration: 60,
    exam_status: "OPEN", exam_kumpulan: ["K1", "K2"],
  });
  assert.equal(dua.success, true, dua.message);
  assert.equal(dua.data.question_count, 4);

  // Kumpulan nonaktif tidak boleh dipilih.
  post(gas, "updateQuestionCollection", { id_kumpulan: "K2", status: "NONAKTIF" });
  const ditolak = post(gas, "saveExamConfig", {
    exam_name: "UH Bab 2", exam_mapel: "MAPEL_A", exam_duration: 60,
    exam_status: "OPEN", exam_kumpulan: ["K2"],
  });
  assert.equal(ditolak.success, false);
  assert.match(ditolak.message, /tidak aktif/);

  // Kumpulan kosong tidak boleh membuka ujian.
  const kosong = post(gas, "createQuestionCollection", { nama_kumpulan: "Remedial", id_mapel: "MAPEL_A" });
  const ujianKosong = post(gas, "saveExamConfig", {
    exam_name: "Remedial", exam_mapel: "MAPEL_A", exam_duration: 60,
    exam_status: "OPEN", exam_kumpulan: [kosong.data.id_kumpulan],
  });
  assert.equal(ujianKosong.success, false);
  assert.match(ujianKosong.message, /belum berisi soal/);

  // Kumpulan yang tidak dikenal ditolak.
  assert.equal(post(gas, "saveExamConfig", {
    exam_name: "X", exam_mapel: "MAPEL_A", exam_duration: 60,
    exam_status: "OPEN", exam_kumpulan: ["K_HANTU"],
  }).success, false);

  // Ringkasan untuk layar guru: angka per mapel mengikuti aturan ujian.
  const summary = getAs(gas, "getExamSummary");
  assert.equal(summary.data.question_counts.MAPEL_A, 2, "kumpulan nonaktif tidak dihitung");
  assert.equal(byId(summary.data.collections, "K2").jumlah_soal, 2, "soalnya tetap ada di Bank Soal");
  assert.ok(byId(summary.data.collections, "K1").terakhir_dipakai, "kumpulan terpakai dicatat waktunya");
}

// ── Satu kumpulan dipakai ujian yang sedang berjalan lalu dinonaktifkan ────
{
  const gas = loadGas(bankState());
  post(gas, "saveExamConfig", {
    exam_name: "UH Bab 1", exam_mapel: "MAPEL_A", exam_duration: 60,
    exam_status: "OPEN", exam_kumpulan: ["K1"],
  });
  post(gas, "login", { username: "siswa", password: "pw" });

  const off = post(gas, "updateQuestionCollection", { id_kumpulan: "K1", status: "NONAKTIF" });
  assert.equal(off.success, true, "menonaktifkan tidak pernah ditolak — bukan aksi merusak");
  assert.deepEqual(
    questionIds(getAs(gas, "getQuestions", { id_siswa: "S1" })), ["Q1", "Q2"],
    "siswa yang sedang ujian tetap memegang soalnya",
  );
  assert.equal(gas.__sheets.Questions.rows.length, 5, "tidak ada soal yang hilang");
}

// ── Pindahkan soal antar kumpulan ──────────────────────────────────────────
{
  const gas = loadGas(bankState());
  const before = gas.__sheets.Questions.rows.length;

  const moved = post(gas, "moveQuestions", { id_soal: ["Q1", "Q2"], id_kumpulan: "K2" });
  assert.equal(moved.success, true, moved.message);
  assert.equal(moved.data.moved, 2);
  assert.equal(gas.__sheets.Questions.rows.length, before, "memindahkan tidak boleh menghapus baris");

  const list = collections(gas);
  assert.equal(byId(list, "K1").jumlah_soal, 0, "kumpulan asal berkurang");
  assert.equal(byId(list, "K2").jumlah_soal, 4, "kumpulan tujuan bertambah");
  assert.deepEqual(examQuestionIds(gas), ["Q1", "Q2", "Q3", "Q4"], "seluruh soal tetap dipakai ujian");

  // Isi soal tidak boleh ikut berubah saat dipindahkan.
  assert.equal(gas.__sheets.Questions.rows[1][3], "Soal Q1");
  assert.equal(gas.__sheets.Questions.rows[1][10], "A");
  assert.equal(gas.__sheets.Questions.rows[1][14], "AKTIF");

  // Kumpulan tujuan tidak dikenal ditolak; tidak ada soal yang bergerak.
  const hantu = post(gas, "moveQuestions", { id_soal: ["Q1"], id_kumpulan: "K_HANTU" });
  assert.equal(hantu.success, false);
  assert.equal(gas.__sheets.Questions.rows[1][17], "K2", "soal tidak boleh pindah saat tujuan tidak sah");

  // Soal yang tidak ada dilewati dan dilaporkan, sisanya tetap diproses.
  const sebagian = post(gas, "moveQuestions", { id_soal: ["Q3", "Q_TIDAK_ADA"], id_kumpulan: "K1" });
  assert.equal(sebagian.success, true, sebagian.message);
  assert.equal(sebagian.data.moved, 1);
  assert.equal(sebagian.data.skipped.length, 1);
  assert.equal(gas.__sheets.Questions.rows[3][17], "K1");

  assert.equal(post(gas, "moveQuestions", { id_soal: [], id_kumpulan: "K1" }).success, false);
}

// ── Keluarkan dari kumpulan ≠ hapus soal ───────────────────────────────────
{
  const gas = loadGas(bankState());
  const before = gas.__sheets.Questions.rows.length;

  const keluar = post(gas, "moveQuestions", { id_soal: ["Q1"], id_kumpulan: "" });
  assert.equal(keluar.success, true, keluar.message);
  assert.match(keluar.message, /tetap tersimpan di Bank Soal/);
  assert.equal(gas.__sheets.Questions.rows.length, before, "soal tidak boleh hilang dari Bank Soal");
  assert.equal(gas.__sheets.Questions.rows[1][17], "", "soal keluar dari kumpulannya");

  // Soal tetap terlihat guru dan tetap dapat dipakai ujian.
  assert.deepEqual(questionIds(getAs(gas, "getAdminQuestions")).sort(), ["Q1", "Q2", "Q3", "Q4"]);
  assert.deepEqual(examQuestionIds(gas), ["Q1", "Q2", "Q3", "Q4"]);
  assert.equal(byId(collections(gas), "K1").jumlah_soal, 1);
  assert.equal(byId(collections(gas), "K_LAMA").jumlah_soal, 1, "soal tanpa kumpulan masuk bucket bawaan");

  // Bucket bawaan sebagai tujuan = sama dengan mengeluarkan dari kumpulan.
  post(gas, "moveQuestions", { id_soal: ["Q2"], id_kumpulan: "K_LAMA" });
  assert.equal(gas.__sheets.Questions.rows[2][17], "");
}

// ── Kumpulan milik mapel lain tidak boleh menampung soal ───────────────────
{
  const gas = loadGas(bankState({
    KumpulanSoal: [
      COLLECTION_HEADER,
      ["K1", "UH Bab 1", "MAPEL_A", "AKTIF", "2026-01-01", ""],
      ["KB", "UH IPA", "MAPEL_B", "AKTIF", "2026-01-01", ""],
    ],
  }));
  const res = post(gas, "moveQuestions", { id_soal: ["Q1"], id_kumpulan: "KB" });
  assert.equal(res.success, false, "tidak ada soal yang boleh pindah lintas mapel");
  assert.equal(gas.__sheets.Questions.rows[1][17], "K1");
}

// ── Soal historis: pindah kumpulan tidak mengubah histori, hapus tetap dijaga ─
{
  const gas = loadGas(bankState({
    Responses: [
      RESPONSE_HEADER,
      ["2026-01-03", "S9", "Lama", "6A", JSON.stringify({ Q1: "A" }), 100, 10, "", ""],
    ],
  }));

  const moved = post(gas, "moveQuestions", { id_soal: ["Q1"], id_kumpulan: "K2" });
  assert.equal(moved.success, true, moved.message);
  assert.equal(gas.__sheets.Questions.rows[1][14], "AKTIF", "pindah kumpulan bukan pengarsipan");
  assert.equal(gas.__sheets.Questions.rows[1][3], "Soal Q1", "isi soal historis tidak berubah");

  // Hapus soal yang sudah pernah dijawab tetap dijaga: barisnya bertahan.
  const rows = gas.__sheets.Questions.rows.length;
  const hapus = post(gas, "deleteQuestion", { id_soal: "Q1" });
  assert.equal(hapus.success, true, hapus.message);
  assert.equal(hapus.archived, true);
  assert.equal(gas.__sheets.Questions.rows.length, rows, "soal historis tidak boleh terhapus");
  assert.doesNotMatch(hapus.message, /arsip/i, "pesan untuk guru tidak memakai istilah arsip");

  // Soal yang belum pernah dijawab tetap bisa dihapus sungguhan.
  const bersih = post(gas, "deleteQuestion", { id_soal: "Q3" });
  assert.equal(bersih.success, true, bersih.message);
  assert.equal(bersih.archived, false);
  assert.equal(gas.__sheets.Questions.rows.length, rows - 1);
}

// ── Pindah kumpulan tidak menyentuh attempt yang sedang berjalan ───────────
{
  const gas = loadGas(bankState());
  post(gas, "login", { username: "siswa", password: "pw" });
  post(gas, "moveQuestions", { id_soal: ["Q1", "Q2"], id_kumpulan: "K2" });
  post(gas, "updateQuestionCollection", { id_kumpulan: "K2", status: "NONAKTIF" });

  assert.deepEqual(
    questionIds(getAs(gas, "getQuestions", { id_siswa: "S1" })),
    ["Q1", "Q2", "Q3", "Q4"],
    "soal attempt dibaca dari snapshot, bukan dari kumpulan terbaru",
  );
}

// ── MUTATION GUARDS ────────────────────────────────────────────────────────
// Tiap mutasi mematikan satu jaminan; test di atas wajib gagal karenanya.
function mutate(find, replaceWith, label) {
  return function (source) {
    const mutated = source.replace(find, replaceWith);
    assert.notEqual(mutated, source, "titik mutation " + label + " tidak ditemukan");
    return mutated;
  };
}

{
  // A. Filter status kumpulan dihapus → kumpulan nonaktif ikut ujian lagi.
  const statusFilter = mutate(
    "    if (!isCollectionActive(statusMap, collection)) continue;",
    "    if (false) continue;",
    "A",
  );
  const gasA = loadGas(bankState(), statusFilter);
  post(gasA, "updateQuestionCollection", { id_kumpulan: "K1", status: "NONAKTIF" });
  assert.throws(() => assert.deepEqual(examQuestionIds(gasA), ["Q3", "Q4"]),
    undefined, "mutation A tidak terdeteksi");

  // B. Nonaktif diubah menjadi hapus baris → kumpulan tidak bisa diaktifkan lagi.
  const deleteInsteadOfDeactivate = mutate(
    "  if (hasStatus) sheet.getRange(found.row_number, 4).setValue(status);",
    "  if (hasStatus) sheet.deleteRow(found.row_number);",
    "B",
  );
  const gasB = loadGas(bankState(), deleteInsteadOfDeactivate);
  post(gasB, "updateQuestionCollection", { id_kumpulan: "K1", status: "NONAKTIF" });
  assert.throws(() => assert.equal(
    post(gasB, "updateQuestionCollection", { id_kumpulan: "K1", status: "AKTIF" }).success, true,
  ), undefined, "mutation B tidak terdeteksi");

  // C. Snapshot diabaikan → siswa yang sedang ujian kehilangan soalnya saat
  //    kumpulannya dinonaktifkan.
  const ignoreSnapshot = mutate(
    "  const binding = skipMapelFilter ? null : getAttemptBinding(id_siswa);",
    "  const binding = null;",
    "C",
  );
  const gasC = loadGas(bankState(), ignoreSnapshot);
  post(gasC, "login", { username: "siswa", password: "pw" });
  post(gasC, "updateQuestionCollection", { id_kumpulan: "K1", status: "NONAKTIF" });
  assert.throws(() => assert.deepEqual(
    questionIds(getAs(gasC, "getQuestions", { id_siswa: "S1" })), ["Q1", "Q2", "Q3", "Q4"],
  ), undefined, "mutation C tidak terdeteksi");

  // D. Pilihan kumpulan guru diabaikan → ujian memakai seluruh Bank Soal.
  const ignoreSelection = mutate(
    "    if (hasSelection && !wanted[collection]) continue;",
    "    if (false) continue;",
    "D",
  );
  const gasD = loadGas(bankState(), ignoreSelection);
  post(gasD, "saveExamConfig", {
    exam_name: "UH Bab 1", exam_mapel: "MAPEL_A", exam_duration: 60,
    exam_status: "OPEN", exam_kumpulan: ["K1"],
  });
  assert.throws(() => assert.deepEqual(examQuestionIds(gasD), ["Q1", "Q2"]),
    undefined, "mutation D tidak terdeteksi");

  // E. Soal import diletakkan di luar kumpulan tujuan.
  // Baris import ditulis sekali lewat setValues; titik mutation mengikuti bentuk itu.
  const ignoreImportTarget = mutate(
    '      rowsToWrite.push(questionRowValues(id_soal, data, QUESTION_STATUS_ACTIVE, "", target.id_kumpulan));',
    '      rowsToWrite.push(questionRowValues(id_soal, data, QUESTION_STATUS_ACTIVE, "", ""));',
    "E",
  );
  const gasE = loadGas(bankState(), ignoreImportTarget);
  post(gasE, "importQuestions", { id_kumpulan: "K2", questions: [validSingle] });
  assert.throws(() => assert.equal(byId(collections(gasE), "K2").jumlah_soal, 3),
    undefined, "mutation E tidak terdeteksi");

  // G. "Keluarkan dari kumpulan" diam-diam menjadi hapus baris.
  const removeBecomesDelete = mutate(
    "    sheet.getRange(minRow, QUESTION_COLLECTION_COL, column.length, 1).setValues(column);",
    "    for (let d = pending.length - 1; d >= 0; d--) sheet.deleteRow(pending[d]);",
    "G",
  );
  const gasG = loadGas(bankState(), removeBecomesDelete);
  post(gasG, "moveQuestions", { id_soal: ["Q1"], id_kumpulan: "" });
  assert.throws(() => assert.equal(gasG.__sheets.Questions.rows.length, 5),
    undefined, "mutation G tidak terdeteksi");

  // H. Soal mendarat di kumpulan yang salah saat dipindahkan.
  const wrongTarget = mutate(
    "    for (let p = 0; p < pending.length; p++) column[pending[p] - minRow][0] = target;",
    '    for (let p = 0; p < pending.length; p++) column[pending[p] - minRow][0] = "";',
    "H",
  );
  const gasH = loadGas(bankState(), wrongTarget);
  post(gasH, "moveQuestions", { id_soal: ["Q1"], id_kumpulan: "K2" });
  assert.throws(() => assert.equal(gasH.__sheets.Questions.rows[1][17], "K2"),
    undefined, "mutation H tidak terdeteksi");

  // I. Soal baru mengabaikan kumpulan yang dipilih guru pada form.
  const ignoreFormCollection = mutate(
    '    const collection = resolveQuestionCollection(data, "");',
    '    const collection = { id_kumpulan: "" };',
    "I",
  );
  const gasI = loadGas(bankState(), ignoreFormCollection);
  post(gasI, "createQuestion", { data: Object.assign({}, validSingle, { id_kumpulan: "K2" }) });
  assert.throws(() => assert.equal(byId(collections(gasI), "K2").jumlah_soal, 3),
    undefined, "mutation I tidak terdeteksi");

  // J. Soal historis dihapus alih-alih dipertahankan.
  const deleteHistorical = mutate(
    "      if (isQuestionAnsweredInHistory(id_soal)) {\n        if (isQuestionArchived(data[i])) {",
    "      if (false) {\n        if (isQuestionArchived(data[i])) {",
    "J",
  );
  const gasJ = loadGas(bankState({
    Responses: [
      RESPONSE_HEADER,
      ["2026-01-03", "S9", "Lama", "6A", JSON.stringify({ Q1: "A" }), 100, 10, "", ""],
    ],
  }), deleteHistorical);
  post(gasJ, "deleteQuestion", { id_soal: "Q1" });
  assert.throws(() => assert.equal(gasJ.__sheets.Questions.rows.length, 5),
    undefined, "mutation J tidak terdeteksi");

  // F. Data khusus guru (kunci jawaban, pengelompokan) bocor ke payload siswa.
  const leakCollection = mutate(
    '    if (skipMapelFilter) {\n      entry.kunci_jawaban = row[10] || "";',
    '    if (true) {\n      entry.kunci_jawaban = row[10] || "";',
    "F",
  );
  const gasF = loadGas(bankState(), leakCollection);
  assert.throws(() => assert.equal(
    get(gasF, "getQuestions").data.every(function (q) { return !("id_kumpulan" in q); }), true,
  ), undefined, "mutation F tidak terdeteksi");
}

console.log("questionCollection.test.cjs OK");
