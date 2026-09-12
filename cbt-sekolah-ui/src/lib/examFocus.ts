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
