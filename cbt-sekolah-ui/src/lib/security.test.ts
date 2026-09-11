// Self-check untuk session, action allowlist, tenant isolation, dan IDOR.
// Jalankan: node --experimental-strip-types src/lib/security.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ACTION_RULES,
  SESSION_TTL_SECONDS,
  authorizeAction,
  bindStudentIdentity,
  createSessionToken,
  verifySessionToken,
} from "./security.ts";

const secret = "test-session-secret-32-characters-minimum";
const now = 2_000_000_000;
const adminToken = createSessionToken("tenant-a", "admin", "admin", secret, now);
const studentToken = createSessionToken("tenant-a", "S001", "student", secret, now);
const admin = verifySessionToken(adminToken, secret, now);
const student = verifySessionToken(studentToken, secret, now);

assert.ok(admin);
assert.ok(student);
assert.equal(verifySessionToken(`${studentToken}tampered`, secret, now), null);
assert.equal(verifySessionToken(studentToken, secret, now + SESSION_TTL_SECONDS), null);

assert.equal(authorizeAction("getConfig", "GET", "tenant-a", null).allowed, true);
assert.equal(authorizeAction("getLiveScore", "GET", "tenant-a", null).allowed, true);
assert.equal(authorizeAction("getUsers", "GET", "tenant-a", null).allowed, false);
assert.equal(authorizeAction("getUsers", "GET", "tenant-a", admin).allowed, true);
assert.equal(authorizeAction("getUsers", "GET", "tenant-a", student).allowed, false);
assert.equal(authorizeAction("getQuestions", "GET", "tenant-a", student).allowed, true);
assert.equal(authorizeAction("getQuestions", "GET", "tenant-a", admin).allowed, false);
assert.equal(authorizeAction("submitExam", "POST", "tenant-b", student).allowed, false);
assert.equal(authorizeAction("unknownAction", "POST", "tenant-a", admin).allowed, false);
assert.equal(authorizeAction("getUsers", "POST", "tenant-a", admin).allowed, false);

const ownIdentity = bindStudentIdentity({ id_siswa: "S001", answers: {} }, student!);
assert.equal(ownIdentity.allowed, true);
if (ownIdentity.allowed) assert.equal(ownIdentity.body.id_siswa, "S001");
assert.equal(bindStudentIdentity({ id_siswa: "S002", answers: {} }, student!).allowed, false);
const derivedIdentity = bindStudentIdentity({ answers: {} }, student!);
assert.equal(derivedIdentity.allowed, true);
if (derivedIdentity.allowed) assert.equal(derivedIdentity.body.id_siswa, "S001");

const apiSource = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
const apiActions = [...apiSource.matchAll(/fetchApi(?:<[^\n]+>)?\(\s*['"]([^'"]+)/g)].map((match) => match[1]);
assert.ok(apiActions.length > 0, "action API harus terdeteksi");
for (const action of apiActions) {
  assert.ok(ACTION_RULES[action], `action ${action} belum masuk allowlist`);
}

const gasSource = readFileSync(new URL("../../../backend-script/code.gs", import.meta.url), "utf8");
const gasActions = [...gasSource.matchAll(/case "([^"]+)"/g)].map((match) => match[1]);
for (const action of gasActions) {
  assert.ok(ACTION_RULES[action], `action GAS ${action} belum masuk allowlist`);
}

for (const action of [
  "getAdminQuestions", "getUsers", "exportResults", "updateConfig",
  "createStudent", "updateStudent", "deleteStudent", "deleteAllStudents", "importStudents",
  "createQuestion", "updateQuestion", "deleteQuestion", "uploadImage",
  "createKelas", "updateKelas", "deleteKelas", "deleteAllKelas",
  "createMataPelajaran", "updateMataPelajaran", "deleteMataPelajaran", "deleteAllMataPelajaran",
  "setExamStatus", "getPrintSettings", "savePrintSettings",
  "saveExamConfig", "getExamSummary", "importQuestions",
]) {
  assert.equal(ACTION_RULES[action]?.role, "admin", `${action} harus admin-only`);
}

assert.equal(authorizeAction("updateConfig", "POST", "tenant-a", student).allowed, false);
// Adakan Ujian: hanya admin, hanya tenant-nya sendiri, dan tidak pernah publik.
assert.equal(authorizeAction("saveExamConfig", "POST", "tenant-a", student).allowed, false);
assert.equal(authorizeAction("saveExamConfig", "POST", "tenant-a", null).allowed, false);
assert.equal(authorizeAction("saveExamConfig", "POST", "tenant-a", admin).allowed, true);
assert.equal(authorizeAction("saveExamConfig", "POST", "tenant-b", admin).allowed, false);
assert.equal(authorizeAction("saveExamConfig", "GET", "tenant-a", admin).allowed, false);
assert.equal(authorizeAction("getExamSummary", "GET", "tenant-a", student).allowed, false);
assert.equal(authorizeAction("getExamSummary", "GET", "tenant-a", admin).allowed, true);
// Import soal Word: admin-only, tenant-bound, dan bukan endpoint publik baru.
assert.equal(authorizeAction("importQuestions", "POST", "tenant-a", student).allowed, false);
assert.equal(authorizeAction("importQuestions", "POST", "tenant-a", null).allowed, false);
assert.equal(authorizeAction("importQuestions", "POST", "tenant-a", admin).allowed, true);
assert.equal(authorizeAction("importQuestions", "POST", "tenant-b", admin).allowed, false);
// Live Monitoring tetap publik: tidak boleh berubah menjadi butuh login.
assert.equal(ACTION_RULES.getLiveScore.role, "public");
assert.equal(authorizeAction("getLiveScore", "GET", "tenant-a", null).allowed, true);
assert.equal(authorizeAction("getAdminQuestions", "GET", "tenant-a", student).allowed, false);
assert.equal(authorizeAction("getAdminQuestions", "GET", "tenant-a", admin).allowed, true);

console.log("security: session, role, tenant, IDOR, dan allowlist PASS");
