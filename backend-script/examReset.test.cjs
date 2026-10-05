// Integritas data saat reset, dan kebenaran status yang dibaca layar guru.
//
// Kenapa test ini ada: reset lama menulis delapan sel berurutan tanpa lock, dan
// salah satunya mengosongkan skor_akhir + saved_answers. Dua akibatnya nyata di
// lapangan: hasil mapel pertama hilang dari setiap layar guru, dan login siswa
// yang beradu dengan reset meninggalkan baris setengah-reset yang terbaca
// "belum mengerjakan" padahal siswanya sedang bekerja.
//
// Yang dijaga di sini:
//   1. Hasil yang sudah final tetap ada di Responses setelah reset.
//   2. Jawaban yang BELUM disubmit diarsipkan sebelum attempt baru dimulai.
//   3. Reset akses tidak menyentuh satu pun kolom hasil.
//   4. Login menyembuhkan status yang tertimpa "BELUM".
//   5. Heartbeat memperbarui last_seen tanpa menyentuh jawaban.
//
// Jalankan: node backend-script/examReset.test.cjs

const assert = require("node:assert/strict");
const { loadGas, baseState, post, get, USER_HEADER, RESPONSE_HEADER } = require("./gasHarness.cjs");

const CACHE = { liveCache: true };

function userRow(over) {
  const row = [
    "S1", "siswa", "pw", "Siswa Satu", "6A",
    false, "", "", "", 0, "BELUM", "", "", "",
  ];
  Object.keys(over || {}).forEach(function (k) { row[Number(k)] = over[k]; });
  return row;
}

function stateWith(over) {
  return baseState({ Users: [USER_HEADER.slice(), userRow(over)] });
}

function users(gas) {
  return get(gas, "getUsers").data[0];
}

function responses(gas) {
  return gas.__sheets.Responses.rows.slice(1);
}

// ── 1. Hasil final selamat dari reset ──────────────────────────────────────
{
  const gas = loadGas(stateWith({}), null, CACHE);
  post(gas, "login", { username: "siswa", password: "pw" });
  const submitted = post(gas, "submitExam", { id_siswa: "S1", answers: { Q1: "A" } });
  assert.equal(submitted.score, "100.00");
  assert.equal(responses(gas).length, 1, "submit menulis satu baris Responses");

  const reset = post(gas, "resetUserLogin", { id_siswa: "S1", mode: "attempt" });
  assert.equal(reset.success, true);
  assert.equal(reset.archived, false, "attempt yang sudah submit tidak perlu diarsipkan ulang");

  const after = responses(gas);
  assert.equal(after.length, 1, "reset tidak pernah menghapus baris Responses");
  assert.equal(after[0][1], "S1");
  assert.equal(after[0][5], "100.00", "skor hasil ujian pertama masih utuh");
  assert.equal(after[0][4], JSON.stringify({ Q1: "A" }), "jawaban hasil ujian pertama masih utuh");

  // Baris Users memang dikosongkan: itu slot attempt BERIKUTNYA, bukan arsip hasil.
  const u = users(gas);
  assert.equal(u.status_ujian, "BELUM");
  assert.equal(u.skor_akhir, null);
  // Jejak "kapan terakhir terlihat" tidak ikut terhapus — layar guru memakainya
  // untuk membedakan "belum mulai" dari "status belum diperbarui".
  assert.ok(u.last_seen_ms > 0, "last_seen bertahan melewati reset");

  // Dan siswa memang bisa masuk ke mapel berikutnya setelahnya.
  assert.equal(post(gas, "login", { username: "siswa", password: "pw" }).success, true);
}

// ── 2. Jawaban yang belum disubmit diarsipkan, bukan dibuang ───────────────
{
  const gas = loadGas(stateWith({}), null, CACHE);
  post(gas, "login", { username: "siswa", password: "pw" });
  post(gas, "syncAnswers", { id_siswa: "S1", answers: { Q1: "A" }, rev: 1 });
  assert.equal(responses(gas).length, 0, "autosave belum menulis Responses");

  const reset = post(gas, "resetUserLogin", { id_siswa: "S1", mode: "attempt" });
  assert.equal(reset.archived, true, "jawaban yang belum disubmit diarsipkan");

  const archived = responses(gas);
  assert.equal(archived.length, 1);
  assert.equal(archived[0][4], JSON.stringify({ Q1: "A" }), "jawaban tersalin apa adanya");
  assert.equal(archived[0][5], "", "baris arsip tidak mengklaim skor");
  assert.match(String(archived[0][7]), /BELUM DISUBMIT/, "baris arsip bertanda belum disubmit");

  // Attempt baru tidak boleh memulihkan jawaban attempt lama.
  const relogin = post(gas, "login", { username: "siswa", password: "pw" });
  assert.equal(relogin.data.saved_answers, null, "attempt baru mulai tanpa jawaban lama");
}

// ── 3. Reset akses: membuka kunci sesi, TIDAK menyentuh hasil ──────────────
{
  const gas = loadGas(stateWith({}), null, CACHE);
  post(gas, "login", { username: "siswa", password: "pw" });
  post(gas, "syncAnswers", { id_siswa: "S1", answers: { Q1: "A" }, rev: 1 });
  const before = users(gas);

  const reset = post(gas, "resetUserLogin", { id_siswa: "S1", mode: "access" });
  assert.equal(reset.success, true);
  assert.equal(reset.mode, "access");
  assert.equal(responses(gas).length, 0, "reset akses tidak mengarsipkan apa pun");

  const after = users(gas);
  assert.equal(after.status_login, false, "kunci sesi dilepas");
  assert.equal(after.status_ujian, "SEDANG", "status attempt tidak disentuh");
  assert.equal(after.waktu_mulai, before.waktu_mulai, "timer attempt tidak digeser");
  assert.equal(gas.__sheets.Users.rows[1][13], JSON.stringify({ Q1: "A" }), "jawaban tersimpan tidak disentuh");

  // Masuk kembali ke attempt yang SAMA, lengkap dengan jawabannya.
  const relogin = post(gas, "login", { username: "siswa", password: "pw" });
  assert.deepEqual(relogin.data.saved_answers, { Q1: "A" }, "attempt yang sama dipulihkan");
}

// ── 4. Login menyembuhkan status yang tertimpa "BELUM" ─────────────────────
// Ini kondisi yang dilaporkan guru: siswa sedang mengerjakan, layar guru bilang
// "belum mengerjakan". Baris di bawah adalah bentuk barisnya setelah reset
// beradu dengan login — waktu_mulai sudah terisi, status masih BELUM.
{
  const gas = loadGas(
    stateWith({ 5: false, 6: new Date(Date.now() - 300000), 10: "BELUM", 11: new Date() }),
    null,
    CACHE,
  );
  assert.equal(users(gas).status_ujian, "BELUM");

  const relogin = post(gas, "login", { username: "siswa", password: "pw" });
  assert.equal(relogin.success, true);
  assert.equal(users(gas).status_ujian, "SEDANG", "status dikoreksi saat siswa masuk");
  // Attempt yang sama: waktu_mulai tidak digeser, jadi timer tidak diperpanjang.
  assert.equal(
    new Date(gas.__sheets.Users.rows[1][6]).getTime(),
    new Date(relogin.data.waktu_mulai).getTime(),
    "waktu_mulai attempt lama dipakai apa adanya",
  );
}

// ── 5. Heartbeat: last_seen maju, jawaban tidak disentuh ───────────────────
{
  const gas = loadGas(stateWith({}), null, CACHE);
  post(gas, "login", { username: "siswa", password: "pw" });
  post(gas, "syncAnswers", { id_siswa: "S1", answers: { Q1: "A" }, rev: 1 });
  const saved = gas.__sheets.Users.rows[1][13];
  gas.__sheets.Users.rows[1][11] = new Date(Date.now() - 600000);

  const beat = post(gas, "syncAnswers", { id_siswa: "S1", heartbeat: true });
  assert.equal(beat.success, true);
  assert.equal(gas.__sheets.Users.rows[1][13], saved, "heartbeat tidak menulis jawaban");
  assert.ok(
    Date.now() - new Date(gas.__sheets.Users.rows[1][11]).getTime() < 5000,
    "last_seen diperbarui oleh heartbeat",
  );
}

// ── 6. Mode reset yang tidak dikenal ditolak, bukan ditebak ────────────────
{
  const gas = loadGas(stateWith({}), null, CACHE);
  const bad = post(gas, "resetUserLogin", { id_siswa: "S1", mode: "hapus-semua" });
  assert.equal(bad.success, false);
  assert.match(bad.message, /Mode reset/);
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
  // A. Pengarsipan jawaban yang belum disubmit dimatikan → test 2 wajib gagal.
  const gasA = loadGas(
    stateWith({}),
    mutate("  const archived = archiveUnsubmittedAttempt(row);", "  const archived = false;", "A"),
    CACHE,
  );
  post(gasA, "login", { username: "siswa", password: "pw" });
  post(gasA, "syncAnswers", { id_siswa: "S1", answers: { Q1: "A" }, rev: 1 });
  post(gasA, "resetUserLogin", { id_siswa: "S1", mode: "attempt" });
  assert.equal(responses(gasA).length, 0, "mutation A tidak terdeteksi");
}

{
  // B. Reset akses ikut mengosongkan attempt → test 3 wajib gagal.
  const gasB = loadGas(
    stateWith({}),
    mutate('  if (mode === "access") {', "  if (false) {", "B"),
    CACHE,
  );
  post(gasB, "login", { username: "siswa", password: "pw" });
  post(gasB, "syncAnswers", { id_siswa: "S1", answers: { Q1: "A" }, rev: 1 });
  post(gasB, "resetUserLogin", { id_siswa: "S1", mode: "access" });
  assert.notEqual(users(gasB).status_ujian, "SEDANG", "mutation B tidak terdeteksi");
}

{
  // C. Status hanya ditulis pada attempt baru → test 4 wajib gagal.
  const gasC = loadGas(
    stateWith({ 5: false, 6: new Date(Date.now() - 300000), 10: "BELUM", 11: new Date() }),
    mutate(
      '  if (row[10] !== "SEDANG") sheet.getRange(rowNumber, 11).setValue("SEDANG");',
      "  if (false) sheet.getRange(rowNumber, 11).setValue(\"SEDANG\");",
      "C",
    ),
    CACHE,
  );
  post(gasC, "login", { username: "siswa", password: "pw" });
  assert.equal(users(gasC).status_ujian, "BELUM", "mutation C tidak terdeteksi");
}

{
  // D. Heartbeat jatuh ke jalur autosave biasa → jawaban tertimpa objek kosong.
  const gasD = loadGas(
    stateWith({}),
    mutate("    if (params.heartbeat === true) {", "    if (false) {", "D"),
    CACHE,
  );
  post(gasD, "login", { username: "siswa", password: "pw" });
  post(gasD, "syncAnswers", { id_siswa: "S1", answers: { Q1: "A" }, rev: 1 });
  post(gasD, "syncAnswers", { id_siswa: "S1", heartbeat: true });
  assert.notEqual(
    gasD.__sheets.Users.rows[1][13],
    JSON.stringify({ Q1: "A" }),
    "mutation D tidak terdeteksi",
  );
}

assert.ok(RESPONSE_HEADER.length >= 9);
console.log("examReset.test.cjs OK");
