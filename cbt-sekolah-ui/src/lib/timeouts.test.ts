// P0-1: batas waktu request harus pasti, dan sebabnya harus dapat dibedakan.
// Jalankan: node --experimental-strip-types src/lib/timeouts.test.ts
import assert from "node:assert/strict";
import {
  CLIENT_HEAVY_TIMEOUT_MS,
  CLIENT_TIMEOUT_MS,
  GAS_HEAVY_TIMEOUT_MS,
  GAS_TIMEOUT_MS,
  RequestTimeoutError,
  clientTimeoutMs,
  fetchWithTimeout,
  gasTimeoutMs,
} from "./timeouts.ts";

// ===== Anggaran per action =====

assert.equal(gasTimeoutMs("login"), GAS_TIMEOUT_MS);
assert.equal(gasTimeoutMs("getConfig"), GAS_TIMEOUT_MS);
assert.equal(gasTimeoutMs("syncAnswers"), GAS_TIMEOUT_MS);
assert.equal(gasTimeoutMs("submitExam"), GAS_TIMEOUT_MS);
assert.equal(gasTimeoutMs("importQuestions"), GAS_HEAVY_TIMEOUT_MS, "import massal tidak boleh memakai anggaran login");
assert.equal(gasTimeoutMs("importStudents"), GAS_HEAVY_TIMEOUT_MS);
assert.equal(gasTimeoutMs("uploadImage"), GAS_HEAVY_TIMEOUT_MS);
assert.equal(clientTimeoutMs("login"), CLIENT_TIMEOUT_MS);
assert.equal(clientTimeoutMs("importQuestions"), CLIENT_HEAVY_TIMEOUT_MS);

// Klien harus selalu lebih longgar dari server untuk action yang sama, supaya
// pesan milik server yang sampai ke pengguna, bukan abort milik browser.
for (const action of ["login", "getConfig", "importQuestions", "uploadImage"]) {
  assert.ok(
    clientTimeoutMs(action) > gasTimeoutMs(action),
    `anggaran klien untuk ${action} harus lebih longgar dari anggaran server`,
  );
}

// ===== Request menggantung wajib berakhir sebagai timeout =====

{
  const hang: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    });

  const started = Date.now();
  await assert.rejects(
    () => fetchWithTimeout("http://example.invalid", {}, 60, hang),
    (error: unknown) => {
      assert.ok(error instanceof RequestTimeoutError, "abort milik kita wajib jadi RequestTimeoutError");
      assert.equal((error as RequestTimeoutError).timeoutMs, 60);
      return true;
    },
  );
  assert.ok(Date.now() - started < 3000, "timeout tidak boleh menunggu lebih lama dari anggarannya");
}

// ===== Request normal tidak boleh terpotong =====

{
  const quick: typeof fetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });
  const response = await fetchWithTimeout("http://example.invalid", {}, 1000, quick);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
}

{
  // Respons lambat tapi masih di dalam anggaran tetap harus lolos.
  const slow: typeof fetch = async () => {
    await new Promise((r) => setTimeout(r, 80));
    return new Response("{}", { status: 200 });
  };
  const response = await fetchWithTimeout("http://example.invalid", {}, 1000, slow);
  assert.equal(response.status, 200);
}

// ===== Kegagalan lain tidak boleh menyamar jadi timeout =====

{
  const broken: typeof fetch = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(
    () => fetchWithTimeout("http://example.invalid", {}, 1000, broken),
    (error: unknown) => {
      assert.equal(error instanceof RequestTimeoutError, false, "kegagalan jaringan bukan timeout");
      assert.ok(error instanceof TypeError);
      return true;
    },
  );
}

{
  // Penolakan bisnis adalah respons HTTP yang sah: bukan error, bukan timeout.
  const rejected: typeof fetch = async () =>
    new Response(JSON.stringify({ success: false, message: "Password salah" }), { status: 200 });
  const response = await fetchWithTimeout("http://example.invalid", {}, 1000, rejected);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).message, "Password salah");
}

// ===== Timer dibersihkan: proses tidak boleh tertahan oleh timer menganggur =====

{
  const quick: typeof fetch = async () => new Response("{}", { status: 200 });
  await fetchWithTimeout("http://example.invalid", {}, 30_000, quick);
  // Kalau timer tidak di-clear, event loop akan menahan proses ini 30 detik.
  assert.ok(true);
}

console.log("timeouts: anggaran per action, timeout pasti, error dibedakan PASS");
