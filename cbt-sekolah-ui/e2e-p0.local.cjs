// E2E P0: menjalankan aplikasi sungguhan (dev server 3100) terhadap GAS tiruan.
// Mengukur jumlah panggilan GAS per workflow dan menguji perilaku gagal.
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const BASE = "http://localhost:3100";
const LOG = 'C:/Users/LEGION~1/AppData/Local/Temp/claude/d--Projects-Webappscript-ruangcbt/8f5d44ca-092c-40b8-8ad4-4dbb6c6c538e/scratchpad/gas-calls.log';

function calls() {
  return fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean)
    .map((line) => line.split(" ")[1]);
}
function since(mark) { return calls().slice(mark); }
function mark() { return calls().length; }

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });

  // ================= STUDENT =================
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const proxyRequests = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/proxy")) proxyRequests.push(r.method());
    });

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill("#username", "siswa");
    await page.fill("#password", "rahasia");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/pin-verification", { timeout: 20000 });
    check("student: login sukses -> pin-verification", true);

    // PIN benar -> masuk ujian
    const entryMark = mark();
    for (let i = 0; i < 4; i++) await page.fill(`#pin-${i}`, "1234"[i]);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/exam", { timeout: 20000 });
    await page.waitForSelector("text=Mulai Ujian, text=Berapa 2 + 2?, text=Memuat soal", { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes("Memuat soal ujian"), null, { timeout: 25000 });
    const entryCalls = since(entryMark);
    check("student: masuk ujian tanpa stuck loading", !(await page.locator("text=Memuat soal ujian").count()));

    // Dev server menjalankan effect dua kali (React Strict Mode), jadi tiap panggilan
    // muncul berpasangan. Yang diukur karena itu adalah JENIS panggilan per masuk
    // ujian, bukan jumlah mentahnya.
    const afterPin = entryCalls.filter((a) => a !== "validateExamPin");
    const unique = [...new Set(afterPin)].sort();
    const configCalls = afterPin.filter((a) => a === "getConfig").length;
    const questionCalls = afterPin.filter((a) => a === "getQuestions").length;
    const legacyCalls = afterPin.filter((a) => a === "getExamStatus" || a === "getExamPinStatus").length;
    check(
      "student: masuk ujian tidak lagi memanggil getExamStatus/getExamPinStatus",
      legacyCalls === 0,
      `legacy=${legacyCalls} semua=[${afterPin.join(",")}]`,
    );
    check(
      "student: masuk ujian hanya butuh 2 jenis action (getConfig + getQuestions)",
      unique.length === 2 && unique[0] === "getConfig" && unique[1] === "getQuestions",
      `jenis=[${unique.join(",")}]`,
    );
    check(
      "student: getConfig dipanggil sekali per siklus init",
      configCalls === questionCalls && configCalls > 0,
      `getConfig=${configCalls} getQuestions=${questionCalls} (berpasangan = satu per siklus init)`,
    );

    await page.getByRole("button", { name: /Mulai Ujian/ }).click();
    await page.waitForSelector("text=Berapa 2 + 2?", { timeout: 20000 });
    check("student: soal tampil setelah Mulai Ujian", true);
    await ctx.close();
  }

  // ================= STUDENT: PIN salah tetap ditolak =================
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill("#username", "siswa");
    await page.fill("#password", "rahasia");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/pin-verification", { timeout: 20000 });
    for (let i = 0; i < 4; i++) await page.fill(`#pin-${i}`, "9999"[i]);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    check("student: PIN salah tidak masuk ujian", page.url().includes("pin-verification"));
    await ctx.close();
  }

  // ================= STUDENT: password salah =================
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill("#username", "siswa");
    await page.fill("#password", "salah");
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Username atau password salah.", { timeout: 15000 });
    check("student: password salah -> pesan bisnis, bukan timeout", true);
    await ctx.close();
  }

  // ================= ADMIN =================
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="password"]', "admin-rahasia");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin", { timeout: 20000 });
    await page.waitForSelector("text=Siswa Uji", { timeout: 20000 });
    check("admin: login -> dashboard memuat data siswa", true);

    // Polling eksplisit harus tetap berjalan.
    const pollMark = mark();
    await page.waitForTimeout(11000);
    const polled = since(pollMark).filter((a) => a === "getUsers").length;
    check("admin: polling getUsers tetap berjalan", polled >= 2, `${polled} panggilan dalam 11 detik`);

    // Alt-tab: revalidateOnFocus dimatikan -> tidak boleh ada burst di luar polling.
    const focusMark = mark();
    const other = await ctx.newPage();
    await other.goto("about:blank");
    await page.waitForTimeout(300);
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForTimeout(2500);
    const burst = since(focusMark);
    const mapelBurst = burst.filter((a) => a === "getMataPelajaran").length;
    check(
      "admin: kembali dari tab lain tidak memicu refetch tambahan",
      mapelBurst === 0,
      `getMataPelajaran=${mapelBurst} dalam 2.5 detik setelah focus; semua=[${burst.join(",")}]`,
    );
    await other.close();
    await ctx.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("E2E ERROR:", e.message); process.exit(1); });
