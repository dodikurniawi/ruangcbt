import { defineConfig } from "@playwright/test";

// E2E dijalankan terhadap dev server LOKAL, bukan terhadap cbt.supathub.my.id:
// yang di-deploy adalah build lama, jadi menguji domain produksi tidak pernah
// menguji perubahan yang sedang dikerjakan.
//
// Tenant tujuan ditentukan E2E_SCHOOL_ID dan diarahkan lewat rewrite request di
// dalam spec, sehingga tidak ada kredensial GAS yang perlu ditaruh di sini —
// dev server sudah punya REGISTRY_GAS_URL di .env.local.
//
// Chromium bundled Playwright sengaja tidak dipakai (unduhannya diblokir di
// mesin ini); channel "chrome" memakai Chrome yang sudah terpasang.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
