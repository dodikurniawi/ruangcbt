// E2E P1.2: exam entry paralel, dirty tracking, in-flight guard, admin, failure.
const { chromium } = require("@playwright/test");
const fs = require("node:fs");

const BASE = "http://localhost:3100";
const MOCK = "http://127.0.0.1:39125";
const LOG = "C:/Users/LEGION~1/AppData/Local/Temp/claude/d--Projects-Webappscript-ruangcbt/8f5d44ca-092c-40b8-8ad4-4dbb6c6c538e/scratchpad/gas-calls.log";

const results = [];
function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
function entries() {
  return fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean)
    .map((l) => { const p = l.split(" "); return { t: Number(p[0]), action: p[1], rev: p[2] }; });
}
const setMode = (v) => fetch(`${MOCK}/__mode?value=${v}`).then((r) => r.text());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path) {
  const t = Date.now();
  const res = await fetch(`${BASE}${path}`);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, ms: Date.now() - t };
}

(async () => {
  await setMode("normal");
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext();
  let browserSync = 0;
  ctx.on("request", (r) => {
    if (r.url().includes("/api/proxy") && (r.postData() || "").includes('"action":"syncAnswers"')) browserSync++;
  });

  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", "siswa");
  await page.fill("#password", "rahasia");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/pin-verification", { timeout: 20000 });
  for (let i = 0; i < 4; i++) await page.fill(`#pin-${i}`, "1234"[i]);

  const mark = entries().length;
  const t0 = Date.now();
  await page.click('button[type="submit"]');
  await page.waitForURL("**/exam", { timeout: 20000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Memuat soal ujian"), null, { timeout: 25000 });
  const entryMs = Date.now() - t0;

  const entry = entries().slice(mark).filter((e) => e.action !== "validateExamPin");
  const kinds = [...new Set(entry.map((e) => e.action))].sort();
  check("exam entry: hanya getConfig + getQuestions", kinds.join(",") === "getConfig,getQuestions", `[${kinds.join(",")}]`);

  // Paralel: jarak waktu antara getConfig dan getQuestions harus sangat kecil,
  // bukan selisih satu perjalanan jaringan penuh.
  const cfg = entry.filter((e) => e.action === "getConfig").map((e) => e.t);
  const q = entry.filter((e) => e.action === "getQuestions").map((e) => e.t);
  const gap = (cfg.length && q.length) ? Math.abs(q[0] - cfg[0]) : -1;
  check("exam entry: Config dan Questions diminta bersamaan", gap >= 0 && gap < 300, `jarak ${gap}ms, total masuk ujian ${entryMs}ms`);

  await page.getByRole("button", { name: /Mulai Ujian/ }).click();
  await page.waitForSelector("text=Berapa 2 + 2?", { timeout: 20000 });
  check("soal tampil", true);

  let m = browserSync;
  await page.locator("button", { hasText: "4" }).first().click();
  await wait(13000);
  check("dirty: ubah jawaban -> 1 autosave", browserSync - m === 1, `${browserSync - m}`);

  m = browserSync;
  await wait(45000);
  check("dirty: 45 detik diam -> 0 autosave", browserSync - m === 0, `${browserSync - m}`);

  await setMode("hang");
  await page.locator("button", { hasText: "5" }).first().click();
  m = browserSync;
  await wait(25000);
  check("in-flight guard: GAS menggantung 25 detik -> 1 request", browserSync - m === 1, `${browserSync - m}`);
  await setMode("normal");
  await ctx.close();

  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await ap.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await ap.fill('input[type="password"]', "admin-rahasia");
  await ap.click('button[type="submit"]');
  await ap.waitForURL("**/admin", { timeout: 20000 });
  await ap.waitForSelector("text=Siswa Uji", { timeout: 20000 });
  check("admin: dashboard memuat data siswa", true);
  const pm = entries().length;
  await wait(11000);
  check("admin: polling tetap berjalan", entries().slice(pm).filter((e) => e.action === "getUsers").length >= 2);
  await actx.close();
  await browser.close();

  await setMode("hang");
  const hung = await api("/api/proxy?action=getConfig");
  check("failure: GAS menggantung -> 504 dalam anggaran", hung.status === 504 && hung.ms < 17000, `${hung.ms}ms`);
  await setMode("normal");
  const rec = await api("/api/proxy?action=getConfig");
  check("failure: pulih otomatis", rec.status === 200 && rec.body.success === true, `${rec.ms}ms`);

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
