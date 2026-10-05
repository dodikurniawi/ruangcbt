// Tempat & tanggal lahir siswa pada boundary GAS.
// Yang diuji: TTL tersimpan di kolom baru tanpa menggeser kolom lama, menyimpan
// perubahan lain tidak menghapus TTL, dan siswa lama tanpa TTL tetap sah.

const assert = require("node:assert/strict");
const {
  loadGas, baseState, post, get,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
} = require("./gasHarness.cjs");

const BIRTHPLACE_COL = 17; // 1-indexed, sesudah foto_url (kolom 16)
const BIRTHDATE_COL = 18;

// Baris siswa lama: 14 kolom saja, tanpa foto maupun TTL.
const LEGACY_ROW = ["S1", "siswa1", "pw1", "Siswa Satu", "6A", false, "", "", "", 0, "BELUM", "", "", ""];

function birthState(rows) {
  return baseState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["exam_duration", 90], ["exam_status", "OPEN"]],
    MataPelajaran: [["id_mapel", "kode", "nama"], ["MAPEL_A", "MTK", "Matematika"]],
    Questions: [
      QUESTION_HEADER,
      ["Q1", 1, "SINGLE", "Soal", "", "A", "B", "C", "D", "", "A", 1, "", "MAPEL_A", "AKTIF", "", ""],
    ],
    Users: [USER_HEADER.slice()].concat((rows || [LEGACY_ROW]).map((r) => r.slice())),
    Responses: [RESPONSE_HEADER],
  });
}

const userById = (gas, id) => gas.__sheets.Users.rows.find((r) => r[0] === id);

// ── Siswa lama tanpa TTL tetap terbaca, tanpa nilai karangan ───────────────
{
  const gas = loadGas(birthState());
  const siswa = get(gas, "getUsers").data[0];
  assert.equal(siswa.tempat_lahir, "", "siswa lama: tempat lahir kosong");
  assert.equal(siswa.tanggal_lahir, "", "siswa lama: tanggal lahir kosong");
  assert.equal(siswa.nama_lengkap, "Siswa Satu");
  assert.equal(siswa.username, "siswa1");
  assert.equal(siswa.kelas, "6A");
}

// ── TTL tersimpan di kolom 17-18, kolom lama tidak bergeser ────────────────
{
  const gas = loadGas(birthState());
  const res = post(gas, "updateStudent", {
    id_siswa: "S1", tempat_lahir: " Tangerang ", tanggal_lahir: "2015-05-12",
  });
  assert.equal(res.success, true, res.message);

  const row = userById(gas, "S1");
  assert.equal(row[BIRTHPLACE_COL - 1], "Tangerang", "tempat lahir di-trim dan tersimpan di kolom 17");
  assert.equal(row[BIRTHDATE_COL - 1], "2015-05-12", "tanggal lahir ISO di kolom 18");
  assert.equal(row[0], "S1");
  assert.equal(row[1], "siswa1");
  assert.equal(row[2], "pw1");
  assert.equal(row[3], "Siswa Satu");
  assert.equal(row[4], "6A");
  assert.equal(row[10], "BELUM");

  const siswa = get(gas, "getUsers").data[0];
  assert.equal(siswa.tempat_lahir, "Tangerang");
  assert.equal(siswa.tanggal_lahir, "2015-05-12");
}

// ── Menyimpan nama/kelas/password tidak menghapus TTL yang sudah ada ───────
{
  const gas = loadGas(birthState());
  post(gas, "updateStudent", { id_siswa: "S1", tempat_lahir: "Tangerang", tanggal_lahir: "2015-05-12" });
  const ubah = post(gas, "updateStudent", {
    id_siswa: "S1", nama_lengkap: "Siswa Berubah", kelas: "6B", password: "pw-baru",
  });
  assert.equal(ubah.success, true, ubah.message);

  const siswa = get(gas, "getUsers").data[0];
  assert.equal(siswa.tempat_lahir, "Tangerang", "TTL bertahan saat field lain diubah");
  assert.equal(siswa.tanggal_lahir, "2015-05-12");
  assert.equal(siswa.nama_lengkap, "Siswa Berubah");
  assert.equal(siswa.kelas, "6B");
}

// ── TTL boleh dikosongkan kembali, tanpa menyentuh data lain ───────────────
{
  const gas = loadGas(birthState());
  post(gas, "updateStudent", { id_siswa: "S1", tempat_lahir: "Tangerang", tanggal_lahir: "2015-05-12" });
  post(gas, "updateStudent", { id_siswa: "S1", tempat_lahir: "", tanggal_lahir: "" });
  const siswa = get(gas, "getUsers").data[0];
  assert.equal(siswa.tempat_lahir, "");
  assert.equal(siswa.tanggal_lahir, "");
  assert.equal(siswa.username, "siswa1", "login siswa tidak ikut berubah");
}

// ── Tanggal tidak valid ditolak, data lama tidak tersentuh ─────────────────
{
  const gas = loadGas(birthState());
  const res = post(gas, "updateStudent", { id_siswa: "S1", tanggal_lahir: "12 Mei 2015" });
  assert.equal(res.success, false, "format tampilan bukan format simpan");
  assert.equal(userById(gas, "S1")[BIRTHDATE_COL - 1], undefined);
  assert.equal(get(gas, "getUsers").data[0].nama_lengkap, "Siswa Satu");
}

// ── Siswa baru: TTL mendarat di kolom 17-18, bukan menggeser kolom lain ────
{
  const gas = loadGas(birthState());
  const res = post(gas, "createStudent", {
    id_siswa: "S2", username: "siswa2", password: "pw2", nama_lengkap: "Siswa Dua",
    kelas: "6A", tempat_lahir: "Jakarta", tanggal_lahir: "2014-06-20",
  });
  assert.equal(res.success, true, res.message);

  const row = userById(gas, "S2");
  assert.equal(row[1], "siswa2");
  assert.equal(row[3], "Siswa Dua");
  assert.equal(row[4], "6A");
  assert.equal(row[10], "BELUM", "status_ujian tetap di kolom 11");
  assert.equal(row[BIRTHPLACE_COL - 1], "Jakarta");
  assert.equal(row[BIRTHDATE_COL - 1], "2014-06-20");

  // Dua siswa, dua TTL berbeda — tidak ada satu nilai untuk semua.
  const users = get(gas, "getUsers").data;
  const dua = users.find((u) => u.id_siswa === "S2");
  assert.equal(dua.tempat_lahir, "Jakarta");
  assert.equal(dua.tanggal_lahir, "2014-06-20");
  assert.equal(users.find((u) => u.id_siswa === "S1").tempat_lahir, "");

  // Siswa baru tanpa TTL tetap boleh dibuat.
  assert.equal(post(gas, "createStudent", {
    username: "siswa3", password: "pw3", nama_lengkap: "Siswa Tiga", kelas: "6B",
  }).success, true);
}

// ── Import: kolom TTL opsional, file lama tanpa TTL tetap berhasil ─────────
{
  const gas = loadGas(birthState());
  const res = post(gas, "importStudents", {
    students: [
      { username: "i1", password: "p1", nama_lengkap: "Impor Satu", kelas: "6A",
        tempat_lahir: "Bandung", tanggal_lahir: "2013-08-17" },
      { username: "i2", password: "p2", nama_lengkap: "Impor Dua", kelas: "6A" },
    ],
  });
  assert.equal(res.success, true, res.message);
  assert.equal(res.data.added, 2);

  const users = get(gas, "getUsers").data;
  const satu = users.find((u) => u.username === "i1");
  const dua = users.find((u) => u.username === "i2");
  assert.equal(satu.tempat_lahir, "Bandung");
  assert.equal(satu.tanggal_lahir, "2013-08-17");
  assert.equal(dua.tempat_lahir, "", "siswa impor tanpa TTL: kosong, bukan nilai siswa lain");
  assert.equal(dua.tanggal_lahir, "");
  assert.equal(dua.nama_lengkap, "Impor Dua");
}

// ── Sel yang dikembalikan Sheets sebagai Date tetap terbaca sebagai ISO ────
{
  const row = LEGACY_ROW.slice();
  row[BIRTHDATE_COL - 1] = new Date(2015, 4, 12); // tengah malam waktu lokal
  row[BIRTHPLACE_COL - 1] = "Tangerang";
  const gas = loadGas(birthState([row]));
  const siswa = get(gas, "getUsers").data[0];
  assert.equal(siswa.tanggal_lahir, "2015-05-12", "tanggal tidak bergeser sehari");
  assert.equal(siswa.tempat_lahir, "Tangerang");
}

console.log("studentBirth: TTL siswa pada boundary GAS PASS");
