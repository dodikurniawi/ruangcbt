// Kredensial yang dicetak di kartu peserta. Sumbernya satu: baris siswa dari
// getUsers (admin-only), sehingga kartu tidak pernah memakai state siswa lain.

export interface CardCredentials {
    username: string;
    password: string;
}

const EMPTY = "-";

// Sel Sheets bisa datang sebagai number (username/password berupa angka) atau
// boolean, bukan hanya string. Kartu hanya menampilkan, jadi apa pun bentuknya
// dibaca sebagai teks — tanpa mengubah nilainya.
function asCardText(value: unknown): string {
    if (value === null || value === undefined) return EMPTY;
    return String(value).trim() || EMPTY;
}

export function studentCardCredentials(
    student: { username?: unknown; password?: unknown },
): CardCredentials {
    // ponytail: siswa lama tanpa password tetap tercetak, dengan placeholder —
    // kartu tidak boleh membuat atau menebak password.
    return {
        username: asCardText(student.username),
        password: asCardText(student.password),
    };
}

/** Password boleh berisi karakter HTML; kartu print dirakit sebagai string HTML. */
export function escapeCardHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
