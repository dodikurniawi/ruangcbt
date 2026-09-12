// Kredensial kartu peserta pada boundary GAS.
// Yang diuji: password login ikut pada payload admin getUsers (agar bisa dicetak
// di kartu), tidak pernah ikut pada payload siswa/publik, dan siswa lama tanpa
// password tetap terbaca tanpa membuat password baru.

const assert = require("node:assert/strict");
const {
  tenantSecret, loadGas, baseState, post, get,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
} = require("./gasHarness.cjs");

function cardState(userRows) {
  return baseState({
    Config: [
      ["key", "value"],
      ["exam_mapel", "MAPEL_A"], ["exam_duration", 90], ["exam_status", "OPEN"],
      ["live_score_pin", "1234"],
    ],
    MataPelajaran: [["id_mapel", "kode", "nama"], ["MAPEL_A", "MTK", "Matematika"]],
    Questions: [
      QUESTION_HEADER,
      ["Q1", 1, "SINGLE", "Soal", "", "A", "B", "C", "D", "", "A", 1, "", "MAPEL_A", "AKTIF", "", ""],
    ],
    // Baris disalin: state tiap blok test harus berdiri sendiri.
    Users: [USER_HEADER.slice()].concat(userRows.map((r) => r.slice())),
    Responses: [RESPONSE_HEADER],
  });
}

const ROW_A = ["S1", "siswa1", "rahasia1", "Siswa Satu", "6A", false, "", "", "", 0, "BELUM", "", "", ""];
const ROW_B = ["S2", "siswa2", "rahasia2", "Siswa Dua", "6A", false, "", "", "", 0, "BELUM", "", "", ""];
const ROW_KOSONG = ["S3", "siswa3", "", "Siswa Tiga", "6B", false, "", "", "", 0, "BELUM", "", "", ""];

function hasPassword(value) {
  return JSON.stringify(value).includes("rahasia");
}

// ── Password ikut pada getUsers, per siswa, tanpa tertukar ─────────────────
{
  const gas = loadGas(cardState([ROW_A, ROW_B, ROW_KOSONG]));
  const users = get(gas, "getUsers").data;

  const byId = Object.fromEntries(users.map((u) => [u.id_siswa, u]));
  assert.equal(byId.S1.username, "siswa1");
  assert.equal(byId.S1.password, "rahasia1", "kartu memakai password milik siswa itu sendiri");
  assert.equal(byId.S2.password, "rahasia2");
  assert.notEqual(byId.S1.password, byId.S2.password, "password tidak tertukar antar siswa");

  // Password yang dipakai login memang password yang sama dengan yang dicetak.
  const login = post(gas, "login", { username: "siswa1", password: byId.S1.password });
  assert.equal(login.success, true, "password pada kartu harus bisa dipakai login");
  assert.equal(login.data.id_siswa, "S1");

  // Mencetak kartu (membaca getUsers) tidak mengubah password di sheet.
  get(gas, "getUsers");
  assert.equal(gas.__sheets.Users.rows[1][2], "rahasia1", "password tidak diubah oleh pencetakan");

  // Siswa lama tanpa password: terbaca kosong, bukan crash dan bukan password baru.
  assert.equal(byId.S3.password, "");
  assert.equal(gas.__sheets.Users.rows[3][2], "", "password kosong tidak diisi otomatis");
}

// ── Sel numerik: username/password angka tetap terbaca sebagai teks ───────
{
  const gas = loadGas(cardState([
    ["S9", 114989305, 652511, "Siswa Angka", "6A", false, "", "", "", 0, "BELUM", "", "", ""],
  ]));
  const u = get(gas, "getUsers").data[0];
  assert.equal(u.username, "114989305", "username numerik dikirim sebagai teks");
  assert.equal(u.password, "652511", "password numerik dikirim sebagai teks");
  assert.equal(typeof u.username, "string");
  assert.equal(typeof u.password, "string");
}

// ── Password tidak bocor ke payload siswa/publik ───────────────────────────
{
  const gas = loadGas(cardState([ROW_A, ROW_B]));

  const login = post(gas, "login", { username: "siswa1", password: "rahasia1" });
  assert.equal(login.success, true, login.message);
  assert.equal(hasPassword(login.data), false, "payload login siswa tanpa password");

  assert.equal(hasPassword(get(gas, "getQuestions")), false, "soal siswa tanpa password");
  assert.equal(hasPassword(get(gas, "getLiveScore")), false, "live monitoring tanpa password");
  assert.equal(hasPassword(get(gas, "getConfig")), false, "config publik tanpa password siswa");
  assert.equal(hasPassword(get(gas, "getExamSummary")), false, "ringkasan ujian tanpa password");
  assert.equal(hasPassword(get(gas, "getExamStatus")), false);

  post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A" }, forced: false });
  assert.equal(hasPassword(gas.__sheets.Responses.rows), false, "Responses tidak menyimpan password");
}

// ── Identitas lain di kartu tetap utuh ─────────────────────────────────────
{
  const gas = loadGas(cardState([
    ROW_A.concat(["", "https://drive.google.com/thumbnail?id=FOTO1&sz=w800"]),
  ]));
  const u = get(gas, "getUsers").data[0];
  assert.equal(u.id_siswa, "S1");
  assert.equal(u.nama_lengkap, "Siswa Satu");
  assert.equal(u.kelas, "6A");
  assert.equal(u.status_ujian, "BELUM");
  assert.equal(u.foto_url, "https://drive.google.com/thumbnail?id=FOTO1&sz=w800", "foto kartu tetap ada");
}

console.log("studentCard: kredensial kartu peserta admin-only + identitas utuh PASS");
