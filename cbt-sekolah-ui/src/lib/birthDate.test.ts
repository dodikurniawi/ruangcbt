import assert from "node:assert/strict";
import { toIsoBirthDate, formatBirthDateId } from "./birthDate.ts";

// Teks ISO lewat apa adanya; tampilannya memakai nama bulan Indonesia.
assert.equal(toIsoBirthDate("2015-05-12"), "2015-05-12");
assert.equal(formatBirthDateId("2015-05-12"), "12 Mei 2015");
assert.equal(formatBirthDateId("2014-06-20"), "20 Juni 2014");
assert.equal(formatBirthDateId("2011-01-10"), "10 Januari 2011");
assert.equal(formatBirthDateId("2009-12-31"), "31 Desember 2009");

// Tanggal lahir tidak boleh bergeser satu hari karena zona waktu.
// (new Date("2015-05-12").toLocaleDateString di TZ negatif → 11 Mei 2015.)
for (const tz of ["UTC", "Asia/Jakarta", "Pacific/Kiritimati", "America/Los_Angeles"]) {
    process.env.TZ = tz;
    assert.equal(formatBirthDateId("2015-05-12"), "12 Mei 2015", `tanggal bergeser di ${tz}`);
    assert.equal(formatBirthDateId("2015-01-01"), "1 Januari 2015", `tanggal bergeser di ${tz}`);
}
process.env.TZ = "Asia/Jakarta";

// Kosong tetap kosong — bukan "Invalid Date"/"undefined"/"NaN".
for (const empty of ["", "   ", null, undefined, 0, "-"]) {
    assert.equal(toIsoBirthDate(empty), "", `nilai kosong: ${String(empty)}`);
    assert.equal(formatBirthDateId(empty), "", `nilai kosong: ${String(empty)}`);
}
assert.equal(formatBirthDateId("bukan tanggal"), "");
assert.equal(formatBirthDateId(new Date("x")), "");

// Tanggal yang tidak pernah ada ditolak, tidak digulung diam-diam.
assert.equal(toIsoBirthDate("2015-02-31"), "");
assert.equal(toIsoBirthDate("2015-13-01"), "");
assert.equal(toIsoBirthDate("2016-02-29"), "2016-02-29", "tahun kabisat tetap sah");

// Guru biasa mengetik hari-dulu; keduanya dinormalkan ke ISO.
assert.equal(toIsoBirthDate("12/05/2015"), "2015-05-12");
assert.equal(toIsoBirthDate("1-5-2015"), "2015-05-01");
assert.equal(toIsoBirthDate("31/02/2015"), "");

// Sel .xlsx bertanggal: Date asli maupun serial number Excel.
assert.equal(toIsoBirthDate(new Date(2015, 4, 12)), "2015-05-12");
assert.equal(toIsoBirthDate(42136), "2015-05-12", "serial Excel 42136 = 12 Mei 2015");
assert.equal(toIsoBirthDate(-5), "");

console.log("birthDate.test.ts OK");
