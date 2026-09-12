import assert from "node:assert/strict";
import {
    createViolationDeduper,
    exitExamFullscreen,
    isFullscreenActive,
    isFullscreenSupported,
    requestExamFullscreen,
    LEAVE_COOLDOWN_MS,
} from "./examFocus.ts";

const el = {} as Element;

// --- support detection ---
assert.equal(isFullscreenSupported({ fullscreenEnabled: true }, { requestFullscreen: async () => {} }), true);
assert.equal(isFullscreenSupported({}, {}), false, "tanpa requestFullscreen = tidak didukung");
assert.equal(
    isFullscreenSupported({ fullscreenEnabled: false }, { requestFullscreen: async () => {} }),
    false,
    "iframe tanpa allow=fullscreen",
);

// --- request ---
let called = 0;
const ok = await requestExamFullscreen({ fullscreenEnabled: true }, { requestFullscreen: async () => { called += 1; } });
assert.equal(ok, true);
assert.equal(called, 1);

// Browser menolak (gesture hilang / user menolak) → false, bukan throw.
const rejected = await requestExamFullscreen(
    { fullscreenEnabled: true },
    { requestFullscreen: async () => { throw new Error("NotAllowedError"); } },
);
assert.equal(rejected, false, "penolakan fullscreen tidak boleh merusak ujian");

// Tidak didukung sama sekali → false, ujian tetap jalan.
assert.equal(await requestExamFullscreen({}, {}), false);

// --- active ---
assert.equal(isFullscreenActive({ fullscreenElement: el }), true);
assert.equal(isFullscreenActive({ fullscreenElement: null }), false);
assert.equal(isFullscreenActive({}), false);

// --- exit ---
let exited = 0;
await exitExamFullscreen({ fullscreenElement: el, exitFullscreen: async () => { exited += 1; } });
assert.equal(exited, 1, "submit sukses harus melepas fullscreen");

await exitExamFullscreen({ fullscreenElement: null, exitFullscreen: async () => { exited += 1; } });
assert.equal(exited, 1, "tidak memanggil exit saat sudah keluar fullscreen");

await exitExamFullscreen({ fullscreenElement: el, exitFullscreen: async () => { throw new Error("nope"); } });

// --- dedup ---
const dedupe = createViolationDeduper(LEAVE_COOLDOWN_MS);
const t0 = 1_000_000;
// Satu alt+tab: fullscreenchange + visibilitychange + blur ≈ bersamaan → satu pelanggaran.
assert.equal(dedupe("exit_fullscreen", t0), true);
assert.equal(dedupe("tab_switch", t0 + 30), false);
assert.equal(dedupe("blur", t0 + 120), false);
// Kejadian baru setelah cooldown tetap tercatat.
assert.equal(dedupe("tab_switch", t0 + LEAVE_COOLDOWN_MS), true);
// Jenis lain punya cooldown sendiri, tidak ikut tertelan.
assert.equal(dedupe("copy", t0 + LEAVE_COOLDOWN_MS + 10), true);
assert.equal(dedupe("copy", t0 + LEAVE_COOLDOWN_MS + 20), false);
assert.equal(dedupe("paste", t0 + LEAVE_COOLDOWN_MS + 20), true);

console.log("examFocus: fullscreen fallback + dedup pelanggaran PASS");
