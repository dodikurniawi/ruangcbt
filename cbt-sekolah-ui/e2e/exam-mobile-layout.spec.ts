import { test, expect, type Page } from "@playwright/test";

// Repro + regresi layout halaman ujian pada viewport mobile portrait.
//
// Tidak memakai kredensial GAS: seluruh panggilan /api/proxy di-stub dan state
// siswa diisi langsung ke sessionStorage (kunci persist zustand yang sama yang
// dipakai aplikasi). Yang diuji di sini murni layout, bukan integrasi backend.

const PORTRAIT = { width: 360, height: 800 };
const DESKTOP = { width: 1440, height: 900 };

const CONFIG = {
  exam_name: "Ujian Tengah Semester",
  exam_duration: 90,
  max_violations: 3,
  auto_submit: true,
  shuffle_questions: false,
  exam_status: "OPEN",
  isPinRequired: false,
};

const LONG_TEXT =
  "Perhatikan pernyataan berikut dengan saksama sebelum menentukan jawaban yang paling tepat. " +
  "Interaksi sosial asosiatif merupakan bentuk hubungan sosial yang mengarah pada persatuan, " +
  "sedangkan interaksi disosiatif mengarah pada perpecahan di dalam kelompok masyarakat.";

function questions(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id_soal: `Q${i + 1}`,
    nomor_urut: i + 1,
    pertanyaan: `<p>${LONG_TEXT}</p>`,
    tipe: "SINGLE",
    bobot: 1,
    nama_mapel: "Sosiologi",
    opsi_a: "Kerja sama antarindividu dalam menyelesaikan masalah bersama",
    opsi_b: "Pertentangan yang melibatkan dua kelompok berbeda kepentingan",
    opsi_c: "Persaingan memperebutkan sumber daya yang jumlahnya terbatas",
    opsi_d: "Akomodasi sebagai upaya meredakan konflik yang sedang berlangsung",
    opsi_e: "Kontravensi yang ditandai sikap tidak suka secara tersembunyi",
  }));
}

async function stubApi(page: Page) {
  await page.route("**/api/proxy*", async (route) => {
    const url = new URL(route.request().url());
    const action =
      url.searchParams.get("action") ??
      (JSON.parse(route.request().postData() || "{}").action as string);
    const body: Record<string, unknown> =
      action === "getConfig"
        ? { success: true, data: CONFIG }
        : action === "getQuestions"
          ? { success: true, data: questions(40) }
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
            id_siswa: "S001",
            username: "siswa01",
            nama_lengkap: "Ahmad Fauzi Rahman",
            kelas: "XI IPS 1",
            status_ujian: "SEDANG",
            waktu_mulai: waktuMulai,
            exam_duration: 90,
          },
          answers: {},
          timeRemaining: 5400,
          violations: 0,
          currentQuestionIndex: 0,
          isExamStarted: true,
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

/** Lebar konten dokumen vs viewport: >1px berarti ada overflow horizontal. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe("Halaman ujian — mobile portrait", () => {
  test.use({ viewport: PORTRAIT });

  test("teks soal terbaca, tidak tertutup navigasi, tanpa overflow horizontal", async ({ page }) => {
    await openExam(page);

    // Teks soal harus punya lebar baca yang layak, bukan terhimpit sidebar.
    const questionText = page.locator("[data-testid='question-text']");
    const box = (await questionText.boundingBox())!;
    expect(box.width).toBeGreaterThan(PORTRAIT.width * 0.7);

    // Grid nomor soal tidak boleh menempel permanen di layar portrait.
    await expect(page.locator("[data-testid='question-nav-panel']")).toBeHidden();

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

    // Pilihan jawaban harus berada di dalam viewport dan dapat diklik.
    const firstOption = page.locator("[data-testid='option-a']");
    const optBox = (await firstOption.boundingBox())!;
    expect(optBox.x).toBeGreaterThanOrEqual(0);
    expect(optBox.x + optBox.width).toBeLessThanOrEqual(PORTRAIT.width + 1);
    await firstOption.click();
    await expect(firstOption).toHaveAttribute("aria-pressed", "true");
  });

  test("navigasi soal dapat dibuka sebagai panel dan menutup kembali", async ({ page }) => {
    await openExam(page);

    await page.locator("[data-testid='toggle-question-nav']").click();
    const panel = page.locator("[data-testid='question-nav-panel']");
    await expect(panel).toBeVisible();

    await panel.getByRole("button", { name: "12", exact: true }).click();
    await expect(panel).toBeHidden();
    await expect(page.locator("[data-testid='question-number']")).toHaveText("12");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test("tombol navigasi bawah tetap berada di dalam viewport", async ({ page }) => {
    await openExam(page);
    for (const id of ["nav-prev", "nav-next", "toggle-question-nav"]) {
      const b = (await page.locator(`[data-testid='${id}']`).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(PORTRAIT.width + 1);
    }
  });
});

test.describe("Halaman ujian — peringatan keamanan di portrait", () => {
  test.use({ viewport: PORTRAIT });

  // Aturan keamanan tidak boleh dikorbankan demi layout: pelanggaran tetap
  // tercatat dan peringatannya tetap terbaca utuh di layar kecil.
  test("pelanggaran tab switch tetap terdeteksi dan peringatannya terbaca", async ({ page }) => {
    await openExam(page);

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await expect(page.getByText(/Peringatan: tab switch/i)).toBeVisible();
    await expect(page.getByText(/PELANGGARAN \(1\/3\)/)).toBeVisible();
    await expect(page.getByText(/Sisa 2 peringatan sebelum ujian ditangguhkan/)).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});

test.describe("Halaman ujian — desktop", () => {
  test.use({ viewport: DESKTOP });

  test("sidebar navigasi tetap tampil permanen dan tidak ada overflow", async ({ page }) => {
    await openExam(page);
    await expect(page.locator("[data-testid='question-nav-panel']")).toBeVisible();
    await expect(page.locator("[data-testid='toggle-question-nav']")).toBeHidden();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
