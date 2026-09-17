import { test, expect, type Page } from "@playwright/test";

// E2E Bank Soal → Kumpulan Soal, dijalankan terhadap tenant demo.
//
// Kredensial TIDAK pernah ditulis di sini. Dijalankan seperti ini:
//
//   E2E_SCHOOL_ID=sdn-demo E2E_ADMIN_PASSWORD=<password demo> npx playwright test
//
// Tanpa E2E_ADMIN_PASSWORD seluruh suite di-skip, bukan gagal — supaya CI tanpa
// kredensial tidak berisik.

const SCHOOL_ID = process.env.E2E_SCHOOL_ID || "sdn-demo";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";
const TARGET_NAME = process.env.E2E_COLLECTION_NAME || "Matematika";
const LEGACY_NAME = "Soal Lama";

test.skip(
  !ADMIN_PASSWORD,
  "E2E_ADMIN_PASSWORD belum diset — suite dilewati, bukan digagalkan.",
);

// Halaman /admin/* lokal memanggil /api/proxy (mode single-tenant). Dialihkan ke
// /api/<schoolId>/proxy supaya request mendarat di GAS tenant demo lewat registry
// yang sudah ada. Test-only: tidak ada kode aplikasi yang berubah karenanya.
async function routeToTenant(page: Page) {
  await page.route("**/api/proxy*", async (route) => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.replace("/api/proxy", `/api/${SCHOOL_ID}/proxy`);
    await route.continue({ url: url.toString() });
  });
}

/** Kartu kumpulan pada panel Kumpulan Soal, dicari lewat judulnya. */
function card(page: Page, nama: string) {
  return page.locator("div.rounded-2xl", { has: page.getByRole("heading", { name: nama, exact: true }) }).first();
}

async function openCollection(page: Page, nama: string) {
  await card(page, nama).getByRole("button", { name: /Lihat Soal|Sedang dilihat/ }).click();
}

async function collectionCount(page: Page, nama: string): Promise<number> {
  const text = (await card(page, nama).locator("p").first().textContent()) ?? "";
  return Number(text.match(/(\d+)\s*soal/)?.[1] ?? -1);
}

/** Mapel yang tertulis pada kartu ("0 soal • Matematika"), "" bila tidak terikat. */
async function collectionMapel(page: Page, nama: string): Promise<string> {
  const text = (await card(page, nama).locator("p").first().textContent()) ?? "";
  return text.split("•")[1]?.trim() ?? "";
}

// Kumpulan yang terikat satu mapel menolak soal dari mapel lain — itu aturan
// server yang sudah ada. Kandidat disaring dulu supaya test menguji flow assign,
// bukan menabrak aturan tersebut.
async function narrowToCollectionMapel(page: Page, nama: string) {
  const mapel = await collectionMapel(page, nama);
  if (!mapel) return;
  const filter = page.getByRole("combobox").filter({ hasText: /Semua Mapel|Mata Pelajaran/i }).first();
  if (await filter.count()) await filter.selectOption({ label: mapel });
}

function rows(page: Page) {
  return page.locator("tbody tr").filter({ has: page.locator('input[type="checkbox"]') });
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await routeToTenant(page);
  await page.goto("/admin/login");
  await page.getByPlaceholder("Masukkan password admin").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Masuk|Login/i }).click();
  await page.waitForURL("**/admin");
  await page.goto("/admin/questions");
  await expect(card(page, TARGET_NAME)).toBeVisible();
});

// Tenant demo dikembalikan ke kondisi awal (kumpulan tujuan kosong) supaya suite
// dapat dijalankan berulang kali dan TEST 1 tetap bermakna.
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await routeToTenant(page);
  await page.goto("/admin/login");
  await page.getByPlaceholder("Masukkan password admin").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Masuk|Login/i }).click();
  await page.waitForURL("**/admin");
  await page.goto("/admin/questions");
  await expect(card(page, TARGET_NAME)).toBeVisible();

  if ((await collectionCount(page, TARGET_NAME)) > 0) {
    await openCollection(page, TARGET_NAME);
    await page.locator('thead input[type="checkbox"]').check();
    await page.getByRole("button", { name: "Keluarkan dari Kumpulan" }).click();
    await page.getByRole("button", { name: "Keluarkan", exact: true }).click();
    await expect(card(page, TARGET_NAME)).toContainText("0 soal");
  }
  await page.close();
});

test("TEST 1 — kumpulan kosong menyebut namanya, bukan mengaku Bank Soal kosong", async ({ page }) => {
  await openCollection(page, TARGET_NAME);
  await expect(card(page, TARGET_NAME).getByRole("button", { name: "Sedang dilihat" })).toBeVisible();

  const empty = page.locator("tbody");
  await expect(empty).toContainText(`Kumpulan “${TARGET_NAME}” belum berisi soal.`);
  await expect(empty).not.toContainText("Belum ada soal tersedia");
  await expect(page.getByRole("button", { name: "Tambahkan Soal dari Bank" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tampilkan Semua Soal" })).toBeVisible();
});

test("TEST 2 — assign mode: tujuan terbawa dari konteks, tabel kembali terisi", async ({ page }) => {
  await openCollection(page, TARGET_NAME);
  await page.getByRole("button", { name: "Tambahkan Soal dari Bank" }).click();

  await expect(page.getByText(`Menambahkan soal ke “${TARGET_NAME}”`)).toBeVisible();
  await expect(rows(page).first()).toBeVisible();
  // Filter kumpulan dilepas: tombol kartu kembali ke "Lihat Soal".
  await expect(card(page, TARGET_NAME).getByRole("button", { name: "Lihat Soal" })).toBeVisible();

  await rows(page).first().locator('input[type="checkbox"]').check();
  await expect(page.getByRole("button", { name: `Tambahkan ke ${TARGET_NAME}` })).toBeVisible();
  // Tidak ada langkah memilih kumpulan untuk kedua kalinya.
  await expect(page.getByRole("button", { name: "Pindahkan ke Kumpulan" })).toHaveCount(0);
});

test("TEST 3 — soal legacy dapat dipilih; anggota kumpulan tujuan bukan kandidat", async ({ page }) => {
  await openCollection(page, TARGET_NAME);
  const sebelum = await collectionCount(page, TARGET_NAME);
  await page.getByRole("button", { name: "Tambahkan Soal dari Bank" }).click();

  const kandidat = await rows(page).count();
  expect(kandidat).toBeGreaterThan(0);
  // Yang sudah menjadi anggota tujuan tidak ditawarkan lagi.
  expect(kandidat).toBeLessThanOrEqual((await collectionCount(page, LEGACY_NAME)) + sebelum);

  await rows(page).nth(0).locator('input[type="checkbox"]').check();
  await expect(page.getByText("1 soal dipilih")).toBeVisible();
});

test("TEST 4+5 — assign tanpa dialog kedua, lalu kembali ke kumpulan tujuan", async ({ page }) => {
  const sebelum = await collectionCount(page, TARGET_NAME);
  await openCollection(page, TARGET_NAME);
  await page.getByRole("button", { name: "Tambahkan Soal dari Bank" }).click();
  await narrowToCollectionMapel(page, TARGET_NAME);

  await rows(page).first().locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: `Tambahkan ke ${TARGET_NAME}` }).click();

  // Kembali ke kumpulan tujuan, banner assign mati, soal terlihat.
  await expect(card(page, TARGET_NAME).getByRole("button", { name: "Sedang dilihat" })).toBeVisible();
  await expect(page.getByText(`Menambahkan soal ke “${TARGET_NAME}”`)).toHaveCount(0);
  await expect(rows(page).first()).toBeVisible();
  expect(await collectionCount(page, TARGET_NAME)).toBeGreaterThan(sebelum);
});

test("TEST 6+7 — hilang dari bucket legacy dan bertahan setelah refresh", async ({ page }) => {
  const diTujuan = await collectionCount(page, TARGET_NAME);
  expect(diTujuan).toBeGreaterThan(0);

  await openCollection(page, LEGACY_NAME);
  const legacyRows = await rows(page).count();
  expect(legacyRows).toBe(await collectionCount(page, LEGACY_NAME));

  await page.reload();
  await expect(card(page, TARGET_NAME)).toBeVisible();
  // Persisten di Sheets, bukan state client.
  expect(await collectionCount(page, TARGET_NAME)).toBe(diTujuan);
});

test("TEST 8 — Batalkan: mode mati, centang bersih, tidak ada mutation", async ({ page }) => {
  const sebelum = await collectionCount(page, TARGET_NAME);
  await openCollection(page, TARGET_NAME);
  await page.getByRole("button", { name: "Tambahkan Soal dari Bank" }).click();
  await rows(page).first().locator('input[type="checkbox"]').check();

  await page.getByRole("button", { name: "Batalkan" }).click();

  await expect(page.getByText(/soal dipilih/)).toHaveCount(0);
  await expect(page.getByText(`Menambahkan soal ke “${TARGET_NAME}”`)).toHaveCount(0);
  await expect(card(page, TARGET_NAME).getByRole("button", { name: "Sedang dilihat" })).toBeVisible();
  expect(await collectionCount(page, TARGET_NAME)).toBe(sebelum);
});

test("TEST 9 — ganti kumpulan saat assign: tujuan dan centang sama-sama dibuang", async ({ page }) => {
  await openCollection(page, TARGET_NAME);
  await page.getByRole("button", { name: "Tambahkan Soal dari Bank" }).click();
  await rows(page).first().locator('input[type="checkbox"]').check();
  await expect(page.getByText("1 soal dipilih")).toBeVisible();

  await openCollection(page, LEGACY_NAME);

  await expect(page.getByText(`Menambahkan soal ke “${TARGET_NAME}”`)).toHaveCount(0);
  await expect(page.getByText(/soal dipilih/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Tambahkan ke ${TARGET_NAME}` })).toHaveCount(0);
});

test("TEST 10 — search/mapel kosong tidak mengaku Bank Soal kosong", async ({ page }) => {
  const search = page.getByPlaceholder(/Cari soal/i);

  await search.fill("qqqzzz-tidak-mungkin-ada");
  await expect(page.locator("tbody")).toContainText("Tidak ada soal yang cocok dengan filter.");
  await expect(page.locator("tbody")).not.toContainText("Belum ada soal tersedia");

  await search.fill("");
  await expect(rows(page).first()).toBeVisible();
});

test("TEST 11 — flow normal di luar assign mode tidak berubah", async ({ page }) => {
  // Select-all, toolbar normal, dan dialog pemilihan kumpulan tetap seperti semula.
  await page.locator('thead input[type="checkbox"]').check();
  await expect(page.getByText(/soal dipilih/)).toBeVisible();

  await page.getByRole("button", { name: "Pindahkan ke Kumpulan" }).click();
  await expect(page.getByRole("combobox").last()).toBeVisible();
  await page.getByRole("button", { name: "Batal", exact: true }).click();

  await page.getByRole("button", { name: "Batal Pilih" }).click();
  await expect(page.getByText(/soal dipilih/)).toHaveCount(0);
});
