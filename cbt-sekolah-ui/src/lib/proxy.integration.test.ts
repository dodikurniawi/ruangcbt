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

  const studentLogin = await handleProxyRequest(
    request("POST", "login", undefined, { username: "student", password: "student-pass" }),
    "POST", "tenant-a", resolveTarget
  );
  const studentCookie = cookieFrom(studentLogin);
  const questions = await handleProxyRequest(request("GET", "getQuestions", studentCookie), "GET", "tenant-a", resolveTarget);
  assert.equal(questions.status, 200);
  assert.equal(JSON.stringify(await questions.json()).includes("kunci_jawaban"), false);

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
