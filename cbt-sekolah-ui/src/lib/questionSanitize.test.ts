import assert from "node:assert/strict";
import { sanitizeQuestionHtml, sanitizeQuestionPayload } from "./questionSanitize.ts";

// ── Rich text guru harus selamat ────────────────────────────────────────────
assert.equal(
  sanitizeQuestionHtml("<p>Ibu kota <b>Indonesia</b> adalah <i>...</i></p>"),
  "<p>Ibu kota <b>Indonesia</b> adalah <i>...</i></p>"
);
assert.equal(
  sanitizeQuestionHtml("<ul><li>satu</li><li>dua</li></ul>"),
  "<ul><li>satu</li><li>dua</li></ul>"
);
assert.equal(sanitizeQuestionHtml("Baris satu<br>Baris dua"), "Baris satu<br>Baris dua");
assert.equal(sanitizeQuestionHtml("<u>garis</u> dan <s>coret</s>"), "<u>garis</u> dan <s>coret</s>");
assert.equal(sanitizeQuestionHtml('<font size="4">besar</font>'), '<font size="4">besar</font>');
assert.equal(sanitizeQuestionHtml("H<sub>2</sub>O dan x<sup>2</sup>"), "H<sub>2</sub>O dan x<sup>2</sup>");
assert.equal(sanitizeQuestionHtml("2 &lt; 5 &amp; 5 &gt; 2"), "2 &lt; 5 &amp; 5 &gt; 2");

// ── Script dan konten eksekutabel dibuang beserta isinya ────────────────────
assert.equal(sanitizeQuestionHtml("<script>alert(1)</script>Soal"), "Soal");
assert.equal(sanitizeQuestionHtml("<SCRIPT>alert(1)</SCRIPT>Soal"), "Soal");
assert.equal(sanitizeQuestionHtml("Soal<script>steal()"), "Soal"); // tag tak tertutup
assert.equal(sanitizeQuestionHtml("<style>body{display:none}</style>Soal"), "Soal");
assert.equal(sanitizeQuestionHtml('<iframe src="//evil"></iframe>Soal'), "Soal");
assert.equal(sanitizeQuestionHtml("<!-- <script>x</script> -->Soal"), "Soal");

// ── Event handler tidak pernah ikut ke output ───────────────────────────────
for (const payload of [
  '<p onclick="steal()">Soal</p>',
  "<p ONCLICK=steal()>Soal</p>",
  '<b onmouseover="x">Soal</b>',
  '<div onload="x" onerror="y">Soal</div>',
]) {
  const out = sanitizeQuestionHtml(payload);
  assert.ok(!/on[a-z]+\s*=/i.test(out), `event handler bocor: ${out}`);
  assert.ok(out.includes("Soal"), `teks hilang: ${out}`);
}

// ── Tag berbahaya tanpa allowlist hilang total ──────────────────────────────
assert.equal(sanitizeQuestionHtml('<img src=x onerror="alert(1)">Soal'), "Soal");
assert.equal(sanitizeQuestionHtml('<svg><animate onbegin="alert(1)"/></svg>Soal'), "Soal");
assert.equal(sanitizeQuestionHtml('<object data="evil"></object>Soal'), "Soal");
assert.equal(sanitizeQuestionHtml('<form action="/x"><input name="p"></form>Soal'), "Soal");

// ── URL berbahaya pada link dibuang, link aman dipertahankan ────────────────
assert.equal(sanitizeQuestionHtml('<a href="javascript:alert(1)">klik</a>'), "<a>klik</a>");
assert.equal(sanitizeQuestionHtml('<a href="JaVaScRiPt:alert(1)">klik</a>'), "<a>klik</a>");
assert.equal(sanitizeQuestionHtml('<a href="data:text/html,<script>x</script>">klik</a>'), "<a>klik</a>");
assert.equal(
  sanitizeQuestionHtml('<a href="https://kemdikbud.go.id">sumber</a>'),
  '<a href="https://kemdikbud.go.id" target="_blank" rel="noopener noreferrer nofollow">sumber</a>'
);

// ── Atribut selain allowlist tidak pernah lolos ─────────────────────────────
assert.equal(sanitizeQuestionHtml('<p style="position:fixed;top:0">Soal</p>'), "<p>Soal</p>");
assert.equal(sanitizeQuestionHtml('<span class="x" id="y" data-z="1">Soal</span>'), "<span>Soal</span>");
assert.equal(sanitizeQuestionHtml('<font size="99" color="red">Soal</font>'), "<font>Soal</font>");

// ── Markup rusak tidak menghasilkan tag menggantung ─────────────────────────
assert.equal(sanitizeQuestionHtml("<b>tebal"), "<b>tebal</b>");
assert.equal(sanitizeQuestionHtml("</b>tanpa pembuka"), "tanpa pembuka");
assert.equal(sanitizeQuestionHtml("5 < 7 dan 9 > 3"), "5 &lt; 7 dan 9 &gt; 3");

// ── Input non-string aman ───────────────────────────────────────────────────
assert.equal(sanitizeQuestionHtml(null), "");
assert.equal(sanitizeQuestionHtml(undefined), "");
assert.equal(sanitizeQuestionHtml(42), "");

// ── Payload: seluruh field rich-text tersanitasi, field lain tidak diubah ───
const payload = sanitizeQuestionPayload({
  pertanyaan: '<p onclick="x">Berapa 2+2?</p>',
  opsi_a: "<script>alert(1)</script>4",
  opsi_b: "<b>5</b>",
  opsi_c: "6",
  opsi_d: "7",
  opsi_e: null,
  kunci_jawaban: "A",
  bobot: 1,
  id_mapel: "MAPEL_1",
});
assert.equal(payload.pertanyaan, "<p>Berapa 2+2?</p>");
assert.equal(payload.opsi_a, "4");
assert.equal(payload.opsi_b, "<b>5</b>");
assert.equal(payload.opsi_e, null);
assert.equal(payload.kunci_jawaban, "A");
assert.equal(payload.bobot, 1);
assert.equal(payload.id_mapel, "MAPEL_1");

console.log("questionSanitize: allowlist rich-text dan blokir XSS PASS");
