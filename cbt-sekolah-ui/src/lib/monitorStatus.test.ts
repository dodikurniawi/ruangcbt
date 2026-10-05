import assert from "node:assert/strict";
import {
    PRESENCE_STALE_MS,
    formatSinceLastSeen,
    resolveMonitorStatus,
} from "./monitorStatus.ts";

const NOW = 1_700_000_000_000;
const fresh = NOW - 10_000;
const stale = NOW - PRESENCE_STALE_MS - 1;

// --- belum mulai: tidak ada jejak sama sekali ---
{
    const s = resolveMonitorStatus({ status_ujian: "BELUM", last_seen_ms: null }, NOW);
    assert.equal(s.state, "BELUM");
    assert.equal(s.label, "Belum mulai");
    assert.equal(s.detail, "");
    assert.equal(s.needsAction, false);
}

// Sel status kosong diperlakukan sama dengan "BELUM".
assert.equal(resolveMonitorStatus({}, NOW).label, "Belum mulai");

// --- JAMINAN UTAMA: ada jejak aktivitas ⇒ tidak boleh dilabeli "belum mengerjakan" ---
{
    const s = resolveMonitorStatus({ status_ujian: "BELUM", last_seen_ms: fresh }, NOW);
    assert.equal(s.state, "TIDAK_PASTI");
    assert.equal(s.label, "Status belum diperbarui");
    assert.match(s.detail, /Terakhir aktif/);
    assert.equal(s.needsAction, true, "guru perlu melihat baris ini");
    assert.notEqual(s.label, "Belum mulai");
}

// Jejak lama + status BELUM: tetap jangan mengklaim "belum mulai".
{
    const s = resolveMonitorStatus({ status_ujian: "BELUM", last_seen_ms: stale }, NOW);
    assert.equal(s.state, "BELUM");
    assert.equal(s.label, "Belum ada aktivitas terdeteksi");
    assert.match(s.detail, /Terakhir aktif/);
    assert.equal(s.needsAction, false);
}

// --- sedang mengerjakan ---
{
    const s = resolveMonitorStatus({ status_ujian: "SEDANG", last_seen_ms: fresh }, NOW);
    assert.equal(s.state, "SEDANG");
    assert.equal(s.label, "Sedang mengerjakan");
    assert.equal(s.needsAction, false);
}

// --- disconnect TIDAK dianggap selesai ---
{
    const s = resolveMonitorStatus({ status_ujian: "SEDANG", last_seen_ms: stale }, NOW);
    assert.equal(s.state, "TERPUTUS");
    assert.equal(s.label, "Terputus");
    assert.equal(s.needsAction, true);
    assert.notEqual(s.state, "SELESAI");
}

// Attempt berjalan tanpa stempel sama sekali: tetap bukan "selesai", bukan "belum".
{
    const s = resolveMonitorStatus({ status_ujian: "SEDANG", last_seen_ms: null }, NOW);
    assert.equal(s.state, "TERPUTUS");
    assert.equal(s.detail, "Belum ada komunikasi sejak masuk");
}

// Tepat di batas masih dihitung segar; satu ms setelahnya tidak.
assert.equal(
    resolveMonitorStatus({ status_ujian: "SEDANG", last_seen_ms: NOW - PRESENCE_STALE_MS }, NOW).state,
    "SEDANG",
);
assert.equal(
    resolveMonitorStatus({ status_ujian: "SEDANG", last_seen_ms: NOW - PRESENCE_STALE_MS - 1 }, NOW).state,
    "TERPUTUS",
);

// Jam perangkat guru meleset ke belakang: jangan sampai siswa aktif dibilang hilang.
assert.equal(
    resolveMonitorStatus({ status_ujian: "SEDANG", last_seen_ms: NOW + 60_000 }, NOW).state,
    "SEDANG",
);

// --- selesai ---
{
    const s = resolveMonitorStatus({ status_ujian: "SELESAI", last_seen_ms: stale }, NOW);
    assert.equal(s.state, "SELESAI");
    assert.equal(s.label, "Selesai");
    assert.equal(s.needsAction, false, "selesai bukan pekerjaan guru");
}

// --- kena batas pelanggaran: menunggu reset ---
{
    const s = resolveMonitorStatus(
        { status_ujian: "DISKUALIFIKASI", last_seen_ms: fresh, violation_count: 3 },
        NOW,
    );
    assert.equal(s.state, "DIHENTIKAN");
    assert.match(s.label, /menunggu reset/);
    assert.equal(s.detail, "3 pelanggaran tercatat");
    assert.equal(s.needsAction, true);
}

// --- format waktu relatif ---
assert.equal(formatSinceLastSeen(NOW - 5_000, NOW), "5 detik lalu");
assert.equal(formatSinceLastSeen(NOW, NOW), "1 detik lalu", "0 detik dibulatkan ke 1, bukan '0 detik'");
assert.equal(formatSinceLastSeen(NOW - 120_000, NOW), "2 menit lalu");
assert.equal(formatSinceLastSeen(NOW - 7_200_000, NOW), "2 jam lalu");
assert.equal(formatSinceLastSeen(NOW - 172_800_000, NOW), "2 hari lalu");

console.log("monitorStatus.test.ts OK");
