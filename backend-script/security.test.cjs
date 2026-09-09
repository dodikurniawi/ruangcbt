const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const tenantSecret = "tenant-shared-secret-32-characters-minimum";

function responseApi() {
  return {
    MimeType: { JSON: "application/json" },
    createTextOutput(text) {
      return { text, setMimeType() { return this; } };
    },
  };
}

function loadTenantGas(sheetRows) {
  const context = {
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) },
    ContentService: responseApi(),
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (key) => key === "SHARED_SECRET" ? tenantSecret : null }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => {
        if (!sheetRows) throw new Error("unauthorized request reached Sheets");
        return {
          getSheetByName: (name) => ({
            getDataRange: () => ({ getValues: () => sheetRows[name] || [] }),
          }),
        };
      },
    },
    console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "code.gs"), "utf8"), context);
  return context;
}

{
  const gas = loadTenantGas({
    Config: [["key", "value"], ["exam_mapel", ""]],
    MataPelajaran: [["id", "kode", "nama"]],
    Questions: [
      ["id", "nomor", "tipe", "pertanyaan", "gambar", "a", "b", "c", "d", "e", "kunci", "bobot", "kategori", "mapel"],
      ["Q1", 1, "SINGLE", "Soal", "", "A", "B", "C", "D", "", "A", 1, "", ""],
    ],
    Users: [
      ["id", "username", "password", "nama", "kelas", "login", "mulai", "selesai", "skor", "pelanggaran", "status", "last_seen"],
      ["S001", "student", "plaintext-secret", "Nama Siswa", "6A", false, "", new Date(), 90, 0, "SELESAI", ""],
    ],
  });
  const auth = { proxy_secret: tenantSecret };
  const studentQuestions = JSON.parse(gas.doGet({ parameter: { ...auth, action: "getQuestions" } }).text);
  assert.equal(studentQuestions.data[0].kunci_jawaban, undefined);
  const adminQuestions = JSON.parse(gas.doGet({ parameter: { ...auth, action: "getAdminQuestions" } }).text);
  assert.equal(adminQuestions.data[0].kunci_jawaban, "A");
  const live = JSON.parse(gas.doGet({ parameter: { ...auth, action: "getLiveScore" } }).text);
  assert.deepEqual(Object.keys(live.data[0]).sort(), [
    "kelas", "nama", "rank", "skor", "status", "waktu_selesai", "waktu_submit_ms",
  ]);
  assert.equal(JSON.stringify(live).includes("plaintext-secret"), false);
}

function loadRegistryGas() {
  const rows = [
    ["school_id", "school_name", "gas_url", "active", "shared_secret"],
    ["tenant-a", "Tenant A", "https://example.test/gas", true, tenantSecret],
  ];
  const context = {
    ContentService: responseApi(),
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => key === "REGISTRY_LOOKUP_SECRET"
          ? "registry-lookup-secret-32-characters-minimum"
          : null,
      }),
    },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => ({ getDataRange: () => ({ getValues: () => rows }) }) }),
    },
    console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "registry-gas.gs"), "utf8"), context);
  return context;
}

{
  const gas = loadTenantGas();
  const deniedGet = JSON.parse(gas.doGet({ parameter: { action: "getAdminQuestions" } }).text);
  assert.deepEqual(deniedGet, { success: false, message: "Unauthorized" });
  const deniedPost = JSON.parse(gas.doPost({ postData: { contents: JSON.stringify({ action: "deleteAllStudents" }) } }).text);
  assert.deepEqual(deniedPost, { success: false, message: "Unauthorized" });
  const authorizedUnknown = JSON.parse(gas.doGet({ parameter: { action: "unknown", proxy_secret: tenantSecret } }).text);
  assert.equal(authorizedUnknown.success, false);
  assert.match(authorizedUnknown.message, /Unknown action/);
}

{
  const registry = loadRegistryGas();
  const denied = JSON.parse(registry.doGet({ parameter: { school_id: "tenant-a" } }).text);
  assert.equal(denied.success, true);
  assert.equal(denied.gas_url, "https://example.test/gas");
  assert.equal(denied.shared_secret, undefined);
  const allowed = JSON.parse(registry.doGet({ parameter: {
    school_id: "tenant-a",
    registry_secret: "registry-lookup-secret-32-characters-minimum",
  } }).text);
  assert.equal(allowed.success, true);
  assert.equal(allowed.shared_secret, tenantSecret);
}

console.log("GAS security: registry dan tenant shared-secret boundary PASS");
