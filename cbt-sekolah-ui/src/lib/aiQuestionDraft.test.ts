// Generator soal AI untuk kelima tipe.
// Yang diuji: tiap tipe meminta bentuk jawaban sendiri, hasil AI diterjemahkan ke
// draft yang LOLOS validator form, kunci menjodohkan tidak tergeser oleh acakan,
// dan hasil cacat ditolak dengan alasan — bukan tersimpan diam-diam.

import assert from "node:assert/strict";
import { buildQuestionRequest, toQuestionDraft } from "./aiQuestionDraft.ts";
import { validateTrueFalseDraft } from "./trueFalse.ts";
import { validateFillInDraft } from "./fillIn.ts";
import { validateMatchingDraft, serializeMatchingDraft } from "./matching.ts";

const ctx = { topik: "perubahan wujud benda", kelas: "6", mapel: "IPA" };
const TYPES = ["SINGLE", "COMPLEX", "TRUE_FALSE", "MATCHING", "FILL_IN"] as const;

// ── Tiap tipe punya permintaan sendiri, tidak ada yang memakai schema kosong ──
{
  const prompts = new Set<string>();
  for (const tipe of TYPES) {
    const { prompt, schema, maxOutputTokens } = buildQuestionRequest(tipe, ctx);
    prompts.add(prompt);
    assert.ok(prompt.includes(ctx.topik), `${tipe}: topik guru masuk ke prompt`);
    assert.ok(prompt.includes(ctx.kelas), `${tipe}: kelas masuk ke prompt`);
    assert.ok(prompt.includes(ctx.mapel), `${tipe}: mapel masuk ke prompt`);
    assert.equal(schema.type, "object");
    assert.ok(
      Object.keys(schema.properties ?? {}).length > 1,
      `${tipe}: responseSchema harus menyebut field, bukan objek kosong`,
    );
    assert.ok((schema.required ?? []).includes("pertanyaan"), `${tipe}: redaksi soal wajib`);
    assert.ok(maxOutputTokens >= 1024);
  }
  assert.equal(prompts.size, TYPES.length, "tiap tipe meminta bentuk jawaban yang berbeda");
}

// ── SINGLE: satu kunci A–D ───────────────────────────────────────────────────
{
  const res = toQuestionDraft("SINGLE", {
    pertanyaan: "Proses es menjadi air disebut?",
    opsi_a: "Mencair", opsi_b: "Membeku", opsi_c: "Menguap", opsi_d: "Menyublim",
    kunci_jawaban: "a",
    wikipedia_search_term: "melting ice",
  });
  if (!res.ok) throw new Error(res.message);
  assert.equal(res.patch.kunci_jawaban, "A", "huruf kecil dinormalkan");
  assert.equal(res.patch.opsi_d, "Menyublim");
  assert.equal(res.patch.opsi_e, "", "SINGLE tidak memakai opsi E");
  assert.equal(res.wikipediaSearchTerm, "melting ice");
}

// SINGLE cacat ditolak, tidak diam-diam tersimpan.
{
  const kurangOpsi = toQuestionDraft("SINGLE", {
    pertanyaan: "x", opsi_a: "a", opsi_b: "b", opsi_c: "", opsi_d: "d", kunci_jawaban: "A",
  });
  assert.equal(kurangOpsi.ok, false);
  if (!kurangOpsi.ok) assert.match(kurangOpsi.message, /opsi A–D/);

  const kunciLiar = toQuestionDraft("SINGLE", {
    pertanyaan: "x", opsi_a: "a", opsi_b: "b", opsi_c: "c", opsi_d: "d", kunci_jawaban: "E",
  });
  assert.equal(kunciLiar.ok, false, "kunci E tidak ada pada soal empat opsi");

  assert.equal(toQuestionDraft("SINGLE", { opsi_a: "a" }).ok, false, "tanpa redaksi soal ditolak");
  assert.equal(toQuestionDraft("SINGLE", "bukan objek").ok, false);
  assert.equal(toQuestionDraft("SINGLE", null).ok, false);
}

// ── COMPLEX: minimal dua kunci, format "A,C" seperti form ────────────────────
{
  const res = toQuestionDraft("COMPLEX", {
    pertanyaan: "Manakah yang termasuk perubahan fisika?",
    opsi_a: "Es mencair", opsi_b: "Kertas terbakar", opsi_c: "Air menguap",
    opsi_d: "Besi berkarat", opsi_e: "Lilin meleleh",
    kunci_jawaban: ["c", "A", "E", "A"],
  });
  if (!res.ok) throw new Error(res.message);
  assert.equal(res.patch.kunci_jawaban, "A,C,E", "kunci unik, urut, dipisah koma");

  const satuKunci = toQuestionDraft("COMPLEX", {
    pertanyaan: "x", opsi_a: "a", opsi_b: "b", opsi_c: "c", opsi_d: "d", opsi_e: "e",
    kunci_jawaban: ["A"],
  });
  assert.equal(satuKunci.ok, false, "pilihan kompleks butuh minimal dua kunci");

  // Kunci yang menunjuk opsi kosong tidak boleh lolos: siswa tidak akan pernah
  // bisa memilihnya.
  const kunciKeOpsiKosong = toQuestionDraft("COMPLEX", {
    pertanyaan: "x", opsi_a: "a", opsi_b: "b", opsi_c: "c", opsi_d: "d", opsi_e: "",
    kunci_jawaban: ["A", "E"],
  });
  assert.equal(kunciKeOpsiKosong.ok, false);
}

// ── TRUE_FALSE: ID ditetapkan aplikasi, draft lolos validator form ───────────
{
  const res = toQuestionDraft("TRUE_FALSE", {
    pertanyaan: "Tentukan benar atau salah.",
    pernyataan: [
      { teks: "Es mencair saat dipanaskan.", kunci: "BENAR" },
      { teks: "Air membeku pada 100 derajat Celsius.", kunci: "salah" },
      { teks: "Uap air adalah wujud gas.", kunci: "BENAR" },
    ],
  });
  if (!res.ok) throw new Error(res.message);
  const pernyataan = res.patch.pernyataan!;
  assert.deepEqual(pernyataan.map((p) => p.id), ["1", "2", "3"], "ID berurutan dari aplikasi");
  assert.deepEqual(pernyataan.map((p) => p.kunci), ["BENAR", "SALAH", "BENAR"]);
  assert.equal(validateTrueFalseDraft(pernyataan), null, "draft langsung dapat disimpan");

  // Pernyataan kosong dibuang; kalau tidak tersisa satu pun, hasilnya ditolak.
  const kosong = toQuestionDraft("TRUE_FALSE", { pertanyaan: "x", pernyataan: [{ teks: "  ", kunci: "BENAR" }] });
  assert.equal(kosong.ok, false);
  assert.equal(toQuestionDraft("TRUE_FALSE", { pertanyaan: "x" }).ok, false);
}

// ── FILL_IN: jawaban alternatif jadi acceptedAnswers ─────────────────────────
{
  const res = toQuestionDraft("FILL_IN", {
    pertanyaan: "Perubahan wujud padat ke cair disebut ....",
    petunjuk: "Satu kata.",
    jawaban_diterima: ["mencair", "  melebur  ", ""],
  });
  if (!res.ok) throw new Error(res.message);
  assert.deepEqual(res.patch.fillIn!.acceptedAnswers, ["mencair", "melebur"], "di-trim, kosong dibuang");
  assert.equal(res.patch.fillIn!.petunjuk, "Satu kata.");
  assert.equal(res.patch.fillIn!.trim, true, "default kontrak dipertahankan");
  assert.equal(res.patch.fillIn!.caseSensitive, false);
  assert.equal(validateFillInDraft(res.patch.fillIn!), null);

  assert.equal(toQuestionDraft("FILL_IN", { pertanyaan: "x", jawaban_diterima: [] }).ok, false);
}

// ── MATCHING: acakan kolom kanan tidak pernah menggeser kunci ────────────────
{
  const payload = {
    pertanyaan: "Jodohkan proses dengan namanya.",
    pasangan: [
      { kiri: "Padat ke cair", kanan: "Mencair" },
      { kiri: "Cair ke gas", kanan: "Menguap" },
      { kiri: "Gas ke cair", kanan: "Mengembun" },
      { kiri: "Padat ke gas", kanan: "Menyublim" },
    ],
  };

  // RNG tetap: hasilnya dapat diperiksa, bukan ditebak.
  const res = toQuestionDraft("MATCHING", payload, () => 0.42);
  if (!res.ok) throw new Error(res.message);
  const draft = res.patch.matching!;
  assert.equal(validateMatchingDraft(draft), null, "draft langsung dapat disimpan");
  assert.deepEqual(draft.kiri.map((i) => i.id), ["1", "2", "3", "4"]);
  assert.deepEqual(draft.kanan.map((i) => i.id), ["A", "B", "C", "D"]);

  // Inti kontraknya: tiap kiri menunjuk ID yang teksnya memang jodoh benarnya.
  const kananById = new Map(draft.kanan.map((i) => [i.id, i.teks]));
  payload.pasangan.forEach((pair, index) => {
    assert.equal(
      kananById.get(draft.pasangan[String(index + 1)]),
      pair.kanan,
      `pasangan "${pair.kiri}" harus tetap menunjuk "${pair.kanan}" setelah diacak`,
    );
  });

  // Kunci yang tersimpan juga utuh lewat jalur serialisasi form yang sebenarnya.
  const { kunci_jawaban } = serializeMatchingDraft(draft);
  const tersimpan = JSON.parse(kunci_jawaban) as Record<string, string>;
  assert.equal(kananById.get(tersimpan["1"]), "Mencair");
  assert.equal(kananById.get(tersimpan["4"]), "Menyublim");
}

// Jawaban tidak boleh berbaris sejajar 1→A, 2→B — soal seperti itu dapat ditebak
// tanpa memahami materi. RNG identitas sekalipun harus tetap bergeser.
{
  const res = toQuestionDraft("MATCHING", {
    pertanyaan: "x",
    pasangan: [
      { kiri: "k1", kanan: "j1" }, { kiri: "k2", kanan: "j2" }, { kiri: "k3", kanan: "j3" },
    ],
  }, () => 0.999999);
  if (!res.ok) throw new Error(res.message);
  const sejajar = res.patch.matching!.kanan.every((item, i) => item.teks === `j${i + 1}`);
  assert.equal(sejajar, false, "kolom kanan tidak boleh sejajar dengan kolom kiri");
}

// MATCHING cacat ditolak.
{
  assert.equal(toQuestionDraft("MATCHING", { pertanyaan: "x", pasangan: [] }).ok, false);
  assert.equal(
    toQuestionDraft("MATCHING", { pertanyaan: "x", pasangan: [{ kiri: "a", kanan: "" }] }).ok,
    false,
    "pasangan tanpa jodoh ditolak",
  );
}

// ── Draft hanya menyentuh field milik tipenya ────────────────────────────────
{
  const single = toQuestionDraft("SINGLE", {
    pertanyaan: "x", opsi_a: "a", opsi_b: "b", opsi_c: "c", opsi_d: "d", kunci_jawaban: "A",
  });
  if (!single.ok) throw new Error(single.message);
  assert.equal("matching" in single.patch, false, "draft SINGLE tidak menimpa draft menjodohkan");
  assert.equal("pernyataan" in single.patch, false);
  assert.equal("fillIn" in single.patch, false);

  const tf = toQuestionDraft("TRUE_FALSE", {
    pertanyaan: "x", pernyataan: [{ teks: "p", kunci: "BENAR" }],
  });
  if (!tf.ok) throw new Error(tf.message);
  assert.equal("opsi_a" in tf.patch, false, "draft BENAR/SALAH tidak menimpa opsi pilihan ganda");
}

console.log("aiQuestionDraft: 5 tipe soal, kunci utuh, hasil cacat ditolak PASS");
