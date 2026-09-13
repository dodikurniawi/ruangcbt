// Security self-check endpoint data analisis. Tidak ada provider/key/network AI.
import assert from "node:assert/strict";
import http from "node:http";
import { NextRequest } from "next/server.js";
import { handleAiAnalysisRequest } from "./aiAnalysis.ts";
import { createSessionToken, SESSION_COOKIE } from "./security.ts";

process.env.SESSION_SIGNING_SECRET = "test-session-signing-secret-at-least-32-characters";
const sharedSecret = "test-shared-secret-at-least-32-characters-long";
const calls: Array<{ method: string; action: string; body: string }> = [];

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += String(chunk); });
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const action = url.searchParams.get("action") ?? "";
    calls.push({ method: req.method ?? "", action, body });
    res.setHeader("Content-Type", "application/json");
    if (action === "getStudentAnalysis") {
      res.end(JSON.stringify({ success: true, data: {
        exam_id: "E1", exam_mapel: "M1", mapel_nama: "Matematika", kelas: "6A",
        score: 60, kkm: 75, status: "PERLU_TINDAK_LANJUT", total_questions: 2,
        correct: 1, partial: 0, wrong: 1, unanswered: 0, uncategorized: 0,
        categories: [{ name: "Pecahan", correct: 0, total: 1, earnedScore: 0, maxScore: 50, accuracy: 0 }],
        result_hash: "hash-1",
      } }));
      return;
    }
    if (action === "getUsers") {
      res.end(JSON.stringify({ success: true, data: [
        { nama_lengkap: "Budi", kelas: "6A", skor_akhir: 60, status_ujian: "SELESAI" },
        { nama_lengkap: "Sari", kelas: "6A", skor_akhir: 90, status_ujian: "SELESAI" },
      ] }));
      return;
    }
    if (action === "getConfig") {
      res.end(JSON.stringify({ success: true, data: { kkm: 75 } }));
      return;
    }
    res.end(JSON.stringify({ success: false }));
  });
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const resolveTarget = async () => ({
  gasUrl: `http://127.0.0.1:${address.port}`,
  sharedSecret,
});

function cookie(role: "admin" | "student", school = "tenant-a") {
  const token = createSessionToken(school, "u1", role, process.env.SESSION_SIGNING_SECRET!);
  return `${SESSION_COOKIE}=${token}`;
}

function request(body: unknown, value = cookie("admin")) {
  return new NextRequest("http://app.test/api/tenant-a/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(value ? { Cookie: value } : {}) },
    body: JSON.stringify(body),
  });
}

assert.equal((await handleAiAnalysisRequest(request({ mode: "stats", id_siswa: "S1" }, ""), "tenant-a", resolveTarget)).status, 401);
assert.equal((await handleAiAnalysisRequest(request({ mode: "stats", id_siswa: "S1" }, cookie("student")), "tenant-a", resolveTarget)).status, 403);
assert.equal((await handleAiAnalysisRequest(request({ mode: "stats", id_siswa: "S1" }, cookie("admin", "tenant-b")), "tenant-a", resolveTarget)).status, 403);

// Mode AI lama dan body berisi key ditolak sebelum menyentuh GAS/provider.
const before = calls.length;
const rejected = await handleAiAnalysisRequest(
  request({ mode: "student", id_siswa: "S1", apiKey: "AIza-not-real-secret" }),
  "tenant-a",
  resolveTarget,
);
assert.equal(rejected.status, 400);
assert.equal(calls.length, before);
assert.equal((await rejected.text()).includes("AIza-not-real-secret"), false);

const statsResponse = await handleAiAnalysisRequest(request({ mode: "stats", id_siswa: "S1" }), "tenant-a", resolveTarget);
assert.equal(statsResponse.status, 200);
const statsText = await statsResponse.text();
assert.equal(statsText.includes("API"), false);
assert.equal(calls.at(-1)?.method, "GET");
assert.equal(calls.at(-1)?.action, "getStudentAnalysis");

const classResponse = await handleAiAnalysisRequest(request({ mode: "class_stats", kelas: "6A" }), "tenant-a", resolveTarget);
assert.equal(classResponse.status, 200);
const classJson = JSON.parse(await classResponse.text());
assert.deepEqual(classJson.data.stats.students, [{ label: "S1", score: 60 }, { label: "S2", score: 90 }]);
assert.equal(classJson.data.stats.kkm, 75);
assert.deepEqual(classJson.data.names, { S1: "Budi", S2: "Sari" });
assert.ok(calls.slice(-2).every((call) => call.method === "GET"));
assert.ok(calls.every((call) => !call.body.includes("AIza-not-real-secret")));

server.close();
console.log("aiAnalysis: admin/tenant guard, stats-only endpoint, no personal key/provider call PASS");
