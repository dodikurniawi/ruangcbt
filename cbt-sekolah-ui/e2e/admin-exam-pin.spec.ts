import { test, expect, type Page } from "@playwright/test";

// PIN ujian dua arah pada layar Konfigurasi Ujian.
//
// Tidak memakai kredensial GAS: /api/proxy di-stub dengan kontrak yang sama
// dengan yang dibuktikan backend-script/readCache.test.cjs — `getExamSummary`
// (role admin) membawa exam_pin, `getConfig` (publik) tidak pernah membawanya.
// Yang diuji di sini adalah perilaku layar: baca, simpan, baca ulang, validasi.

type Sheet = { exam_pin: string; admin_wa: string; max_violations: number };

const INVALID_PINS = ["123", "12345", "abcd", "12ab"];
const PIN_ERROR = /PIN ujian harus 4 digit angka/i;

/** Validasi yang sama dengan CONFIG_VALUE_VALIDATORS.exam_pin di code.gs. */
function validatePin(raw: unknown): { value?: string; message?: string } {
  const pin = String(raw ?? "").trim();
  if (pin === "") return { value: "" };
  if (!/^[0-9]{4}$/.test(pin)) return { message: "PIN ujian harus 4 digit angka." };
  return { value: pin };
}

async function stubAdminApi(page: Page, sheet: Sheet, writes: string[][] = []) {
  await page.route("**/api/proxy*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let action = url.searchParams.get("action");
    let body: Record<string, unknown> = {};
    if (!action) {
      try {
        body = JSON.parse(request.postData() || "{}");
        action = String(body.action ?? "");
      } catch {
        body = {};
      }
    }

    let json: Record<string, unknown> = { success: true };
    if (action === "getConfig") {
      // Cerminan handleGetConfig: turunan saja, PIN mentah tidak ikut.
      json = {
        success: true,
        data: {
          exam_name: "UTS Ganjil",
          exam_duration: 90,
          max_violations: sheet.max_violations,
          admin_wa: sheet.admin_wa,
          exam_status: "OPEN",
          exam_mapel: "",
          kkm: 70,
          isPinRequired: sheet.exam_pin.trim() !== "",
        },
      };
    } else if (action === "getExamSummary") {
      json = {
        success: true,
        data: {
          exam_name: "UTS Ganjil",
          exam_mapel: "",
          exam_duration: 90,
          exam_status: "OPEN",
          exam_pin: sheet.exam_pin,
          question_count: 0,
          collections: [],
        },
      };
    } else if (action === "getUsers") {
      json = { success: true, data: [] };
    } else if (action === "updateConfig") {
      const key = String(body.key ?? "");
      writes.push([key, String(body.value ?? "")]);
      if (key === "exam_pin") {
        const checked = validatePin(body.value);
        if (checked.message) json = { success: false, message: checked.message };
        else sheet.exam_pin = checked.value!;
      } else if (key === "admin_wa") {
        sheet.admin_wa = String(body.value ?? "");
      } else if (key === "max_violations") {
        sheet.max_violations = Number(body.value);
      }
    }

    await route.fulfill({ json });
  });

  await page.addInitScript(() => sessionStorage.setItem("admin_auth", "true"));
}

const pinField = (page: Page) => page.locator('input[name="exam_pin"]');
const saveButton = (page: Page) => page.getByRole("button", { name: /SIMPAN KONFIGURASI/i });

async function openConfigTab(page: Page) {
  await page.goto("/admin/management");
  await page.getByRole("button", { name: /Konfigurasi/i }).first().click();
  await expect(pinField(page)).toBeVisible();
}

async function save(page: Page) {
  await saveButton(page).click();
}

test.describe("Konfigurasi Ujian — PIN ujian", () => {
  test("PIN yang sudah tersimpan tampil saat halaman dibuka", async ({ page }) => {
    await stubAdminApi(page, { exam_pin: "1234", admin_wa: "628123456789", max_violations: 3 });
    await openConfigTab(page);
    await expect(pinField(page)).toHaveValue("1234");
  });

  test("PIN diubah dari UI, tersimpan, dan terbaca kembali setelah muat ulang", async ({ page }) => {
    const sheet: Sheet = { exam_pin: "1234", admin_wa: "628123456789", max_violations: 3 };
    await stubAdminApi(page, sheet);
    await openConfigTab(page);

    await pinField(page).fill("5678");
    await save(page);
    await expect(page.getByText(/Konfigurasi berhasil disimpan/i)).toBeVisible();
    expect(sheet.exam_pin).toBe("5678");
    await expect(pinField(page)).toHaveValue("5678");

    // Muat ulang penuh: nilainya datang dari server, bukan dari state yang tersisa.
    await openConfigTab(page);
    await expect(pinField(page)).toHaveValue("5678");
  });

  test("nol depan bertahan: 0001 tidak menjadi 1", async ({ page }) => {
    const sheet: Sheet = { exam_pin: "1234", admin_wa: "628123456789", max_violations: 3 };
    await stubAdminApi(page, sheet);
    await openConfigTab(page);

    await pinField(page).fill("0001");
    await save(page);
    await expect(page.getByText(/Konfigurasi berhasil disimpan/i)).toBeVisible();
    expect(sheet.exam_pin).toBe("0001");

    await openConfigTab(page);
    await expect(pinField(page)).toHaveValue("0001");
  });

  test("PIN tidak sah ditolak dan nilai lama tidak tertimpa", async ({ page }) => {
    const sheet: Sheet = { exam_pin: "0001", admin_wa: "628123456789", max_violations: 3 };
    await stubAdminApi(page, sheet);
    await openConfigTab(page);

    for (const invalid of INVALID_PINS) {
      await pinField(page).fill(invalid);
      await save(page);
      await expect(page.getByText(PIN_ERROR).first()).toBeVisible();
      expect(sheet.exam_pin, `PIN ${invalid} tidak boleh tersimpan`).toBe("0001");
    }
  });

  test("mengosongkan field tanpa aksi nonaktifkan ditolak", async ({ page }) => {
    const sheet: Sheet = { exam_pin: "4321", admin_wa: "628123456789", max_violations: 3 };
    await stubAdminApi(page, sheet);
    await openConfigTab(page);

    await pinField(page).fill("");
    await save(page);
    await expect(page.getByText(/Jika ingin menonaktifkan PIN/i)).toBeVisible();
    expect(sheet.exam_pin).toBe("4321");

    await page.getByRole("checkbox", { name: /Nonaktifkan PIN ujian/i }).check();
    await save(page);
    await expect(page.getByText(/Konfigurasi berhasil disimpan/i)).toBeVisible();
    expect(sheet.exam_pin).toBe("");

    await openConfigTab(page);
    await expect(pinField(page)).toHaveValue("");
  });

  test("PIN tidak berubah saat disimpan tanpa perubahan", async ({ page }) => {
    const sheet: Sheet = { exam_pin: "1234", admin_wa: "628123456789", max_violations: 3 };
    const writes: string[][] = [];
    await stubAdminApi(page, sheet, writes);
    await openConfigTab(page);

    await save(page);
    await expect(page.getByText(/Konfigurasi berhasil disimpan/i)).toBeVisible();
    expect(sheet.exam_pin).toBe("1234");
    expect(writes.some(([key]) => key === "exam_pin")).toBe(false);
  });

  test("menyimpan pengaturan lain tidak menulis ulang sel PIN", async ({ page }) => {
    const sheet: Sheet = { exam_pin: "4321", admin_wa: "628123456789", max_violations: 3 };
    const writes: string[][] = [];
    await stubAdminApi(page, sheet, writes);
    await openConfigTab(page);

    await page.locator('input[name="admin_wa"]').fill("628999888777");
    await save(page);
    await expect(page.getByText(/Konfigurasi berhasil disimpan/i)).toBeVisible();

    expect(writes.some(([key]) => key === "exam_pin")).toBe(false);
    expect(sheet.exam_pin).toBe("4321");
  });
});
