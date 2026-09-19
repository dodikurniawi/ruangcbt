// Mengukur BASELINE (kode sebelum P0) pada aplikasi yang sama dan GAS tiruan yang
// sama, supaya angka before/after dapat dibandingkan langsung.
const { chromium } = require("@playwright/test");
const fs = require("node:fs");

const BASE = "http://localhost:3100";
const LOG = 'C:/Users/LEGION~1/AppData/Local/Temp/claude/d--Projects-Webappscript-ruangcbt/8f5d44ca-092c-40b8-8ad4-4dbb6c6c538e/scratchpad/gas-calls.log';

function calls() {
  return fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => l.split(" ")[1]);
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", "siswa");
  await page.fill("#password", "rahasia");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/pin-verification", { timeout: 20000 });

  const entryMark = calls().length;
  for (let i = 0; i < 4; i++) await page.fill(`#pin-${i}`, "1234"[i]);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/exam", { timeout: 20000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Memuat soal ujian"), null, { timeout: 25000 });
  const entry = calls().slice(entryMark).filter((a) => a !== "validateExamPin");
  console.log("BEFORE exam entry actions:", JSON.stringify(entry));
  console.log("BEFORE jenis action unik:", JSON.stringify([...new Set(entry)].sort()));
  await ctx.close();

  // Dashboard admin: burst saat kembali dari tab lain.
  const actx = await browser.newContext();
  const apage = await actx.newPage();
  await apage.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await apage.fill('input[type="password"]', "admin-rahasia");
  await apage.click('button[type="submit"]');
  await apage.waitForURL("**/admin", { timeout: 20000 });
  await apage.waitForSelector("text=Siswa Uji", { timeout: 20000 });

  // Tab-switch sungguhan: halaman disembunyikan lalu ditampilkan lagi, sehingga
  // visibilitychange dan focus benar-benar terjadi seperti saat guru alt-tab.
  const other = await actx.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await apage.waitForTimeout(6000);
  const focusMark = calls().length;
  await apage.bringToFront();
  await apage.waitForTimeout(1200);
  const burst = calls().slice(focusMark);
  console.log("BEFORE focus burst (1.2s setelah kembali):", JSON.stringify(burst));
  console.log("BEFORE getMataPelajaran saat focus:", burst.filter((a) => a === "getMataPelajaran").length);

  await browser.close();
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
