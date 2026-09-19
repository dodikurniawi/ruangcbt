// Failure test runtime lewat dev server sungguhan (bukan mock di dalam proses):
// GAS menggantung, GAS menjawab HTML, tenant tidak dikenal, dan jalur normal.
const BASE = "http://localhost:3100";
const MOCK = "http://127.0.0.1:39125";

const results = [];
function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
const setMode = (value) => fetch(`${MOCK}/__mode?value=${value}`).then((r) => r.text());

async function call(path) {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let body = {};
  try { body = JSON.parse(text); } catch { body = { __raw: text.slice(0, 120) }; }
  return { status: res.status, body, ms: Date.now() - started };
}

(async () => {
  await setMode("normal");

  // Skenario C — jalur normal.
  const ok = await call("/api/proxy?action=getConfig");
  check("normal: getConfig sukses", ok.status === 200 && ok.body.success === true, `${ok.ms}ms`);
  check(
    "normal: isPinRequired dikirim, exam_pin tidak ikut",
    ok.body.data?.isPinRequired === true && !("exam_pin" in (ok.body.data || {})),
  );

  // Skenario B — GAS menjawab HTML (deployment salah / halaman error Google).
  await setMode("html");
  const html = await call("/api/proxy?action=getConfig");
  check("GAS balas HTML: 502 terkendali", html.status === 502 && html.body.code === "upstream_error", `${html.ms}ms`);
  check("GAS balas HTML: detail internal tidak bocor",
    !JSON.stringify(html.body).includes("39125") && !JSON.stringify(html.body).includes("mock-shared-secret"));

  // Skenario A — GAS menggantung: wajib berakhir, tidak boleh loading selamanya.
  await setMode("hang");
  const hung = await call("/api/proxy?action=getConfig");
  check("GAS menggantung: berakhir 504, bukan request abadi",
    hung.status === 504 && hung.body.code === "upstream_timeout", `${hung.ms}ms`);
  check("GAS menggantung: selesai dalam anggaran (<17s)", hung.ms < 17000, `${hung.ms}ms`);
  check("GAS menggantung: pesan dapat dibaca guru",
    typeof hung.body.message === "string" && hung.body.message.length > 0, hung.body.message);

  // Login siswa saat GAS menggantung juga harus gagal terkendali.
  const hungLogin = await fetch(`${BASE}/api/proxy`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "login", username: "siswa", password: "rahasia" }),
  });
  const hungLoginBody = await hungLogin.json();
  check("login saat GAS menggantung: 504, bukan menggantung",
    hungLogin.status === 504 && hungLoginBody.code === "upstream_timeout");

  // Skenario D — pulih otomatis begitu GAS sehat kembali (tanpa restart apa pun).
  await setMode("normal");
  const recovered = await call("/api/proxy?action=getConfig");
  check("pulih otomatis setelah GAS sehat", recovered.status === 200 && recovered.body.success === true, `${recovered.ms}ms`);

  // Tenant tidak dikenal berbeda dari backend gagal.
  const unknownTenant = await call("/api/sekolah-tidak-ada/proxy?action=getConfig");
  check("tenant tidak dikenal: 404 tenant_not_found",
    unknownTenant.status === 404 && unknownTenant.body.code === "tenant_not_found",
    `${unknownTenant.status} ${unknownTenant.body.code}`);

  // Penolakan bisnis tetap 200 tanpa kode teknis.
  const wrongPass = await fetch(`${BASE}/api/proxy`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "adminLogin", password: "salah" }),
  });
  const wrongBody = await wrongPass.json();
  check("password salah: penolakan bisnis, bukan kegagalan teknis",
    wrongPass.status === 200 && wrongBody.success === false && wrongBody.code === undefined,
    JSON.stringify(wrongBody));

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
