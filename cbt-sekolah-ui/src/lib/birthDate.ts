// Tempat/tanggal lahir siswa: satu tempat untuk menormalkan dan menampilkannya.
//
// Penyimpanan selalu teks ISO "YYYY-MM-DD" (sama seperti nilai <input type="date">),
// bukan format tampilan. Tampilan dirakit dari potongan angka ISO-nya, tanpa pernah
// membuat objek Date: `new Date("2015-05-12")` diparse sebagai UTC dan tercetak
// "11 Mei 2015" di zona waktu negatif — tanggal lahir tidak boleh bergeser.

const BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Hari ke-0 epoch serial Excel (1899-12-30), dasar konversi tanggal dari .xlsx. */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

/**
 * Terima apa pun yang bisa datang dari Sheets, Excel, atau form → "YYYY-MM-DD".
 * Nilai yang tidak dapat dibaca sebagai tanggal menjadi "" (kosong), bukan error:
 * siswa lama memang tidak punya tanggal lahir dan itu sah.
 */
export function toIsoBirthDate(value: unknown): string {
    if (value === null || value === undefined) return "";

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "" : fromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    // Sel tanggal Excel datang sebagai serial number, bukan teks.
    if (typeof value === "number" && Number.isFinite(value)) {
        if (value <= 0) return "";
        const d = new Date(EXCEL_EPOCH_UTC + Math.round(value) * 86400000);
        return fromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }

    const text = String(value).trim();
    if (!text) return "";

    const iso = ISO.exec(text);
    if (iso) return isRealDate(+iso[1], +iso[2], +iso[3]) ? text : "";

    // Guru biasa mengetik 12/05/2015 atau 12-5-2015 (hari dulu, kebiasaan Indonesia).
    const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    if (dmy) {
        const [, d, m, y] = dmy;
        return isRealDate(+y, +m, +d) ? fromParts(+y, +m, +d) : "";
    }

    return "";
}

/** "2015-05-12" → "12 Mei 2015". Nilai kosong/tak valid → "". */
export function formatBirthDateId(iso: unknown): string {
    const normalized = toIsoBirthDate(iso);
    if (!normalized) return "";
    const [y, m, d] = normalized.split("-");
    return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
}

function fromParts(y: number, m: number, d: number): string {
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Menolak 2015-02-31 dan bulan 13: Date UTC akan menggulungnya diam-diam.
function isRealDate(y: number, m: number, d: number): boolean {
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const probe = new Date(Date.UTC(y, m - 1, d));
    return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}
