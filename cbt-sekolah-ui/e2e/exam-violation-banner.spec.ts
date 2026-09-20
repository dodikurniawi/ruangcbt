import { test, expect, type Page } from "@playwright/test";

// Spanduk header "PELANGGARAN (n/maks)" harus tampil sementara (~5 detik) lalu
// hilang otomatis. Pelaporan pelanggaran, counter, dan enforcement (auto-submit
// saat mencapai batas) TIDAK berubah — hanya durasi tampil spanduk di UI.
//
// Memakai page.clock untuk mengendalikan waktu secara deterministic, supaya
// test tidak bergantung pada `sleep` nyata dan tidak flaky.

const PORTRAIT = { width: 360, height: 800 };

const CONFIG = {
  exam_name: "Ujian Tengah Semester",
  exam_duration: 90,
  max_violations: 3,
  auto_submit: true,
  shuffle_questions: false,
  exam_status: "OPEN",
  isPinRequired: false,
};

function questions(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id_soal: `Q${i + 1}`,
    nomor_urut: i + 1,
    pertanyaan: `<p>Soal nomor ${i + 1}</p>`,
    tipe: "SINGLE",
    bobot: 1,
    nama_mapel: "Sosiologi",
    opsi_a: "A", opsi_b: "B", opsi_c: "C", opsi_d: "D", opsi_e: "E",
  }));
}

let submitCalled = 0;

async function stubApi(page: Page) {
  submitCalled = 0;
  await page.route("**/api/proxy*", async (route) => {
    const url = new URL(route.request().url());
    const action =
      url.searchParams.get("action") ??
      (JSON.parse(route.request().postData() || "{}").action as string);
    if (action === "submitExam") {
      submitCalled++;
      await route.fulfill({ json: { success: true, score: "0" } });
      return;
    }
    const body: Record<string, unknown> =
      action === "getConfig"
        ? { success: true, data: CONFIG }
        : action === "getQuestions"
          ? { success: true, data: questions(10) }
          : { success: true };
    await route.fulfill({ json: body });
  });
}

async function seedStudent(page: Page) {
  await page.addInitScript((waktuMulai: string) => {
    sessionStorage.setItem(
      "cbt-exam-storage",
      JSON.stringify({
        state: {
          user: {
            id_siswa: "S001", username: "siswa01", nama_lengkap: "Ahmad Fauzi Rahman",
            kelas: "XI IPS 1", status_ujian: "SEDANG", waktu_mulai: waktuMulai, exam_duration: 90,
          },
          answers: {}, timeRemaining: 5400, violations: 0, currentQuestionIndex: 0, isExamStarted: true,
        },
        version: 0,
      }),
    );
  }, new Date().toISOString());
}

async function openExam(page: Page) {
  await stubApi(page);
  await seedStudent(page);
  await page.goto("/exam");
  await page.getByRole("button", { name: /Mulai Ujian|Siap|Mulai/i }).click();
  await expect(page.getByText("PERTANYAAN")).toBeVisible();
}

/** Satu pelanggaran tab-switch; useExamSecurity men-dedup peristiwa berdekatan. */
async function triggerViolation(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

const banner = (page: Page) => page.getByText(/PELANGGARAN \(\d+\/3\)/);

test.describe("Spanduk pelanggaran — auto-hide 5 detik", () => {
  test.use({ viewport: PORTRAIT });

  test("CASE 1+2: muncul saat pelanggaran, hilang setelah 5 detik", async ({ page }) => {
    await page.clock.install();
    await openExam(page);

    await triggerViolation(page);
    await expect(banner(page)).toBeVisible();

    await page.clock.runFor(4900);
    await expect(banner(page)).toBeVisible();

    await page.clock.runFor(200);
    await expect(banner(page)).toBeHidden();
  });

  test("CASE 3: pelanggaran baru me-restart timer, bukan menumpuk", async ({ page }) => {
    await page.clock.install();
    await openExam(page);

    await triggerViolation(page); // t=0, dedup cooldown useExamSecurity 1500ms
    await expect(banner(page)).toBeVisible();

    await page.clock.runFor(3000); // t=3000, banner lama akan habis di t=5000 kalau tidak di-reset
    await triggerViolation(page); // t=3000, restart timer 5s dari sini -> hilang di t=8000

    await page.clock.runFor(4900); // t=7900, masih sebelum 8000
    await expect(banner(page)).toBeVisible();

    await page.clock.runFor(200); // t=8100
    await expect(banner(page)).toBeHidden();
  });

  test("CASE 4: enforcement tetap jalan — batas maksimum tetap memicu auto-submit", async ({ page }) => {
    await page.clock.install();
    await openExam(page);

    // useExamSecurity men-dedup pelanggaran "leave" berdekatan (cooldown 1500ms):
    // tiap trigger harus berjarak lebih dari itu supaya dihitung 3 pelanggaran.
    await triggerViolation(page);
    await page.clock.runFor(1600);
    await triggerViolation(page);
    await page.clock.runFor(1600);
    await triggerViolation(page);

    await expect(page.getByText(/PELANGGARAN \(3\/3\)/)).toBeVisible();

    // handleMaxViolations menunda submit 10 detik untuk countdown.
    await page.clock.runFor(10100);
    expect(submitCalled).toBe(1);
  });

  test("CASE 5: unmount sebelum 5 detik tidak melempar/menyisakan timer", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.clock.install();
    await openExam(page);

    await triggerViolation(page);
    await expect(banner(page)).toBeVisible();

    // Pindah halaman sebelum timer 5 detik selesai: componentWillUnmount cleanup
    // harus membatalkan setTimeout, bukan memanggil setState di halaman yang sudah tidak ada.
    await page.goto("/login");
    await page.clock.runFor(6000);

    expect(errors).toEqual([]);
  });
});
