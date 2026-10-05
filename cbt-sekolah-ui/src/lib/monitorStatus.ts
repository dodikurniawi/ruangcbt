// Status yang DIBACA GURU, diturunkan dari status yang DISIMPAN SERVER.
//
// `status_ujian` di sheet hanya punya empat nilai dan tidak mengenal waktu: ia
// tidak bisa membedakan "sedang mengerjakan" dari "tadi mengerjakan, lalu hilang",
// dan ia bisa tertinggal di "BELUM" untuk siswa yang sebenarnya sudah masuk.
// Keputusan guru (reset / tunggu / hubungi siswa) bergantung pada perbedaan itu,
// jadi label di layar dihitung dari status DAN kesegaran last_seen — bukan dari
// status saja.
//
// Aturan yang tidak boleh dilanggar: jangan pernah menulis "belum mengerjakan"
// untuk baris yang punya jejak aktivitas. Lebih baik mengaku tidak tahu.

export type MonitorState =
    | "BELUM"        // tidak ada jejak aktivitas sama sekali
    | "SEDANG"       // mengerjakan, komunikasi terakhir masih segar
    | "TERPUTUS"     // attempt berjalan, tapi sudah lama tidak terdengar
    | "TIDAK_PASTI"  // ada jejak aktivitas, tapi status server masih "BELUM"
    | "SELESAI"
    | "DIHENTIKAN";  // kena batas pelanggaran, menunggu reset guru

export interface MonitorInput {
    status_ujian?: string;
    /** Epoch ms komunikasi terakhir siswa (login / autosave / heartbeat). */
    last_seen_ms?: number | null;
    violation_count?: number;
}

export interface MonitorStatus {
    state: MonitorState;
    /** Label pendek untuk badge. */
    label: string;
    /** Keterangan waktu, kosong bila tidak ada jejak aktivitas. */
    detail: string;
    /** true = guru kemungkinan perlu bertindak atas baris ini. */
    needsAction: boolean;
}

/**
 * Batas "masih terdengar". Klien mengirim heartbeat tiap 60 detik, jadi 150 detik
 * memberi ruang dua heartbeat yang hilang sebelum sebuah baris disebut terputus —
 * cukup longgar untuk jaringan sekolah yang tersendat, cukup rapat untuk ketahuan
 * dalam satu-dua menit.
 */
export const PRESENCE_STALE_MS = 150_000;

export function formatSinceLastSeen(lastSeenMs: number, now: number): string {
    const diff = Math.max(0, now - lastSeenMs);
    if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))} detik lalu`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)} menit lalu`;
    const hours = Math.floor(diff / 3_600_000);
    return hours < 24 ? `${hours} jam lalu` : `${Math.floor(hours / 24)} hari lalu`;
}

function isFreshStamp(lastSeenMs: number | null | undefined, now: number): lastSeenMs is number {
    // Stempel dari masa depan (jam perangkat guru meleset) tetap dihitung segar:
    // yang berbahaya adalah mengaku "tidak ada aktivitas" padahal ada.
    return typeof lastSeenMs === "number" && isFinite(lastSeenMs) && lastSeenMs > 0
        && now - lastSeenMs <= PRESENCE_STALE_MS;
}

function hasStamp(lastSeenMs: number | null | undefined): lastSeenMs is number {
    return typeof lastSeenMs === "number" && isFinite(lastSeenMs) && lastSeenMs > 0;
}

export function resolveMonitorStatus(user: MonitorInput, now: number = Date.now()): MonitorStatus {
    const lastSeen = user.last_seen_ms;
    const since = hasStamp(lastSeen) ? `Terakhir aktif ${formatSinceLastSeen(lastSeen, now)}` : "";

    switch (user.status_ujian) {
        case "SELESAI":
            return { state: "SELESAI", label: "Selesai", detail: since, needsAction: false };

        case "DISKUALIFIKASI":
            return {
                state: "DIHENTIKAN",
                label: "Dihentikan — menunggu reset",
                detail: user.violation_count
                    ? `${user.violation_count} pelanggaran tercatat`
                    : since,
                needsAction: true,
            };

        case "SEDANG":
            if (isFreshStamp(lastSeen, now)) {
                return { state: "SEDANG", label: "Sedang mengerjakan", detail: since, needsAction: false };
            }
            // Attempt masih terbuka di server, tapi sudah lama tidak ada kabar.
            // Bukan "selesai", bukan "belum" — guru perlu melihat baris ini.
            return {
                state: "TERPUTUS",
                label: "Terputus",
                detail: since || "Belum ada komunikasi sejak masuk",
                needsAction: true,
            };

        default:
            // "BELUM" (atau sel kosong). Kalau ada jejak aktivitas, status server
            // yang tertinggal — bukan siswanya yang belum mulai.
            if (isFreshStamp(lastSeen, now)) {
                return {
                    state: "TIDAK_PASTI",
                    label: "Status belum diperbarui",
                    detail: since,
                    needsAction: true,
                };
            }
            if (hasStamp(lastSeen)) {
                return {
                    state: "BELUM",
                    label: "Belum ada aktivitas terdeteksi",
                    detail: since,
                    needsAction: false,
                };
            }
            return { state: "BELUM", label: "Belum mulai", detail: "", needsAction: false };
    }
}
