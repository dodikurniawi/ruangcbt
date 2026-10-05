// Lapisan fokus ujian: fullscreen + dedup pelanggaran.
// Fullscreen hanya UX/fokus — server tetap pemilik attempt, timer, dan skor.

// ponytail: subset dokumen yang dipakai, supaya bisa diuji tanpa DOM asli.
export interface FullscreenDocLike {
    fullscreenElement?: Element | null;
    fullscreenEnabled?: boolean;
    exitFullscreen?: () => Promise<void>;
}

export interface FullscreenElementLike {
    requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
}

export function isFullscreenSupported(doc: FullscreenDocLike, el: FullscreenElementLike): boolean {
    return typeof el.requestFullscreen === "function" && doc.fullscreenEnabled !== false;
}

export function isFullscreenActive(doc: FullscreenDocLike): boolean {
    return doc.fullscreenElement !== null && doc.fullscreenElement !== undefined;
}

/**
 * Minta fullscreen. Tidak pernah melempar: browser yang menolak (atau tidak
 * mendukung) tidak boleh menggagalkan ujian — cukup kembalikan false.
 */
export async function requestExamFullscreen(
    doc: FullscreenDocLike,
    el: FullscreenElementLike,
): Promise<boolean> {
    if (!isFullscreenSupported(doc, el)) return false;
    try {
        await el.requestFullscreen!();
        return true;
    } catch {
        return false;
    }
}

/** Keluar fullscreen dengan aman; dipanggil hanya setelah submit sukses. */
export async function exitExamFullscreen(doc: FullscreenDocLike): Promise<void> {
    if (!isFullscreenActive(doc) || typeof doc.exitFullscreen !== "function") return;
    try {
        await doc.exitFullscreen();
    } catch {
        // Browser menolak exit: biarkan, hasil ujian sudah tersimpan di server.
    }
}

/**
 * Satu tindakan siswa (alt+tab, keluar fullscreen) memicu beberapa event
 * berdekatan: visibilitychange + fullscreenchange + blur. Semua event "keluar
 * ujian" berbagi satu cooldown supaya tercatat sebagai satu pelanggaran.
 */
export const LEAVE_VIOLATIONS = ["tab_switch", "blur", "exit_fullscreen"] as const;
export const LEAVE_COOLDOWN_MS = 1500;

/**
 * Berapa lama jendela harus TETAP kehilangan fokus sebelum blur dihitung sebagai
 * meninggalkan ujian.
 *
 * `blur` di ponsel berbunyi untuk hal-hal yang bukan kecurangan dan sering tidak
 * disadari siswa: notifikasi masuk, bilah status ditarik, papan ketik muncul,
 * layar berputar. Semuanya mengembalikan fokus dalam waktu di bawah satu detik.
 * Berpindah aplikasi atau alt+tab yang sungguhan tidak: fokus tetap hilang
 * selama siswa berada di tempat lain.
 *
 * Yang hilang karena jeda ini hanyalah blur sekejap. Berpindah tab, me-minimize,
 * mengunci layar, dan keluar layar penuh tetap tercatat lewat `visibilitychange`
 * dan `fullscreenchange` tanpa jeda apa pun.
 */
export const BLUR_SUSTAIN_MS = 1200;

export function createViolationDeduper(cooldownMs: number = LEAVE_COOLDOWN_MS) {
    const lastAt = new Map<string, number>();
    return function shouldReport(type: string, now: number): boolean {
        const key = (LEAVE_VIOLATIONS as readonly string[]).includes(type) ? "leave" : type;
        const prev = lastAt.get(key);
        if (prev !== undefined && now - prev < cooldownMs) return false;
        lastAt.set(key, now);
        return true;
    };
}

/**
 * Kalimat yang dibaca SISWA untuk setiap jenis pelanggaran. Nama event
 * ("visibilitychange", "tab_switch") tidak pernah sampai ke layar: siswa harus
 * tahu apa yang harus ia lakukan, bukan nama teknis pemicunya.
 */
const VIOLATION_MESSAGES: Record<string, string> = {
    tab_switch: "Anda meninggalkan halaman ujian. Tetap berada di halaman ini selama mengerjakan — layar yang mati atau berpindah aplikasi juga terbaca sebagai meninggalkan halaman.",
    blur: "Jendela ujian kehilangan fokus. Jangan membuka aplikasi atau jendela lain selama mengerjakan.",
    exit_fullscreen: "Anda keluar dari mode layar penuh. Tekan “Kembali ke Layar Penuh” untuk melanjutkan.",
    copy: "Menyalin teks soal tidak diizinkan.",
    paste: "Menempel teks ke lembar jawaban tidak diizinkan.",
    contextmenu: "Menu klik kanan dinonaktifkan selama ujian.",
    devtools: "Membuka alat pengembang tidak diizinkan selama ujian.",
    keyboard_shortcut: "Kombinasi tombol tersebut dinonaktifkan selama ujian.",
};

export function violationMessage(type: string): string {
    return VIOLATION_MESSAGES[type] ?? "Terdeteksi aktivitas yang tidak diizinkan selama ujian.";
}
