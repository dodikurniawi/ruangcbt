// Concurrency, isolasi row, dan stale-write autosave.
//
// Kenapa test ini ada: test lama menyatakan "10 siswa concurrent" padahal
// memanggil handler satu per satu dengan lock tiruan yang selalu berhasil —
// hasilnya sama persis dengan atau tanpa ScriptLock, jadi ia tidak membuktikan
// apa pun. Di sini eksekusi benar-benar dijalin: request berikutnya dilepas
// TEPAT setelah request sebelumnya membaca sheet, jadi keduanya hidup bersamaan.
// gasHarness memodelkan ScriptLock sungguhan (tryLock gagal saat lock dipegang),
// sehingga mengembalikan lock akan membuat test ini MERAH.
//
// Jalankan: node backend-script/syncConcurrency.test.cjs

const assert = require("node:assert/strict");
const { loadGas, baseState, post, USER_HEADER } = require("./gasHarness.cjs");

// Guard revisi menyimpan nomor terakhir di CacheService. Stub cache bawaan
// harness selalu kosong, jadi test ini memakai cache in-memory sungguhan —
// kalau tidak, guardnya tidak pernah teruji.
const CACHE = { liveCache: true };

function studentsState(n, startedAt) {
  const rows = [USER_HEADER.slice()];
  for (let i = 1; i <= n; i++) {
    rows.push([
      `S${String(i).padStart(3, "0")}`, `siswa${i}`, "pw", `Siswa ${i}`, "6A", true,
      startedAt || new Date(), "", "", 0, "SEDANG", "", "", "",
    ]);
  }
  return baseState({ Users: rows });
}

/** Lepas `release()` tepat setelah sheet Users dibaca oleh request yang sedang jalan. */
function armInterleave(gas, release) {
  const sheet = gas.__sheets.Users;
  const original = sheet.getDataRange.bind(sheet);
  let armed = true;
  sheet.getDataRange = function () {
    const range = original();
    if (armed) { armed = false; release(); }
    return range;
  };
}

// ===========================================================================
// 1. CONCURRENCY — N siswa berbeda, request saling tumpang tindih
// ===========================================================================
function concurrentSync(n, mutateSource) {
  const gas = loadGas(studentsState(n), mutateSource, CACHE);
  const ids = [];
  for (let i = 1; i <= n; i++) ids.push(`S${String(i).padStart(3, "0")}`);

  const results = [];
  const call = (id) => results.push({
    id, res: gas.handleSyncAnswers({ id_siswa: id, answers: { Q1: "A", milik: id } }),
  });

  // Request #1 berangkat; saat ia sudah membaca sheet (dan, bila lock masih ada,
  // masih memegangnya), semua request lain dicoba sampai selesai.
  armInterleave(gas, () => { for (let i = 1; i < ids.length; i++) call(ids[i]); });
  call(ids[0]);

  const success = results.filter((r) => r.res.success).length;
  const busy = results.filter((r) => !r.res.success && /busy|sibuk/i.test(r.res.message || "")).length;

  let corrupt = 0, lost = 0;
  for (let i = 1; i <= n; i++) {
    const id = `S${String(i).padStart(3, "0")}`;
    const row = gas.__sheets.Users.rows[i];
    assert.equal(row[0], id, "urutan baris tidak boleh bergeser oleh concurrency");
    if (!row[13]) { lost++; continue; }
    if (JSON.parse(row[13]).milik !== id) corrupt++;
  }

  const usersOps = gas.__ops ? null : null;
  return {
    n, total: results.length, success, busy,
    failure: results.length - success - busy,
    corrupt, lost,
  };
}

const concurrency = {};
for (const n of [1, 5, 10, 20]) {
  const r = concurrentSync(n);
  concurrency[n] = r;
  assert.equal(r.total, n, `n=${n}: semua request harus dicoba`);
  assert.equal(r.success, n, `n=${n}: siswa berbeda tidak boleh saling memblokir (sukses ${r.success}/${n})`);
  assert.equal(r.busy, 0, `n=${n}: tidak boleh ada "server busy" antar siswa berbeda`);
  assert.equal(r.failure, 0, `n=${n}: tidak boleh ada kegagalan lain`);
  assert.equal(r.corrupt, 0, `n=${n}: jawaban siswa tidak boleh masuk baris siswa lain`);
  assert.equal(r.lost, 0, `n=${n}: tidak boleh ada jawaban yang hilang`);
}

// ===========================================================================
// 2. ISOLASI ROW — A/B/C saling tidak dapat mengubah data satu sama lain
// ===========================================================================
{
  const gas = loadGas(studentsState(3), null, CACHE);
  gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "punyaA" } });
  gas.handleSyncAnswers({ id_siswa: "S002", answers: { Q1: "punyaB" } });
  gas.handleSyncAnswers({ id_siswa: "S003", answers: { Q1: "punyaC" } });

  const rows = gas.__sheets.Users.rows;
  assert.equal(JSON.parse(rows[1][13]).Q1, "punyaA");
  assert.equal(JSON.parse(rows[2][13]).Q1, "punyaB");
  assert.equal(JSON.parse(rows[3][13]).Q1, "punyaC");
  assert.ok(rows[1][11] && rows[2][11] && rows[3][11], "last_seen tiap siswa diisi oleh syncnya sendiri");

  // A menulis lagi; B dan C tidak boleh ikut berubah.
  const snapshotB = JSON.stringify(rows[2]);
  const snapshotC = JSON.stringify(rows[3]);
  gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "punyaA-2" } });
  assert.equal(JSON.stringify(rows[2]), snapshotB, "baris B tidak boleh tersentuh oleh sync A");
  assert.equal(JSON.stringify(rows[3]), snapshotC, "baris C tidak boleh tersentuh oleh sync A");

  // Siswa tidak dikenal tidak boleh menulis baris siapa pun.
  const before = JSON.stringify(rows);
  const unknown = gas.handleSyncAnswers({ id_siswa: "S999", answers: { Q1: "x" } });
  assert.equal(unknown.success, false);
  assert.equal(JSON.stringify(rows), before, "id tidak dikenal tidak boleh mengubah satu baris pun");
}

// ===========================================================================
// 3. STALE WRITE — A (lama) start, B (baru) start, B selesai, A selesai
// ===========================================================================
function staleScenario(revA, revB, mutateSource) {
  const gas = loadGas(studentsState(1), mutateSource, CACHE);
  let resB = null;
  armInterleave(gas, () => {
    resB = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "BARU" }, rev: revB });
  });
  const resA = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "LAMA" }, rev: revA });
  const cell = gas.__sheets.Users.rows[1][13];
  return { resA, resB, final: cell ? JSON.parse(cell).Q1 : null };
}

{
  // A berangkat lebih dulu (rev lebih kecil) tetapi mendarat belakangan.
  const r = staleScenario(100, 105);
  assert.equal(r.resB.success, true, "autosave yang lebih baru harus diterima");
  assert.equal(r.resA.success, false, "autosave basi harus ditolak");
  assert.equal(r.resA.message, "stale_write");
  assert.equal(r.final, "BARU", "jawaban terbaru tidak boleh ditimpa oleh autosave basi");
}

{
  // Urutan wajar (A lebih tua selesai duluan) tidak boleh ikut tertolak.
  const gas = loadGas(studentsState(1), null, CACHE);
  const first = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "satu" }, rev: 100 });
  const second = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "dua" }, rev: 101 });
  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(JSON.parse(gas.__sheets.Users.rows[1][13]).Q1, "dua");
}

{
  // rev sama (dua request pada milidetik yang sama) tetap diterima.
  const gas = loadGas(studentsState(1), null, CACHE);
  assert.equal(gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "a" }, rev: 100 }).success, true);
  assert.equal(gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "b" }, rev: 100 }).success, true);
  assert.equal(JSON.parse(gas.__sheets.Users.rows[1][13]).Q1, "b");
}

{
  // Kompatibilitas: klien lama tanpa rev tetap dilayani (fail-open, bukan fail-closed).
  const gas = loadGas(studentsState(1), null, CACHE);
  assert.equal(gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "a" }, rev: 500 }).success, true);
  const noRev = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "tanpa-rev" } });
  assert.equal(noRev.success, true, "request tanpa rev tidak boleh ditolak");
  assert.equal(JSON.parse(gas.__sheets.Users.rows[1][13]).Q1, "tanpa-rev");
}

{
  // rev sampah dari klien tidak boleh mengunci autosave siswa.
  for (const bogus of ["abc", null, -5, 0, NaN, Infinity]) {
    const gas = loadGas(studentsState(1), null, CACHE);
    const res = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "a" }, rev: bogus });
    assert.equal(res.success, true, `rev tidak valid (${String(bogus)}) harus diabaikan, bukan menolak`);
  }
}

{
  // Guard revisi TIDAK boleh mendahului aturan bisnis.
  const submitted = studentsState(1);
  submitted.Users[1][10] = "SELESAI";
  const gasSubmitted = loadGas(submitted, null, CACHE);
  assert.equal(
    gasSubmitted.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "x" }, rev: 1 }).message,
    "already_submitted",
    "status submit menang atas guard revisi",
  );

  const expired = studentsState(1, new Date(Date.now() - 200 * 60 * 1000));
  const gasExpired = loadGas(expired, null, CACHE);
  assert.equal(
    gasExpired.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "x" }, rev: 1 }).message,
    "deadline_expired",
    "deadline menang atas guard revisi",
  );
}

{
  // Revisi satu siswa tidak boleh mempengaruhi siswa lain.
  const gas = loadGas(studentsState(2), null, CACHE);
  assert.equal(gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "a" }, rev: 9999 }).success, true);
  const other = gas.handleSyncAnswers({ id_siswa: "S002", answers: { Q1: "b" }, rev: 1 });
  assert.equal(other.success, true, "rev tinggi milik siswa lain tidak boleh memblokir siswa ini");
}

// ===========================================================================
// 4. SUBMIT x AUTOSAVE
// ===========================================================================
{
  // A. autosave lalu submit
  const gas = loadGas(studentsState(1), null, CACHE);
  assert.equal(gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "A" }, rev: 1 }).success, true);
  const sub = gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A" }, forced: false });
  assert.equal(sub.success, true);
  assert.equal(gas.__sheets.Users.rows[1][10], "SELESAI");
  assert.equal(gas.__sheets.Responses.rows.length - 1, 1);
}
{
  // B. submit lalu autosave
  const gas = loadGas(studentsState(1), null, CACHE);
  gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A" }, forced: false });
  const late = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "DIUBAH" }, rev: 2 });
  assert.equal(late.success, false);
  assert.equal(late.message, "already_submitted");
}
{
  // C. autosave sedang berjalan, submit selesai, autosave selesai belakangan.
  // Yang wajib dijaga: status, skor, dan jumlah baris Responses.
  const gas = loadGas(studentsState(1), null, CACHE);
  let subRes = null;
  armInterleave(gas, () => {
    subRes = gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A" }, forced: false });
  });
  const lateSync = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "BASI" }, rev: 3 });
  const row = gas.__sheets.Users.rows[1];
  assert.equal(subRes.success, true, "submit tidak boleh diblokir autosave yang sedang berjalan");
  assert.equal(row[10], "SELESAI", "status akhir wajib SELESAI");
  assert.equal(row[8], subRes.score, "skor akhir tidak boleh disentuh autosave");
  assert.equal(gas.__sheets.Responses.rows.length - 1, 1, "tepat satu baris Responses");
  // Autosave itu memang masih sempat menulis saved_answers/last_seen. Itu tidak
  // mengubah hasil ujian: nilai dan status sudah final, dan login setelah
  // SELESAI ditolak sehingga saved_answers tidak pernah dipakai lagi.
  assert.equal(lateSync.success, true, "perilaku ini didokumentasikan, bukan kebetulan");
  assert.equal(JSON.parse(row[13]).Q1, "BASI");
}
{
  // D. submit dua kali
  const gas = loadGas(studentsState(1), null, CACHE);
  const r1 = gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A" }, forced: false });
  const r2 = gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "B" }, forced: false });
  assert.equal(r2.duplicate, true);
  assert.equal(r2.score, r1.score, "skor tersimpan tidak dihitung ulang");
  assert.equal(gas.__sheets.Responses.rows.length - 1, 1);
}
{
  // E. stale autosave datang setelah submit -> ditolak oleh aturan bisnis
  const gas = loadGas(studentsState(1), null, CACHE);
  gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "A" }, rev: 10 });
  gas.handleSubmitExam({ id_siswa: "S001", answers: { Q1: "A" }, forced: false });
  const stale = gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "BASI" }, rev: 5 });
  assert.equal(stale.success, false);
  assert.equal(stale.message, "already_submitted", "aturan bisnis diperiksa lebih dulu");
}

// ===========================================================================
// 5. BOUNDARY — autosave tetap butuh proxy_secret
// ===========================================================================
{
  const gas = loadGas(studentsState(1), null, CACHE);
  const noSecret = JSON.parse(gas.doPost({
    postData: { contents: JSON.stringify({ action: "syncAnswers", id_siswa: "S001", answers: {}, rev: 1 }) },
  }).text);
  assert.equal(noSecret.success, false);
  assert.equal(noSecret.message, "Unauthorized");
  const withSecret = post(gas, "syncAnswers", { id_siswa: "S001", answers: { Q1: "A" }, rev: 1 });
  assert.equal(withSecret.success, true);
}

// ===========================================================================
// MUTATION — test di atas wajib mati kalau implementasinya dirusak
// ===========================================================================
function mutate(find, replaceWith, label) {
  return function (source) {
    const mutated = source.replace(find, replaceWith);
    assert.notEqual(mutated, source, "titik mutation " + label + " tidak ditemukan");
    return mutated;
  };
}

const mutations = [
  {
    label: "ScriptLock dikembalikan ke syncAnswers",
    apply: mutate(
      "  var sheet = getSheet(\"Users\");\n  var data = sheet.getDataRange().getValues();\n\n  for (var i = 1; i < data.length; i++) {\n    if (data[i][0] === id_siswa) {",
      "  var __lock = LockService.getScriptLock();\n  if (!__lock.tryLock(5000)) return { success: false, message: \"Server busy, retry later\" };\n  var sheet = getSheet(\"Users\");\n  var data = sheet.getDataRange().getValues();\n\n  for (var i = 1; i < data.length; i++) {\n    if (data[i][0] === id_siswa) {",
      "LOCK",
    ),
    run: () => {
      const r = concurrentSync(10, mutations[0].apply);
      return r.success === 10;   // masih 10 = test tidak mendeteksi lock
    },
  },
  {
    label: "stale-write guard dimatikan",
    apply: mutate(
      "        if (isFinite(storedRev) && storedRev > 0 && incomingRev < storedRev) {",
      "        if (false) {",
      "STALE",
    ),
    run: () => staleScenario(100, 105, mutations[1].apply).final === "BARU",
  },
  {
    label: "revisi tidak pernah disimpan",
    apply: mutate(
      '      if (hasRev) cache.put(revKey, String(incomingRev), 3600);',
      "      if (false) cache.put(revKey, String(incomingRev), 3600);",
      "REVSTORE",
    ),
    run: () => staleScenario(100, 105, mutations[2].apply).final === "BARU",
  },
  {
    label: "guard revisi mendahului aturan submit",
    apply: mutate(
      '      if (status === "SELESAI" || status === "DISKUALIFIKASI") {\n        return { success: false, message: "already_submitted" };\n      }',
      "      if (false) {\n        return { success: false, message: \"already_submitted\" };\n      }",
      "SUBMITGUARD",
    ),
    run: () => {
      const state = studentsState(1);
      state.Users[1][10] = "SELESAI";
      const gas = loadGas(state, mutations[3].apply, CACHE);
      return gas.handleSyncAnswers({ id_siswa: "S001", answers: { Q1: "x" }, rev: 1 }).message === "already_submitted";
    },
  },
];

for (const m of mutations) {
  let survived = false;
  try { survived = m.run() === true; } catch { survived = false; }
  assert.equal(survived, false, `mutation "${m.label}" LOLOS — test tidak mendeteksi regresi`);
  console.log("  KILLED ", m.label);
}

console.log(
  "syncConcurrency: concurrency 1/5/10/20, isolasi row, stale-write, submit race, boundary + 4 mutation PASS",
);
