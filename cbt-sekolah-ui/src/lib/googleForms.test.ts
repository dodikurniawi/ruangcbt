import assert from "node:assert/strict";
import {
  buildGoogleImportPayload,
  fetchGoogleImage,
  getGoogleForm,
  isGoogleQuestionReady,
  listGoogleForms,
  mapGoogleForm,
  markGoogleImageFailed,
} from "./googleForms.ts";

const FORM = {
  formId: "form-1234567890",
  info: { title: "PAS Sosiologi Kelas X", description: "Pilih jawaban yang benar." },
  items: [
    {
      itemId: "item-single",
      title: "Ibu kota Indonesia adalah ...",
      questionItem: {
        image: { contentUri: "https://lh3.googleusercontent.com/question.png", altText: "Peta Indonesia" },
        question: {
          questionId: "single-1",
          grading: { pointValue: 2, correctAnswers: { answers: [{ value: "Jakarta" }] } },
          choiceQuestion: {
            type: "RADIO",
            options: ["Bandung", "Jakarta", "Surabaya", "Medan"].map((value) => ({ value })),
          },
        },
      },
    },
    {
      itemId: "item-fill",
      title: "Semboyan bangsa Indonesia adalah ...",
      description: "Tulis semboyan lengkap.",
      questionItem: {
        question: {
          questionId: "fill-1",
          grading: {
            pointValue: 3,
            correctAnswers: { answers: [{ value: "Bhinneka Tunggal Ika" }, { value: "Bhineka Tunggal Ika" }] },
          },
          textQuestion: { paragraph: false },
        },
      },
    },
    {
      itemId: "item-no-key",
      title: "Soal tanpa kunci",
      questionItem: {
        question: {
          questionId: "single-no-key",
          choiceQuestion: {
            type: "DROP_DOWN",
            options: ["A1", "B1", "C1", "D1"].map((value) => ({ value })),
          },
        },
      },
    },
    {
      itemId: "item-conflict",
      title: "Soal kunci konflik",
      questionItem: {
        question: {
          questionId: "single-conflict",
          grading: { pointValue: 1, correctAnswers: { answers: [{ value: "A" }, { value: "B" }] } },
          choiceQuestion: {
            type: "RADIO",
            options: ["A", "B", "C", "D"].map((value) => ({ value })),
          },
        },
      },
    },
    {
      itemId: "item-checkbox",
      title: "Pilih banyak",
      questionItem: {
        question: {
          questionId: "checkbox-1",
          grading: { pointValue: 1, correctAnswers: { answers: [{ value: "A" }, { value: "B" }] } },
          choiceQuestion: {
            type: "CHECKBOX",
            options: ["A", "B", "C", "D"].map((value) => ({ value })),
          },
        },
      },
    },
    {
      itemId: "item-grid",
      title: "Tentukan benar atau salah",
      questionGroupItem: {
        image: { contentUri: "https://lh3.googleusercontent.com/grid.png", altText: "Ilustrasi" },
        grid: {
          columns: {
            type: "RADIO",
            options: [{ value: "Benar" }, { value: "Salah" }],
          },
        },
        questions: [
          {
            questionId: "row-1",
            rowQuestion: { title: "Air mendidih pada 100°C." },
            grading: { pointValue: 1, correctAnswers: { answers: [{ value: "Benar" }] } },
          },
          {
            questionId: "row-2",
            rowQuestion: { title: "Matahari mengelilingi bumi." },
            grading: { pointValue: 1, correctAnswers: { answers: [{ value: "Salah" }] } },
          },
        ],
      },
    },
    { itemId: "text-1", title: "Petunjuk", textItem: {} },
  ],
};

{
  const preview = mapGoogleForm(FORM, (_uri, sourceId) => `/api/google-forms/image?ticket=${sourceId}`);
  assert.equal(preview.title, "PAS Sosiologi Kelas X");
  assert.equal(preview.questions.length, 6);
  assert.equal(preview.skippedItems, 1);

  const [single, fill, noKey, conflict, unsupported, trueFalse] = preview.questions;
  assert.equal(single.tipe, "SINGLE");
  assert.equal(single.kunci_jawaban, "B");
  assert.equal(single.bobot, 2);
  assert.match(single.imageUrl, /single-1/);
  assert.equal(isGoogleQuestionReady(single), true);

  assert.equal(fill.tipe, "FILL_IN");
  assert.deepEqual(JSON.parse(fill.kunci_jawaban), {
    accepted_answers: ["Bhinneka Tunggal Ika", "Bhineka Tunggal Ika"],
    case_sensitive: false,
    trim: true,
  });
  assert.deepEqual(fill.data_soal, { petunjuk: "Tulis semboyan lengkap." });
  assert.equal(isGoogleQuestionReady(fill), true);

  assert.equal(noKey.kunci_jawaban, "", "answer key tanpa bukti tidak boleh ditebak");
  assert.equal(isGoogleQuestionReady(noKey), false);
  assert.match(noKey.issues.join(" "), /belum tersedia/i);

  assert.equal(conflict.kunci_jawaban, "", "kunci konflik tidak boleh dipilih otomatis");
  assert.equal(isGoogleQuestionReady(conflict), false);
  assert.match(conflict.issues.join(" "), /konflik/i);

  assert.equal(unsupported.tipe, null, "tipe unsupported tidak boleh dipaksa menjadi SINGLE");
  assert.equal(isGoogleQuestionReady(unsupported), false);
  assert.match(unsupported.issues.join(" "), /belum didukung/i);

  assert.equal(trueFalse.tipe, "TRUE_FALSE");
  assert.deepEqual(trueFalse.data_soal, {
    pernyataan: [
      { id: "row-1", teks: "Air mendidih pada 100°C." },
      { id: "row-2", teks: "Matahari mengelilingi bumi." },
    ],
  });
  assert.deepEqual(JSON.parse(trueFalse.kunci_jawaban), { "row-1": "BENAR", "row-2": "SALAH" });
  assert.equal(trueFalse.bobot, 2);
  assert.equal(isGoogleQuestionReady(trueFalse), true);

  const failedImage = markGoogleImageFailed(single);
  assert.equal(isGoogleQuestionReady(failedImage), false, "gambar gagal harus mengubah READY menjadi PERLU DICEK");

  const copied: string[] = [];
  const built = await buildGoogleImportPayload(preview.questions, 10, "MAPEL_A", async (url) => {
    copied.push(url);
    return "https://drive.google.com/thumbnail?id=IMPORTED&sz=w800";
  });
  assert.equal(built.payload.length, 3, "hanya SINGLE, FILL_IN, TRUE_FALSE valid yang masuk import");
  assert.deepEqual(built.payload.map((row) => row.nomor_urut), [11, 12, 13]);
  assert.deepEqual(built.payload.map((row) => row.tipe), ["SINGLE", "FILL_IN", "TRUE_FALSE"]);
  assert.equal(copied.length, 2, "gambar pertanyaan dan grid memakai jalur upload existing");

  const imageBlocked = await buildGoogleImportPayload([single], 0, "MAPEL_A", async () => null);
  assert.equal(imageBlocked.payload.length, 0, "gambar gagal tidak boleh menghasilkan soal tanpa gambar");
  assert.equal(imageBlocked.blockedByImages, 1);
}

{
  const threeOptionForm = {
    formId: "FORM_ABC",
    info: { title: "Form tiga opsi" },
    items: [{
      itemId: "item-abc",
      title: "Pilih satu",
      questionItem: { question: {
        questionId: "question-abc",
        grading: { correctAnswers: { answers: [{ value: "C" }] } },
        choiceQuestion: { type: "RADIO", options: ["A", "B", "C"].map((value) => ({ value })) },
      } },
    }],
  };
  const question = mapGoogleForm(threeOptionForm).questions[0];
  assert.deepEqual([question.opsi_a, question.opsi_b, question.opsi_c, question.opsi_d, question.opsi_e],
    ["A", "B", "C", "", ""], "Google Form tidak mengarang D/E");
  assert.equal(question.kunci_jawaban, "C");
  assert.equal(isGoogleQuestionReady(question), true, "Google Form A-C harus siap diimport");
  const built = await buildGoogleImportPayload([question], 0, "MAPEL_A", async () => "");
  assert.equal(built.payload.length, 1, "tombol import punya satu soal siap");
}

{
  let authorization = "";
  let requestedUrl = "";
  const fetcher: typeof fetch = async (input, init) => {
    requestedUrl = String(input);
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    return Response.json({
      files: [{ id: "FORM_A", name: "Form A", modifiedTime: "2026-09-13T00:00:00Z" }],
      nextPageToken: "NEXT",
    });
  };
  const result = await listGoogleForms("server-access-token", "", fetcher);
  assert.deepEqual(result.forms, [{ id: "FORM_A", name: "Form A", modifiedTime: "2026-09-13T00:00:00Z" }]);
  assert.equal(result.nextPageToken, "NEXT");
  assert.match(requestedUrl, /application%2Fvnd.google-apps.form/);
  assert.equal(authorization, "Bearer server-access-token");

  const empty = await listGoogleForms("server-access-token", "", async () => Response.json({ files: [] }));
  assert.deepEqual(empty.forms, []);
}

{
  const preview = await getGoogleForm(
    "server-access-token",
    "form-1234567890",
    () => "",
    async (input, init) => {
      assert.match(String(input), /forms.googleapis.com\/v1\/forms\/form-1234567890$/);
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer server-access-token");
      return Response.json(FORM);
    },
  );
  assert.equal(preview.questions[0].kunci_jawaban, "B");
}

{
  const bytes = new Uint8Array([1, 2, 3]);
  const image = await fetchGoogleImage(
    "server-access-token",
    "https://lh3.googleusercontent.com/image.png",
    async (_input, init) => {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer server-access-token");
      return new Response(bytes, { headers: { "content-type": "image/png", "content-length": "3" } });
    },
  );
  assert.deepEqual([...image.bytes], [1, 2, 3]);
  await assert.rejects(
    fetchGoogleImage("token", "http://127.0.0.1/private", async () => new Response(bytes)),
    /Gambar tidak berhasil diambil/,
  );
  await assert.rejects(
    fetchGoogleImage("token", "https://lh3.googleusercontent.com/huge.png", async () =>
      new Response(bytes, { headers: { "content-type": "image/png", "content-length": String(3 * 1024 * 1024) } })),
    /Gambar tidak berhasil diambil/,
  );
}

console.log("googleForms: list, parsing, mapping, key, unsupported, image, preview, import filter PASS");
