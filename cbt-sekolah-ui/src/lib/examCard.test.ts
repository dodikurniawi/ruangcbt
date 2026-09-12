import assert from "node:assert/strict";
import { studentCardCredentials, escapeCardHtml } from "./examCard.ts";

// Kredensial diambil apa adanya dari baris siswa, bukan dibuat ulang.
assert.deepEqual(
    studentCardCredentials({ username: "D1303013900018", password: "652511" }),
    { username: "D1303013900018", password: "652511" },
);

// Tiap siswa memakai barisnya sendiri: tidak ada state yang bocor antar kartu.
const siswa = [
    { id_siswa: "S1", username: "siswa1", password: "rahasia1" },
    { id_siswa: "S2", username: "siswa2", password: "rahasia2" },
    { id_siswa: "S3", username: "siswa3", password: "" },
];
const kartu = siswa.map((s) => ({ id: s.id_siswa, ...studentCardCredentials(s) }));
assert.deepEqual(kartu, [
    { id: "S1", username: "siswa1", password: "rahasia1" },
    { id: "S2", username: "siswa2", password: "rahasia2" },
    { id: "S3", username: "siswa3", password: "-" },
]);
assert.notEqual(kartu[0].password, kartu[1].password, "password tidak tertukar antar siswa");

// Data siswa lama: password kosong/null/undefined tidak membuat kartu gagal.
assert.equal(studentCardCredentials({ username: "u", password: null }).password, "-");
assert.equal(studentCardCredentials({ username: "u" }).password, "-");
assert.equal(studentCardCredentials({}).username, "-");
assert.equal(studentCardCredentials({ username: "  ", password: "   " }).password, "-");

// Sel Sheets numerik: username/password berupa angka datang sebagai number,
// bukan string — kartu tetap mencetaknya, tidak crash.
assert.deepEqual(
    studentCardCredentials({ username: 114989305, password: 652511 }),
    { username: "114989305", password: "652511" },
);
assert.equal(studentCardCredentials({ password: 0 }).password, "0", "password 0 bukan kosong");
assert.equal(studentCardCredentials({ username: true }).username, "true");

// Password apa adanya, termasuk spasi di tengah dan tanda bintang seperti kartu ANBK.
assert.equal(studentCardCredentials({ password: "652511*" }).password, "652511*");
assert.equal(studentCardCredentials({ password: " ab cd " }).password, "ab cd");

// Kartu print dirakit sebagai string HTML: karakter khusus tidak boleh merusak layout.
assert.equal(escapeCardHtml(`<b>&"'`), "&lt;b&gt;&amp;&quot;&#39;");
assert.equal(escapeCardHtml("p@ss<script>"), "p@ss&lt;script&gt;");
assert.equal(escapeCardHtml("biasa123"), "biasa123");

console.log("examCard: kredensial kartu peserta per siswa + escaping PASS");
