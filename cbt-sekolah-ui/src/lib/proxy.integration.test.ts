// Integrasi lokal Next proxy -> HTTP mock GAS. Tidak menggantikan E2E deployment GAS nyata.
// Jalankan: node --experimental-strip-types src/lib/proxy.integration.test.ts
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { NextRequest } from "next/server.js";
import { handleProxyRequest, type ProxyTarget } from "./proxy.ts";

const sharedSecret = "tenant-shared-secret-32-characters-minimum";
process.env.SESSION_SIGNING_SECRET = "session-signing-secret-32-characters-minimum";

let upstreamCalls = 0;
let lastBody: Record<string, unknown> = {};
let lastQuery: URLSearchParams = new URLSearchParams();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    body = JSON.parse(raw) as Record<string, unknown>;
  }
  const action = request.method === "GET" ? url.searchParams.get("action") : body.action;
  const providedSecret = request.method === "GET" ? url.searchParams.get("proxy_secret") : body.proxy_secret;
  if (providedSecret !== sharedSecret) {
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, message: "Unauthorized" }));
    return;
  }

  upstreamCalls++;
  lastBody = body;
  lastQuery = url.searchParams;
  const result: Record<string, unknown> = action === "adminLogin"
    ? { success: body.password === "admin-pass", message: "Login" }
    : action === "login"
      ? { success: true, data: { id_siswa: "S001", username: "student" } }
      : action === "getUsers"
        ? { success: true, data: [] }
        : action === "getQuestions"
          ? { success: true, data: [{ id_soal: "Q1", pertanyaan: "Soal" }] }
          : action === "getLiveScore"
            ? { success: true, data: [{ nama: "Siswa", kelas: "6A", skor: 90 }] }
            : { success: true };
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(result));
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const target: ProxyTarget = { gasUrl: `http://127.0.0.1:${address.port}/gas`, sharedSecret };
const resolveTarget = async () => target;

function request(method: "GET" | "POST", action: string, cookie?: string, body: Record<string, unknown> = {}) {
  const url = method === "GET"
    ? `http://app.test/api/tenant-a/proxy?action=${encodeURIComponent(action)}`
    : "http://app.test/api/tenant-a/proxy";
  return new NextRequest(url, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
    },
    body: method === "POST" ? JSON.stringify({ action, ...body }) : undefined,
  });
}

function cookieFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie") || "";
  assert.match(setCookie, /ruangcbt_session=/);
  assert.match(setCookie.toLowerCase(), /httponly/);
  assert.match(setCookie.toLowerCase(), /samesite=lax/);
  return setCookie.split(";", 1)[0];
}

try {
  const callsBeforeDeniedAdmin = upstreamCalls;
  const deniedAdmin = await handleProxyRequest(request("GET", "getUsers"), "GET", "tenant-a", resolveTarget);
  assert.equal(deniedAdmin.status, 401);
  assert.equal(upstreamCalls, callsBeforeDeniedAdmin, "request unauthorized tidak boleh mencapai GAS");

  const adminLogin = await handleProxyRequest(
    request("POST", "adminLogin", undefined, { password: "admin-pass" }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(adminLogin.status, 200);
  const adminCookie = cookieFrom(adminLogin);
  const allowedAdmin = await handleProxyRequest(request("GET", "getUsers", adminCookie), "GET", "tenant-a", resolveTarget);
  assert.equal(allowedAdmin.status, 200);

  // Rich text soal disanitasi di proxy, jadi HTML berbahaya tidak pernah sampai ke sheet.
  const createQuestion = await handleProxyRequest(
    request("POST", "createQuestion", adminCookie, {
      data: {
        tipe: "SINGLE",
        pertanyaan: '<p onclick="steal()">Ibu kota <b>Indonesia</b>?</p><script>alert(1)</script>',
        opsi_a: '<img src=x onerror="alert(1)">Jakarta',
        opsi_b: "Bandung",
        opsi_c: "Medan",
        opsi_d: "Surabaya",
        kunci_jawaban: "A",
        bobot: 1,
        id_mapel: "MAPEL_A",
      },
    }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(createQuestion.status, 200);
  const forwarded = lastBody.data as Record<string, unknown>;
  assert.equal(forwarded.pertanyaan, "<p>Ibu kota <b>Indonesia</b>?</p>");
  assert.equal(forwarded.opsi_a, "Jakarta");
  assert.equal(forwarded.kunci_jawaban, "A");
  assert.equal(forwarded.bobot, 1);

  const nestedQuestion = await handleProxyRequest(
    request("POST", "updateQuestion", adminCookie, {
      id_soal: "Q1",
      data: {
        tipe: "TRUE_FALSE",
        pertanyaan: "Nilai pernyataan",
        kunci_jawaban: '{"1":"BENAR","2":"SALAH"}',
        data_soal: {
          pernyataan: [
            { id: "1", teks: '<script>alert(1)</script>Jakarta adalah ibu kota' },
            { id: "2", teks: '<b onclick="steal()">Bandung di Jawa Timur</b>' },
          ],
        },
      },
    }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(nestedQuestion.status, 200);
  const nestedData = (lastBody.data as Record<string, unknown>).data_soal as {
    pernyataan: { id: string; teks: string }[];
  };
  assert.equal(nestedData.pernyataan[0].teks, "Jakarta adalah ibu kota");
  assert.equal(nestedData.pernyataan[1].teks, "<b>Bandung di Jawa Timur</b>");
  assert.equal((lastBody.data as Record<string, unknown>).kunci_jawaban, '{"1":"BENAR","2":"SALAH"}');

  const fillInQuestion = await handleProxyRequest(
    request("POST", "updateQuestion", adminCookie, {
      id_soal: "Q1",
      data: {
        tipe: "FILL_IN",
        pertanyaan: "Apa ibu kota Indonesia?",
        kunci_jawaban: '{"accepted_answers":["Jakarta"],"case_sensitive":false,"trim":true}',
        data_soal: { petunjuk: '<p onclick="steal()">Tulis nama kota</p><script>alert(1)</script>' },
      },
    }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(fillInQuestion.status, 200);
  const fillInData = (lastBody.data as Record<string, unknown>).data_soal as { petunjuk: string };
  assert.equal(fillInData.petunjuk, "<p>Tulis nama kota</p>", "petunjuk wajib disanitasi di proxy");
  assert.equal(
    (lastBody.data as Record<string, unknown>).kunci_jawaban,
    '{"accepted_answers":["Jakarta"],"case_sensitive":false,"trim":true}',
    "kunci FILL_IN diteruskan apa adanya untuk divalidasi GAS",
  );

  const matchingQuestion = await handleProxyRequest(
    request("POST", "updateQuestion", adminCookie, {
      id_soal: "Q1",
      data: {
        tipe: "MATCHING",
        pertanyaan: "Jodohkan",
        kunci_jawaban: '{"1":"B"}',
        data_soal: {
          kiri: [{ id: "1", teks: '<script>alert(1)</script>Jakarta' }],
          kanan: [{ id: "B", teks: '<b onclick="steal()">DKI Jakarta</b>' }],
        },
      },
    }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(matchingQuestion.status, 200);
  const matchingData = (lastBody.data as Record<string, unknown>).data_soal as {
    kiri: { id: string; teks: string }[];
    kanan: { id: string; teks: string }[];
  };
  assert.equal(matchingData.kiri[0].teks, "Jakarta", "teks kiri wajib disanitasi di proxy");
  assert.equal(matchingData.kanan[0].teks, "<b>DKI Jakarta</b>");
  assert.equal(matchingData.kiri[0].id, "1", "ID tetap identifier polos");
  assert.equal((lastBody.data as Record<string, unknown>).kunci_jawaban, '{"1":"B"}',
    "mapping MATCHING diteruskan apa adanya untuk divalidasi GAS");

  // Import Word: tiap soal disanitasi seperti entri manual sebelum mencapai GAS.
  const importOk = await handleProxyRequest(
    request("POST", "importQuestions", adminCookie, {
      questions: [
        { tipe: "SINGLE", pertanyaan: "<p onclick=\"steal()\">Soal <script>alert(1)</script>satu</p>", opsi_a: "<b>A</b>", kunci_jawaban: "A" },
        { tipe: "SINGLE", pertanyaan: "Soal dua", opsi_a: "<img src=x onerror=alert(1)>", kunci_jawaban: "A" },
      ],
    }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(importOk.status, 200);
  const importedQuestions = lastBody.questions as Record<string, unknown>[];
  assert.equal(importedQuestions.length, 2);
  assert.equal(JSON.stringify(importedQuestions).includes("onclick"), false, "atribut event wajib dibuang");
  assert.equal(JSON.stringify(importedQuestions).includes("<script"), false, "script wajib dibuang");
  assert.equal(JSON.stringify(importedQuestions).includes("onerror"), false, "soal kedua juga wajib disanitasi");
  assert.equal(importedQuestions[0].opsi_a, "<b>A</b>", "format yang aman tetap dipertahankan");

  const callsBeforeMalformedImport = upstreamCalls;
  const malformedImport = await handleProxyRequest(
    request("POST", "importQuestions", adminCookie, { questions: "bukan array" }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(malformedImport.status, 400);
  assert.equal(upstreamCalls, callsBeforeMalformedImport, "payload import rusak tidak boleh mencapai GAS");

  const callsBeforeStudentImport = upstreamCalls;
  const studentImport = await handleProxyRequest(
    request("POST", "importQuestions", undefined, { questions: [] }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(studentImport.status, 401, "import tanpa sesi admin ditolak");
  assert.equal(upstreamCalls, callsBeforeStudentImport);

  const callsBeforeMalformedQuestion = upstreamCalls;
  const malformedQuestion = await handleProxyRequest(
    request("POST", "createQuestion", adminCookie, { data: [] }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(malformedQuestion.status, 400);
  assert.equal(upstreamCalls, callsBeforeMalformedQuestion, "shape soal rusak tidak boleh mencapai GAS");

  const studentLogin = await handleProxyRequest(
    request("POST", "login", undefined, { username: "student", password: "student-pass" }),
    "POST", "tenant-a", resolveTarget
  );
  const studentCookie = cookieFrom(studentLogin);
  const questions = await handleProxyRequest(request("GET", "getQuestions", studentCookie), "GET", "tenant-a", resolveTarget);
  assert.equal(questions.status, 200);
  assert.equal(JSON.stringify(await questions.json()).includes("kunci_jawaban"), false);
  // Soal dilayani per attempt: GAS harus menerima identitas siswa, dan identitas itu
  // berasal dari sesi bertanda tangan, bukan dari query yang dikirim klien.
  assert.equal(lastQuery.get("id_siswa"), "S001", "getQuestions wajib membawa id_siswa dari sesi");

  const spoofed = await handleProxyRequest(
    new NextRequest("http://app.test/api/tenant-a/proxy?action=getQuestions&id_siswa=S999", {
      method: "GET",
      headers: { cookie: studentCookie },
    }),
    "GET", "tenant-a", resolveTarget
  );
  assert.equal(spoofed.status, 200);
  assert.equal(lastQuery.get("id_siswa"), "S001", "id_siswa dari query siswa tidak boleh dipakai");

  const ownSync = await handleProxyRequest(
    request("POST", "syncAnswers", studentCookie, { id_siswa: "S001", answers: {} }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(ownSync.status, 200);
  assert.equal(lastBody.id_siswa, "S001");

  const callsBeforeIdor = upstreamCalls;
  const idor = await handleProxyRequest(
    request("POST", "submitExam", studentCookie, { id_siswa: "S002", answers: {} }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(idor.status, 403);
  assert.equal(upstreamCalls, callsBeforeIdor, "IDOR tidak boleh mencapai GAS");

  const deniedConfig = await handleProxyRequest(
    request("POST", "updateConfig", studentCookie, { key: "exam_name", value: "X" }),
    "POST", "tenant-a", resolveTarget
  );
  assert.equal(deniedConfig.status, 403);

  const crossTenant = await handleProxyRequest(request("GET", "getQuestions", studentCookie), "GET", "tenant-b", resolveTarget);
  assert.equal(crossTenant.status, 403);

  const liveScore = await handleProxyRequest(request("GET", "getLiveScore"), "GET", "tenant-a", resolveTarget);
  assert.equal(liveScore.status, 200);
  const unknown = await handleProxyRequest(request("POST", "unknownAction"), "POST", "tenant-a", resolveTarget);
  assert.equal(unknown.status, 403);

  const logout = await handleProxyRequest(request("POST", "logout", adminCookie), "POST", "tenant-a", resolveTarget);
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") || "", /Max-Age=0/);

  const directGas = await fetch(target.gasUrl + "?action=getUsers");
  assert.equal(directGas.status, 401);
} finally {
  server.close();
}

console.log("proxy integration: auth, role, IDOR, tenant, live score, logout PASS");
