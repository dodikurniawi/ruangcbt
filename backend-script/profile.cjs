// [sim] Profiler jalur panas GAS — bukan latency production.
//
// Mengukur apa yang BISA diukur tanpa deploy: jumlah operasi Sheets, jumlah sel
// yang dibaca/ditulis, cache hit/miss, dan lock wait/contention, per action, pada
// populasi siswa yang berbeda. Angka wall-clock di sini hanyalah CPU harness;
// biaya nyata di Apps Script didominasi jumlah panggilan Sheets dan ukuran range,
// dan itulah yang dihitung di sini.
//
// Jalankan: node backend-script/profile.cjs [populasi...]   (default 1 5 10 20 30 50 100)

const { loadGas, baseState, USER_HEADER, QUESTION_HEADER } = require("./gasHarness.cjs");

const QUESTION_COUNT = Number(process.env.PROFILE_QUESTIONS || 50);

function state(students, questions) {
  const users = [USER_HEADER.slice()];
  for (let i = 1; i <= students; i++) {
    users.push([
      `S${String(i).padStart(3, "0")}`, `siswa${i}`, "pw", `Siswa ${i}`, "6A",
      false, "", "", "", 0, "BELUM", "", "", "",
    ]);
  }
  const qs = [QUESTION_HEADER.slice()];
  for (let q = 1; q <= questions; q++) {
    qs.push([
      `Q${q}`, q, "SINGLE", `Soal nomor ${q} dengan teks yang cukup panjang untuk realistis`,
      "", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E",
      "A", 1, "Mudah", "MAPEL_A", "AKTIF", "", "",
    ]);
  }
  return baseState({ Users: users, Questions: qs });
}

// Menghitung SEL, bukan hanya panggilan: satu getDataRange atas 100x14 jauh lebih
// mahal daripada satu getRange 1x16, dan perbedaan itu hilang kalau hanya
// panggilan yang dihitung.
function instrument(gas) {
  const m = {
    fullReads: 0, rangeReads: 0, cellsRead: 0,
    writes: 0, cellsWritten: 0, appends: 0,
    cacheHit: 0, cacheMiss: 0, lockWait: 0, lockFail: 0,
  };
  for (const name of Object.keys(gas.__sheets)) {
    const sheet = gas.__sheets[name];
    const getDataRange = sheet.getDataRange.bind(sheet);
    sheet.getDataRange = function () {
      const range = getDataRange();
      const values = range.getValues();
      m.fullReads++;
      m.cellsRead += values.length * (values[0] ? values[0].length : 0);
      return { getValues: () => values };
    };
    const getRange = sheet.getRange.bind(sheet);
    sheet.getRange = function (row, col, numRows, numCols) {
      const range = getRange(row, col, numRows, numCols);
      const getValues = range.getValues.bind(range);
      const setValue = range.setValue.bind(range);
      const setValues = range.setValues.bind(range);
      range.getValues = function () {
        const out = getValues();
        m.rangeReads++;
        m.cellsRead += (numRows || 1) * (numCols || 1);
        return out;
      };
      range.setValue = function (v) { m.writes++; m.cellsWritten += 1; return setValue(v); };
      range.setValues = function (v) {
        m.writes++;
        m.cellsWritten += v.length * (v[0] ? v[0].length : 0);
        return setValues(v);
      };
      return range;
    };
    const appendRow = sheet.appendRow.bind(sheet);
    sheet.appendRow = function (v) { m.appends++; m.cellsWritten += v.length; return appendRow(v); };
  }
  const cache = gas.__eval("cache");
  const get = cache.get.bind(cache);
  cache.get = function (key) {
    const value = get(key);
    if (value === null || value === undefined) m.cacheMiss++; else m.cacheHit++;
    return value;
  };
  const getScriptLock = gas.LockService.getScriptLock.bind(gas.LockService);
  gas.LockService.getScriptLock = function () {
    const lock = getScriptLock();
    const tryLock = lock.tryLock.bind(lock);
    return Object.assign(lock, {
      tryLock(timeout) {
        const ok = tryLock(timeout);
        m.lockWait++;
        if (!ok) m.lockFail++;
        return ok;
      },
    });
  };
  return m;
}

function snapshot(m) { return Object.assign({}, m); }
function delta(before, after) {
  const out = {};
  for (const k of Object.keys(after)) out[k] = after[k] - before[k];
  return out;
}

function measure(m, fn) {
  const before = snapshot(m);
  const started = process.hrtime.bigint();
  const result = fn();
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { d: delta(before, snapshot(m)), ms, result };
}

function avg(list, key) {
  if (!list.length) return 0;
  return list.reduce((s, x) => s + x[key], 0) / list.length;
}

// Satu putaran lengkap: login → getQuestions → autosave → violation → submit,
// untuk SELURUH populasi, seperti satu sesi ujian sungguhan.
function runPopulation(n) {
  const gas = loadGas(state(n, QUESTION_COUNT), null, { liveCache: true });
  const m = instrument(gas);
  const ids = [];
  for (let i = 1; i <= n; i++) ids.push(`S${String(i).padStart(3, "0")}`);

  const answers = {};
  for (let q = 1; q <= QUESTION_COUNT; q++) answers[`Q${q}`] = "A";

  const phases = { login: [], questions: [], autosave: [], violation: [], submit: [], monitoring: [] };

  for (let i = 0; i < n; i++) {
    phases.login.push(measure(m, () => gas.handleLogin({ username: `siswa${i + 1}`, password: "pw" })));
  }
  for (const id of ids) {
    phases.questions.push(measure(m, () => gas.handleGetQuestions(false, id)));
  }
  // 3 siklus autosave per siswa — jalur terpanas, dijalankan berulang.
  for (let cycle = 0; cycle < 3; cycle++) {
    for (let i = 0; i < n; i++) {
      phases.autosave.push(measure(m, () => gas.handleSyncAnswers({
        id_siswa: ids[i], answers: answers, rev: Date.now() + cycle * 1000 + i,
      })));
    }
  }
  for (const id of ids) {
    phases.violation.push(measure(m, () => gas.handleReportViolation({ id_siswa: id, type: "blur" })));
  }
  // Monitoring guru: getUsers dipanggil tiap 5 detik oleh layar pemantauan.
  for (let poll = 0; poll < 3; poll++) {
    phases.monitoring.push(measure(m, () => gas.handleGetUsers({})));
  }
  for (const id of ids) {
    phases.submit.push(measure(m, () => gas.handleSubmitExam({ id_siswa: id, answers: answers })));
  }

  const failures = [];
  for (const [name, runs] of Object.entries(phases)) {
    for (const run of runs) {
      if (run.result && run.result.success === false) failures.push(`${name}: ${run.result.message}`);
    }
  }
  return { n, phases, totals: m, failures };
}

function row(label, runs) {
  const per = (k) => avg(runs, "d").toFixed;   // unused guard
  const d = (k) => (runs.reduce((s, r) => s + r.d[k], 0) / runs.length).toFixed(2);
  const sum = (k) => runs.reduce((s, r) => s + r.d[k], 0);
  return [
    label.padEnd(11),
    `calls=${String(runs.length).padStart(4)}`,
    `full/call=${d("fullReads").padStart(5)}`,
    `range/call=${d("rangeReads").padStart(5)}`,
    `cellsRead/call=${d("cellsRead").padStart(8)}`,
    `writes/call=${d("writes").padStart(5)}`,
    `cellsWr/call=${d("cellsWritten").padStart(5)}`,
    `hit=${String(sum("cacheHit")).padStart(5)}`,
    `miss=${String(sum("cacheMiss")).padStart(5)}`,
    `lockFail=${String(sum("lockFail")).padStart(3)}`,
    `ms/call=${avg(runs, "ms").toFixed(3)}`,
  ].join("  ");
}

const populations = process.argv.slice(2).map(Number).filter(Boolean);
const sizes = populations.length ? populations : [1, 5, 10, 20, 30, 50, 100];

console.log(`[sim] profiler — ${QUESTION_COUNT} soal per ujian. Angka ms = CPU harness, BUKAN latency production.\n`);
const summary = [];
for (const n of sizes) {
  const r = runPopulation(n);
  console.log(`=== ${n} siswa ===`);
  for (const name of ["login", "questions", "autosave", "violation", "monitoring", "submit"]) {
    console.log("  " + row(name, r.phases[name]));
  }
  const t = r.totals;
  console.log(`  TOTAL sesi: fullReads=${t.fullReads} rangeReads=${t.rangeReads} cellsRead=${t.cellsRead} ` +
    `writes=${t.writes + t.appends} cellsWritten=${t.cellsWritten} cacheHit=${t.cacheHit} cacheMiss=${t.cacheMiss} ` +
    `lockAcquire=${t.lockWait} lockFail=${t.lockFail} failures=${r.failures.length}`);
  if (r.failures.length) console.log("  FAILURES: " + [...new Set(r.failures)].join(", "));
  console.log("");
  summary.push({ n, cellsRead: t.cellsRead, cellsPerStudent: Math.round(t.cellsRead / n) });
}

console.log("=== SKALA cellsRead per siswa (linear = sehat, naik = O(n^2)) ===");
for (const s of summary) {
  console.log(`  n=${String(s.n).padStart(3)}  total=${String(s.cellsRead).padStart(8)}  per-siswa=${String(s.cellsPerStudent).padStart(7)}`);
}
