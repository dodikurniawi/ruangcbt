// Foto siswa untuk kartu ujian, pada boundary GAS.
// Yang diuji: rujukan foto tersimpan di kolom baru tanpa menggeser kolom lama,
// hanya URL hasil unggah sendiri yang diterima, dan data siswa lama tanpa foto
// tetap sah.

const assert = require("node:assert/strict");
const {
  tenantSecret, loadGas, baseState, post, get,
  QUESTION_HEADER, USER_HEADER, RESPONSE_HEADER,
} = require("./gasHarness.cjs");

const PHOTO_COL = 16; // 1-indexed, sesudah exam_binding (kolom 15)
const PHOTO_URL = "https://drive.google.com/thumbnail?id=1AbC_dEf-GhI&sz=w800";

function photoState(userRow) {
  return baseState({
    Config: [["key", "value"], ["exam_mapel", "MAPEL_A"], ["exam_duration", 90], ["exam_status", "OPEN"]],
    MataPelajaran: [["id_mapel", "kode", "nama"], ["MAPEL_A", "MTK", "Matematika"]],
    Questions: [
      QUESTION_HEADER,
      ["Q1", 1, "SINGLE", "Soal", "", "A", "B", "C", "D", "", "A", 1, "", "MAPEL_A", "AKTIF", "", ""],
    ],
    Users: [
      USER_HEADER.concat(["exam_binding", "foto_url"]),
      userRow || ["S1", "siswa", "pw", "Siswa Satu", "6A", false, "", "", "", 0, "BELUM", "", "", "", "", ""],
    ],
    Responses: [RESPONSE_HEADER],
  });
}

function userRowOf(gas) {
  return gas.__sheets.Users.rows[1];
}

// ── Foto tersimpan dan ikut terbaca pada data siswa ────────────────────────
{
  const gas = loadGas(photoState());
  assert.equal(get(gas, "getUsers").data[0].foto_url, "", "siswa tanpa foto terbaca sebagai kosong");

  const res = post(gas, "updateStudent", { id_siswa: "S1", foto_url: PHOTO_URL });
  assert.equal(res.success, true, res.message);
  assert.equal(userRowOf(gas)[PHOTO_COL - 1], PHOTO_URL, "foto tersimpan di kolom 16");
  assert.equal(get(gas, "getUsers").data[0].foto_url, PHOTO_URL);

  // Kolom lama tidak bergeser sedikit pun.
  const row = userRowOf(gas);
  assert.equal(row[0], "S1");
  assert.equal(row[3], "Siswa Satu");
  assert.equal(row[4], "6A");
  assert.equal(row[10], "BELUM");

  // Sheets hanya menyimpan rujukan, bukan gambarnya.
  assert.equal(String(row[PHOTO_COL - 1]).startsWith("data:"), false);
  assert.ok(String(row[PHOTO_COL - 1]).length < 200, "kolom foto hanya berisi URL pendek");
}

// ── Hanya URL hasil unggah sendiri yang diterima ───────────────────────────
{
  const invalid = [
    "https://situs-lain.example/foto.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "http://drive.google.com/thumbnail?id=abc",
    "https://drive.google.com/thumbnail?id=abc onerror=alert(1)",
    "<img src=x onerror=alert(1)>",
  ];
  for (const value of invalid) {
    const gas = loadGas(photoState());
    const res = post(gas, "updateStudent", { id_siswa: "S1", foto_url: value });
    assert.equal(res.success, false, "harus ditolak: " + value);
    assert.match(res.message, /Foto siswa tidak valid/);
    assert.equal(userRowOf(gas)[PHOTO_COL - 1], "", "penolakan tidak boleh menulis apa pun");
  }

  // Bentuk sah lain dari handleUploadImage (tanpa parameter ukuran) tetap diterima.
  const gas = loadGas(photoState());
  assert.equal(
    post(gas, "updateStudent", { id_siswa: "S1", foto_url: "https://drive.google.com/thumbnail?id=1AbC_dEf-GhI" }).success,
    true,
  );
}

// ── Menghapus foto, dan mengedit data lain tidak menyentuh foto ────────────
{
  const gas = loadGas(photoState());
  post(gas, "updateStudent", { id_siswa: "S1", foto_url: PHOTO_URL });

  post(gas, "updateStudent", { id_siswa: "S1", nama_lengkap: "Nama Baru", kelas: "6B" });
  assert.equal(userRowOf(gas)[PHOTO_COL - 1], PHOTO_URL, "edit data lain tidak boleh menghapus foto");
  assert.equal(userRowOf(gas)[3], "Nama Baru");

  assert.equal(post(gas, "updateStudent", { id_siswa: "S1", foto_url: "" }).success, true);
  assert.equal(userRowOf(gas)[PHOTO_COL - 1], "", "string kosong menghapus foto");
}

// ── Foto bertahan melewati alur ujian ──────────────────────────────────────
{
  const gas = loadGas(photoState());
  post(gas, "updateStudent", { id_siswa: "S1", foto_url: PHOTO_URL });

  post(gas, "login", { username: "siswa", password: "pw" });
  assert.equal(userRowOf(gas)[PHOTO_COL - 1], PHOTO_URL, "login tidak menyentuh foto");
  post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A" } });
  assert.equal(userRowOf(gas)[PHOTO_COL - 1], PHOTO_URL, "submit tidak menyentuh foto");
  post(gas, "resetUserLogin", { id_siswa: "S1" });
  assert.equal(userRowOf(gas)[PHOTO_COL - 1], PHOTO_URL, "reset login tidak menghapus foto siswa");
  assert.equal(userRowOf(gas)[10], "BELUM", "reset login tetap bekerja seperti biasa");
}

// ── Baris siswa lama (tanpa kolom foto) tetap sah ──────────────────────────
{
  const legacy = ["S1", "siswa", "pw", "Siswa Lama", "6A", false, "", "", "", 0, "BELUM", "", "", ""];
  const state = photoState(legacy);
  state.Users[0] = USER_HEADER; // header lama juga tanpa kolom foto
  const gas = loadGas(state);

  assert.equal(get(gas, "getUsers").data[0].foto_url, "", "baris lama dibaca tanpa error");
  assert.equal(get(gas, "getUsers").data[0].nama_lengkap, "Siswa Lama");
  assert.equal(post(gas, "login", { username: "siswa", password: "pw" }).success, true);

  const res = post(gas, "updateStudent", { id_siswa: "S1", foto_url: PHOTO_URL });
  assert.equal(res.success, true, "menambah foto pada baris lama tidak boleh gagal");
  assert.equal(userRowOf(gas)[PHOTO_COL - 1], PHOTO_URL);
  assert.equal(userRowOf(gas)[3], "Siswa Lama", "kolom lama tetap di tempatnya");
}

// ── Foto siswa tidak pernah ikut ke siswa lain atau ke Live Monitoring ─────
{
  const gas = loadGas(photoState());
  post(gas, "updateStudent", { id_siswa: "S1", foto_url: PHOTO_URL });
  post(gas, "login", { username: "siswa", password: "pw" });
  post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A" } });

  const live = get(gas, "getLiveScore");
  assert.equal(JSON.stringify(live).includes("drive.google.com"), false,
    "payload monitoring publik tidak memuat foto siswa");
  const questions = JSON.parse(
    gas.doGet({ parameter: { action: "getQuestions", proxy_secret: tenantSecret, id_siswa: "S1" } }).text
  );
  assert.equal(JSON.stringify(questions).includes("drive.google.com/thumbnail?id=1AbC"), false);
}

// ── REGRESI BUG: foto tersimpan tetapi gagal dimuat browser ────────────────
// Drive hanya membuatkan thumbnail untuk berkas yang dikenali sebagai gambar, dan
// pengenalannya lewat ekstensi nama berkas. Unggahan tanpa ekstensi menghasilkan
// URL thumbnail yang selalu gagal dimuat — foto tersimpan, tetapi tidak terlihat.
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUg==";

function uploadPhoto(gas, fileName, mimeType) {
  return post(gas, "uploadImage", {
    base64Data: PNG_BASE64,
    mimeType: mimeType || "image/jpeg",
    fileName: fileName,
  });
}

{
  const gas = loadGas(photoState());

  // Inti bug: nama tanpa ekstensi harus tetap sampai ke Drive sebagai berkas gambar.
  const res = uploadPhoto(gas, "siswa_S1_1762000000000", "image/jpeg");
  assert.equal(res.success, true, res.message);
  const uploaded = gas.__driveFiles[gas.__driveFiles.length - 1];
  assert.match(uploaded.blob.name, /\.jpg$/, "berkas gambar wajib punya ekstensi di Drive");
  assert.equal(uploaded.blob.mime, "image/jpeg");
  assert.equal(uploaded.sharing, "ANYONE_WITH_LINK:VIEW", "izin berkas tidak boleh berubah");

  // Ekstensi mengikuti tipe berkasnya, bukan selalu .jpg.
  for (const [mime, suffix] of [
    ["image/png", /\.png$/], ["image/webp", /\.webp$/], ["image/gif", /\.gif$/],
  ]) {
    assert.equal(uploadPhoto(gas, "siswa_tanpa_ekstensi", mime).success, true);
    assert.match(gas.__driveFiles[gas.__driveFiles.length - 1].blob.name, suffix, "ekstensi " + mime);
  }

  // Nama yang sudah berekstensi (jalur gambar soal) tidak diubah dua kali.
  uploadPhoto(gas, "foto siswa.JPG", "image/jpeg");
  assert.equal(gas.__driveFiles[gas.__driveFiles.length - 1].blob.name, "foto siswa.JPG");
  uploadPhoto(gas, "soal-1.png", "image/png");
  assert.equal(gas.__driveFiles[gas.__driveFiles.length - 1].blob.name, "soal-1.png");
}

// ── URL hasil unggah benar-benar dapat dipakai sebagai sumber gambar ───────
{
  const gas = loadGas(photoState());
  const res = uploadPhoto(gas, "siswa_S1_1762000000000", "image/jpeg");
  const url = res.data.url;

  // Bentuk URL: https + host Drive + id berkas, tanpa spasi atau karakter aneh
  // yang membuat browser gagal memuatnya.
  assert.match(url, /^https:\/\/drive\.google\.com\/thumbnail\?id=[A-Za-z0-9_-]+&sz=w\d+$/);
  assert.equal(url, url.trim());
  assert.equal(encodeURI(url), url, "URL tidak boleh butuh encoding tambahan");
  assert.equal(res.data.fileId.length > 0, true);

  // URL yang sama harus lolos validasi penyimpanan foto siswa — bug kelas ini
  // (upload sukses tetapi URL ditolak/berubah) ikut tertangkap di sini.
  assert.equal(post(gas, "updateStudent", { id_siswa: "S1", foto_url: url }).success, true);
  assert.equal(userRowOf(gas)[PHOTO_COL - 1], url, "URL tersimpan apa adanya");
  assert.equal(get(gas, "getUsers").data[0].foto_url, url, "getUsers mengembalikan URL yang sama");

  // Ganti foto: URL baru menggantikan yang lama, bukan menumpuk.
  const second = uploadPhoto(gas, "siswa_S1_1762000009999", "image/png");
  assert.notEqual(second.data.url, url);
  post(gas, "updateStudent", { id_siswa: "S1", foto_url: second.data.url });
  assert.equal(get(gas, "getUsers").data[0].foto_url, second.data.url);
}

// ── MUTATION GUARDS ────────────────────────────────────────────────────────
function mutate(find, replaceWith, label) {
  return function (source) {
    const mutated = source.replace(find, replaceWith);
    assert.notEqual(mutated, source, "titik mutation " + label + " tidak ditemukan");
    return mutated;
  };
}
{
  // A. Validasi URL foto dilewati.
  const skipValidation = mutate(
    '  if (photoGiven && photo !== "" && !DRIVE_PHOTO_URL.test(photo)) {',
    "  if (false) {",
    "A",
  );
  const gasA = loadGas(photoState(), skipValidation);
  assert.throws(() => assert.equal(
    post(gasA, "updateStudent", { id_siswa: "S1", foto_url: "javascript:alert(1)" }).success, false,
  ), undefined, "mutation A tidak terdeteksi");

  // C. Ekstensi berkas gambar dilepas lagi (bug aslinya): berkas tanpa ekstensi
  // tidak pernah mendapat thumbnail Drive, jadi fotonya tidak akan terlihat.
  const dropExtension = mutate(
    "      imageFileNameFor(fileName, normalizedMime)",
    '      fileName || ("soal_" + Date.now() + ".jpg")',
    "C",
  );
  const gasC = loadGas(photoState(), dropExtension);
  uploadPhoto(gasC, "siswa_S1_1762000000000", "image/jpeg");
  assert.throws(() => assert.match(
    gasC.__driveFiles[gasC.__driveFiles.length - 1].blob.name, /\.jpg$/,
  ), undefined, "mutation C tidak terdeteksi");

  // B. Foto ditulis ke kolom lain sehingga menimpa data siswa.
  const wrongColumn = mutate(
    "      if (photoGiven)   sheet.getRange(i + 1, USER_PHOTO_COL).setValue(photo);",
    "      if (photoGiven)   sheet.getRange(i + 1, 4).setValue(photo);",
    "B",
  );
  const gasB = loadGas(photoState(), wrongColumn);
  post(gasB, "updateStudent", { id_siswa: "S1", foto_url: PHOTO_URL });
  assert.throws(() => assert.equal(userRowOf(gasB)[3], "Siswa Satu"),
    undefined, "mutation B tidak terdeteksi");
}

console.log("studentPhoto: kolom append-only, validasi URL, unggah dapat dirender, reset/ujian aman, baris lama + mutations A/B/C PASS");
